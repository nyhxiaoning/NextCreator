export { PromptNode } from "./PromptNode";
export { ImageGeneratorNode } from "./ImageGeneratorNode";
export { ImageInputNode } from "./ImageInputNode";
export { VideoGeneratorNode } from "./VideoGeneratorNode";
export { VeoGeneratorNode } from "./VeoGeneratorNode";
export { KlingGeneratorNode } from "./KlingGeneratorNode";
export { PPTContentNode } from "./PPTContentNode";
export { PPTAssemblerNode } from "./PPTAssemblerNode";
export { LLMContentNode } from "./LLMContentNode";
export { FileUploadNode } from "./FileUploadNode";

import { InteractionNodeShell } from "@/components/canvas/InteractionNodeShell";

// 节点类型映射
export const nodeTypes = {
  promptNode: InteractionNodeShell,
  imageGeneratorNode: InteractionNodeShell,
  imageInputNode: InteractionNodeShell,
  videoGeneratorNode: InteractionNodeShell,
  veoGeneratorNode: InteractionNodeShell,
  klingGeneratorNode: InteractionNodeShell,
  pptContentNode: InteractionNodeShell,
  pptAssemblerNode: InteractionNodeShell,
  llmContentNode: InteractionNodeShell,
  fileUploadNode: InteractionNodeShell,
};
