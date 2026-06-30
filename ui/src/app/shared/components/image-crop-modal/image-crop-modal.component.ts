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
import {
  blobToFile,
  computeImageDisplayRect,
  computeOutputSize,
  cropImageToBlob,
  cropRectToSourceRect,
  CropRect,
  IMAGE_CROP_PRESETS,
  ImageCropPreset,
  moveCropRect,
  readImageFromFile,
  resizeCropRect,
  ResizeHandle,
} from '../../utils/image-crop.util';

@Component({
  selector: 'app-image-crop-modal',
  standalone: true,
  imports: [],
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
            (pointermove)="onStagePointerMove($event)"
            (pointerup)="onStagePointerUp($event)"
            (pointercancel)="onStagePointerUp($event)"
            (pointerleave)="onStagePointerUp($event)">
            @if (imageUrl) {
              <img
                [src]="imageUrl"
                class="crop-image"
                [style.left.px]="imageRect.x"
                [style.top.px]="imageRect.y"
                [style.width.px]="imageRect.width"
                [style.height.px]="imageRect.height"
                alt=""
                draggable="false">
            }

            <div
              class="crop-frame"
              [style.left.px]="cropRect.x"
              [style.top.px]="cropRect.y"
              [style.width.px]="cropRect.width"
              [style.height.px]="cropRect.height"
              (pointerdown)="onFramePointerDown($event)">
              <div class="crop-frame-inner"></div>
              @for (handle of resizeHandles; track handle) {
                <div
                  class="resize-handle"
                  [class]="'handle-' + handle"
                  (pointerdown)="onResizePointerDown($event, handle)">
                </div>
              }
            </div>
          </div>

          <p class="crop-hint">Перетащите рамку или потяните за края и углы</p>

          @if (errorMessage) {
            <p class="crop-error" role="alert">{{ errorMessage }}</p>
          }

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
      user-select: none;
    }

    .crop-image {
      position: absolute;
      object-fit: fill;
      pointer-events: none;
    }

    .crop-frame {
      position: absolute;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55);
      cursor: move;
      touch-action: none;
    }

    .crop-frame-inner {
      position: absolute;
      inset: 0;
      border: 2px solid rgba(255, 255, 255, 0.95);
      border-radius: 2px;
      pointer-events: none;
    }

    .resize-handle {
      position: absolute;
      width: 18px;
      height: 18px;
      background: #fff;
      border: 2px solid #fd297b;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
      z-index: 2;
    }

    .handle-nw { top: -9px; left: -9px; cursor: nwse-resize; }
    .handle-n { top: -9px; left: calc(50% - 9px); cursor: ns-resize; }
    .handle-ne { top: -9px; right: -9px; cursor: nesw-resize; }
    .handle-e { top: calc(50% - 9px); right: -9px; cursor: ew-resize; }
    .handle-se { bottom: -9px; right: -9px; cursor: nwse-resize; }
    .handle-s { bottom: -9px; left: calc(50% - 9px); cursor: ns-resize; }
    .handle-sw { bottom: -9px; left: -9px; cursor: nesw-resize; }
    .handle-w { top: calc(50% - 9px); left: -9px; cursor: ew-resize; }

    .crop-hint {
      margin: 0;
      padding: 0.75rem 1rem 0;
      font-size: 0.8rem;
      color: var(--text-secondary, #666);
      text-align: center;
    }

    .crop-error {
      margin: 0.75rem 1rem 0;
      padding: 0.65rem 0.75rem;
      border-radius: 10px;
      background: rgba(239, 68, 68, 0.12);
      color: #ef4444;
      font-size: 0.8rem;
      text-align: center;
    }

    .crop-footer {
      display: flex;
      gap: 0.75rem;
      padding: 1rem;
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

  readonly resizeHandles: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

  title = 'Обрезка фото';
  imageUrl: string | null = null;
  imageLoaded = false;
  processing = false;
  errorMessage: string | null = null;

  imageRect: CropRect = { x: 0, y: 0, width: 0, height: 0 };
  cropRect: CropRect = { x: 0, y: 0, width: 0, height: 0 };

  private imageWidth = 0;
  private imageHeight = 0;
  private objectUrl: string | null = null;
  private loadGeneration = 0;

  private interaction: 'move' | 'resize' | null = null;
  private activeHandle: ResizeHandle | null = null;
  private pointerId: number | null = null;
  private startPointerX = 0;
  private startPointerY = 0;
  private startCropRect: CropRect = { x: 0, y: 0, width: 0, height: 0 };

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
      this.updateLayout();
    }
  }

  onFramePointerDown(event: PointerEvent): void {
    if (!this.imageLoaded || event.button !== 0) {
      return;
    }
    event.stopPropagation();
    this.beginInteraction('move', event);
  }

  onResizePointerDown(event: PointerEvent, handle: ResizeHandle): void {
    if (!this.imageLoaded || event.button !== 0) {
      return;
    }
    event.stopPropagation();
    this.activeHandle = handle;
    this.beginInteraction('resize', event);
  }

  onStagePointerMove(event: PointerEvent): void {
    if (!this.interaction || this.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - this.startPointerX;
    const deltaY = event.clientY - this.startPointerY;

    if (this.interaction === 'move') {
      this.cropRect = moveCropRect(this.startCropRect, deltaX, deltaY, this.imageRect);
      return;
    }

    if (this.interaction === 'resize' && this.activeHandle) {
      this.cropRect = resizeCropRect(
        this.startCropRect,
        this.activeHandle,
        deltaX,
        deltaY,
        this.imageRect
      );
    }
  }

  onStagePointerUp(event: PointerEvent): void {
    if (this.pointerId !== event.pointerId) {
      return;
    }
    this.endInteraction(event);
  }

  async confirm(): Promise<void> {
    if (!this.sourceFile || !this.imageLoaded || this.processing) {
      return;
    }

    this.processing = true;
    this.errorMessage = null;
    const generation = this.loadGeneration;
    try {
      const options = IMAGE_CROP_PRESETS[this.preset];
      const image = await readImageFromFile(this.sourceFile);
      if (generation !== this.loadGeneration || !this.visible) {
        return;
      }

      const sourceRect = cropRectToSourceRect(
        this.cropRect,
        this.imageRect,
        this.imageWidth,
        this.imageHeight
      );
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
      this.errorMessage = 'Не удалось обрезать изображение';
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
    this.errorMessage = null;
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
        this.updateLayout();
      });
    } catch {
      if (generation !== this.loadGeneration) {
        return;
      }
      this.errorMessage = 'Не удалось открыть изображение';
      this.cancelled.emit();
      this.resetState();
    }
  }

  private updateLayout(): void {
    const stage = this.stageRef?.nativeElement;
    if (!stage || !this.imageLoaded) {
      return;
    }

    this.imageRect = computeImageDisplayRect(
      stage.clientWidth,
      stage.clientHeight,
      this.imageWidth,
      this.imageHeight
    );
    this.cropRect = { ...this.imageRect };
  }

  private beginInteraction(type: 'move' | 'resize', event: PointerEvent): void {
    this.interaction = type;
    this.pointerId = event.pointerId;
    this.startPointerX = event.clientX;
    this.startPointerY = event.clientY;
    this.startCropRect = { ...this.cropRect };
    this.stageRef?.nativeElement.setPointerCapture(event.pointerId);
  }

  private endInteraction(event: PointerEvent): void {
    if (this.stageRef?.nativeElement.hasPointerCapture(event.pointerId)) {
      this.stageRef.nativeElement.releasePointerCapture(event.pointerId);
    }
    this.interaction = null;
    this.activeHandle = null;
    this.pointerId = null;
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
    this.errorMessage = null;
    this.imageWidth = 0;
    this.imageHeight = 0;
    this.imageRect = { x: 0, y: 0, width: 0, height: 0 };
    this.cropRect = { x: 0, y: 0, width: 0, height: 0 };
    this.interaction = null;
    this.activeHandle = null;
    this.pointerId = null;
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    this.imageUrl = null;
  }
}
