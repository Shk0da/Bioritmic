import { Component, EventEmitter, Input, OnDestroy, Output, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { StoryService } from '../../../core/services/story.service';

@Component({
  selector: 'app-story-creator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (visible) {
      <div class="creator-overlay" (click)="close()">
        <div class="creator-content" (click)="$event.stopPropagation()">
          <div class="creator-header">
            <h5>Новая история</h5>
            <button class="btn-close" (click)="close()"></button>
          </div>

          <div class="creator-body">
            @if (!previewUrl) {
              <div class="file-upload" (click)="fileInput.click()">
                <i class="bi bi-image"></i>
                <p>Нажмите для выбора фото</p>
                <span class="text-muted">JPG, PNG до 5MB</span>
              </div>
              <input
                #fileInput
                type="file"
                accept="image/*"
                (change)="onFileSelected($event)"
                style="display: none"
              >
            } @else {
              <div class="preview-container">
                <img [src]="previewUrl" alt="Preview" class="preview-image">
                <button class="remove-preview" (click)="removePreview()">
                  <i class="bi bi-x-lg"></i>
                </button>
              </div>
            }

            <div class="caption-input">
              <input
                type="text"
                [(ngModel)]="caption"
                placeholder="Добавить подпись..."
                maxlength="500"
                class="form-control"
              >
            </div>
          </div>

          <div class="creator-footer">
            <button class="btn btn-secondary" (click)="close()">Отмена</button>
            <button
              class="btn btn-primary"
              (click)="publish()"
              [disabled]="!selectedFile || uploading"
            >
              @if (uploading) {
                <span class="spinner-border spinner-border-sm me-2"></span>
              }
              Опубликовать
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .creator-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .creator-content {
      background: var(--card-bg, white);
      border-radius: 16px;
      width: 90%;
      max-width: 400px;
      overflow: hidden;
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .creator-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-color, #eee);
    }

    .creator-header h5 {
      margin: 0;
      font-weight: 600;
      color: var(--text-primary);
    }

    .creator-body {
      padding: 20px;
    }

    .file-upload {
      border: 2px dashed var(--border-color, #ddd);
      border-radius: 12px;
      padding: 40px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .file-upload:hover {
      border-color: var(--accent-blue, #4a90d9);
      background: var(--bg-secondary, #f8f9fa);
    }

    .file-upload i {
      font-size: 3rem;
      color: var(--text-muted, #ccc);
      margin-bottom: 12px;
    }

    .file-upload p {
      margin: 0 0 4px;
      color: var(--text-secondary, #666);
    }

    .preview-container {
      position: relative;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 16px;
    }

    .preview-image {
      width: 100%;
      max-height: 300px;
      object-fit: contain;
      background: var(--bg-secondary, #f0f0f0);
    }

    .remove-preview {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.6);
      border: none;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
    }

    .caption-input {
      margin-top: 12px;
    }

    .caption-input input {
      border-radius: 8px;
      padding: 10px 14px;
    }

    .creator-footer {
      display: flex;
      gap: 12px;
      padding: 16px 20px;
      border-top: 1px solid var(--border-color, #eee);
    }

    .creator-footer .btn {
      flex: 1;
      padding: 10px;
      border-radius: 8px;
      font-weight: 500;
    }
  `]
})
export class StoryCreatorComponent implements OnDestroy {
  @Input() visible = false;
  @Output() closed = new EventEmitter<void>();
  @Output() storyCreated = new EventEmitter<void>();

  selectedFile: File | null = null;
  previewUrl: string | null = null;
  caption = '';
  uploading = false;

  private destroy$ = new Subject<void>();
  private destroyRef = inject(DestroyRef);

  constructor(private storyService: StoryService) {
    this.destroyRef.onDestroy(() => this.destroy$.next());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl = reader.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  removePreview(): void {
    this.selectedFile = null;
    this.previewUrl = null;
  }

  publish(): void {
    if (!this.selectedFile) return;

    this.uploading = true;

    // For now, we send the file as base64 data URL
    // In production, you'd upload to S3 first and send the URL
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.storyService.createStory(dataUrl, this.caption || undefined)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.uploading = false;
            this.storyCreated.emit();
            this.close();
          },
          error: () => {
            this.uploading = false;
          }
        });
    };
    reader.readAsDataURL(this.selectedFile);
  }

  close(): void {
    this.selectedFile = null;
    this.previewUrl = null;
    this.caption = '';
    this.closed.emit();
  }
}
