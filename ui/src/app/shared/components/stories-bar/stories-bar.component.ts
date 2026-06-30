import { Component, OnInit, OnDestroy, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { StoryService, Story } from '../../../core/services/story.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { ModalService } from '../../../core/services/modal.service';
import { ToastService } from '../../../core/services/toast.service';
import { StoryCreatorComponent } from '../story-creator/story-creator.component';
import { StoryViewerComponent } from '../story-viewer/story-viewer.component';
import { AvatarStatusBadgeComponent } from '../avatar-status-badge/avatar-status-badge.component';

@Component({
  selector: 'app-stories-bar',
  standalone: true,
  imports: [CommonModule, StoryCreatorComponent, StoryViewerComponent, AvatarStatusBadgeComponent],
  template: `
    <div class="stories-bar">
      <div class="stories-scroll">
        <div
          class="story-item my-story"
          [class.my-story-disabled]="!canCreateStory"
          (click)="openMyStory()"
        >
          <div class="story-avatar-wrapper">
            <div class="story-avatar" [style.backgroundImage]="myStoryPreview ? 'url(' + myStoryPreview + ')' : ''">
              @if (!myStoryPreview) {
                <i class="bi bi-person-fill"></i>
              }
            </div>
            @if (myStories.length > 0) {
              <button
                type="button"
                class="delete-story-btn"
                title="Удалить истории"
                (click)="deleteMyStories($event)">
                <i class="bi bi-x-lg"></i>
              </button>
            }
            @if (canCreateStory) {
              <button
                type="button"
                class="add-story-btn"
                title="Добавить историю"
                (click)="openCreator($event)">
                <i class="bi bi-plus-lg"></i>
              </button>
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
                <app-avatar-status-badge
                  [emoji]="group.statusEmoji"
                  [position]="group.statusPosition"
                  size="sm">
                </app-avatar-status-badge>
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
      background: var(--text-muted, #9ca3af);
    }

    .story-item.viewed .story-name {
      opacity: 0.55;
      color: var(--text-muted, #999);
    }

    .story-avatar {
      position: relative;
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
      overflow: visible;
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

    .my-story .add-story-btn,
    .my-story .delete-story-btn {
      position: absolute;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.6rem;
      color: white;
      padding: 0;
      cursor: pointer;
    }

    .my-story .add-story-btn {
      bottom: 0;
      right: 0;
      background: #4a90d9;
    }

    .my-story .delete-story-btn {
      top: 0;
      right: 0;
      background: #ef4444;
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
  myStories: Story[] = [];
  currentUserPhoto: string | null = null;
  creatorVisible = false;
  viewerVisible = false;
  viewerStories: Story[] = [];
  viewerUserId = '';
  viewerUserName = '';
  viewerUserPhoto: string | null = null;
  deletingStories = false;

  private destroy$ = new Subject<void>();
  private destroyRef = inject(DestroyRef);

  constructor(
    private storyService: StoryService,
    private userService: UserService,
    private authService: AuthService,
    private modalService: ModalService,
    private toastService: ToastService
  ) {
    this.destroyRef.onDestroy(() => this.destroy$.next());
  }

  get canCreateStory(): boolean {
    return this.authService.getCurrentUser()?.isVerified !== false;
  }

  get myStoryPreview(): string | null {
    return this.myStories[0]?.mediaUrl ?? this.currentUserPhoto;
  }

  ngOnInit(): void {
    this.loadCurrentUserPhoto();
    this.loadStories();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openCreator(event?: Event): void {
    event?.stopPropagation();
    if (!this.canCreateStory) {
      void this.modalService.alert(
        'Публикация историй доступна только верифицированным пользователям.'
      );
      return;
    }
    this.creatorVisible = true;
  }

  openMyStory(): void {
    if (this.myStories.length > 0) {
      const user = this.authService.getCurrentUser();
      this.viewerStories = [...this.myStories];
      this.viewerUserId = user?.id ?? '';
      this.viewerUserName = user?.name ?? 'Вы';
      this.viewerUserPhoto = this.currentUserPhoto;
      this.viewerVisible = true;
      return;
    }
    this.openCreator();
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

  async deleteMyStories(event: Event): Promise<void> {
    event.stopPropagation();
    if (this.myStories.length === 0 || this.deletingStories) {
      return;
    }

    const count = this.myStories.length;
    const message = count === 1
      ? 'Удалить вашу историю?'
      : `Удалить все ваши истории (${count})?`;
    const confirmed = await this.modalService.confirm(message, 'Удаление историй');
    if (!confirmed) {
      return;
    }

    this.deletingStories = true;
    const storyIds = this.myStories.map((story) => story.id);
    forkJoin(storyIds.map((id) => this.storyService.deleteStory(id)))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deletingStories = false;
          this.toastService.success(count === 1 ? 'История удалена' : 'Истории удалены');
          this.loadStories();
        },
        error: () => {
          this.deletingStories = false;
          this.toastService.error('Не удалось удалить истории');
        }
      });
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

    this.currentUserPhoto = this.userService.peekCachedPhotoUrl(userId, 'card');
    this.userService.getCachedPhotoUrl(userId, 'card').pipe(takeUntil(this.destroy$)).subscribe({
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
        this.myStories = [];
      }
    });
  }

  private groupStoriesByUser(stories: Story[]): void {
    const currentUserId = this.authService.getCurrentUser()?.id;
    const grouped = new Map<string, StoryGroup>();

    for (const story of stories) {
      if (story.userId === currentUserId) {
        continue;
      }
      if (!grouped.has(story.userId)) {
        grouped.set(story.userId, {
          userId: story.userId,
          stories: [],
          viewedByCurrentUser: false,
          userName: '',
          userPhoto: null,
          statusEmoji: null,
          statusPosition: null
        });
      }
      grouped.get(story.userId)!.stories.push(story);
    }

    this.myStories = stories
      .filter((story) => story.userId === currentUserId)
      .sort((a, b) => b.createdAt - a.createdAt);

    this.storyGroups = Array.from(grouped.values()).map((group) => ({
      ...group,
      viewedByCurrentUser: group.stories.length > 0 &&
        group.stories.every((story) => story.viewedByCurrentUser)
    }));
  }

  private loadUserProfiles(): void {
    for (const group of this.storyGroups) {
      group.userPhoto = this.userService.peekCachedPhotoUrl(group.userId, 'card');

      this.userService.getUserById(group.userId).pipe(takeUntil(this.destroy$)).subscribe({
        next: (user) => {
          group.userName = user.name || '';
          group.statusEmoji = user.statusEmoji ?? null;
          group.statusPosition = user.statusPosition ?? null;
        },
        error: () => {
          group.userName = '';
          group.statusEmoji = null;
          group.statusPosition = null;
        }
      });

      this.userService.getCachedPhotoUrl(group.userId, 'card').pipe(takeUntil(this.destroy$)).subscribe({
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
  statusEmoji?: string | null;
  statusPosition?: string | null;
}
