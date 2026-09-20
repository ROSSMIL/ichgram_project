export const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

export default async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) {
    return null;
  }

  const cropX = pixelCrop?.x ?? 0;
  const cropY = pixelCrop?.y ?? 0;
  const cropWidth = pixelCrop?.width || image.naturalWidth;
  const cropHeight = pixelCrop?.height || image.naturalHeight;

  const MAX_SIZE = 1920;
  let targetWidth = cropWidth;
  let targetHeight = cropHeight;

  if (targetWidth > MAX_SIZE || targetHeight > MAX_SIZE) {
    if (targetWidth > targetHeight) {
      targetHeight = Math.round((targetHeight * MAX_SIZE) / targetWidth);
      targetWidth = MAX_SIZE;
    } else {
      targetWidth = Math.round((targetWidth * MAX_SIZE) / targetHeight);
      targetHeight = MAX_SIZE;
    }
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(
    image,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    targetWidth,
    targetHeight,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          resolve(reader.result);
        };
      },
      "image/jpeg",
      0.88,
    );
  });
}
