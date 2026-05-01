import type { Node } from "@xyflow/react";
import type { ErrorDetails, ModelType, NodeProviderMapping } from "@/types";
import type { ImageGenerationRequest } from "@/services/imageGeneration";

export type ImageGeneratorEngine =
  | "nanobanana-pro"
  | "nanobanana2"
  | "nanobanana"
  | "dalle"
  | "flux"
  | "gpt-image"
  | "doubao"
  | "z-image";

export type ImageNodeProviderKey = Extract<
  keyof NodeProviderMapping,
  | "imageGeneratorPro"
  | "imageGeneratorFast"
  | "imageGeneratorNB2"
  | "dalleGenerator"
  | "fluxGenerator"
  | "gptImageGenerator"
  | "doubaoGenerator"
  | "zImageGenerator"
>;

export type GptImageSize = "auto" | `${number}x${number}`;
export type GptImageSizeMode = "preset" | "custom";

export interface ImageGeneratorNodeData {
  [key: string]: unknown;
  label: string;
  engine: ImageGeneratorEngine;
  model: ModelType;
  aspectRatio?: string;
  imageSize?: string;
  size?: GptImageSize;
  sizeMode?: GptImageSizeMode;
  customWidth?: number;
  customHeight?: number;
  quality?: "auto" | "standard" | "hd" | "low" | "medium" | "high";
  background?: "auto" | "transparent" | "opaque";
  outputFormat?: "png" | "jpeg" | "webp";
  outputCompression?: number;
  moderation?: "auto" | "low";
  guidanceScale?: number;
  watermark?: boolean;
  negativePrompt?: string;
  status: "idle" | "loading" | "success" | "error";
  outputImage?: string;
  outputImagePath?: string;
  error?: string;
  errorDetails?: ErrorDetails;
}

export type ImageGeneratorNode = Node<ImageGeneratorNodeData>;

export interface ImageEngineConfig {
  engine: ImageGeneratorEngine;
  providerKey: ImageNodeProviderKey;
  label: string;
  shortLabel: string;
  description: string;
  defaultModel: string;
  presetModels: Array<{ value: string; label: string }>;
  aspectRatios?: Array<{ value: string; label: string }>;
  imageSizes?: Array<{ value: string; label: string }>;
  accent: "primary" | "info" | "warning" | "secondary" | "error";
  headerClass: string;
  badgeClass: string;
  outputHandleClass: string;
  supportsImageInput: boolean;
  supportsMultipleImages: boolean;
  hasImageSize?: boolean;
  hasDalleQuality?: boolean;
  hasGptImageControls?: boolean;
  hasGuidanceScale?: boolean;
  hasWatermark?: boolean;
  hasNegativePrompt?: boolean;
}

const basicAspectRatioOptions = [
  { value: "1:1", label: "1:1" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
];

const proAspectRatioOptions = [
  ...basicAspectRatioOptions,
  { value: "3:2", label: "3:2" },
  { value: "2:3", label: "2:3" },
  { value: "5:4", label: "5:4" },
  { value: "4:5", label: "4:5" },
  { value: "21:9", label: "21:9" },
];

const nb2AspectRatioOptions = [
  ...proAspectRatioOptions,
  { value: "1:4", label: "1:4" },
  { value: "4:1", label: "4:1" },
  { value: "1:8", label: "1:8" },
  { value: "8:1", label: "8:1" },
];

export const imageSizeOptions = [
  { value: "1K", label: "1K" },
  { value: "2K", label: "2K" },
  { value: "4K", label: "4K" },
];

export const nb2ImageSizeOptions = [
  { value: "512", label: "512" },
  ...imageSizeOptions,
];

export const gptImagePresetModels = [
  { value: "gpt-image-2", label: "GPT Image 2" },
  { value: "gpt-image-1.5", label: "GPT Image 1.5" },
  { value: "gpt-image-1", label: "GPT Image 1" },
  { value: "gpt-image-1-mini", label: "GPT Image Mini" },
];

export const gptImageQualityOptions = [
  { value: "auto", label: "自动" },
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
] as const;

export const dalleQualityOptions = [
  { value: "standard", label: "标准" },
  { value: "hd", label: "高清" },
] as const;

export const gptImageSizePresetOptions: Array<{ value: GptImageSize | "custom"; label: string }> = [
  { value: "auto", label: "自动" },
  { value: "1024x1024", label: "1:1 1024" },
  { value: "2048x2048", label: "1:1 2048" },
  { value: "2880x2880", label: "1:1 最大" },
  { value: "1536x864", label: "16:9 1536" },
  { value: "2048x1152", label: "16:9 2048" },
  { value: "3840x2160", label: "16:9 4K" },
  { value: "864x1536", label: "9:16 1536" },
  { value: "1152x2048", label: "9:16 2048" },
  { value: "2160x3840", label: "9:16 4K" },
  { value: "1536x1152", label: "4:3 1536" },
  { value: "1152x1536", label: "3:4 1536" },
  { value: "1536x1024", label: "3:2 1536" },
  { value: "1024x1536", label: "2:3 1536" },
  { value: "1600x1280", label: "5:4 1600" },
  { value: "1280x1600", label: "4:5 1600" },
  { value: "1792x768", label: "21:9 1792" },
  { value: "2304x768", label: "3:1 2304" },
  { value: "custom", label: "自定义" },
];

export const gptImageBackgroundOptions = [
  { value: "auto", label: "自动" },
  { value: "transparent", label: "透明" },
  { value: "opaque", label: "不透明" },
] as const;

export const gptImageOutputFormatOptions = [
  { value: "png", label: "PNG" },
  { value: "jpeg", label: "JPEG" },
  { value: "webp", label: "WebP" },
] as const;

export const gptImageModerationOptions = [
  { value: "auto", label: "标准" },
  { value: "low", label: "宽松" },
] as const;

export const imageEngineConfigs: Record<ImageGeneratorEngine, ImageEngineConfig> = {
  "nanobanana-pro": {
    engine: "nanobanana-pro",
    providerKey: "imageGeneratorPro",
    label: "NanoBanana Pro",
    shortLabel: "NB Pro",
    description: "高质量生成，支持 4K 分辨率",
    defaultModel: "gemini-3-pro-image-preview",
    presetModels: [{ value: "gemini-3-pro-image-preview", label: "NanoBanana Pro" }],
    aspectRatios: proAspectRatioOptions,
    imageSizes: imageSizeOptions,
    accent: "primary",
    headerClass: "bg-gradient-to-r from-purple-500 to-pink-500",
    badgeClass: "bg-purple-500/10 text-purple-600",
    outputHandleClass: "!bg-pink-500",
    supportsImageInput: true,
    supportsMultipleImages: true,
    hasImageSize: true,
  },
  nanobanana2: {
    engine: "nanobanana2",
    providerKey: "imageGeneratorNB2",
    label: "NanoBanana2",
    shortLabel: "NB2",
    description: "推荐首选，性能/成本/延迟最佳平衡",
    defaultModel: "gemini-3.1-flash-image-preview",
    presetModels: [{ value: "gemini-3.1-flash-image-preview", label: "NanoBanana2" }],
    aspectRatios: nb2AspectRatioOptions,
    imageSizes: nb2ImageSizeOptions,
    accent: "info",
    headerClass: "bg-gradient-to-r from-cyan-500 to-blue-500",
    badgeClass: "bg-cyan-500/10 text-cyan-600",
    outputHandleClass: "!bg-blue-500",
    supportsImageInput: true,
    supportsMultipleImages: true,
    hasImageSize: true,
  },
  nanobanana: {
    engine: "nanobanana",
    providerKey: "imageGeneratorFast",
    label: "NanoBanana",
    shortLabel: "NB",
    description: "快速生成，适合批量任务",
    defaultModel: "gemini-2.5-flash-image",
    presetModels: [{ value: "gemini-2.5-flash-image", label: "NanoBanana" }],
    aspectRatios: basicAspectRatioOptions,
    accent: "warning",
    headerClass: "bg-gradient-to-r from-amber-500 to-orange-500",
    badgeClass: "bg-amber-500/10 text-amber-600",
    outputHandleClass: "!bg-orange-500",
    supportsImageInput: true,
    supportsMultipleImages: true,
  },
  dalle: {
    engine: "dalle",
    providerKey: "dalleGenerator",
    label: "DALL-E",
    shortLabel: "DALL-E",
    description: "OpenAI DALL-E 图片生成",
    defaultModel: "dall-e-3",
    presetModels: [
      { value: "dall-e-3", label: "DALL-E 3" },
      { value: "dall-e-2", label: "DALL-E 2" },
    ],
    aspectRatios: [
      { value: "1:1", label: "1:1" },
      { value: "16:9", label: "16:9" },
      { value: "9:16", label: "9:16" },
    ],
    accent: "secondary",
    headerClass: "bg-gradient-to-r from-pink-500 to-rose-500",
    badgeClass: "bg-pink-500/10 text-pink-600",
    outputHandleClass: "!bg-pink-500",
    supportsImageInput: true,
    supportsMultipleImages: false,
    hasDalleQuality: true,
  },
  flux: {
    engine: "flux",
    providerKey: "fluxGenerator",
    label: "Flux",
    shortLabel: "Flux",
    description: "Flux 图片生成",
    defaultModel: "flux-1-pro",
    presetModels: [
      { value: "flux-1-pro", label: "Flux 1 Pro" },
      { value: "flux-1.1-pro", label: "Flux 1.1 Pro" },
      { value: "flux-1-dev", label: "Flux 1 Dev" },
      { value: "flux-1-schnell", label: "Flux 1 Schnell" },
    ],
    aspectRatios: basicAspectRatioOptions,
    accent: "primary",
    headerClass: "bg-gradient-to-r from-violet-500 to-purple-500",
    badgeClass: "bg-violet-500/10 text-violet-600",
    outputHandleClass: "!bg-violet-500",
    supportsImageInput: true,
    supportsMultipleImages: false,
  },
  "gpt-image": {
    engine: "gpt-image",
    providerKey: "gptImageGenerator",
    label: "GPT Image",
    shortLabel: "GPT",
    description: "OpenAI GPT Image 图片生成和编辑",
    defaultModel: "gpt-image-2",
    presetModels: gptImagePresetModels,
    accent: "primary",
    headerClass: "bg-gradient-to-r from-lime-500 to-green-500",
    badgeClass: "bg-lime-500/10 text-lime-700",
    outputHandleClass: "!bg-lime-500",
    supportsImageInput: true,
    supportsMultipleImages: true,
    hasGptImageControls: true,
  },
  doubao: {
    engine: "doubao",
    providerKey: "doubaoGenerator",
    label: "豆包",
    shortLabel: "豆包",
    description: "字节跳动豆包图片生成",
    defaultModel: "doubao-seedream-3-0-t2i-250415",
    presetModels: [
      { value: "doubao-seedream-3-0-t2i-250415", label: "Seedream 3.0" },
      { value: "doubao-seedream-4-0-250828", label: "Seedream 4.0" },
    ],
    aspectRatios: basicAspectRatioOptions,
    accent: "info",
    headerClass: "bg-gradient-to-r from-cyan-500 to-teal-500",
    badgeClass: "bg-cyan-500/10 text-cyan-600",
    outputHandleClass: "!bg-cyan-500",
    supportsImageInput: true,
    supportsMultipleImages: true,
    hasGuidanceScale: true,
    hasWatermark: true,
  },
  "z-image": {
    engine: "z-image",
    providerKey: "zImageGenerator",
    label: "Z-Image",
    shortLabel: "Z",
    description: "Gitee AI Z-Image 图片生成",
    defaultModel: "z-image-turbo",
    presetModels: [
      { value: "z-image-turbo", label: "Z-Image Turbo" },
    ],
    aspectRatios: basicAspectRatioOptions,
    accent: "primary",
    headerClass: "bg-gradient-to-r from-indigo-500 to-blue-500",
    badgeClass: "bg-indigo-500/10 text-indigo-600",
    outputHandleClass: "!bg-indigo-500",
    supportsImageInput: false,
    supportsMultipleImages: false,
    hasNegativePrompt: true,
  },
};

export const imageEngineOptions = Object.values(imageEngineConfigs).map((config) => ({
  value: config.engine,
  label: config.label,
  description: config.description,
}));

export const defaultImageEngine: ImageGeneratorEngine = "nanobanana2";

export function getImageEngineConfig(engine?: unknown): ImageEngineConfig {
  return imageEngineConfigs[(engine as ImageGeneratorEngine) || defaultImageEngine] || imageEngineConfigs[defaultImageEngine];
}

export function getDefaultImageGeneratorData(engine: ImageGeneratorEngine = defaultImageEngine): ImageGeneratorNodeData {
  const config = getImageEngineConfig(engine);
  return {
    label: "绘图生成",
    engine,
    model: config.defaultModel,
    aspectRatio: config.aspectRatios?.[0]?.value || "1:1",
    imageSize: config.imageSizes?.[0]?.value || "1K",
    size: "auto",
    sizeMode: "preset",
    quality: config.hasDalleQuality ? "standard" : "auto",
    background: "auto",
    outputFormat: "png",
    moderation: "auto",
    guidanceScale: 5,
    watermark: false,
    negativePrompt: "",
    status: "idle",
  };
}

export function parseGptImageSize(size?: string): { width: number; height: number } | null {
  const match = size?.match(/^(\d+)x(\d+)$/);
  if (!match) return null;

  return {
    width: Number(match[1]),
    height: Number(match[2]),
  };
}

const gptImageSizePresetValues = new Set(
  gptImageSizePresetOptions
    .map((opt) => opt.value)
    .filter((value): value is GptImageSize => value !== "custom")
);

export function getGptImageCustomDimensions(data: ImageGeneratorNodeData) {
  const parsedSize = parseGptImageSize(data.size);
  return {
    width: data.customWidth || parsedSize?.width || 1024,
    height: data.customHeight || parsedSize?.height || 1024,
  };
}

export function getGptImageSizeMode(data: ImageGeneratorNodeData): GptImageSizeMode {
  if (data.sizeMode) return data.sizeMode;
  return data.size && !gptImageSizePresetValues.has(data.size) ? "custom" : "preset";
}

export function getResolvedGptImageSize(data: ImageGeneratorNodeData): GptImageSize {
  if (getGptImageSizeMode(data) !== "custom") {
    return data.size || "auto";
  }

  const { width, height } = getGptImageCustomDimensions(data);
  return `${width}x${height}`;
}

export function validateGptImage2Size(size: GptImageSize): string | undefined {
  if (size === "auto") return undefined;

  const parsed = parseGptImageSize(size);
  if (!parsed) return "尺寸格式无效";

  const { width, height } = parsed;
  if (width <= 0 || height <= 0) return "宽高必须大于 0";
  if (width % 16 !== 0 || height % 16 !== 0) return "宽高必须是 16 的倍数";
  if (Math.max(width, height) > 3840) return "最长边不能超过 3840";
  if (Math.max(width, height) / Math.min(width, height) > 3) return "宽高比不能超过 3:1";

  const pixels = width * height;
  if (pixels < 655360) return "总像素不能低于 655,360";
  if (pixels > 8294400) return "总像素不能超过 8,294,400";

  return undefined;
}

export function getGptImageBackgroundOptions(model: string) {
  return model === "gpt-image-2"
    ? gptImageBackgroundOptions.filter((opt) => opt.value !== "transparent")
    : [...gptImageBackgroundOptions];
}

export function getImageModelDisplayName(data: ImageGeneratorNodeData) {
  const config = getImageEngineConfig(data.engine);
  const preset = config.presetModels.find((opt) => opt.value === data.model);
  return preset ? preset.label : data.model;
}

export function buildImageGenerationRequest(
  data: ImageGeneratorNodeData,
  prompt: string,
  inputImages?: string[],
  maskImage?: string
): ImageGenerationRequest {
  const config = getImageEngineConfig(data.engine);
  const base: ImageGenerationRequest = {
    prompt,
    model: data.model || config.defaultModel,
    inputImages,
    maskImage,
    aspectRatio: data.aspectRatio,
  };

  if (config.hasImageSize) {
    return {
      ...base,
      imageSize: data.imageSize || config.imageSizes?.[0]?.value,
    };
  }

  if (config.hasGptImageControls) {
    return {
      ...base,
      size: getResolvedGptImageSize(data),
      quality: data.quality || "auto",
      background: data.background || "auto",
      outputFormat: data.outputFormat || "png",
      outputCompression: data.outputCompression,
      moderation: data.moderation || "auto",
    };
  }

  if (config.hasDalleQuality) {
    return {
      ...base,
      quality: data.quality || "standard",
      imageSize: data.quality === "hd" ? "4K" : undefined,
    };
  }

  if (config.hasGuidanceScale || config.hasWatermark) {
    return {
      ...base,
      guidanceScale: data.guidanceScale,
      watermark: data.watermark,
    };
  }

  if (config.hasNegativePrompt) {
    return {
      ...base,
      negativePrompt: data.negativePrompt || undefined,
    };
  }

  return base;
}
