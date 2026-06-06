/**
 * GitHub 同步服务
 * 通过 GitHub Contents API 实现项目数据的远程存储和同步
 */
import type { ProjectData } from "@/types/project";

export interface GitHubSyncConfig {
  owner: string;
  repo: string;
  path: string;
  token: string;
}

/** GitHub Contents API 响应中的文件信息 */
interface GitHubContentResponse {
  sha: string;
  content?: string;
  encoding?: string;
  size: number;
}

/** GitHub API 错误响应 */
interface GitHubErrorResponse {
  message: string;
  documentation_url?: string;
  status?: number;
}

/**
 * 生成 GitHub API 请求头
 */
function getHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };
}

/**
 * 友好的 GitHub API 错误消息映射
 */
function getErrorMessage(status: number, message: string): string {
  if (status === 401) return "GitHub Token 无效或已过期";
  if (status === 403) {
    if (message.includes("rate limit")) return "GitHub API 速率限制已达，请稍后重试";
    return "权限不足，请检查 Token 的 repo 权限范围";
  }
  if (status === 404)
    return "仓库或路径不存在，请检查仓库名和路径是否正确";
  if (status === 422)
    return "文件冲突，请先拉取最新版本再推送";
  return `GitHub API 错误 (${status}): ${message}`;
}

/**
 * 处理 GitHub API 响应，统一错误处理
 */
async function handleGitHubResponse(response: Response): Promise<any> {
  if (!response.ok) {
    let errorBody: GitHubErrorResponse = { message: "" };
    try {
      errorBody = await response.json();
    } catch {
      errorBody.message = response.statusText;
    }
    throw new Error(
      getErrorMessage(response.status, errorBody.message)
    );
  }
  return response.json();
}

/**
 * Base64 编码（支持 Unicode）
 */
function encodeBase64(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Base64 解码（支持 Unicode）
 */
function decodeBase64(str: string): string {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

/**
 * 获取远程文件的 SHA（用于更新已有文件）
 * 文件不存在时返回 null
 */
export async function getFileSha(
  config: GitHubSyncConfig
): Promise<string | null> {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodeURIComponent(config.path)}`;

  try {
    const response = await fetch(url, {
      headers: getHeaders(config.token),
    });

    if (response.status === 404) return null;

    const data: GitHubContentResponse = await handleGitHubResponse(response);
    return data.sha;
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      return null;
    }
    throw error;
  }
}

/**
 * 从 GitHub 拉取项目数据
 * 获取文件内容，解码 base64，解析为 ProjectData
 */
export async function pullProject(
  config: GitHubSyncConfig
): Promise<ProjectData> {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodeURIComponent(config.path)}`;

  const response = await fetch(url, {
    headers: getHeaders(config.token),
  });

  const data: GitHubContentResponse = await handleGitHubResponse(response);

  if (!data.content || data.encoding !== "base64") {
    throw new Error("GitHub 返回的文件内容格式异常");
  }

  const jsonStr = decodeBase64(data.content);
  let projectData: ProjectData;

  try {
    projectData = JSON.parse(jsonStr);
  } catch {
    throw new Error("远程文件不是有效的 JSON 格式");
  }

  if (!projectData.schemaVersion) {
    throw new Error("远程文件不是有效的 NextCreator 备份文件");
  }

  return projectData;
}

/**
 * 推送项目数据到 GitHub
 * @param sha 如果文件已存在则需提供 SHA
 */
export async function pushProject(
  config: GitHubSyncConfig,
  data: ProjectData,
  sha?: string | null
): Promise<void> {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodeURIComponent(config.path)}`;

  const jsonStr = JSON.stringify(data, null, 2);
  const content = encodeBase64(jsonStr);

  const body: Record<string, unknown> = {
    message: `NextCreator 备份 - ${new Date().toLocaleString("zh-CN")}`,
    content,
  };
  if (sha) {
    body.sha = sha;
  }

  const response = await fetch(url, {
    method: "PUT",
    headers: getHeaders(config.token),
    body: JSON.stringify(body),
  });

  await handleGitHubResponse(response);
}

/**
 * 删除 GitHub 上的备份文件
 */
export async function deleteProject(config: GitHubSyncConfig): Promise<void> {
  const sha = await getFileSha(config);
  if (!sha) return; // 文件不存在，视为删除成功

  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodeURIComponent(config.path)}`;

  const body = {
    message: `NextCreator 删除备份 - ${new Date().toLocaleString("zh-CN")}`,
    sha,
  };

  const response = await fetch(url, {
    method: "DELETE",
    headers: getHeaders(config.token),
    body: JSON.stringify(body),
  });

  await handleGitHubResponse(response);
}

/**
 * 测试 GitHub Token 和仓库连接是否正常
 * 返回 { success: boolean, message: string }
 */
export async function testConnection(
  config: GitHubSyncConfig
): Promise<{ success: boolean; message: string }> {
  // 测试 Token 有效性
  try {
    const userResponse = await fetch("https://api.github.com/user", {
      headers: getHeaders(config.token),
    });

    if (userResponse.status === 401) {
      return { success: false, message: "GitHub Token 无效或已过期" };
    }
    if (!userResponse.ok) {
      return { success: false, message: "Token 验证失败" };
    }

    const userData = await userResponse.json();
    const username: string = userData.login;

    // 测试仓库访问权限
    const repoUrl = `https://api.github.com/repos/${config.owner}/${config.repo}`;
    const repoResponse = await fetch(repoUrl, {
      headers: getHeaders(config.token),
    });

    if (repoResponse.status === 404) {
      return { success: false, message: `仓库 ${config.owner}/${config.repo} 不存在` };
    }
    if (repoResponse.status === 403) {
      return { success: false, message: `无权访问仓库 ${config.owner}/${config.repo}，请检查 Token 权限` };
    }
    if (!repoResponse.ok) {
      return { success: false, message: "仓库验证失败" };
    }

    return {
      success: true,
      message: `连接成功！以 ${username} 身份访问 ${config.owner}/${config.repo}`,
    };
  } catch (error) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      return { success: false, message: "网络连接失败，请检查网络设置" };
    }
    return {
      success: false,
      message: error instanceof Error ? error.message : "未知错误",
    };
  }
}
