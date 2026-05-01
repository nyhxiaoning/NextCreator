export function compositeWithMask(originalBase64: string, maskBase64: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const originalImage = new Image();
    originalImage.onload = () => {
      const maskImage = new Image();
      maskImage.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = originalImage.naturalWidth;
        canvas.height = originalImage.naturalHeight;

        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("无法创建图片合成画布"));
          return;
        }

        context.drawImage(originalImage, 0, 0);
        context.drawImage(maskImage, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png").split(",")[1]);
      };
      maskImage.onerror = reject;
      maskImage.src = `data:image/png;base64,${maskBase64}`;
    };
    originalImage.onerror = reject;
    originalImage.src = `data:image/png;base64,${originalBase64}`;
  });
}
