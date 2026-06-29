export type ImageCropPreset = 'profile' | 'story' | 'message';

export interface ImageCropOptions {
  aspectRatio: number;
  maxWidth: number;
  maxHeight: number;
  outputQuality: number;
  title: string;
}

export interface CropTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface CropFrame {
  width: number;
  height: number;
}

export const IMAGE_CROP_PRESETS: Record<ImageCropPreset, ImageCropOptions> = {
  profile: {
    aspectRatio: 1,
    maxWidth: 1200,
    maxHeight: 1200,
    outputQuality: 0.92,
    title: 'Фото профиля',
  },
  story: {
    aspectRatio: 9 / 16,
    maxWidth: 1080,
    maxHeight: 1920,
    outputQuality: 0.9,
    title: 'История',
  },
  message: {
    aspectRatio: 4 / 5,
    maxWidth: 1080,
    maxHeight: 1350,
    outputQuality: 0.9,
    title: 'Фото в сообщение',
  },
};

export function computeCropFrame(stageWidth: number, stageHeight: number, aspectRatio: number): CropFrame {
  const padding = 24;
  const maxWidth = Math.max(stageWidth - padding * 2, 1);
  const maxHeight = Math.max(stageHeight - padding * 2, 1);

  let width = maxWidth;
  let height = width / aspectRatio;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return { width, height };
}

export function computeBaseScale(imageWidth: number, imageHeight: number, cropFrame: CropFrame): number {
  return Math.max(cropFrame.width / imageWidth, cropFrame.height / imageHeight);
}

export function clampPan(
  imageWidth: number,
  imageHeight: number,
  cropFrame: CropFrame,
  scale: number,
  offsetX: number,
  offsetY: number
): CropTransform {
  const baseScale = computeBaseScale(imageWidth, imageHeight, cropFrame);
  const displayWidth = imageWidth * baseScale * scale;
  const displayHeight = imageHeight * baseScale * scale;

  const maxOffsetX = Math.max((displayWidth - cropFrame.width) / 2, 0);
  const maxOffsetY = Math.max((displayHeight - cropFrame.height) / 2, 0);

  return {
    scale,
    offsetX: clamp(offsetX, -maxOffsetX, maxOffsetX),
    offsetY: clamp(offsetY, -maxOffsetY, maxOffsetY),
  };
}

export function computeSourceRect(
  imageWidth: number,
  imageHeight: number,
  cropFrame: CropFrame,
  transform: CropTransform
): { x: number; y: number; width: number; height: number } {
  const baseScale = computeBaseScale(imageWidth, imageHeight, cropFrame);
  const displayScale = baseScale * transform.scale;
  const displayWidth = imageWidth * displayScale;
  const displayHeight = imageHeight * displayScale;

  const imageLeft = -displayWidth / 2 + transform.offsetX;
  const imageTop = -displayHeight / 2 + transform.offsetY;
  const cropLeft = -cropFrame.width / 2;
  const cropTop = -cropFrame.height / 2;

  const sourceX = (cropLeft - imageLeft) / displayScale;
  const sourceY = (cropTop - imageTop) / displayScale;
  const sourceWidth = cropFrame.width / displayScale;
  const sourceHeight = cropFrame.height / displayScale;

  const x = clamp(sourceX, 0, imageWidth);
  const y = clamp(sourceY, 0, imageHeight);
  const width = clamp(sourceWidth, 1, imageWidth - x);
  const height = clamp(sourceHeight, 1, imageHeight - y);

  return { x, y, width, height };
}

export function computeOutputSize(
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const ratio = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight, 1);
  return {
    width: Math.max(Math.round(sourceWidth * ratio), 1),
    height: Math.max(Math.round(sourceHeight * ratio), 1),
  };
}

export function readImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Не удалось загрузить изображение'));
    };
    image.src = objectUrl;
  });
}

export function cropImageToBlob(
  image: HTMLImageElement,
  sourceRect: { x: number; y: number; width: number; height: number },
  outputSize: { width: number; height: number },
  mimeType = 'image/jpeg',
  quality = 0.9
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = outputSize.width;
    canvas.height = outputSize.height;
    const context = canvas.getContext('2d');
    if (!context) {
      reject(new Error('Canvas недоступен'));
      return;
    }

    context.drawImage(
      image,
      sourceRect.x,
      sourceRect.y,
      sourceRect.width,
      sourceRect.height,
      0,
      0,
      outputSize.width,
      outputSize.height
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Не удалось обрезать изображение'));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality
    );
  });
}

export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type || 'image/jpeg' });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
