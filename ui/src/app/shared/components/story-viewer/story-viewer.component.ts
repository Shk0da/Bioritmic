import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil, interval } from 'rxjs';
import { STORY_REACTIONS, Story, StoryReactionCounts, StoryReactionType, StoryService } from '../../../core/services/story.service';

@Component({
  selector: 'app-story-viewer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (visible && currentStory) {
      <div class="story-overlay" (click)="close()">
        <div class="story-content" (click)="$event.stopPropagation()">
          <div class="progress-container">
            @for (story of stories; track story.id; let i = $index) {
              <div class="progress-bar" [class.active]="i < currentIndex" [class.current]="i === currentIndex">
                <div class="progress-fill" [style.width]="i === currentIndex ? progressWidth + '%' : (i < currentIndex ? '100%' : '0%')"></div>
              </div>
            }
          </div>

          <div class="story-header">
            <div class="user-info">
              <div class="user-avatar" [style.backgroundImage]="userPhoto ? 'url(' + userPhoto + ')' : ''">
                @if (!userPhoto) {
                  <i class="bi bi-person-fill"></i>
                }
              </div>
              @if (userId) {
                <a
                  class="user-name"
                  [routerLink]="['/user', userId]"
                  (click)="openProfile($event)">
                  {{ userName }}
                </a>
              } @else {
                <span class="user-name">{{ userName }}</span>
              }
              <span class="story-time">{{ getTimeAgo(currentStory.createdAt) }}</span>
            </div>
            <button type="button" class="close-btn" (click)="close()">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <div class="story-image">
            <img [src]="currentStory.mediaUrl" alt="Story">
          </div>

          @if (currentStory.caption) {
            <div class="story-caption">
              {{ currentStory.caption }}
            </div>
          }

          <div class="story-reactions" (click)="$event.stopPropagation()">
            @for (reaction of reactions; track reaction.type) {
              <div class="reaction-item">
                @if (getReactionCount(reaction.type) > 0) {
                  <span class="reaction-count">{{ getReactionCount(reaction.type) }}</span>
                }
                <button
                  type="button"
                  class="reaction-btn"
                  [class.selected]="selectedReaction === reaction.type"
                  [attr.aria-label]="reaction.label"
                  [title]="reaction.label"
                  (click)="sendReaction(reaction.type)">
                  {{ reaction.emoji }}
                </button>
              </div>
            }
          </div>

          <div class="story-viewers">
            <i class="bi bi-eye"></i>
            <span>{{ currentStory.viewerCount }}</span>
          </div>

          <div class="nav-hint left" (click)="previousStory()"></div>
          <div
            class="nav-hint center"
            (mousedown)="onCenterPress($event)"
            (touchstart)="onCenterPress($event)">
          </div>
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
      min-width: 0;
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
      flex-shrink: 0;
    }

    .user-avatar i {
      color: #999;
    }

    .user-name {
      color: white;
      font-weight: 600;
      font-size: 0.9rem;
      text-decoration: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 140px;
    }

    a.user-name:hover {
      text-decoration: underline;
      opacity: 0.9;
    }

    .story-time {
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.8rem;
      flex-shrink: 0;
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
      bottom: 56px;
      left: 12px;
      right: 72px;
      color: white;
      font-size: 1rem;
      text-align: left;
      background: rgba(0, 0, 0, 0.5);
      padding: 8px 12px;
      border-radius: 8px;
    }

    .story-reactions {
      position: absolute;
      bottom: 10px;
      right: 10px;
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: flex-end;
      align-items: flex-end;
      gap: 2px 4px;
      z-index: 11;
      max-width: 55%;
    }

    .reaction-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 22px;
    }

    .reaction-btn {
      border: none;
      background: transparent;
      font-size: 1rem;
      line-height: 1;
      cursor: pointer;
      padding: 0;
      opacity: 0.75;
      transition: transform 0.15s ease, opacity 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .reaction-btn:hover {
      opacity: 1;
      transform: scale(1.12);
    }

    .reaction-btn.selected {
      opacity: 1;
      transform: scale(1.15);
    }

    .reaction-count {
      font-size: 0.6rem;
      color: rgba(255, 255, 255, 0.9);
      line-height: 1;
      margin-bottom: 1px;
      font-weight: 600;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
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
      cursor: pointer;
      z-index: 5;
    }

    .nav-hint.left {
      left: 0;
      width: 30%;
    }

    .nav-hint.center {
      left: 30%;
      width: 40%;
    }

    .nav-hint.right {
      right: 0;
      width: 30%;
    }
  `]
})
export class StoryViewerComponent implements OnChanges, OnDestroy {
  @Input() visible = false;
  @Input() stories: Story[] = [];
  @Input() userId = '';
  @Input() userName = '';
  @Input() userPhoto: string | null = null;
  @Output() closed = new EventEmitter<void>();

  readonly reactions = STORY_REACTIONS;

  currentIndex = 0;
  currentStory: Story | null = null;
  progressWidth = 0;
  selectedReaction: StoryReactionType | null = null;
  reactionCounts: StoryReactionCounts = {};

  private progressInterval$ = new Subject<void>();
  private destroy$ = new Subject<void>();
  private destroyRef = inject(DestroyRef);
  private readonly STORY_DURATION = 5000;
  private readonly PROGRESS_INTERVAL = 50;
  private isPaused = false;
  private progressStartTime = 0;
  private progressElapsedOffset = 0;
  private readonly centerReleaseHandler = (): void => this.resumeProgress();

  constructor(
    private storyService: StoryService,
    private router: Router
  ) {
    this.destroyRef.onDestroy(() => {
      this.unbindCenterReleaseListeners();
      this.destroy$.next();
      this.destroy$.complete();
      this.progressInterval$.next();
      this.progressInterval$.complete();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true && this.stories.length > 0) {
      this.showStory(0);
      return;
    }
    if (changes['visible']?.currentValue === false) {
      this.resetViewer();
    }
  }

  ngOnDestroy(): void {
    this.unbindCenterReleaseListeners();
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
    this.progressElapsedOffset = 0;
    this.isPaused = false;
    this.unbindCenterReleaseListeners();
    this.selectedReaction = this.currentStory.currentUserReaction ?? null;
    this.reactionCounts = { ...(this.currentStory.reactionCounts ?? {}) };

    this.storyService.viewStory(this.currentStory.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.currentStory!.viewedByCurrentUser = true;
      }
    });

    this.startProgress();
  }

  sendReaction(reaction: StoryReactionType): void {
    if (!this.currentStory) {
      return;
    }

    this.storyService.reactToStory(this.currentStory.id, reaction).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.selectedReaction = response.reaction;
        this.currentStory!.currentUserReaction = response.reaction;
        this.reactionCounts = { ...response.reactionCounts };
        this.currentStory!.reactionCounts = { ...response.reactionCounts };
      }
    });
  }

  getReactionCount(reaction: StoryReactionType): number {
    return this.reactionCounts[reaction] ?? 0;
  }

  openProfile(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const profileUrl = this.userId ? `/user/${this.userId}` : null;
    this.close();
    if (profileUrl) {
      void this.router.navigateByUrl(profileUrl);
    }
  }

  onCenterPress(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.pauseProgress();
    document.addEventListener('mouseup', this.centerReleaseHandler);
    document.addEventListener('touchend', this.centerReleaseHandler);
    document.addEventListener('touchcancel', this.centerReleaseHandler);
  }

  pauseProgress(): void {
    if (this.isPaused) {
      return;
    }
    this.isPaused = true;
    this.progressElapsedOffset += Date.now() - this.progressStartTime;
    this.progressInterval$.next();
  }

  resumeProgress(): void {
    if (!this.isPaused) {
      return;
    }
    this.isPaused = false;
    this.unbindCenterReleaseListeners();
    this.startProgress();
  }

  private unbindCenterReleaseListeners(): void {
    document.removeEventListener('mouseup', this.centerReleaseHandler);
    document.removeEventListener('touchend', this.centerReleaseHandler);
    document.removeEventListener('touchcancel', this.centerReleaseHandler);
  }

  private startProgress(): void {
    this.progressInterval$.next();
    if (this.isPaused) {
      return;
    }

    this.progressStartTime = Date.now();

    interval(this.PROGRESS_INTERVAL).pipe(takeUntil(this.progressInterval$), takeUntil(this.destroy$)).subscribe(() => {
      const elapsed = this.progressElapsedOffset + (Date.now() - this.progressStartTime);
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

  close(): void {
    this.unbindCenterReleaseListeners();
    this.progressInterval$.next();
    this.resetViewer();
    this.closed.emit();
  }

  private resetViewer(): void {
    this.progressInterval$.next();
    this.currentStory = null;
    this.currentIndex = 0;
    this.progressWidth = 0;
    this.selectedReaction = null;
    this.reactionCounts = {};
    this.isPaused = false;
    this.progressElapsedOffset = 0;
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
