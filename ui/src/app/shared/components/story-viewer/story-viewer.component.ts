import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil, interval, finalize } from 'rxjs';
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
            <button type="button" class="close-btn" aria-label="Закрыть" (click)="close()">
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

          <div
            class="story-reactions-bar"
            [class.expanded]="reactionPickerOpen"
            (click)="$event.stopPropagation()">
            @if (reactionPickerOpen) {
              <div class="reaction-picker-options">
                @for (reaction of reactions; track reaction.type) {
                  <button
                    type="button"
                    class="reaction-picker-option"
                    [class.selected]="selectedReaction === reaction.type"
                    [attr.aria-label]="reaction.label"
                    [attr.aria-pressed]="selectedReaction === reaction.type"
                    [title]="reaction.label"
                    (click)="sendReaction(reaction.type, $event)">
                    {{ reaction.emoji }}
                  </button>
                }
              </div>
            }

            <div class="story-reactions-row">
              @for (reaction of reactions; track reaction.type) {
                @if (getReactionCount(reaction.type) > 0) {
                  <button
                    type="button"
                    class="reaction-chip"
                    [class.selected]="selectedReaction === reaction.type"
                    [attr.aria-label]="reaction.label"
                    [attr.aria-pressed]="selectedReaction === reaction.type"
                    [title]="reaction.label"
                    (click)="sendReaction(reaction.type)">
                    <span class="reaction-chip__emoji">{{ reaction.emoji }}</span>
                    <span class="reaction-chip__count">{{ getReactionCount(reaction.type) }}</span>
                  </button>
                }
              }

              <button
                type="button"
                class="reaction-picker-trigger"
                [attr.aria-expanded]="reactionPickerOpen"
                aria-label="Реакция на историю"
                (click)="toggleReactionPicker($event)">
                <span class="reaction-picker-trigger__icon" aria-hidden="true">
                  <i class="bi bi-heart"></i>
                </span>
              </button>
            </div>
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
      z-index: 12;
      color: white;
      font-size: 1rem;
      text-align: left;
      background: rgba(0, 0, 0, 0.5);
      padding: 8px 12px;
      border-radius: 8px;
    }

    .story-reactions-bar {
      --reaction-size: 44px;
      --reaction-row-size: 35px;
      position: absolute;
      bottom: 10px;
      right: 10px;
      z-index: 12;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.35rem;
      max-width: calc(100% - 20px);
    }

    .story-reactions-row {
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: center;
      justify-content: flex-end;
      gap: 0.28rem;
    }

    .story-reactions-row .reaction-chip,
    .story-reactions-row .reaction-picker-trigger {
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      padding: 0;
      cursor: pointer;
      line-height: 1;
    }

    .reaction-picker-option {
      border-radius: 50%;
      display: grid;
      place-items: center;
      flex-shrink: 0;
      padding: 0;
      cursor: pointer;
      line-height: 1;
    }

    .story-reactions-row .reaction-chip,
    .story-reactions-row .reaction-picker-trigger {
      width: var(--reaction-row-size);
      height: var(--reaction-row-size);
      min-width: var(--reaction-row-size);
    }

    .reaction-picker-option {
      width: var(--reaction-size);
      height: var(--reaction-size);
      min-width: var(--reaction-size);
    }

    .reaction-chip {
      position: relative;
      border: 1px solid rgba(255, 255, 255, 0.28);
      background: rgba(0, 0, 0, 0.42);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      color: white;
      transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
    }

    .reaction-chip__emoji {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      font-size: 0.92rem;
      line-height: 1;
      pointer-events: none;
    }

    .reaction-chip__count {
      position: absolute;
      right: -2px;
      bottom: -1px;
      min-width: 12px;
      height: 12px;
      padding: 0 2px;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.82);
      color: #fff;
      font-size: 0.46rem;
      font-weight: 700;
      border: 1px solid rgba(255, 255, 255, 0.35);
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .reaction-chip:hover {
      transform: scale(1.06);
      background: rgba(255, 255, 255, 0.16);
    }

    .reaction-chip.selected {
      border-color: #fd297b;
      background: rgba(253, 41, 123, 0.32);
      transform: scale(1.06);
    }

    .reaction-picker-trigger {
      border: 1.5px dashed rgba(255, 255, 255, 0.42);
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      color: rgba(255, 255, 255, 0.92);
      font-size: 0.92rem;
      transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
      box-shadow: 0 3px 14px rgba(0, 0, 0, 0.18);
      overflow: hidden;
    }

    .reaction-picker-trigger__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      line-height: 1;
    }

    .reaction-picker-trigger__icon i {
      display: block;
      line-height: 1;
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.92);
    }

    .reaction-picker-trigger:hover {
      background: rgba(255, 255, 255, 0.14);
      border-color: rgba(255, 255, 255, 0.62);
      transform: scale(1.06);
    }

    .story-reactions-bar.expanded .story-reactions-row .reaction-picker-trigger {
      border-style: solid;
      border-color: rgba(255, 255, 255, 0.55);
      background: rgba(0, 0, 0, 0.35);
      font-size: 0.8rem;
    }

    .reaction-picker-options {
      display: flex;
      flex-direction: column-reverse;
      align-items: flex-end;
      gap: 0.35rem;
    }

    .reaction-picker-option {
      border: 1px solid rgba(255, 255, 255, 0.28);
      background: rgba(0, 0, 0, 0.42);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      color: white;
      font-size: 1.15rem;
      transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
      animation: reactionOptionRise 0.22s ease backwards;
      overflow: hidden;
    }

    .reaction-picker-option:nth-child(1) { animation-delay: 0.02s; }
    .reaction-picker-option:nth-child(2) { animation-delay: 0.04s; }
    .reaction-picker-option:nth-child(3) { animation-delay: 0.06s; }
    .reaction-picker-option:nth-child(4) { animation-delay: 0.08s; }
    .reaction-picker-option:nth-child(5) { animation-delay: 0.1s; }
    .reaction-picker-option:nth-child(6) { animation-delay: 0.12s; }
    .reaction-picker-option:nth-child(7) { animation-delay: 0.14s; }

    @keyframes reactionOptionRise {
      from {
        opacity: 0;
        transform: translateY(18px) scale(0.82);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .reaction-picker-option:hover {
      transform: scale(1.08);
      background: rgba(255, 255, 255, 0.16);
    }

    .reaction-picker-option.selected {
      border-color: #fd297b;
      background: rgba(253, 41, 123, 0.32);
      transform: scale(1.06);
    }

    .story-viewers {
      position: absolute;
      bottom: 12px;
      left: 12px;
      z-index: 12;
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
export class StoryViewerComponent implements OnChanges {
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
  reactionPickerOpen = false;
  private reactionSubmitting = false;

  private progressInterval$ = new Subject<void>();
  private destroy$ = new Subject<void>();
  private destroyRef = inject(DestroyRef);
  private readonly STORY_DURATION = 5000;
  private readonly PROGRESS_INTERVAL = 50;
  private readonly pauseReasons = new Set<'picker' | 'center'>();
  private centerHeld = false;
  private progressStartTime = 0;
  private progressElapsedOffset = 0;
  private readonly centerReleaseHandler = (): void => {
    this.centerHeld = false;
    this.resumeProgress('center');
  };

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
      this.unbindCenterReleaseListeners();
      this.resetViewer();
    }
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
    this.pauseReasons.clear();
    this.centerHeld = false;
    this.unbindCenterReleaseListeners();
    this.reactionPickerOpen = false;
    this.selectedReaction = this.currentStory.currentUserReaction ?? null;
    this.reactionCounts = { ...(this.currentStory.reactionCounts ?? {}) };

    const storyId = this.currentStory.id;
    this.storyService.viewStory(storyId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        const story = this.stories.find((item) => item.id === storyId);
        if (story) {
          story.viewedByCurrentUser = true;
        }
        if (this.currentStory?.id === storyId) {
          this.currentStory.viewedByCurrentUser = true;
        }
      }
    });

    this.startProgress();
  }

  sendReaction(reaction: StoryReactionType, event?: Event): void {
    event?.stopPropagation();
    if (!this.currentStory || this.reactionSubmitting) {
      return;
    }

    const storyId = this.currentStory.id;
    this.reactionSubmitting = true;
    this.storyService.reactToStory(storyId, reaction).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.reactionSubmitting = false;
      })
    ).subscribe({
      next: (response) => {
        if (this.currentStory?.id !== storyId) {
          return;
        }
        this.selectedReaction = response.reaction ?? null;
        this.currentStory.currentUserReaction = response.reaction ?? null;
        this.reactionCounts = { ...response.reactionCounts };
        this.currentStory.reactionCounts = { ...response.reactionCounts };
        this.closeReactionPicker();
      },
      error: () => {
        if (this.reactionPickerOpen) {
          this.closeReactionPicker();
        }
      }
    });
  }

  toggleReactionPicker(event: Event): void {
    event.stopPropagation();
    if (this.reactionPickerOpen) {
      this.closeReactionPicker();
      return;
    }
    this.reactionPickerOpen = true;
    this.pauseProgress('picker');
  }

  closeReactionPicker(): void {
    if (!this.reactionPickerOpen) {
      return;
    }
    this.reactionPickerOpen = false;
    this.resumeProgress('picker');
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
    if (this.centerHeld) {
      return;
    }
    this.centerHeld = true;
    this.pauseProgress('center');
    this.unbindCenterReleaseListeners();
    document.addEventListener('mouseup', this.centerReleaseHandler);
    document.addEventListener('touchend', this.centerReleaseHandler);
    document.addEventListener('touchcancel', this.centerReleaseHandler);
  }

  pauseProgress(reason: 'picker' | 'center'): void {
    const wasPaused = this.pauseReasons.size > 0;
    this.pauseReasons.add(reason);
    if (!wasPaused) {
      this.progressElapsedOffset += Date.now() - this.progressStartTime;
      this.progressInterval$.next();
    }
  }

  resumeProgress(reason: 'picker' | 'center'): void {
    if (!this.pauseReasons.has(reason)) {
      return;
    }
    this.pauseReasons.delete(reason);
    if (this.pauseReasons.size > 0) {
      return;
    }
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
    if (this.pauseReasons.size > 0) {
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
    this.reactionPickerOpen = false;
    this.pauseReasons.clear();
    this.centerHeld = false;
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
    this.reactionPickerOpen = false;
    this.pauseReasons.clear();
    this.centerHeld = false;
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
