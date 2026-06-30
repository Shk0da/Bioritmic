import {
  clampCropRect,
  computeImageDisplayRect,
  computeOutputSize,
  cropRectToSourceRect,
  moveCropRect,
  resizeCropRect,
} from './image-crop.util';

describe('image-crop.util', () => {
  it('computeImageDisplayRect should fit entire image inside stage', () => {
    const imageRect = computeImageDisplayRect(400, 500, 1200, 900);
    expect(imageRect.width).toBe(368);
    expect(imageRect.height).toBe(276);
    expect(imageRect.x).toBe(16);
    expect(imageRect.y).toBe(112);
  });

  it('clampCropRect should keep crop inside image bounds', () => {
    const bounds = { x: 20, y: 20, width: 300, height: 200 };
    const crop = clampCropRect({ x: 0, y: 0, width: 400, height: 250 }, bounds);
    expect(crop.x).toBe(20);
    expect(crop.y).toBe(20);
    expect(crop.width).toBe(300);
    expect(crop.height).toBe(200);
  });

  it('moveCropRect should shift crop area', () => {
    const bounds = { x: 0, y: 0, width: 300, height: 300 };
    const moved = moveCropRect({ x: 50, y: 50, width: 120, height: 80 }, 20, 10, bounds);
    expect(moved.x).toBe(70);
    expect(moved.y).toBe(60);
  });

  it('resizeCropRect should change width and height independently', () => {
    const bounds = { x: 0, y: 0, width: 300, height: 300 };
    const initial = { x: 20, y: 30, width: 200, height: 180 };
    const resized = resizeCropRect(initial, 'se', 40, -20, bounds);
    expect(resized.width).toBe(240);
    expect(resized.height).toBe(160);
  });

  it('cropRectToSourceRect should map full image when crop covers display', () => {
    const imageRect = { x: 50, y: 40, width: 400, height: 300 };
    const source = cropRectToSourceRect(imageRect, imageRect, 1600, 1200);
    expect(source.x).toBe(0);
    expect(source.y).toBe(0);
    expect(source.width).toBe(1600);
    expect(source.height).toBe(1200);
  });

  it('computeOutputSize should downscale large crops', () => {
    const output = computeOutputSize(2400, 2400, 1200, 1200);
    expect(output.width).toBe(1200);
    expect(output.height).toBe(1200);
  });
});
