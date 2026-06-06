import type { CanvasData } from "@/stores/canvasStore";
import type { UserPrompt } from "@/stores/userPromptStore";
import type { Provider, NodeProviderMapping } from "@/types";

/**
 * 项目数据 schema 版本号
 * 当数据结构有破坏性变更时递增，用于导入时兼容性检查
 */
export const PROJECT_SCHEMA_VERSION = 1;

/**
 * 统一的项目数据 JSON 结构
 * 用于完整导入/导出和 GitHub 同步
 */
export interface ProjectData {
  /** Schema 版本号，用于向前兼容 */
  schemaVersion: number;

  /** 导出时间戳（Unix 毫秒） */
  exportedAt: number;

  /** 导出的应用版本 */
  appVersion: string;

  /** 所有画布数据 */
  canvases: CanvasData[];

  /** 当前激活的画布 ID */
  activeCanvasId: string | null;

  /** 供应商列表 */
  providers: Provider[];

  /** 节点类型到供应商的映射 */
  nodeProviders: NodeProviderMapping;

  /** 主题设置 */
  theme: "light" | "dark" | "system";

  /** 用户自定义提示词 */
  userPrompts: UserPrompt[];

  /** 自定义模型（按分类） */
  customModels: Record<string, string[]>;

  /** 收藏的提示词 ID 列表 */
  favoriteIds: string[];
}
