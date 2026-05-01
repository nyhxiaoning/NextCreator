import { useState } from "react";
import { AlertCircle, AlertTriangle, Maximize2, Play } from "lucide-react";
import { ModelSelector } from "@/components/ui/ModelSelector";
import { Select } from "@/components/ui/Select";
import { ErrorDetailModal } from "@/components/ui/ErrorDetailModal";
import { ImagePreviewModal } from "@/components/ui/ImagePreviewModal";
import { useLoadingDots } from "@/hooks/useLoadingDots";
import { useImageGeneratorExecution } from "@/hooks/useImageGeneratorExecution";
import { useNodeConnectionStatus } from "@/hooks/useNodeConnectionStatus";
import { getImageUrl } from "@/services/fileStorageService";
import { useFlowStore } from "@/stores/flowStore";
import type {
  GptImageSize,
  ImageGeneratorEngine,
  ImageGeneratorNodeData,
} from "@/components/nodes/imageGeneratorConfig";
import {
  dalleQualityOptions,
  getDefaultImageGeneratorData,
  getGptImageBackgroundOptions,
  getGptImageCustomDimensions,
  getGptImageSizeMode,
  getImageEngineConfig,
  gptImageModerationOptions,
  gptImageOutputFormatOptions,
  gptImageQualityOptions,
  gptImageSizePresetOptions,
  imageEngineOptions,
} from "@/components/nodes/imageGeneratorConfig";

interface ImageGeneratorInspectorProps {
  nodeId: string;
  data: ImageGeneratorNodeData;
}

function getButtonClass(accent: string) {
  if (accent === "info") return "btn-info";
  if (accent === "warning") return "btn-warning";
  if (accent === "secondary") return "btn-secondary";
  if (accent === "error") return "btn-error";
  return "btn-primary";
}

function getModelSelectorVariant(accent: string) {
  if (accent === "info") return "info";
  if (accent === "warning") return "warning";
  return "primary";
}

export function ImageGeneratorInspector({ nodeId, data }: ImageGeneratorInspectorProps) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const [showPreview, setShowPreview] = useState(false);
  const [showErrorDetail, setShowErrorDetail] = useState(false);

  const config = getImageEngineConfig(data.engine);
  const { handleGenerate, model, resolvedSize, sizeValidationError } = useImageGeneratorExecution(nodeId, data);
  const dots = useLoadingDots(data.status === "loading");
  const { isPromptConnected, hasEmptyImageInputs, emptyImageLabels } = useNodeConnectionStatus(nodeId);
  const sizeMode = getGptImageSizeMode(data);
  const customDimensions = getGptImageCustomDimensions(data);
  const sizeSelectValue = sizeMode === "custom" ? "custom" : (data.size || "auto");

  const updateData = (updates: Partial<ImageGeneratorNodeData>) => {
    updateNodeData<ImageGeneratorNodeData>(nodeId, updates);
  };

  const handleEngineChange = (value: string) => {
    const nextEngine = value as ImageGeneratorEngine;
    const nextDefaults = getDefaultImageGeneratorData(nextEngine);
    updateData({
      ...nextDefaults,
      label: data.label || nextDefaults.label,
      outputImage: data.outputImage,
      outputImagePath: data.outputImagePath,
      status: data.status,
      error: data.error,
      errorDetails: data.errorDetails,
    });
  };

  const handleModelChange = (value: string) => {
    updateData({
      model: value,
      background: value === "gpt-image-2" && data.background === "transparent" ? "auto" : data.background,
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <section className="space-y-3">
          <div>
            <label className="text-xs text-base-content/60 mb-1 block">绘图引擎</label>
            <Select
              value={config.engine}
              options={imageEngineOptions}
              onChange={handleEngineChange}
            />
          </div>

          <ModelSelector
            value={model}
            options={config.presetModels}
            onChange={handleModelChange}
            variant={getModelSelectorVariant(config.accent)}
            allowCustom={true}
            modelCategory="imageGenerator"
            mode="inline"
          />

          {config.aspectRatios && (
            <div>
              <label className="text-xs text-base-content/60 mb-1 block">画幅比例</label>
              <Select
                value={data.aspectRatio || config.aspectRatios[0]?.value || "1:1"}
                options={config.aspectRatios}
                onChange={(value) => updateData({ aspectRatio: value })}
              />
            </div>
          )}

          {config.hasImageSize && config.imageSizes && (
            <div>
              <label className="text-xs text-base-content/60 mb-1 block">输出尺寸</label>
              <div className="grid grid-cols-4 gap-1.5">
                {config.imageSizes.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`btn btn-sm px-0 ${(data.imageSize || config.imageSizes?.[0]?.value) === opt.value ? getButtonClass(config.accent) : "btn-ghost bg-base-200"}`}
                    onClick={() => updateData({ imageSize: opt.value })}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {config.hasDalleQuality && (
            <div>
              <label className="text-xs text-base-content/60 mb-1 block">质量</label>
              <div className="grid grid-cols-2 gap-1.5">
                {dalleQualityOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`btn btn-sm ${(data.quality || "standard") === opt.value ? getButtonClass(config.accent) : "btn-ghost bg-base-200"}`}
                    onClick={() => updateData({ quality: opt.value })}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {config.hasGptImageControls && (
            <>
              <div>
                <label className="text-xs text-base-content/60 mb-1 block">尺寸/比例</label>
                <Select
                  value={sizeSelectValue}
                  options={gptImageSizePresetOptions}
                  onChange={(nextValue) => {
                    const value = nextValue as GptImageSize | "custom";
                    if (value === "custom") {
                      updateData({
                        sizeMode: "custom",
                        customWidth: customDimensions.width,
                        customHeight: customDimensions.height,
                      });
                      return;
                    }

                    updateData({
                      sizeMode: "preset",
                      size: value,
                    });
                  }}
                />
                {sizeMode === "custom" && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <input
                      type="number"
                      min={16}
                      max={3840}
                      step={16}
                      className="input input-bordered input-sm w-full"
                      value={customDimensions.width}
                      onChange={(e) => updateData({
                        customWidth: Number(e.target.value),
                        sizeMode: "custom",
                      })}
                    />
                    <input
                      type="number"
                      min={16}
                      max={3840}
                      step={16}
                      className="input input-bordered input-sm w-full"
                      value={customDimensions.height}
                      onChange={(e) => updateData({
                        customHeight: Number(e.target.value),
                        sizeMode: "custom",
                      })}
                    />
                  </div>
                )}
                {sizeValidationError && (
                  <div className="flex items-start gap-2 text-warning text-xs bg-warning/10 p-2 rounded-lg mt-2">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{sizeValidationError}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-base-content/60 mb-1 block">质量</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {gptImageQualityOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`btn btn-sm px-0 ${(data.quality || "auto") === opt.value ? getButtonClass(config.accent) : "btn-ghost bg-base-200"}`}
                      onClick={() => updateData({ quality: opt.value })}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-base-content/60 mb-1 block">背景</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {getGptImageBackgroundOptions(model).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`btn btn-sm ${(data.background || "auto") === opt.value ? getButtonClass(config.accent) : "btn-ghost bg-base-200"}`}
                      onClick={() => updateData({ background: opt.value })}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-base-content/60 mb-1 block">格式</label>
                  <Select
                    value={data.outputFormat || "png"}
                    options={gptImageOutputFormatOptions}
                    onChange={(value) => updateData({
                      outputFormat: value as ImageGeneratorNodeData["outputFormat"],
                    })}
                  />
                </div>
                <div>
                  <label className="text-xs text-base-content/60 mb-1 block">审核</label>
                  <Select
                    value={data.moderation || "auto"}
                    options={gptImageModerationOptions}
                    onChange={(value) => updateData({
                      moderation: value as ImageGeneratorNodeData["moderation"],
                    })}
                  />
                </div>
              </div>
            </>
          )}

          {(config.hasGuidanceScale || config.hasWatermark) && (
            <div className="space-y-3">
              {config.hasGuidanceScale && (
                <div>
                  <label className="text-xs text-base-content/60 mb-1 block">
                    提示词相关度: {data.guidanceScale ?? 5}
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={data.guidanceScale ?? 5}
                    className="range range-xs range-info"
                    onChange={(e) => updateData({ guidanceScale: Number(e.target.value) })}
                  />
                </div>
              )}
              {config.hasWatermark && (
                <label className="flex items-center justify-between rounded-lg bg-base-200 px-3 py-2 text-sm">
                  <span>添加水印</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-sm toggle-info"
                    checked={data.watermark ?? false}
                    onChange={(e) => updateData({ watermark: e.target.checked })}
                  />
                </label>
              )}
            </div>
          )}

          {config.hasNegativePrompt && (
            <div>
              <label className="text-xs text-base-content/60 mb-1 block">负面提示词</label>
              <textarea
                className="textarea textarea-bordered textarea-sm w-full min-h-24 resize-none"
                value={data.negativePrompt || ""}
                placeholder="输入不想出现的内容..."
                onChange={(e) => updateData({ negativePrompt: e.target.value })}
              />
            </div>
          )}
        </section>

        <section className="space-y-2">
          {!isPromptConnected && (
            <div className="flex items-start gap-2 text-warning text-xs bg-warning/10 p-2 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>请连接提示词节点</span>
            </div>
          )}
          {isPromptConnected && hasEmptyImageInputs && (
            <div className="flex items-start gap-2 text-warning text-xs bg-warning/10 p-2 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>图片输入为空: {emptyImageLabels.join(", ")}</span>
            </div>
          )}
          {data.status === "error" && data.error && (
            <button
              type="button"
              className="flex w-full items-start gap-2 text-left text-error text-xs bg-error/10 p-2 rounded-lg hover:bg-error/20"
              onClick={() => setShowErrorDetail(true)}
            >
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span className="line-clamp-4 break-all">{data.error}</span>
            </button>
          )}
          {(data.outputImage || data.outputImagePath) && (
            <button
              type="button"
              className="relative group block w-full overflow-hidden rounded-lg bg-base-200"
              onClick={() => setShowPreview(true)}
            >
              <img
                src={data.outputImagePath ? getImageUrl(data.outputImagePath) : `data:image/png;base64,${data.outputImage}`}
                alt="Generated"
                className="w-full aspect-video object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Maximize2 className="w-6 h-6 text-white" />
              </div>
            </button>
          )}
        </section>
      </div>

      <div className="p-4 border-t border-base-300 bg-base-100">
        <button
          type="button"
          className={`btn w-full gap-2 ${data.status === "loading" || !isPromptConnected || sizeValidationError ? "btn-disabled" : getButtonClass(config.accent)}`}
          onClick={handleGenerate}
          disabled={data.status === "loading" || !isPromptConnected || !!sizeValidationError}
        >
          <Play className="w-4 h-4" />
          {data.status === "loading" ? `生成中${dots}` : "生成图片"}
        </button>
        <div className="mt-2 text-[11px] text-base-content/45 truncate">
          {config.label} · {config.hasGptImageControls ? resolvedSize : data.imageSize || data.aspectRatio || "自动"}
        </div>
      </div>

      {showPreview && (data.outputImage || data.outputImagePath) && (
        <ImagePreviewModal
          imageData={data.outputImage}
          imagePath={data.outputImagePath}
          onClose={() => setShowPreview(false)}
        />
      )}
      {showErrorDetail && data.error && (
        <ErrorDetailModal
          error={data.error}
          errorDetails={data.errorDetails}
          title="执行错误"
          onClose={() => setShowErrorDetail(false)}
        />
      )}
    </div>
  );
}
