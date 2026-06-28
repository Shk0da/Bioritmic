import { Component, OnInit, OnDestroy, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { StoryService, Story } from '../../../core/services/story.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { ModalService } from '../../../core/services/modal.service';
import { StoryCreatorComponent } from '../story-creator/story-creator.component';
import { StoryViewerComponent } from '../story-viewer/story-viewer.component';

@Component({
  selector: 'app-stories-bar',
  standalone: true,
  imports: [CommonModule, StoryCreatorComponent, StoryViewerComponent],
  template: `
    <div class="stories-bar">
      <div class="stories-scroll">
        <div
          class="story-item my-story"
          [class.my-story-disabled]="!canCreateStory"
          (click)="openCreator()"
        >
          <div class="story-avatar-wrapper">
            <div class="story-avatar" [style.backgroundImage]="currentUserPhoto ? 'url(' + currentUserPhoto + ')' : ''">
              @if (!currentUserPhoto) {
                <i class="bi bi-person-fill"></i>
              }
            </div>
            @if (canCreateStory) {
              <div class="add-story-btn">
                <i class="bi bi-plus-lg"></i>
              </div>
            }
          </div>
          <span class="story-name">Ваша история</span>
        </div>

        @for (group of storyGroups; track group.userId) {
          <div class="story-item" [class.viewed]="group.viewedByCurrentUser" (click)="openViewer(group)">
            <div class="story-avatar-wrapper" [class.viewed]="group.viewedByCurrentUser">
              <div class="story-avatar" [style.backgroundImage]="group.userPhoto ? 'url(' + group.userPhoto + ')' : ''">
                @if (!group.userPhoto) {
                  <span class="avatar-initial">{{ group.userName.charAt(0) || '?' }}</span>
                }
              </div>
            </div>
            <span class="story-name">{{ group.userName }}</span>
          </div>
        }
      </div>
    </div>

    <app-story-creator
      [visible]="creatorVisible"
      (closed)="creatorVisible = false"
      (storyCreated)="onStoryCreated()">
    </app-story-creator>

    <app-story-viewer
      [visible]="viewerVisible"
      [stories]="viewerStories"
      [userId]="viewerUserId"
      [userName]="viewerUserName"
      [userPhoto]="viewerUserPhoto"
      (closed)="onViewerClosed()">
    </app-story-viewer>
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
      background: #bdbdbd;
    }

    .story-avatar-wrapper.viewed .story-avatar {
      opacity: 0.5;
      filter: grayscale(40%);
    }

    .story-item.viewed .story-name {
      opacity: 0.55;
      color: var(--text-muted, #999);
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

    .my-story-disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .my-story-disabled .story-avatar-wrapper {
      background: var(--text-muted, #ccc);
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
  storyGroups: StoryGroup[] = [];
  currentUserPhoto: string | null = null;
  creatorVisible = false;
  viewerVisible = false;
  viewerStories: Story[] = [];
  viewerUserId = '';
  viewerUserName = '';
  viewerUserPhoto: string | null = null;

  private destroy$ = new Subject<void>();
  private destroyRef = inject(DestroyRef);

  constructor(
    private storyService: StoryService,
    private userService: UserService,
    private authService: AuthService,
    private modalService: ModalService
  ) {
    this.destroyRef.onDestroy(() => this.destroy$.next());
  }

  get canCreateStory(): boolean {
    return this.authService.getCurrentUser()?.isVerified !== false;
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
    if (!this.canCreateStory) {
      void this.modalService.alert(
        'Публикация историй доступна только верифицированным пользователям.'
      );
      return;
    }
    this.creatorVisible = true;
  }

  openViewer(group: StoryGroup): void {
    if (!group.stories.length) {
      return;
    }
    this.viewerStories = [...group.stories];
    this.viewerUserId = group.userId;
    this.viewerUserName = group.userName;
    this.viewerUserPhoto = group.userPhoto;
    this.viewerVisible = true;
  }

  onViewerClosed(): void {
    this.viewerVisible = false;
    this.viewerStories = [];
    this.viewerUserId = '';
    this.viewerUserName = '';
    this.viewerUserPhoto = null;
    this.loadStories();
  }

  onStoryCreated(): void {
    this.creatorVisible = false;
    this.loadStories();
    this.loadCurrentUserPhoto();
  }

  private loadCurrentUserPhoto(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) {
      this.currentUserPhoto = null;
      return;
    }

    this.userService.resolveProfilePhotoUrl(userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (url) => {
        this.currentUserPhoto = url;
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
        this.loadUserProfiles();
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
          viewedByCurrentUser: false,
          userName: '',
          userPhoto: null
        });
      }
      grouped.get(story.userId)!.stories.push(story);
    }

    this.storyGroups = Array.from(grouped.values()).map((group) => ({
      ...group,
      viewedByCurrentUser: group.stories.length > 0 &&
        group.stories.every((story) => story.viewedByCurrentUser)
    }));
  }

  private loadUserProfiles(): void {
    for (const group of this.storyGroups) {
      this.userService.getUserById(group.userId).pipe(takeUntil(this.destroy$)).subscribe({
        next: (user) => {
          group.userName = user.name || '';
        },
        error: () => {
          group.userName = '';
        }
      });

      this.userService.resolveProfilePhotoUrl(group.userId).pipe(takeUntil(this.destroy$)).subscribe({
        next: (url) => {
          group.userPhoto = url;
        },
        error: () => {
          group.userPhoto = null;
        }
      });
    }
  }
}

export interface StoryGroup {
  userId: string;
  stories: Story[];
  viewedByCurrentUser: boolean;
  userName: string;
  userPhoto: string | null;
}
