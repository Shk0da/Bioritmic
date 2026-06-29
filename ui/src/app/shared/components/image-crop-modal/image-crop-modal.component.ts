import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  blobToFile,
  clampPan,
  computeBaseScale,
  computeCropFrame,
  computeOutputSize,
  computeSourceRect,
  cropImageToBlob,
  IMAGE_CROP_PRESETS,
  ImageCropPreset,
  readImageFromFile,
} from '../../utils/image-crop.util';

@Component({
  selector: 'app-image-crop-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (visible) {
      <div class="crop-overlay" (click)="cancel()">
        <div class="crop-dialog" (click)="$event.stopPropagation()">
          <div class="crop-header">
            <h5>{{ title }}</h5>
            <button type="button" class="btn-close" aria-label="Закрыть" (click)="cancel()"></button>
          </div>

          <div
            #stage
            class="crop-stage"
            (pointerdown)="onPointerDown($event)"
            (pointermove)="onPointerMove($event)"
            (pointerup)="onPointerUp($event)"
            (pointercancel)="onPointerUp($event)"
            (pointerleave)="onPointerUp($event)">
            @if (imageUrl) {
              <img
                #preview
                [src]="imageUrl"
                class="crop-image"
                [style.transform]="imageTransform"
                alt=""
                draggable="false">
            }
            <div class="crop-frame" [style.width.px]="cropFrame.width" [style.height.px]="cropFrame.height"></div>
          </div>

          <div class="crop-controls">
            <label for="crop-zoom">Масштаб</label>
            <input
              id="crop-zoom"
              type="range"
              min="1"
              max="3"
              step="0.01"
              [(ngModel)]="scale"
              (ngModelChange)="onScaleChange()">
          </div>

          <div class="crop-footer">
            <button type="button" class="btn btn-secondary" (click)="cancel()" [disabled]="processing">
              Отмена
            </button>
            <button type="button" class="btn btn-primary" (click)="confirm()" [disabled]="processing || !imageLoaded">
              @if (processing) {
                <span class="spinner-border spinner-border-sm me-2"></span>
              }
              Применить
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .crop-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 11000;
      padding: 1rem;
      padding-top: calc(1rem + env(safe-area-inset-top));
      padding-bottom: calc(1rem + env(safe-area-inset-bottom));
    }

    .crop-dialog {
      width: min(100%, 420px);
      background: var(--card-bg, #fff);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
    }

    .crop-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-bottom: 1px solid var(--border-color, #eee);
    }

    .crop-header h5 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary, #111);
    }

    .crop-stage {
      position: relative;
      width: 100%;
      height: min(62vh, 520px);
      background: #111;
      overflow: hidden;
      touch-action: none;
      cursor: grab;
      user-select: none;
    }

    .crop-stage:active {
      cursor: grabbing;
    }

    .crop-image {
      position: absolute;
      top: 50%;
      left: 50%;
      transform-origin: center center;
      max-width: none;
      max-height: none;
      pointer-events: none;
    }

    .crop-frame {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      border: 2px solid rgba(255, 255, 255, 0.95);
      border-radius: 4px;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55);
      pointer-events: none;
    }

    .crop-controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      border-top: 1px solid var(--border-color, #eee);
    }

    .crop-controls label {
      font-size: 0.85rem;
      color: var(--text-secondary, #666);
      white-space: nowrap;
    }

    .crop-controls input[type='range'] {
      flex: 1;
    }

    .crop-footer {
      display: flex;
      gap: 0.75rem;
      padding: 0 1rem 1rem;
    }

    .crop-footer .btn {
      flex: 1;
      border-radius: 10px;
      font-weight: 600;
      padding: 0.65rem 1rem;
    }

    .crop-footer .btn-primary {
      background: linear-gradient(135deg, #fd297b 0%, #ff655b 100%);
      border: none;
      color: #fff;
    }
  `],
})
export class ImageCropModalComponent implements OnChanges, OnDestroy {
  @Input() visible = false;
  @Input() sourceFile: File | null = null;
  @Input() preset: ImageCropPreset = 'profile';

  @Output() confirmed = new EventEmitter<File>();
  @Output() cancelled = new EventEmitter<void>();

  @ViewChild('stage') stageRef?: ElementRef<HTMLElement>;
  @ViewChild('preview') previewRef?: ElementRef<HTMLImageElement>;

  title = 'Обрезка фото';
  imageUrl: string | null = null;
  imageLoaded = false;
  processing = false;

  cropFrame = { width: 280, height: 280 };
  scale = 1;
  offsetX = 0;
  offsetY = 0;
  imageTransform = 'translate(-50%, -50%)';

  private imageWidth = 0;
  private imageHeight = 0;
  private dragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragOriginX = 0;
  private dragOriginY = 0;
  private objectUrl: string | null = null;
  private loadGeneration = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] || changes['sourceFile'] || changes['preset']) {
      if (this.visible && this.sourceFile) {
        void this.loadSource();
      } else if (!this.visible) {
        this.resetState();
      }
    }
  }

  ngOnDestroy(): void {
    this.resetState();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.visible && this.imageLoaded) {
      this.updateCropFrame();
      this.applyTransform();
    }
  }

  onScaleChange(): void {
    this.applyTransform();
  }

  onPointerDown(event: PointerEvent): void {
    if (!this.imageLoaded) {
      return;
    }
    this.dragging = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.dragOriginX = this.offsetX;
    this.dragOriginY = this.offsetY;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.dragging) {
      return;
    }
    const next = clampPan(
      this.imageWidth,
      this.imageHeight,
      this.cropFrame,
      this.scale,
      this.dragOriginX + (event.clientX - this.dragStartX),
      this.dragOriginY + (event.clientY - this.dragStartY)
    );
    this.offsetX = next.offsetX;
    this.offsetY = next.offsetY;
    this.applyTransform();
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.dragging) {
      return;
    }
    this.dragging = false;
    if (event.currentTarget instanceof HTMLElement && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  async confirm(): Promise<void> {
    if (!this.sourceFile || !this.imageLoaded || this.processing) {
      return;
    }

    this.processing = true;
    const generation = this.loadGeneration;
    try {
      const options = IMAGE_CROP_PRESETS[this.preset];
      const image = await readImageFromFile(this.sourceFile);
      if (generation !== this.loadGeneration || !this.visible) {
        return;
      }
      const sourceRect = computeSourceRect(this.imageWidth, this.imageHeight, this.cropFrame, {
        scale: this.scale,
        offsetX: this.offsetX,
        offsetY: this.offsetY,
      });
      const outputSize = computeOutputSize(
        sourceRect.width,
        sourceRect.height,
        options.maxWidth,
        options.maxHeight
      );
      const blob = await cropImageToBlob(
        image,
        sourceRect,
        outputSize,
        'image/jpeg',
        options.outputQuality
      );
      const filename = this.toJpegFilename(this.sourceFile.name);
      if (generation !== this.loadGeneration || !this.visible) {
        return;
      }
      this.confirmed.emit(blobToFile(blob, filename));
    } catch {
      alert('Не удалось обрезать изображение');
    } finally {
      this.processing = false;
    }
  }

  cancel(): void {
    if (this.processing) {
      return;
    }
    this.cancelled.emit();
    this.resetState();
  }

  private async loadSource(): Promise<void> {
    const generation = ++this.loadGeneration;
    this.resetState(false);
    if (!this.sourceFile) {
      return;
    }

    const options = IMAGE_CROP_PRESETS[this.preset];
    this.title = options.title;

    this.objectUrl = URL.createObjectURL(this.sourceFile);
    this.imageUrl = this.objectUrl;

    try {
      const image = await readImageFromFile(this.sourceFile);
      if (generation !== this.loadGeneration) {
        return;
      }
      this.imageWidth = image.naturalWidth;
      this.imageHeight = image.naturalHeight;
      this.imageLoaded = true;
      setTimeout(() => {
        if (generation !== this.loadGeneration) {
          return;
        }
        this.updateCropFrame();
        this.applyTransform();
      });
    } catch {
      if (generation !== this.loadGeneration) {
        return;
      }
      alert('Не удалось открыть изображение');
      this.cancelled.emit();
      this.resetState();
    }
  }

  private updateCropFrame(): void {
    const stage = this.stageRef?.nativeElement;
    if (!stage) {
      return;
    }
    const options = IMAGE_CROP_PRESETS[this.preset];
    this.cropFrame = computeCropFrame(stage.clientWidth, stage.clientHeight, options.aspectRatio);
  }

  private applyTransform(): void {
    const clamped = clampPan(
      this.imageWidth,
      this.imageHeight,
      this.cropFrame,
      this.scale,
      this.offsetX,
      this.offsetY
    );
    this.scale = clamped.scale;
    this.offsetX = clamped.offsetX;
    this.offsetY = clamped.offsetY;

    const baseScale = computeBaseScale(this.imageWidth, this.imageHeight, this.cropFrame);
    const displayScale = baseScale * this.scale;
    const displayWidth = this.imageWidth * displayScale;
    const displayHeight = this.imageHeight * displayScale;

    this.imageTransform =
      `translate(calc(-50% + ${this.offsetX}px), calc(-50% + ${this.offsetY}px)) ` +
      `scale(${displayScale})`;

    const preview = this.previewRef?.nativeElement;
    if (preview) {
      preview.style.width = `${this.imageWidth}px`;
      preview.style.height = `${this.imageHeight}px`;
    }
  }

  private toJpegFilename(filename: string): string {
    const base = filename.replace(/\.[^.]+$/, '') || 'photo';
    return `${base}.jpg`;
  }

  private resetState(revokeUrl = true): void {
    if (revokeUrl) {
      this.loadGeneration++;
    }
    this.imageLoaded = false;
    this.processing = false;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.imageWidth = 0;
    this.imageHeight = 0;
    this.dragging = false;
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    this.imageUrl = null;
  }
}
