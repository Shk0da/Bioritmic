import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PhotoItem {
  id?: number;
  photoOrder: number;
  contentType?: string;
  photoBytes?: number[];
  s3Key?: string;
  dataUrl?: string | null;
}

@Component({
  selector: 'app-photo-carousel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="photo-carousel" (touchstart)="onTouchStart($event)" (touchmove)="onTouchMove($event)" (touchend)="onTouchEnd()">
      <div class="carousel-track" [style.transform]="'translateX(' + translateX + 'px)'" [class.dragging]="isDragging">
        @for (photo of photos; track photo.id ?? $index) {
          <div class="carousel-slide">
            <div class="slide-photo" [style.backgroundImage]="'url(' + (photo.dataUrl || defaultPhoto) + ')'"></div>
          </div>
        }
      </div>

      <!-- Индикаторы -->
      @if (photos.length > 1) {
        <div class="carousel-dots">
          @for (photo of photos; track $index) {
            <span class="dot" [class.active]="$index === currentIndex"></span>
          }
        </div>
      }

      <!-- Навигация (десктоп) -->
      @if (photos.length > 1) {
        <button class="nav-btn nav-prev" (click)="prev($event)" [class.hidden]="currentIndex === 0">
          <i class="bi bi-chevron-left"></i>
        </button>
        <button class="nav-btn nav-next" (click)="next($event)" [class.hidden]="currentIndex === photos.length - 1">
          <i class="bi bi-chevron-right"></i>
        </button>
      }
    </div>
  `,
  styles: [`
    .photo-carousel {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      touch-action: pan-y;
    }

    .carousel-track {
      display: flex;
      height: 100%;
      transition: transform 0.3s ease-out;
      will-change: transform;
    }

    .carousel-track.dragging {
      transition: none;
    }

    .carousel-slide {
      flex: 0 0 100%;
      height: 100%;
    }

    .slide-photo {
      width: 100%;
      height: 100%;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    }

    .carousel-dots {
      position: absolute;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 6px;
      z-index: 5;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.5);
      transition: all 0.3s ease;
    }

    .dot.active {
      background: white;
      transform: scale(1.2);
    }

    .nav-btn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.4);
      border: none;
      color: white;
      font-size: 1.2rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s ease;
      z-index: 5;
    }

    .photo-carousel:hover .nav-btn {
      opacity: 1;
    }

    .nav-btn:hover {
      background: rgba(0, 0, 0, 0.6);
    }

    .nav-btn.hidden {
      display: none;
    }

    .nav-prev {
      left: 8px;
    }

    .nav-next {
      right: 8px;
    }
  `]
})
export class PhotoCarouselComponent implements OnInit {
  @Input() photos: PhotoItem[] = [];
  @Input() defaultPhoto = '';
  @Output() photoChanged = new EventEmitter<number>();

  currentIndex = 0;
  translateX = 0;
  isDragging = false;

  private startX = 0;
  private currentTranslate = 0;
  private prevTranslate = 0;
  private animationID = 0;

  ngOnInit(): void {
    this.updateTranslate();
  }

  onTouchStart(event: TouchEvent): void {
    this.startX = event.touches[0].clientX;
    this.isDragging = true;
    this.prevTranslate = -this.currentIndex * 100;
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.isDragging) return;

    const currentX = event.touches[0].clientX;
    const diff = currentX - this.startX;
    const containerWidth = (event.currentTarget as HTMLElement).offsetWidth;
    const percentDiff = (diff / containerWidth) * 100;

    this.currentTranslate = this.prevTranslate + percentDiff;
    this.translateX = (this.currentTranslate / 100) * containerWidth;
  }

  onTouchEnd(): void {
    this.isDragging = false;

    const movedBy = this.currentTranslate - this.prevTranslate;

    if (movedBy < -15 && this.currentIndex < this.photos.length - 1) {
      this.currentIndex++;
    } else if (movedBy > 15 && this.currentIndex > 0) {
      this.currentIndex--;
    }

    this.updateTranslate();
    this.photoChanged.emit(this.currentIndex);
  }

  prev(event: Event): void {
    event.stopPropagation();
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updateTranslate();
      this.photoChanged.emit(this.currentIndex);
    }
  }

  next(event: Event): void {
    event.stopPropagation();
    if (this.currentIndex < this.photos.length - 1) {
      this.currentIndex++;
      this.updateTranslate();
      this.photoChanged.emit(this.currentIndex);
    }
  }

  private updateTranslate(): void {
    this.translateX = -this.currentIndex * 100;
    this.currentTranslate = this.translateX;
    this.prevTranslate = this.translateX;
  }
}
