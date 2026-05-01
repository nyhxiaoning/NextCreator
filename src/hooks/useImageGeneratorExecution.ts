import { useCallback, useRef } from "react";
import { editImage, generateImage } from "@/services/imageGeneration";
import { saveImage, type InputImageInfo } from "@/services/fileStorageService";
import { useCanvasStore } from "@/stores/canvasStore";
import { useFlowStore } from "@/stores/flowStore";
import type { ImageInputNodeData } from "@/types";
import type { ImageGeneratorNodeData } from "@/components/nodes/imageGeneratorConfig";
import {
  buildImageGenerationRequest,
  defaultImageEngine,
  getImageEngineConfig,
  getResolvedGptImageSize,
  validateGptImage2Size,
} from "@/components/nodes/imageGeneratorConfig";
import { compositeWithMask } from "@/utils/imageMask";

export function useImageGeneratorExecution(id: string, data: ImageGeneratorNodeData) {
  const {
    updateNodeData,
    getConnectedInputDataAsync,
    getConnectedImagesWithInfo,
    getConnectedImagesWithInfoAsync,
  } = useFlowStore();
  const canvasIdRef = useRef<string | null>(null);

  const engine = data.engine || defaultImageEngine;
  const config = getImageEngineConfig(engine);
  const model = data.model || config.defaultModel;
  const resolvedSize = getResolvedGptImageSize(data);
  const sizeValidationError = config.hasGptImageControls && model === "gpt-image-2"
    ? validateGptImage2Size(resolvedSize)
    : undefined;

  const updateNodeDataWithCanvas = useCallback(
    (nodeId: string, nodeData: Partial<ImageGeneratorNodeData>) => {
      const { activeCanvasId } = useCanvasStore.getState();
      const targetCanvasId = canvasIdRef.current;

      updateNodeData<ImageGeneratorNodeData>(nodeId, nodeData);

      if (targetCanvasId && targetCanvasId !== activeCanvasId) {
        const canvasStore = useCanvasStore.getState();
        const canvas = canvasStore.canvases.find((c) => c.id === targetCanvasId);

        if (canvas) {
          const updatedNodes = canvas.nodes.map((node) => {
            if (node.id === nodeId) {
              return { ...node, data: { ...node.data, ...nodeData } };
            }
            return node;
          });

          useCanvasStore.setState((state) => ({
            canvases: state.canvases.map((c) =>
              c.id === targetCanvasId ? { ...c, nodes: updatedNodes, updatedAt: Date.now() } : c
            ),
          }));
        }
      }
    },
    [updateNodeData]
  );

  const handleGenerate = useCallback(async () => {
    const { prompt } = await getConnectedInputDataAsync(id);
    const connectedImageDetails = await getConnectedImagesWithInfoAsync(id);
    const orderedImageDetails = [...connectedImageDetails].sort((a, b) => {
      return Number(!!b.hasMask && !!b.maskImageData) - Number(!!a.hasMask && !!a.maskImageData);
    });
    const inputImages = config.supportsImageInput
      ? orderedImageDetails.map((img) => img.imageData).filter(Boolean)
      : [];
    const maskImage = config.hasGptImageControls
      ? orderedImageDetails.find((img) => img.hasMask && img.maskImageData)?.maskImageData
      : undefined;
    const { activeCanvasId } = useCanvasStore.getState();
    canvasIdRef.current = activeCanvasId;

    if (!prompt) {
      updateNodeDataWithCanvas(id, {
        status: "error",
        error: "请连接提示词节点",
        errorDetails: undefined,
      });
      return;
    }

    if (sizeValidationError) {
      updateNodeDataWithCanvas(id, {
        status: "error",
        error: sizeValidationError,
        errorDetails: undefined,
      });
      return;
    }

    updateNodeDataWithCanvas(id, { status: "loading", error: undefined });

    try {
      let finalPrompt = prompt;
      if (!config.hasGptImageControls && inputImages.length > 0) {
        const hasMaskInput = connectedImageDetails.some((img) => img.hasMask);
        if (hasMaskInput) {
          finalPrompt = `I'm providing two images: the original image and the same image with red highlighted areas marking the regions I want you to edit. Please edit ONLY the red-marked areas according to this instruction: ${prompt}`;
        }

        for (const img of orderedImageDetails) {
          if (!img.hasMask || !img.maskImageData || !img.imageData) continue;
          try {
            inputImages.push(await compositeWithMask(img.imageData, img.maskImageData));
          } catch {
            inputImages.push(img.maskImageData);
          }
        }
      }

      const request = buildImageGenerationRequest(
        { ...data, engine, model },
        finalPrompt,
        inputImages.length > 0 ? inputImages : undefined,
        maskImage
      );

      const response = inputImages.length > 0 || maskImage
        ? await editImage(request, config.providerKey)
        : await generateImage(request, config.providerKey);

      if (response.imageData) {
        if (activeCanvasId) {
          try {
            const connectedImages = getConnectedImagesWithInfo(id);
            const inputImagesMetadata: InputImageInfo[] = [];

            for (const img of connectedImages) {
              let imagePath = img.imagePath;
              if (!imagePath && img.imageData) {
                try {
                  const inputImageInfo = await saveImage(
                    img.imageData,
                    activeCanvasId,
                    img.id,
                    undefined,
                    undefined,
                    "input"
                  );
                  imagePath = inputImageInfo.path;
                  updateNodeData<ImageInputNodeData>(img.id, { imagePath: inputImageInfo.path });
                } catch (err) {
                  console.warn("保存输入图片失败:", err);
                }
              }

              if (imagePath) {
                inputImagesMetadata.push({ path: imagePath, label: img.fileName || "输入图片" });
              }
            }

            const imageInfo = await saveImage(
              response.imageData,
              activeCanvasId,
              id,
              prompt,
              inputImagesMetadata.length > 0 ? inputImagesMetadata : undefined,
              "generated"
            );

            updateNodeDataWithCanvas(id, {
              status: "success",
              outputImage: undefined,
              outputImagePath: imageInfo.path,
              error: undefined,
            });
          } catch (saveError) {
            console.warn("文件保存失败，回退到 base64 存储:", saveError);
            updateNodeDataWithCanvas(id, {
              status: "success",
              outputImage: response.imageData,
              outputImagePath: undefined,
              error: undefined,
            });
          }
        } else {
          updateNodeDataWithCanvas(id, {
            status: "success",
            outputImage: response.imageData,
            outputImagePath: undefined,
            error: undefined,
          });
        }
      } else if (response.error) {
        updateNodeDataWithCanvas(id, {
          status: "error",
          error: response.error,
          errorDetails: response.errorDetails,
        });
      } else {
        updateNodeDataWithCanvas(id, {
          status: "error",
          error: "未返回图片数据",
          errorDetails: undefined,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "生成失败";
      updateNodeDataWithCanvas(id, {
        status: "error",
        error: message,
        errorDetails: undefined,
      });
    }
  }, [
    id,
    data,
    engine,
    model,
    config,
    sizeValidationError,
    updateNodeDataWithCanvas,
    getConnectedInputDataAsync,
    getConnectedImagesWithInfo,
    getConnectedImagesWithInfoAsync,
    updateNodeData,
  ]);

  return {
    handleGenerate,
    model,
    resolvedSize,
    sizeValidationError,
  };
}
