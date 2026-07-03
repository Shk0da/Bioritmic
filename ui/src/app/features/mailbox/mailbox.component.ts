import { Component, OnInit, OnDestroy, HostListener, DestroyRef, inject } from '@angular/core';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { MailboxService } from '../../core/services/mailbox.service';
import { UserService } from '../../core/services/user.service';
import { UserMail, PageableRequest, UserInfo } from '../../core/models/user.model';
import { ModalService } from '../../core/services/modal.service';
import { ConversationPanelComponent } from './conversation-panel/conversation-panel.component';
import { normalizeRouteUrl, subscribeCachedRouteRefresh } from '../../core/routing/route-cache-refresh.util';
import { isLayoutCachingEnabled } from '../../core/routing/layout-cache.util';
import { registerPullToRefresh } from '../../core/routing/register-pull-to-refresh.util';
import { PullToRefreshService } from '../../core/routing/pull-to-refresh.service';
import { Subject, takeUntil } from 'rxjs';
import { parseTimestampMs, formatMessageTime } from '../../shared/utils/timestamp.util';
import { isSystemMailVisibleToViewer } from '../../shared/utils/mail-system-message.util';

interface UserConversation {
  userId: string;
  userName?: string;
  userPhotoUrl?: string | null;
  lastMessage: string;
  lastMessageTime: unknown;
  hasUnread?: boolean;
}

@Component({
  selector: 'app-mailbox',
  standalone: true,
  imports: [RouterLink, ConversationPanelComponent],
  template: `
    <div class="row page-layout">
      <div class="col-12 col-md-8 mx-auto page-col">
    <div class="page-header mb-3">
      <h1 class="page-title">
        <i class="bi bi-chat-heart me-2"></i>Сообщения
      </h1>
      <p class="text-muted mb-0 page-subtitle d-none d-md-block">Ваши диалоги</p>
    </div>

    @if (loading && conversations.length === 0 && !selectedUserId) {
      <div class="card mailbox-card">
        <div class="card-body text-center py-5">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Загрузка...</span>
          </div>
        </div>
      </div>
    } @else if (!loading && conversations.length === 0 && !selectedUserId) {
      <div class="card empty-state">
        <div class="card-body text-center py-5">
          <i class="bi bi-chat-square-text display-1 text-muted mb-3"></i>
          <h4 class="text-muted">Нет сообщений</h4>
          <p class="text-muted">Перейдите в профиль пользователя, чтобы написать сообщение</p>
          <a routerLink="/swipe" class="btn btn-primary mt-3">
            <i class="bi bi-people me-2"></i>К поиску
          </a>
        </div>
      </div>
    } @else {
      <div class="mailbox-card" [class.chat-open]="!!selectedUserId">
        <aside class="mailbox-list-panel">
          <div class="list-panel-header">
            <span class="list-panel-title">Диалоги</span>
            <span class="list-panel-count">{{ conversations.length }}</span>
          </div>
          <div class="conversation-list">
            @for (conv of conversations; track conv.userId) {
              <div
                class="conversation-swipe-wrap"
                [class.swipe-delete-revealed]="isSwipeDeleteRevealed(conv.userId)">
                <div
                  class="conversation-swipe-actions"
                  role="button"
                  tabindex="0"
                  aria-label="Удалить переписку"
                  (click)="onSwipeDeleteClick(conv.userId, $event)"
                  (keydown.enter)="onSwipeDeleteClick(conv.userId, $event)"
                  (keydown.space)="onSwipeDeleteClick(conv.userId, $event)">
                  <i class="bi bi-trash-fill"></i>
                </div>
                <div
                  class="conversation-item"
                  [class.active]="conv.userId === selectedUserId"
                  [class.unread]="conv.hasUnread"
                  [class.swipe-dragging]="swipeDragUserId === conv.userId"
                  [style.transform]="getItemTransform(conv.userId)"
                  [attr.aria-label]="conv.hasUnread ? (conv.userName || 'Пользователь') + ', новое сообщение' : null"
                  (click)="onConversationClick(conv.userId)"
                  (touchstart)="onSwipeStart(conv.userId, $event)"
                  (touchmove)="onSwipeMove(conv.userId, $event)"
                  (touchend)="onSwipeEnd(conv.userId)"
                  (touchcancel)="onSwipeEnd(conv.userId)">
                  <div class="conversation-avatar-wrap">
                    <img
                      [src]="conv.userPhotoUrl || 'assets/img/default-avatar.svg'"
                      class="conversation-avatar"
                      [alt]="conv.userName || 'User'">
                    @if (conv.hasUnread) {
                      <span class="conversation-unread-dot" aria-hidden="true"></span>
                    }
                  </div>
                  <div class="conversation-body min-w-0">
                    <div class="conversation-top">
                      <h6 class="conversation-name mb-0">{{ conv.userName || 'Пользователь' }}</h6>
                      <small class="conversation-time">{{ getMessageDate(conv.lastMessageTime) }}</small>
                    </div>
                    <p class="conversation-preview text-truncate mb-0">{{ conv.lastMessage }}</p>
                  </div>
                  <button
                    type="button"
                    class="btn-delete"
                    title="Удалить переписку"
                    (click)="$event.stopPropagation(); deleteConversation(conv.userId)">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            }
          </div>
        </aside>

        <section class="mailbox-chat-panel">
          @if (selectedUserId) {
            <app-conversation-panel
              [userId]="selectedUserId"
              [reloadToken]="conversationReloadToken"
              [showBackButton]="isMobileView"
              (back)="closeChat()"
              (messageSent)="onMessageSent()"
              (conversationLoaded)="onConversationLoaded()">
            </app-conversation-panel>
          } @else {
            <div class="chat-placeholder">
              <i class="bi bi-chat-dots"></i>
              <h5>Выберите диалог</h5>
              <p>Нажмите на переписку слева, чтобы открыть чат</p>
            </div>
          }
        </section>
      </div>
    }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 0;
      width: 100%;
      max-width: 100%;
    }

    .empty-state {
      max-width: 500px;
      margin: 2rem auto;
    }

    .mailbox-card {
      display: grid;
      grid-template-columns: 1fr;
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      box-shadow: var(--shadow-md);
      overflow: hidden;
      min-height: 420px;
    }

    .mailbox-list-panel {
      display: flex;
      flex-direction: column;
      border-right: 1px solid var(--border-color);
      min-height: 0;
      background: var(--card-bg);
    }

    .list-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border-color);
      flex-shrink: 0;
    }

    .list-panel-title {
      font-weight: 700;
      color: var(--text-primary);
    }

    .list-panel-count {
      font-size: 0.8rem;
      color: var(--text-muted);
      background: var(--bg-secondary);
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
    }

    .conversation-list {
      overflow-y: auto;
      overflow-x: hidden;
      flex: 1;
    }

    .conversation-swipe-wrap {
      position: relative;
      overflow: hidden;
      border-bottom: 1px solid var(--border-light);

      &:last-child {
        border-bottom: none;
      }
    }

    .conversation-swipe-actions {
      display: none;
    }

    .conversation-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      cursor: pointer;
      transition: background 0.2s ease, transform 0.2s ease;
      position: relative;
      z-index: 1;
      background: var(--card-bg);
      will-change: transform;

      &.swipe-dragging {
        transition: background 0.2s ease;
      }

      &:hover {
        background: var(--bg-hover);
      }

      &.active {
        background: linear-gradient(135deg, rgba(253, 41, 123, 0.08) 0%, rgba(255, 101, 91, 0.06) 100%);
        border-left: 3px solid var(--accent-pink);
        padding-left: calc(1rem - 3px);
      }

      &.unread:not(.active) {
        background: rgba(253, 41, 123, 0.04);
      }
    }

    .conversation-avatar-wrap {
      position: relative;
      width: 48px;
      height: 48px;
      flex-shrink: 0;
    }

    .conversation-unread-dot {
      position: absolute;
      top: 0;
      right: 0;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--accent-pink);
      border: 2px solid var(--card-bg);
      box-shadow: 0 0 0 1px rgba(253, 41, 123, 0.25);
    }

    .conversation-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid var(--border-light);
      flex-shrink: 0;
    }

    .conversation-body {
      flex: 1;
      min-width: 0;
    }

    .conversation-top {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 0.5rem;
      margin-bottom: 0.2rem;
    }

    .conversation-name {
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      .conversation-item.unread & {
        font-weight: 700;
      }
    }

    .conversation-preview {
      color: var(--text-secondary);
      font-size: 0.875rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      .conversation-item.unread & {
        color: var(--text-primary);
        font-weight: 600;
      }
    }

    .conversation-time {
      font-size: 0.75rem;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .btn-delete {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 0.35rem;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease, color 0.2s ease;
      flex-shrink: 0;

      &:hover {
        color: var(--accent-red);
      }
    }

    .mailbox-chat-panel {
      display: flex;
      flex-direction: column;
      min-height: 0;
      min-width: 0;
      background: var(--bg-secondary);
    }

    .chat-placeholder {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 2rem;
      color: var(--text-secondary);

      i {
        font-size: 3.5rem;
        margin-bottom: 1rem;
        opacity: 0.35;
        color: var(--accent-pink);
      }

      h5 {
        color: var(--text-primary);
        margin-bottom: 0.5rem;
      }

      p {
        margin: 0;
        font-size: 0.9rem;
        color: var(--text-muted);
      }
    }

    .min-w-0 { min-width: 0; }

    @media (max-width: 991.98px) {
      .page-layout,
      .page-col {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        height: 100%;
        margin-left: 0;
        margin-right: 0;
        padding-left: 0;
        padding-right: 0;
      }
    }

    @media (min-width: 992px) {
      .mailbox-card {
        grid-template-columns: 320px 1fr;
        height: calc(100dvh - var(--header-height) - 7.5rem);
        max-height: 760px;
        min-height: 520px;
      }

      .mailbox-list-panel,
      .mailbox-chat-panel {
        height: 100%;
      }

      .chat-placeholder {
        display: flex;
      }

      .conversation-item:hover .btn-delete,
      .conversation-item:focus-within .btn-delete {
        opacity: 1;
        pointer-events: auto;
      }
    }

    @media (max-width: 991.98px) {
      .conversation-swipe-actions {
        display: flex;
        align-items: center;
        justify-content: center;
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        width: 72px;
        z-index: 0;
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
        font-size: 1.05rem;
        border: none;
        cursor: pointer;
        padding: 0;
        visibility: hidden;
        pointer-events: none;

        i {
          font-size: 1.05rem;
          line-height: 1;
        }
      }

      .conversation-swipe-wrap.swipe-delete-revealed .conversation-swipe-actions {
        visibility: visible;
        pointer-events: auto;
      }

      .conversation-item {
        width: 100%;
        box-sizing: border-box;

        &::after {
          content: '';
          position: absolute;
          top: 0;
          right: -4px;
          width: 4px;
          height: 100%;
          background: inherit;
          pointer-events: none;
        }
      }

      .btn-delete {
        display: none;
      }

      .mailbox-card:not(.chat-open) .mailbox-chat-panel {
        display: none;
      }

      .mailbox-card.chat-open .mailbox-list-panel {
        display: none;
      }

      .mailbox-card.chat-open {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: calc(100dvh - var(--header-height) - 2.5rem);
        height: calc(100dvh - var(--header-height) - 2.5rem);
        max-height: calc(100dvh - var(--header-height) - 2.5rem);
        overflow: hidden;
      }

      .mailbox-card.chat-open .mailbox-chat-panel {
        flex: 1;
        min-height: 0;
        height: auto;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      :host:has(.mailbox-card.chat-open) {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        height: calc(100dvh - var(--header-height) - 2.5rem);
        max-height: calc(100dvh - var(--header-height) - 2.5rem);
      }
    }
  `]
})
export class MailboxComponent implements OnInit, OnDestroy {
  conversations: UserConversation[] = [];
  loading = false;
  selectedUserId: string | null = null;
  conversationReloadToken = 0;
  isMobileView = false;
  swipeDragUserId: string | null = null;
  swipeOffset = 0;

  private readonly swipeActionWidth = 72;
  private readonly swipeOpenThreshold = 34;
  private readonly swipeDeleteThreshold = 60;
  private openedSwipeOffsets: Record<string, number> = {};
  private swipeMoved = false;
  private swipeStartX = 0;
  private swipeStartOffset = 0;
  private messages: UserMail[] = [];
  private pageable: PageableRequest = { page: 0, size: 100 };
  private currentUserId?: string;
  private destroy$ = new Subject<void>();
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private readonly destroyRef = inject(DestroyRef);
  private readonly pullToRefreshService = inject(PullToRefreshService);

  constructor(
    private mailboxService: MailboxService,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private modalService: ModalService
  ) {}

  @HostListener('window:resize')
  onResize(): void {
    this.updateMobileView();
  }

  ngOnInit(): void {
    this.updateMobileView();
    localStorage.setItem('mailbox_last_read', Date.now().toString());
    this.loadCurrentUserId();

    subscribeCachedRouteRefresh(this.router, this.destroyRef, (url) => {
      return normalizeRouteUrl(url) === '/mailbox';
    }, () => {
      if (!this.selectedUserId) {
        this.loadMessages();
      }
    });

    registerPullToRefresh(this.pullToRefreshService, this.destroyRef, (url) => normalizeRouteUrl(url) === '/mailbox', () => ({
      refresh: () => this.loadMessages(),
      isEnabled: () => !this.selectedUserId && !this.loading,
    }));

    subscribeCachedRouteRefresh(this.router, this.destroyRef, (url) => {
      return /^\/mailbox\/[^/]+$/.test(normalizeRouteUrl(url));
    }, () => {
      if (this.selectedUserId) {
        this.conversationReloadToken++;
      }
    });

    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const nextSelectedUserId = params.get('userId');
      const wasSelected = !!this.selectedUserId;
      const openedConversation = !!nextSelectedUserId && nextSelectedUserId !== this.selectedUserId;
      this.selectedUserId = nextSelectedUserId;
      if (this.selectedUserId) {
        if (this.route.snapshot.queryParamMap.has('refresh')) {
          this.conversationReloadToken++;
          void this.router.navigate(['/mailbox', this.selectedUserId], { replaceUrl: true });
        }
        this.ensureSelectedConversationInList();
        if (openedConversation) {
          this.clearConversationUnread(this.selectedUserId);
        }
      } else if (wasSelected) {
        this.loadMessages();
      }
    });

    this.refreshInterval = setInterval(() => {
      if (!this.loading) {
        this.loadMessages();
      }
    }, 15_000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectConversation(userId: string): void {
    this.closeAllSwipes();
    if (this.selectedUserId === userId && isLayoutCachingEnabled()) {
      this.conversationReloadToken++;
    }
    this.router.navigate(['/mailbox', userId]);
  }

  onConversationClick(userId: string): void {
    if (!this.isMobileView) {
      this.selectConversation(userId);
      return;
    }
    if (this.swipeMoved) {
      return;
    }
    const offset = this.getSavedSwipeOffset(userId);
    if (offset < 0) {
      this.openedSwipeOffsets[userId] = 0;
      return;
    }
    this.selectConversation(userId);
  }

  onSwipeDeleteClick(userId: string, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.openedSwipeOffsets[userId] = 0;
    void this.deleteConversation(userId);
  }

  onSwipeStart(userId: string, event: TouchEvent): void {
    if (!this.isMobileView || event.touches.length !== 1) {
      return;
    }
    this.closeOtherSwipes(userId);
    const touch = event.touches[0];
    this.swipeDragUserId = userId;
    this.swipeStartX = touch.clientX;
    this.swipeStartOffset = this.getSavedSwipeOffset(userId);
    this.swipeOffset = this.swipeStartOffset;
    this.swipeMoved = false;
  }

  onSwipeMove(userId: string, event: TouchEvent): void {
    if (!this.isMobileView || this.swipeDragUserId !== userId || event.touches.length !== 1) {
      return;
    }
    const touch = event.touches[0];
    const delta = touch.clientX - this.swipeStartX;
    if (Math.abs(delta) > 6) {
      this.swipeMoved = true;
    }
    this.swipeOffset = this.clampSwipeOffset(this.swipeStartOffset + delta);
    if (this.swipeMoved) {
      event.preventDefault();
    }
  }

  onSwipeEnd(userId: string): void {
    if (!this.isMobileView || this.swipeDragUserId !== userId) {
      return;
    }

    if (this.swipeOffset <= -this.swipeDeleteThreshold) {
      this.resetSwipeState();
      this.openedSwipeOffsets[userId] = 0;
      void this.deleteConversation(userId);
      return;
    }

    if (this.swipeOffset <= -this.swipeOpenThreshold) {
      this.openedSwipeOffsets[userId] = -this.swipeActionWidth;
    } else {
      this.openedSwipeOffsets[userId] = 0;
    }

    this.resetSwipeState();
  }

  getItemTransform(userId: string): string {
    const offset = this.swipeDragUserId === userId
      ? this.swipeOffset
      : this.getSavedSwipeOffset(userId);
    return offset ? `translateX(${offset}px)` : '';
  }

  isSwipeDeleteRevealed(userId: string): boolean {
    if (this.swipeDragUserId === userId) {
      return this.swipeOffset < 0;
    }
    return this.getSavedSwipeOffset(userId) < -this.swipeOpenThreshold;
  }

  private getSavedSwipeOffset(userId: string): number {
    return this.openedSwipeOffsets[userId] ?? 0;
  }

  private clampSwipeOffset(offset: number): number {
    return Math.max(-this.swipeActionWidth, Math.min(0, offset));
  }

  private resetSwipeState(): void {
    this.swipeDragUserId = null;
    this.swipeOffset = 0;
    this.swipeStartX = 0;
    this.swipeStartOffset = 0;
    setTimeout(() => {
      this.swipeMoved = false;
    }, 0);
  }

  private closeOtherSwipes(userId: string): void {
    Object.keys(this.openedSwipeOffsets).forEach((id) => {
      if (id !== userId) {
        this.openedSwipeOffsets[id] = 0;
      }
    });
  }

  private closeAllSwipes(): void {
    this.openedSwipeOffsets = {};
    this.resetSwipeState();
  }

  closeChat(): void {
    this.router.navigate(['/mailbox']);
  }

  onMessageSent(): void {
    this.loadMessages();
  }

  onConversationLoaded(): void {
    if (this.selectedUserId) {
      this.clearConversationUnread(this.selectedUserId);
    }
    this.loadMessages();
  }

  private updateMobileView(): void {
    this.isMobileView = typeof window !== 'undefined' && window.innerWidth < 992;
  }

  private loadCurrentUserId(): void {
    this.userService.getCurrentUser().pipe(takeUntil(this.destroy$)).subscribe({
      next: (user) => {
        this.currentUserId = user.id;
        this.loadMessages();
      },
      error: () => {
        this.loadMessages();
      }
    });
  }

  private loadMessages(): void {
    this.loading = true;
    this.mailboxService.getMailbox(this.pageable).pipe(takeUntil(this.destroy$)).subscribe({
      next: (messages) => {
        this.messages = messages;
        if (this.currentUserId) {
          this.groupByUsers();
        }
        if (this.selectedUserId) {
          this.ensureSelectedConversationInList();
        }
        this.loading = false;
      },
      error: () => {
        if (this.selectedUserId) {
          this.ensureSelectedConversationInList();
        }
        this.loading = false;
      }
    });
  }

  private groupByUsers(): void {
    const userMap = new Map<string, UserMail>();
    const unreadUsers = new Set<string>();

    this.messages.forEach(message => {
      if (!isSystemMailVisibleToViewer(message, this.currentUserId)) {
        return;
      }
      const otherUserId = message.from === this.currentUserId ? message.to : message.from;
      if (!otherUserId) {
        return;
      }
      if (
        message.to === this.currentUserId
        && message.from === otherUserId
        && message.isRead !== true
      ) {
        unreadUsers.add(otherUserId);
      }
      const existing = userMap.get(otherUserId);
      if (!existing || this.isNewer(message.timestamp, existing.timestamp)) {
        userMap.set(otherUserId, message);
      }
    });

    const prevPhotos = new Map(this.conversations.map(c => [c.userId, c.userPhotoUrl]));
    const prevNames = new Map(this.conversations.map(c => [c.userId, c.userName]));

    this.conversations = Array.from(userMap.entries()).map(([userId, message]) => ({
      userId,
      userName: prevNames.get(userId),
      userPhotoUrl: prevPhotos.get(userId) ?? this.userService.peekCachedPhotoUrl(userId, 'thumb'),
      lastMessage: this.formatConversationPreview(message),
      lastMessageTime: message.timestamp,
      hasUnread: unreadUsers.has(userId) && userId !== this.selectedUserId,
    }));

    this.conversations.sort((a, b) => {
      return this.getTimestampSeconds(b.lastMessageTime) - this.getTimestampSeconds(a.lastMessageTime);
    });

    this.conversations.forEach(conv => {
      if (!conv.userName) {
        this.userService.getUserById(conv.userId).pipe(takeUntil(this.destroy$)).subscribe({
          next: (user: UserInfo) => {
            conv.userName = user.name;
            if (!conv.userPhotoUrl) {
              this.loadUserPhoto(conv);
            }
          },
          error: () => {
            conv.userName = 'Пользователь #' + conv.userId;
          }
        });
      }
      if (!conv.userPhotoUrl) {
        this.loadUserPhoto(conv);
      }
    });
  }

  private ensureSelectedConversationInList(): void {
    if (!this.selectedUserId) {
      return;
    }
    if (this.conversations.some(conv => conv.userId === this.selectedUserId)) {
      return;
    }

    const conv: UserConversation = {
      userId: this.selectedUserId,
      userName: undefined,
      userPhotoUrl: this.userService.peekCachedPhotoUrl(this.selectedUserId, 'thumb'),
      lastMessage: '',
      lastMessageTime: { seconds: Math.floor(Date.now() / 1000) },
      hasUnread: false,
    };
    this.conversations = [conv, ...this.conversations];

    this.userService.getUserById(this.selectedUserId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (user: UserInfo) => {
        conv.userName = user.name;
        this.loadUserPhoto(conv);
      },
      error: () => {
        conv.userName = 'Пользователь #' + this.selectedUserId;
      }
    });
    this.loadUserPhoto(conv);
  }

  private loadUserPhoto(conv: UserConversation): void {
    this.userService.getCachedPhotoUrl(conv.userId, 'thumb').pipe(takeUntil(this.destroy$)).subscribe({
      next: (url) => {
        conv.userPhotoUrl = url;
      },
      error: () => {
        conv.userPhotoUrl = null;
      }
    });
  }

  private clearConversationUnread(userId: string): void {
    const conversation = this.conversations.find(conv => conv.userId === userId);
    if (conversation) {
      conversation.hasUnread = false;
    }
  }

  private isNewer(timeA: unknown, timeB: unknown): boolean {
    return this.getTimestampSeconds(timeA) > this.getTimestampSeconds(timeB);
  }

  private formatConversationPreview(message: UserMail): string {
    if (message.mediaType === 'VOICE') {
      return message.message?.trim() ? `🎤 ${message.message}` : '🎤 Голосовое';
    }
    if (message.mediaType === 'PHOTO') {
      return message.message?.trim() ? `📷 ${message.message}` : '📷 Фото';
    }
    if (message.mediaType === 'VIDEO_NOTE') {
      return message.message?.trim() ? `🎬 ${message.message}` : '🎬 Видео';
    }
    return message.message || '';
  }

  private getTimestampSeconds(timestamp: unknown): number {
    const ms = parseTimestampMs(timestamp);
    return ms != null ? Math.floor(ms / 1000) : 0;
  }

  async deleteConversation(userId: string): Promise<void> {
    const confirmed = await this.modalService.confirm('Удалить переписку?', 'Подтверждение');
    if (!confirmed) {
      return;
    }
    this.mailboxService.deleteMail(userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        delete this.openedSwipeOffsets[userId];
        if (this.selectedUserId === userId) {
          this.closeChat();
        }
        this.loadMessages();
      },
      error: () => { /* shown by HTTP interceptor */ }
    });
  }

  getMessageDate(timestamp: unknown): string {
    return formatMessageTime(timestamp);
  }
}
