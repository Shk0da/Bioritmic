import {
  clampPan,
  computeBaseScale,
  computeCropFrame,
  computeOutputSize,
  computeSourceRect,
} from './image-crop.util';

describe('image-crop.util', () => {
  it('computeCropFrame should fit aspect ratio inside stage', () => {
    const frame = computeCropFrame(400, 600, 1);
    expect(frame.width).toBe(352);
    expect(frame.height).toBe(352);
  });

  it('computeCropFrame should respect portrait aspect ratio', () => {
    const frame = computeCropFrame(360, 640, 9 / 16);
    expect(frame.width).toBeCloseTo(312, 0);
    expect(frame.height).toBeCloseTo(554.67, 0);
  });

  it('clampPan should limit offsets to image bounds', () => {
    const cropFrame = { width: 300, height: 300 };
    const result = clampPan(1000, 800, cropFrame, 1, 500, 500);
    expect(Math.abs(result.offsetX)).toBeLessThan(500);
    expect(Math.abs(result.offsetY)).toBeLessThan(500);
  });

  it('computeSourceRect should stay within image dimensions', () => {
    const cropFrame = computeCropFrame(400, 500, 1);
    const source = computeSourceRect(1200, 900, cropFrame, { scale: 1, offsetX: 0, offsetY: 0 });
    expect(source.x).toBeGreaterThanOrEqual(0);
    expect(source.y).toBeGreaterThanOrEqual(0);
    expect(source.x + source.width).toBeLessThanOrEqual(1200);
    expect(source.y + source.height).toBeLessThanOrEqual(900);
  });

  it('computeOutputSize should downscale large crops', () => {
    const output = computeOutputSize(2400, 2400, 1200, 1200);
    expect(output.width).toBe(1200);
    expect(output.height).toBe(1200);
  });

  it('computeBaseScale should cover crop frame', () => {
    const cropFrame = { width: 300, height: 300 };
    const scale = computeBaseScale(800, 600, cropFrame);
    expect(800 * scale).toBeGreaterThanOrEqual(300);
    expect(600 * scale).toBeGreaterThanOrEqual(300);
  });
});
