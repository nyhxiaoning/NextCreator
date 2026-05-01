import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  AlertCircle,
  AlertTriangle,
  CircleAlert,
  ImageIcon,
  Maximize2,
  Play,
} from "lucide-react";
import { getImageUrl } from "@/services/fileStorageService";
import { ErrorDetailModal } from "@/components/ui/ErrorDetailModal";
import { ImagePreviewModal } from "@/components/ui/ImagePreviewModal";
import { ModelSelector } from "@/components/ui/ModelSelector";
import { useLoadingDots } from "@/hooks/useLoadingDots";
import { useImageGeneratorExecution } from "@/hooks/useImageGeneratorExecution";
import { useNodeConnectionStatus } from "@/hooks/useNodeConnectionStatus";
import { useFlowStore } from "@/stores/flowStore";
import type {
  ImageGeneratorNodeData,
  ImageGeneratorEngine,
  ImageGeneratorNode as ImageGeneratorNodeType,
} from "./imageGeneratorConfig";
import {
  defaultImageEngine,
  getDefaultImageGeneratorData,
  getImageEngineConfig,
  getImageModelDisplayName,
  getResolvedGptImageSize,
  imageEngineOptions,
} from "./imageGeneratorConfig";

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

function ImageGeneratorNodeBase({ id, data, selected }: NodeProps<ImageGeneratorNodeType>) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const [showPreview, setShowPreview] = useState(false);
  const [showErrorDetail, setShowErrorDetail] = useState(false);
  const isOverlay = data.__renderOverlay === true;

  const engine = data.engine || defaultImageEngine;
  const config = getImageEngineConfig(engine);
  const { handleGenerate, model, resolvedSize, sizeValidationError } = useImageGeneratorExecution(id, data);
  const dots = useLoadingDots(data.status === "loading");
  const { isPromptConnected, hasEmptyImageInputs, emptyImageLabels } = useNodeConnectionStatus(id);
  const gptImageSize = resolvedSize;
  const canGenerate = data.status !== "loading" && isPromptConnected && !sizeValidationError;

  const handleEngineChange = (value: string) => {
    const nextEngine = value as ImageGeneratorEngine;
    const nextDefaults = getDefaultImageGeneratorData(nextEngine);
    updateNodeData<ImageGeneratorNodeData>(id, {
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
    updateNodeData<ImageGeneratorNodeData>(id, {
      model: value,
      background: value === "gpt-image-2" && data.background === "transparent" ? "auto" : data.background,
    });
  };

  return (
    <>
      <div
        className={`
          w-[240px] rounded-xl bg-base-100 shadow-lg border-2 transition-all
          ${selected ? "border-primary shadow-primary/20" : "border-base-300"}
        `}
      >
        {!isOverlay && (
          <>
            <Handle
              type="target"
              position={Position.Left}
              id="input-prompt"
              style={{ top: "30%" }}
              className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white"
            />
            <div
              className="absolute -left-9 text-[10px] text-base-content/50 tooltip tooltip-left"
              style={{ top: "30%", transform: "translateY(-100%)" }}
              data-tip="支持多个输入，将自动拼接"
            >
              提示词
            </div>
            <Handle
              type="target"
              position={Position.Left}
              id="input-image"
              style={{ top: "70%" }}
              className="!w-3 !h-3 !bg-green-500 !border-2 !border-white"
            />
            <div
              className="absolute -left-9 text-[10px] text-base-content/50"
              style={{ top: "70%", transform: "translateY(-100%)" }}
            >
              参考图
            </div>
          </>
        )}

        <div className={`flex items-center justify-between px-3 py-2 ${config.headerClass} rounded-t-lg`}>
          <div className="flex items-center gap-2 min-w-0">
            <ImageIcon className="w-4 h-4 text-white flex-shrink-0" />
            <span className="text-sm font-medium text-white truncate">{data.label || "绘图生成"}</span>
          </div>
          <div className="flex items-center gap-1">
            {!isPromptConnected && (
              <div className="tooltip tooltip-left" data-tip="请连接提示词节点">
                <CircleAlert className="w-4 h-4 text-white/80" />
              </div>
            )}
            {isPromptConnected && hasEmptyImageInputs && (
              <div className="tooltip tooltip-left" data-tip={`图片输入为空: ${emptyImageLabels.join(", ")}`}>
                <AlertTriangle className="w-4 h-4 text-yellow-300" />
              </div>
            )}
          </div>
        </div>

        <div className="p-2 space-y-2 nodrag">
          <div>
            <label className="text-xs text-base-content/60 mb-0.5 block">绘图引擎</label>
            <select
              className="select select-bordered select-xs w-full"
              value={engine}
              onChange={(e) => handleEngineChange(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {imageEngineOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <ModelSelector
            value={model}
            options={config.presetModels}
            onChange={handleModelChange}
            variant={getModelSelectorVariant(config.accent)}
            allowCustom={true}
            modelCategory="imageGenerator"
          />

          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <div className="rounded-md bg-base-200 px-2 py-1">
              <div className="text-base-content/45">引擎</div>
              <div className="truncate font-medium">{config.shortLabel}</div>
            </div>
            <div className="rounded-md bg-base-200 px-2 py-1">
              <div className="text-base-content/45">尺寸</div>
              <div className="truncate font-medium">
                {config.hasGptImageControls ? gptImageSize : data.imageSize || data.aspectRatio || "自动"}
              </div>
            </div>
          </div>

          {sizeValidationError && (
            <div className="flex items-start gap-2 text-warning text-xs bg-warning/10 p-2 rounded">
              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span className="line-clamp-2 break-all">{sizeValidationError}</span>
            </div>
          )}

          <button
            className={`btn btn-sm w-full gap-2 ${canGenerate ? getButtonClass(config.accent) : "btn-disabled"}`}
            onClick={handleGenerate}
            onPointerDown={(e) => e.stopPropagation()}
            disabled={!canGenerate}
          >
            {data.status === "loading" ? (
              <span>生成中{dots}</span>
            ) : !isPromptConnected ? (
              <span className="text-base-content/50">待连接提示词</span>
            ) : (
              <>
                <Play className="w-4 h-4" />
                生成图片
              </>
            )}
          </button>

          {data.status === "error" && data.error && (
            <div
              className="flex items-start gap-2 text-error text-xs bg-error/10 p-2 rounded cursor-pointer hover:bg-error/20 transition-colors"
              onClick={() => setShowErrorDetail(true)}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span className="line-clamp-3 break-all">{data.error}</span>
            </div>
          )}

          {(data.outputImage || data.outputImagePath) && (
            <div
              className="relative group cursor-pointer"
              onClick={() => setShowPreview(true)}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="w-full h-[120px] overflow-hidden rounded-lg bg-base-200">
                <img
                  src={data.outputImagePath ? getImageUrl(data.outputImagePath) : `data:image/png;base64,${data.outputImage}`}
                  alt="Generated"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <Maximize2 className="w-6 h-6 text-white" />
              </div>
            </div>
          )}
        </div>

        {!isOverlay && (
          <Handle
            type="source"
            position={Position.Right}
            id="output-image"
            className={`!w-3 !h-3 ${config.outputHandleClass} !border-2 !border-white`}
          />
        )}
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
    </>
  );
}

export const ImageGeneratorNode = memo(ImageGeneratorNodeBase);
ImageGeneratorNode.displayName = "ImageGeneratorNode";

export function getImageGeneratorInspectorSummary(data: ImageGeneratorNodeData) {
  const config = getImageEngineConfig(data.engine);
  return {
    engineLabel: config.label,
    modelLabel: getImageModelDisplayName(data),
    sizeLabel: config.hasGptImageControls
      ? getResolvedGptImageSize(data)
      : data.imageSize || data.aspectRatio || "自动",
  };
}
