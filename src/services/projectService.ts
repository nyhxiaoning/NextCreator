/**
 * 项目数据序列化服务
 * 负责完整项目的 JSON 导入/导出、数据组装和分发
 *
 * 兼容 Tauri 桌面端和浏览器端：
 * - Tauri 下使用 plugin-dialog + plugin-fs（原生保存/打开对话框）
 * - 浏览器下使用 Blob/FileReader（下载/文件输入）
 */
import type { ProjectData } from "@/types/project";
import { PROJECT_SCHEMA_VERSION } from "@/types/project";
import { useCanvasStore } from "@/stores/canvasStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUserPromptStore } from "@/stores/userPromptStore";
import { useCustomModelStore } from "@/stores/customModelStore";
import { useFavoritePromptStore } from "@/stores/favoritePromptStore";
import { toast } from "@/stores/toastStore";
import type { CustomNode } from "@/types";
import { getCurrentVersion } from "@/services/updateService";

/** 检测是否运行在 Tauri 环境 */
function isTauri(): boolean {
  return typeof (window as any).__TAURI_INTERNALS__ !== "undefined";
}

/**
 * 浏览器端触发 JSON 文件下载
 */
function downloadJsonFile(jsonStr: string, fileName: string): void {
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 浏览器端通过文件选择器读取 JSON 文件
 */
function readJsonFileFromBrowser(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("读取文件失败"));
      reader.readAsText(file);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

/**
 * 清理节点数据中的 base64 图片，仅保留文件路径
 * 用于导出时减小文件体积
 */
export function cleanNodeDataForExport(nodes: CustomNode[]): CustomNode[] {
  return nodes.map((node) => {
    const cleanedNode = { ...node, data: { ...node.data } };
    const data = cleanedNode.data;

    // 清理 ImageInputNode 的 base64 数据
    if ("imageData" in data && "imagePath" in data) {
      delete data.imageData;
    }

    // 清理 ImageGeneratorNode 的 base64 数据
    if ("outputImage" in data && "outputImagePath" in data) {
      delete data.outputImage;
    }

    // 清理 PPTContentNode 的 pages 数据中的 base64
    if ("pages" in data && Array.isArray(data.pages)) {
      data.pages = data.pages.map((page: Record<string, unknown>) => {
        const cleanedPage = { ...page };

        // 清理 result 中的 base64
        if (cleanedPage.result && typeof cleanedPage.result === "object") {
          const result = cleanedPage.result as Record<string, unknown>;
          const cleanedResult = { ...result };
          if (cleanedResult.imagePath) delete cleanedResult.image;
          if (cleanedResult.thumbnailPath) delete cleanedResult.thumbnail;
          cleanedPage.result = cleanedResult;
        }

        // 清理手动上传图片的 base64
        if (cleanedPage.manualImagePath) delete cleanedPage.manualImage;
        if (cleanedPage.manualThumbnailPath) delete cleanedPage.manualThumbnail;

        return cleanedPage;
      });
    }

    return cleanedNode;
  });
}

/**
 * 从所有 Zustand store 收集当前状态，组装成 ProjectData
 */
export function assembleProjectData(): ProjectData {
  const canvasState = useCanvasStore.getState();
  const settingsState = useSettingsStore.getState();
  const userPromptState = useUserPromptStore.getState();
  const customModelState = useCustomModelStore.getState();
  const favoriteState = useFavoritePromptStore.getState();

  // 清理每个画布中节点的大体积 base64 数据
  const canvasesForExport = canvasState.canvases.map((canvas) => ({
    ...canvas,
    nodes: cleanNodeDataForExport(canvas.nodes),
  }));

  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    exportedAt: Date.now(),
    appVersion: getCurrentVersion(),
    canvases: canvasesForExport,
    activeCanvasId: canvasState.activeCanvasId,
    providers: settingsState.settings.providers,
    nodeProviders: settingsState.settings.nodeProviders,
    theme: settingsState.settings.theme,
    userPrompts: userPromptState.prompts,
    customModels: { ...customModelState.customModels },
    favoriteIds: Array.from(favoriteState.favoriteIds),
  };
}

/**
 * 验证 ProjectData 对象是否结构完整
 */
export function validateProjectData(data: unknown): data is ProjectData {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.schemaVersion === "number" &&
    Array.isArray(d.canvases) &&
    d.schemaVersion >= 1
  );
}

/**
 * 迁移旧版本 ProjectData 到当前版本
 * 当 schemaVersion 变更时需要更新此函数
 */
export function migrateProjectData(data: ProjectData): ProjectData {
  // 目前只有 v1，直接返回
  // 未来版本递增时需要在此处添加迁移逻辑
  if (data.schemaVersion < PROJECT_SCHEMA_VERSION) {
    // TODO: 未来版本迁移
    data.schemaVersion = PROJECT_SCHEMA_VERSION;
  }
  return data;
}

/**
 * 将 ProjectData 分发写入到各个 Zustand store
 */
export function dispatchProjectData(
  data: ProjectData,
  mergeMode: boolean = false
): void {
  const canvasState = useCanvasStore.getState();
  const settingsState = useSettingsStore.getState();
  const userPromptState = useUserPromptStore.getState();
  const customModelState = useCustomModelStore.getState();
  const favoriteState = useFavoritePromptStore.getState();

  if (mergeMode) {
    // 合并模式：追加新画布、新提示词，合并收藏和自定义模型
    const existingCanvasIds = new Set(canvasState.canvases.map((c) => c.id));
    const newCanvases = data.canvases.filter((c) => !existingCanvasIds.has(c.id));

    useCanvasStore.setState({
      canvases: [...canvasState.canvases, ...newCanvases],
    });

    useUserPromptStore.setState({
      prompts: [...userPromptState.prompts, ...data.userPrompts],
    });

    // 合并收藏
    const mergedFavorites = new Set(favoriteState.favoriteIds);
    for (const id of data.favoriteIds) {
      mergedFavorites.add(id);
    }
    useFavoritePromptStore.setState({ favoriteIds: mergedFavorites });

    // 合并自定义模型
    const mergedModels = { ...customModelState.customModels };
    for (const [category, models] of Object.entries(data.customModels)) {
      const existing = mergedModels[category as keyof typeof mergedModels] || [];
      const set = new Set([...existing, ...models]);
      mergedModels[category as keyof typeof mergedModels] = Array.from(set);
    }
    useCustomModelStore.setState({ customModels: mergedModels });
  } else {
    // 替换模式：直接覆盖所有 store
    useCanvasStore.setState({
      canvases: data.canvases,
      activeCanvasId: data.activeCanvasId,
    });

    useSettingsStore.setState({
      settings: {
        ...settingsState.settings,
        providers: data.providers,
        nodeProviders: data.nodeProviders,
        theme: data.theme,
      },
    });

    useUserPromptStore.setState({
      prompts: data.userPrompts,
    });

    useCustomModelStore.setState({
      customModels: data.customModels as Record<string, string[]>,
    });

    useFavoritePromptStore.setState({
      favoriteIds: new Set(data.favoriteIds),
    });
  }

  // 如果指定了激活画布，切换到该画布
  if (data.activeCanvasId) {
    canvasState.switchCanvas(data.activeCanvasId);
  }
}

/**
 * 导出完整项目到 JSON 文件
 * 用户选择保存路径，默认文件名包含时间戳
 * 兼容 Tauri（原生保存对话框）和浏览器（下载）
 */
export async function exportFullProject(): Promise<string | null> {
  try {
    const projectData = assembleProjectData();
    const jsonStr = JSON.stringify(projectData, null, 2);
    const fileName = `nextcreator-backup-${Date.now()}.json`;

    if (isTauri()) {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");

      const filePath = await save({
        defaultPath: fileName,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });

      if (filePath) {
        await writeTextFile(filePath, jsonStr);
        const shortName = filePath.split("/").pop() || filePath.split("\\").pop();
        toast.success(`项目已导出: ${shortName}`);
        return filePath;
      }

      return null;
    }

    // 浏览器端：触发下载
    downloadJsonFile(jsonStr, fileName);
    toast.success("项目已导出");
    return fileName;
  } catch (error) {
    console.error("导出项目失败:", error);
    toast.error(`导出失败: ${error instanceof Error ? error.message : "未知错误"}`);
    return null;
  }
}

/**
 * 从 JSON 文件导入完整项目
 * 兼容 Tauri（原生打开对话框）和浏览器（文件选择器）
 * @param mergeMode true=合并模式(追加新数据), false=替换模式(完全覆盖)
 */
export async function importFullProject(mergeMode: boolean = false): Promise<boolean> {
  try {
    let content: string | null = null;

    if (isTauri()) {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const { readTextFile } = await import("@tauri-apps/plugin-fs");

      const filePath = await open({
        filters: [{ name: "JSON", extensions: ["json"] }],
        multiple: false,
      });

      if (!filePath || typeof filePath !== "string") return false;
      content = await readTextFile(filePath);
    } else {
      // 浏览器端：弹出文件选择器
      content = await readJsonFileFromBrowser();
      if (!content) return false;
    }

    const data = JSON.parse(content);

    // 验证数据结构
    if (!validateProjectData(data)) {
      toast.error("无效的项目文件：缺少必要字段或格式错误");
      return false;
    }

    // 版本兼容性检查
    if (data.schemaVersion > PROJECT_SCHEMA_VERSION) {
      toast.warning(
        `此文件由更新版本创建 (v${data.appVersion})，部分数据可能不兼容`
      );
    }

    // 迁移旧版本数据
    const migratedData = migrateProjectData(data);

    // 分发到各 store
    dispatchProjectData(migratedData, mergeMode);

    if (mergeMode) {
      toast.success("项目数据已合并导入");
    } else {
      toast.success("项目数据已导入（替换模式）");
    }

    return true;
  } catch (error) {
    console.error("导入项目失败:", error);
    if (error instanceof SyntaxError) {
      toast.error("导入失败: JSON 格式错误");
    } else {
      toast.error(`导入失败: ${error instanceof Error ? error.message : "未知错误"}`);
    }
    return false;
  }
}
