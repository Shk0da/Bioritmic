export type ImageCropPreset = 'profile' | 'story' | 'message';

export interface ImageCropOptions {
  maxWidth: number;
  maxHeight: number;
  outputQuality: number;
  title: string;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export const IMAGE_CROP_PRESETS: Record<ImageCropPreset, ImageCropOptions> = {
  profile: {
    maxWidth: 1200,
    maxHeight: 1200,
    outputQuality: 0.92,
    title: 'Фото профиля',
  },
  story: {
    maxWidth: 1080,
    maxHeight: 1920,
    outputQuality: 0.9,
    title: 'История',
  },
  message: {
    maxWidth: 1080,
    maxHeight: 1350,
    outputQuality: 0.9,
    title: 'Фото в сообщение',
  },
};

export function computeImageDisplayRect(
  stageWidth: number,
  stageHeight: number,
  imageWidth: number,
  imageHeight: number,
  padding = 16
): CropRect {
  const maxWidth = Math.max(stageWidth - padding * 2, 1);
  const maxHeight = Math.max(stageHeight - padding * 2, 1);
  const scale = Math.min(maxWidth / imageWidth, maxHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;

  return {
    x: (stageWidth - width) / 2,
    y: (stageHeight - height) / 2,
    width,
    height,
  };
}

export function clampCropRect(crop: CropRect, bounds: CropRect, minSize = 48): CropRect {
  const width = clamp(crop.width, minSize, bounds.width);
  const height = clamp(crop.height, minSize, bounds.height);
  const x = clamp(crop.x, bounds.x, bounds.x + bounds.width - width);
  const y = clamp(crop.y, bounds.y, bounds.y + bounds.height - height);

  return { x, y, width, height };
}

export function moveCropRect(crop: CropRect, deltaX: number, deltaY: number, bounds: CropRect): CropRect {
  return clampCropRect(
    {
      ...crop,
      x: crop.x + deltaX,
      y: crop.y + deltaY,
    },
    bounds
  );
}

export function resizeCropRect(
  initial: CropRect,
  handle: ResizeHandle,
  deltaX: number,
  deltaY: number,
  bounds: CropRect,
  minSize = 48
): CropRect {
  let { x, y, width, height } = initial;
  const right = x + width;
  const bottom = y + height;

  if (handle.includes('e')) {
    width = right + deltaX - x;
  }
  if (handle.includes('w')) {
    const nextX = x + deltaX;
    width = right - nextX;
    x = nextX;
  }
  if (handle.includes('s')) {
    height = bottom + deltaY - y;
  }
  if (handle.includes('n')) {
    const nextY = y + deltaY;
    height = bottom - nextY;
    y = nextY;
  }

  if (width < minSize) {
    if (handle.includes('w')) {
      x = right - minSize;
    }
    width = minSize;
  }
  if (height < minSize) {
    if (handle.includes('n')) {
      y = bottom - minSize;
    }
    height = minSize;
  }

  return clampCropRect({ x, y, width, height }, bounds, minSize);
}

export function cropRectToSourceRect(
  crop: CropRect,
  imageDisplay: CropRect,
  imageWidth: number,
  imageHeight: number
): { x: number; y: number; width: number; height: number } {
  const scale = imageDisplay.width / imageWidth;
  const x = clamp((crop.x - imageDisplay.x) / scale, 0, imageWidth);
  const y = clamp((crop.y - imageDisplay.y) / scale, 0, imageHeight);
  const width = clamp(crop.width / scale, 1, imageWidth - x);
  const height = clamp(crop.height / scale, 1, imageHeight - y);

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
