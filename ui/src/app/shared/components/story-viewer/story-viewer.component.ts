import { Component, EventEmitter, Input, OnInit, OnDestroy, Output, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, interval } from 'rxjs';
import { Story } from '../../../core/services/story.service';
import { StoryService } from '../../../core/services/story.service';

@Component({
  selector: 'app-story-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible && currentStory) {
      <div class="story-overlay" (click)="close()">
        <div class="story-content" (click)="$event.stopPropagation()">
          <!-- Progress bar -->
          <div class="progress-container">
            @for (story of stories; track story.id; let i = $index) {
              <div class="progress-bar" [class.active]="i < currentIndex" [class.current]="i === currentIndex">
                <div class="progress-fill" [style.width]="i === currentIndex ? progressWidth + '%' : (i < currentIndex ? '100%' : '0%')"></div>
              </div>
            }
          </div>

          <!-- User info -->
          <div class="story-header">
            <div class="user-info">
              <div class="user-avatar" [style.backgroundImage]="userPhoto ? 'url(' + userPhoto + ')' : ''">
                @if (!userPhoto) {
                  <i class="bi bi-person-fill"></i>
                }
              </div>
              <span class="user-name">{{ userName }}</span>
              <span class="story-time">{{ getTimeAgo(currentStory.createdAt) }}</span>
            </div>
            <button class="close-btn" (click)="close()">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <!-- Story image -->
          <div class="story-image" (click)="onTap($event)">
            <img [src]="currentStory.mediaUrl" alt="Story">
          </div>

          <!-- Caption -->
          @if (currentStory.caption) {
            <div class="story-caption">
              {{ currentStory.caption }}
            </div>
          }

          <!-- Viewer count -->
          <div class="story-viewers">
            <i class="bi bi-eye"></i>
            <span>{{ currentStory.viewerCount }}</span>
          </div>

          <!-- Navigation hints -->
          <div class="nav-hint left" (click)="previousStory()"></div>
          <div class="nav-hint right" (click)="nextStory()"></div>
        </div>
      </div>
    }
  `,
  styles: [`
    .story-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.95);
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

    .story-content {
      width: 100%;
      max-width: 420px;
      height: 100%;
      max-height: 100vh;
      position: relative;
      display: flex;
      flex-direction: column;
      background: #000;
    }

    .progress-container {
      display: flex;
      gap: 4px;
      padding: 12px 12px 0;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: 10;
    }

    .progress-bar {
      flex: 1;
      height: 3px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 2px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: white;
      transition: width 0.1s linear;
      border-radius: 2px;
    }

    .story-header {
      position: absolute;
      top: 20px;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      z-index: 10;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #333;
      background-size: cover;
      background-position: center;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
    }

    .user-avatar i {
      color: #999;
    }

    .user-name {
      color: white;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .story-time {
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.8rem;
    }

    .close-btn {
      background: none;
      border: none;
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 4px 8px;
      opacity: 0.8;
    }

    .close-btn:hover {
      opacity: 1;
    }

    .story-image {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .story-image img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .story-caption {
      position: absolute;
      bottom: 60px;
      left: 12px;
      right: 12px;
      color: white;
      font-size: 1rem;
      text-align: center;
      background: rgba(0, 0, 0, 0.5);
      padding: 8px 12px;
      border-radius: 8px;
    }

    .story-viewers {
      position: absolute;
      bottom: 12px;
      left: 12px;
      display: flex;
      align-items: center;
      gap: 4px;
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.85rem;
    }

    .nav-hint {
      position: absolute;
      top: 60px;
      bottom: 0;
      width: 40%;
      cursor: pointer;
    }

    .nav-hint.left {
      left: 0;
    }

    .nav-hint.right {
      right: 0;
    }
  `]
})
export class StoryViewerComponent implements OnInit, OnDestroy {
  @Input() visible = false;
  @Input() stories: Story[] = [];
  @Input() userName = '';
  @Input() userPhoto: string | null = null;
  @Output() closed = new EventEmitter<void>();

  currentIndex = 0;
  currentStory: Story | null = null;
  progressWidth = 0;

  private progressInterval$ = new Subject<void>();
  private destroy$ = new Subject<void>();
  private destroyRef = inject(DestroyRef);
  private readonly STORY_DURATION = 5000;
  private readonly PROGRESS_INTERVAL = 50;

  constructor(private storyService: StoryService) {
    this.destroyRef.onDestroy(() => {
      this.destroy$.next();
      this.destroy$.complete();
      this.progressInterval$.next();
      this.progressInterval$.complete();
    });
  }

  ngOnInit(): void {
    if (this.stories.length > 0) {
      this.showStory(0);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.progressInterval$.next();
    this.progressInterval$.complete();
  }

  showStory(index: number): void {
    if (index < 0 || index >= this.stories.length) {
      this.close();
      return;
    }

    this.currentIndex = index;
    this.currentStory = this.stories[index];
    this.progressWidth = 0;

    // Mark as viewed
    this.storyService.viewStory(this.currentStory.id).pipe(takeUntil(this.destroy$)).subscribe();

    // Start progress
    this.startProgress();
  }

  private startProgress(): void {
    this.progressInterval$.next();
    const startTime = Date.now();

    interval(this.PROGRESS_INTERVAL).pipe(takeUntil(this.progressInterval$), takeUntil(this.destroy$)).subscribe(() => {
      const elapsed = Date.now() - startTime;
      this.progressWidth = Math.min((elapsed / this.STORY_DURATION) * 100, 100);

      if (elapsed >= this.STORY_DURATION) {
        this.nextStory();
      }
    });
  }

  nextStory(): void {
    this.progressInterval$.next();
    if (this.currentIndex < this.stories.length - 1) {
      this.showStory(this.currentIndex + 1);
    } else {
      this.close();
    }
  }

  previousStory(): void {
    this.progressInterval$.next();
    if (this.currentIndex > 0) {
      this.showStory(this.currentIndex - 1);
    } else {
      this.showStory(0);
    }
  }

  onTap(event: MouseEvent): void {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const tapX = event.clientX - rect.left;
    const halfWidth = rect.width / 2;

    if (tapX < halfWidth) {
      this.previousStory();
    } else {
      this.nextStory();
    }
  }

  close(): void {
    this.progressInterval$.next();
    this.closed.emit();
  }

  getTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин.`;
    if (diffHours < 24) return `${diffHours} ч.`;
    return `${Math.floor(diffHours / 24)} дн.`;
  }
}
