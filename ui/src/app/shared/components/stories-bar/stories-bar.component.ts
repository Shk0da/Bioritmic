import { Component, EventEmitter, OnInit, OnDestroy, Output, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { StoryService, Story } from '../../../core/services/story.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-stories-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stories-bar">
      <div class="stories-scroll">
        <!-- Current user story creator -->
        <div class="story-item my-story" (click)="openCreator()">
          <div class="story-avatar-wrapper">
            <div class="story-avatar" [style.backgroundImage]="currentUserPhoto ? 'url(' + currentUserPhoto + ')' : ''">
              @if (!currentUserPhoto) {
                <i class="bi bi-person-fill"></i>
              }
            </div>
            <div class="add-story-btn">
              <i class="bi bi-plus-lg"></i>
            </div>
          </div>
          <span class="story-name">Ваша история</span>
        </div>

        <!-- Other users' stories -->
        @for (group of storyGroups; track group.userId) {
          <div class="story-item" (click)="openViewer(group)">
            <div class="story-avatar-wrapper" [class.viewed]="group.viewedByCurrentUser">
              <div class="story-avatar" [style.backgroundImage]="group.userPhoto ? 'url(' + group.userPhoto + ')' : ''">
                @if (!group.userPhoto) {
                  <span class="avatar-initial">{{ group.userName?.charAt(0) || '?' }}</span>
                }
              </div>
            </div>
            <span class="story-name">{{ group.userName }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .stories-bar {
      padding: 12px 0;
      overflow: hidden;
    }

    .stories-scroll {
      display: flex;
      gap: 12px;
      overflow-x: auto;
      padding: 0 16px;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .stories-scroll::-webkit-scrollbar {
      display: none;
    }

    .story-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      flex-shrink: 0;
    }

    .story-avatar-wrapper {
      position: relative;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      padding: 3px;
      background: linear-gradient(135deg, #ff6b6b, #feca57, #ff9ff3);
    }

    .story-avatar-wrapper.viewed {
      background: var(--text-muted, #ccc);
    }

    .story-avatar {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background-color: var(--border-color, #e0e0e0);
      background-size: cover;
      background-position: center;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid var(--card-bg, white);
      overflow: hidden;
    }

    .story-avatar i {
      font-size: 1.5rem;
      color: var(--text-muted, #999);
    }

    .avatar-initial {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text-secondary, #666);
    }

    .my-story .add-story-btn {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #4a90d9;
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.6rem;
      color: white;
    }

    .story-name {
      font-size: 0.7rem;
      color: var(--text-secondary, #666);
      max-width: 64px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: center;
    }
  `]
})
export class StoriesBarComponent implements OnInit, OnDestroy {
  @Output() openViewerEvent = new EventEmitter<StoryGroup>();
  @Output() openCreatorEvent = new EventEmitter<void>();

  storyGroups: StoryGroup[] = [];
  currentUserPhoto: string | null = null;

  private destroy$ = new Subject<void>();
  private destroyRef = inject(DestroyRef);

  constructor(
    private storyService: StoryService,
    private userService: UserService,
    private authService: AuthService,
    private sanitizer: DomSanitizer
  ) {
    this.destroyRef.onDestroy(() => this.destroy$.next());
  }

  ngOnInit(): void {
    this.loadCurrentUserPhoto();
    this.loadStories();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openCreator(): void {
    this.openCreatorEvent.emit();
  }

  openViewer(group: StoryGroup): void {
    this.openViewerEvent.emit(group);
  }

  private loadCurrentUserPhoto(): void {
    this.userService.getPhoto().pipe(takeUntil(this.destroy$)).subscribe({
      next: (bytes: Uint8Array) => {
        this.currentUserPhoto = this.bytesToDataUrl(bytes);
      },
      error: () => {
        this.currentUserPhoto = null;
      }
    });
  }

  private loadStories(): void {
    this.storyService.getFeed().pipe(takeUntil(this.destroy$)).subscribe({
      next: (stories: Story[]) => {
        this.groupStoriesByUser(stories);
        this.loadUserPhotos();
      },
      error: () => {
        this.storyGroups = [];
      }
    });
  }

  private groupStoriesByUser(stories: Story[]): void {
    const grouped = new Map<string, StoryGroup>();

    for (const story of stories) {
      if (!grouped.has(story.userId)) {
        grouped.set(story.userId, {
          userId: story.userId,
          stories: [],
          viewedByCurrentUser: story.viewedByCurrentUser,
          userName: '',
          userPhoto: null
        });
      }
      const group = grouped.get(story.userId)!;
      group.stories.push(story);
      if (story.viewedByCurrentUser) {
        group.viewedByCurrentUser = true;
      }
    }

    this.storyGroups = Array.from(grouped.values());
  }

  private loadUserPhotos(): void {
    for (const group of this.storyGroups) {
      this.userService.getUserById(group.userId).pipe(takeUntil(this.destroy$)).subscribe({
        next: (user) => {
          group.userName = user.name || '';
        },
        error: () => {}
      });

      this.userService.getPhoto(group.userId).pipe(takeUntil(this.destroy$)).subscribe({
        next: (bytes: Uint8Array) => {
          group.userPhoto = this.bytesToDataUrl(bytes);
        },
        error: () => {}
      });
    }
  }

  private bytesToDataUrl(bytes: Uint8Array): string {
    const base64 = this.uint8ArrayToBase64(bytes);
    return `data:image/jpeg;base64,${base64}`;
  }

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

export interface StoryGroup {
  userId: string;
  stories: Story[];
  viewedByCurrentUser: boolean;
  userName: string;
  userPhoto: string | null;
}
