import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { NgClass } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { UserInfo } from '../../core/models/user.model';
import { UserService } from '../../core/services/user.service';
import { MailboxService } from '../../core/services/mailbox.service';
import { MeetingsService } from '../../core/services/meetings.service';
import { ThemeService } from '../../core/services/theme.service';
import { PushNotificationService } from '../../core/services/push-notification.service';
import { clearLayoutRouteCache } from '../../core/routing/mobile-route-reuse.strategy';
import { PullToRefreshService } from '../../core/routing/pull-to-refresh.service';
import { isStandalonePwa } from '../utils/pwa.util';
import { Subject, Subscription, filter, takeUntil } from 'rxjs';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterLink, RouterOutlet, RouterLinkActive, NgClass],
  template: `
    <header
      class="site-header"
      [class.site-header--glass]="headerScrollProgress > 0.02"
      [style.--header-scroll-progress]="headerScrollProgress">
      <div class="site-header__gradient" aria-hidden="true"></div>
      <div class="site-header__glass" aria-hidden="true"></div>
      <div class="header-content">
        <a class="header-logo" routerLink="/swipe" aria-label="Bioritmic">
          <div class="logo-couple">
            <i class="bi bi-person-heart"></i>
            <i class="bi bi-person-hearts"></i>
          </div>
          <span class="logo-text">Bioritmic</span>
        </a>

        <nav class="header-nav">
          <a routerLink="/swipe" routerLinkActive="active" class="nav-btn" title="Поиск">
            <i class="bi bi-people"></i>
          </a>
          @if (isUserVerified) {
            <a routerLink="/bookmarks" routerLinkActive="active" class="nav-btn" title="Избранное">
              <i class="bi bi-bookmark-heart"></i>
            </a>
            <a routerLink="/mailbox" routerLinkActive="active" class="nav-btn" title="Сообщения">
              <i class="bi bi-chat-heart"></i>
              @if (unreadCount > 0) {
                <span class="notification-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
              }
            </a>
            <a routerLink="/meetings" routerLinkActive="active" class="nav-btn" title="Встречи">
              <i class="bi bi-calendar-event"></i>
              @if (newMeetingsCount > 0) {
                <span class="notification-badge badge-meetings">{{ newMeetingsCount > 99 ? '99+' : newMeetingsCount }}</span>
              }
            </a>
          }
          @if (isUserAdmin) {
            <a routerLink="/admin" routerLinkActive="active" class="nav-btn" title="Админ-панель">
              <i class="bi bi-shield-lock"></i>
            </a>
          }
        </nav>

        <div class="user-menu">
          <button class="nav-btn theme-toggle" (click)="themeService.toggle()" [title]="themeService.isDark() ? 'Светлая тема' : 'Тёмная тема'">
            <i class="bi" [ngClass]="themeService.isDark() ? 'bi-sun-fill' : 'bi-moon-stars-fill'"></i>
          </button>
          <a routerLink="/profile" class="nav-btn" title="Профиль">
            <i class="bi bi-person-circle"></i>
          </a>
          <a href="#" (click)="logout($event)" class="nav-btn" title="Выйти">
            <i class="bi bi-box-arrow-right"></i>
          </a>
        </div>
      </div>
    </header>

    <main class="main-container layout-main">
      @if (!isUserVerified) {
        <div class="alert alert-warning verification-alert d-flex align-items-center mb-3" role="alert">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          <div class="flex-grow-1">
            <strong>Подтвердите email.</strong>
            Мы отправили письмо с кодом — перейдите по ссылке или введите код на странице подтверждения.
            <a routerLink="/auth/verify-email" class="alert-link ms-1">Подтвердить email</a>
            ·
            <button
              type="button"
              class="btn btn-link btn-sm p-0 align-baseline alert-link"
              [disabled]="resendLoading || resendCooldown > 0"
              (click)="resendVerificationEmail()">
              @if (resendLoading) {
                <span class="spinner-border spinner-border-sm"></span>
              } @else if (resendCooldown > 0) {
                Повторить через {{ resendCooldown }}с
              } @else {
                Отправить письмо повторно
              }
            </button>
          </div>
        </div>
      }
      <div
        class="layout-pull-host"
        [class.layout-pull-active]="pullRefreshOffset > 0 || pullRefreshing"
        [style.paddingTop.px]="pullRefreshing ? 40 : pullRefreshOffset">
        @if (pullRefreshOffset > 0 || pullRefreshing) {
          <div
            class="layout-pull-refresh-indicator"
            [class.ready]="pullRefreshOffset >= pullRefreshThreshold"
            [style.minHeight.px]="pullRefreshing ? 40 : pullRefreshOffset">
            @if (pullRefreshing) {
              <div class="spinner-border spinner-border-sm text-secondary" role="status">
                <span class="visually-hidden">Обновление...</span>
              </div>
            } @else {
              <i class="bi bi-arrow-down-short layout-pull-refresh-icon"></i>
            }
          </div>
        }
        <div
          class="layout-outlet">
          <router-outlet></router-outlet>
        </div>
      </div>
    </main>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      min-height: 100dvh;
      width: 100%;
      max-width: 100%;
      overflow-x: clip;
      overscroll-behavior-x: none;
      background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
    }

    .logo-couple {
      display: flex;
      align-items: center;
      gap: 2px;
      font-size: 1.5rem;
      
      i {
        color: white;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
      }
      
      i:first-child {
        transform: rotate(-5deg);
      }
      
      i:last-child {
        transform: rotate(5deg);
      }
    }

    .nav-btn {
      position: relative;
    }

    .notification-badge {
      position: absolute;
      top: 4px;
      right: 0px;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      background: #ef4444;
      color: white;
      border-radius: 9px;
      font-size: 0.65rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      border: 2px solid white;
      animation: badgePulse 2s ease infinite;
      z-index: 10;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .badge-meetings {
      background: #f59e0b;
      border-color: white;
    }

    @keyframes badgePulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.15); }
    }

    .theme-toggle {
      cursor: pointer;
      background: none;
      border: none;

      i {
        transition: transform 0.3s ease;
      }

      &:hover i {
        transform: rotate(20deg) scale(1.1);
      }
    }

    .layout-pull-host {
      position: relative;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      transition: padding-top 0.15s ease;
    }

    .layout-pull-host.layout-pull-active {
      transition: none;
    }

    .layout-pull-refresh-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      pointer-events: none;
    }

    .layout-pull-refresh-indicator.ready .layout-pull-refresh-icon {
      transform: rotate(180deg);
    }

    .layout-pull-refresh-icon {
      font-size: 1.5rem;
      line-height: 1;
      transition: transform 0.15s ease;
    }

    .layout-outlet {
      position: relative;
      min-height: calc(100dvh - 5.5rem);
      width: 100%;
      max-width: 100%;
      min-width: 0;
    }
  `]
})
export class LayoutComponent implements OnInit, OnDestroy {
  currentUser: UserInfo | null = null;
  userPhoto: string | null = null;
  unreadCount = 0;
  newMeetingsCount = 0;
  isUserAdmin = false;
  isUserVerified = true;
  resendLoading = false;
  resendCooldown = 0;
  headerScrollProgress = 0;
  pullRefreshOffset = 0;
  pullRefreshing = false;
  readonly pullRefreshThreshold = 64;
  private readonly headerScrollFadeDistance = 96;
  private resendCooldownInterval: ReturnType<typeof setInterval> | null = null;
  private pollingIntervalId: ReturnType<typeof setInterval> | null = null;
  private routerSubscription: Subscription | null = null;
  private userSubscription: Subscription | null = null;
  private prevUnreadCount = 0;
  private prevMeetingsCount = 0;
  private unreadBaselineSet = false;
  private meetingsBaselineSet = false;
  private pushInitDone = false;
  private pullTracking = false;
  private pullStartY = 0;
  private pullTouchStartHandler: ((event: TouchEvent) => void) | null = null;
  private pullTouchMoveHandler: ((event: TouchEvent) => void) | null = null;
  private pullTouchEndHandler: (() => void) | null = null;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private mailboxService: MailboxService,
    private meetingsService: MeetingsService,
    private router: Router,
    public themeService: ThemeService,
    private pushService: PushNotificationService,
    private pullToRefreshService: PullToRefreshService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.updateHeaderScrollProgress();
    this.pullToRefreshService.setCurrentRoute(this.router.url);
    this.bindPullToRefresh();
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isUserAdmin = !!(user?.role && user.role.includes('ADMIN'));
      this.isUserVerified = user?.isVerified !== false;
      if (user?.id) {
        this.loadUserPhoto(user.id);
        this.startPolling();
        void this.initPushNotifications();
      } else {
        this.stopPolling();
        this.pushInitDone = false;
      }
    });

    this.routerSubscription = this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      )
      .subscribe((event) => {
        this.updateHeaderScrollProgress();
        this.pullToRefreshService.setCurrentRoute(event.urlAfterRedirects);
        if (event.urlAfterRedirects?.startsWith('/mailbox')) {
          this.markMessagesAsRead();
        }
        if (event.urlAfterRedirects?.startsWith('/meetings')) {
          this.markMeetingsAsRead();
        }
      });
  }

  ngOnDestroy(): void {
    this.unbindPullToRefresh();
    this.stopPolling();
    if (this.resendCooldownInterval) {
      clearInterval(this.resendCooldownInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
    this.routerSubscription?.unsubscribe();
    this.userSubscription?.unsubscribe();
    this.userService.releasePhotoUrl(this.userPhoto);
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.updateHeaderScrollProgress();
  }

  private updateHeaderScrollProgress(): void {
    if (typeof window === 'undefined') {
      return;
    }
    const progress = Math.min(1, Math.max(0, window.scrollY / this.headerScrollFadeDistance));
    this.headerScrollProgress = Math.round(progress * 100) / 100;
  }

  private isPullToRefreshEnabled(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return isStandalonePwa() || window.matchMedia('(max-width: 767.98px)').matches;
  }

  private bindPullToRefresh(): void {
    this.unbindPullToRefresh();
    if (!this.isPullToRefreshEnabled()) {
      return;
    }

    this.pullTouchStartHandler = (event: TouchEvent) => {
      if (this.pullRefreshing || !this.pullToRefreshService.canPull()) {
        return;
      }
      const pullFromZone = this.isTouchOnPullRefreshZone(event);
      if (this.shouldDeferPullGesture(event)) {
        return;
      }
      if (!pullFromZone && this.pullToRefreshService.getScrollTop() > 0) {
        return;
      }
      this.pullStartY = event.touches[0]?.clientY ?? 0;
      this.pullTracking = true;
    };

    this.pullTouchMoveHandler = (event: TouchEvent) => {
      if (this.shouldDeferPullGesture(event)) {
        this.pullTracking = false;
        this.pullRefreshOffset = 0;
        return;
      }
      if (!this.pullTracking || event.touches.length !== 1) {
        return;
      }
      const deltaY = (event.touches[0]?.clientY ?? 0) - this.pullStartY;
      if (deltaY <= 0) {
        this.pullTracking = false;
        this.pullRefreshOffset = 0;
        return;
      }
      if (!this.isTouchOnPullRefreshZone(event) && this.pullToRefreshService.getScrollTop() > 0) {
        this.pullTracking = false;
        this.pullRefreshOffset = 0;
        return;
      }
      this.pullRefreshOffset = Math.min(deltaY * 0.45, 96);
      if (this.pullRefreshOffset > 12 && event.cancelable) {
        event.preventDefault();
      }
      this.cdr.markForCheck();
    };

    this.pullTouchEndHandler = () => {
      if (!this.pullTracking) {
        return;
      }
      const shouldRefresh = this.pullRefreshOffset >= this.pullRefreshThreshold;
      this.pullTracking = false;
      this.pullRefreshOffset = 0;
      if (shouldRefresh) {
        void this.runPullRefresh();
      }
      this.cdr.markForCheck();
    };

    document.addEventListener('touchstart', this.pullTouchStartHandler, { passive: true });
    document.addEventListener('touchmove', this.pullTouchMoveHandler, { passive: false });
    document.addEventListener('touchend', this.pullTouchEndHandler, { passive: true });
    document.addEventListener('touchcancel', this.pullTouchEndHandler, { passive: true });
  }

  private unbindPullToRefresh(): void {
    if (this.pullTouchStartHandler) {
      document.removeEventListener('touchstart', this.pullTouchStartHandler);
    }
    if (this.pullTouchMoveHandler) {
      document.removeEventListener('touchmove', this.pullTouchMoveHandler);
    }
    if (this.pullTouchEndHandler) {
      document.removeEventListener('touchend', this.pullTouchEndHandler);
      document.removeEventListener('touchcancel', this.pullTouchEndHandler);
    }
    this.pullTouchStartHandler = null;
    this.pullTouchMoveHandler = null;
    this.pullTouchEndHandler = null;
    this.pullTracking = false;
    this.pullRefreshOffset = 0;
    this.pullRefreshing = false;
  }

  private async runPullRefresh(): Promise<void> {
    this.pullRefreshing = true;
    this.cdr.markForCheck();
    try {
      await this.pullToRefreshService.execute();
    } finally {
      this.pullRefreshing = false;
      this.cdr.markForCheck();
    }
  }

  private shouldDeferPullGesture(event: TouchEvent): boolean {
    if (this.isTouchOnPullRefreshZone(event)) {
      return false;
    }
    const touchTarget = this.getTouchTargetElement(event);
    const activeScrollElement = this.pullToRefreshService.getActive()?.getScrollElement?.() ?? null;

    if (activeScrollElement && touchTarget?.isConnected && activeScrollElement.contains(touchTarget)) {
      return activeScrollElement.scrollTop > 0;
    }

    const scrollable = this.findScrollableAncestor(touchTarget);
    if (!scrollable) {
      return false;
    }
    if (scrollable === document.documentElement || scrollable === document.body) {
      return false;
    }
    if (activeScrollElement && scrollable === activeScrollElement) {
      return scrollable.scrollTop > 0;
    }
    return scrollable.scrollTop > 0;
  }

  private isTouchOnPullRefreshZone(event: TouchEvent): boolean {
    const target = this.getTouchTargetElement(event);
    return !!target?.closest('[data-pull-refresh-zone]');
  }

  private getTouchTargetElement(event: TouchEvent): Element | null {
    if (event.target instanceof Element) {
      return event.target;
    }
    const touch = event.touches[0] ?? event.changedTouches[0];
    if (!touch) {
      return null;
    }
    return document.elementFromPoint(touch.clientX, touch.clientY);
  }

  private findScrollableAncestor(element: Element | null): HTMLElement | null {
    let el = element instanceof HTMLElement ? element : element?.parentElement ?? null;
    while (el) {
      if (el === document.documentElement || el === document.body) {
        return el;
      }
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      const canScrollY = (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')
        && el.scrollHeight > el.clientHeight + 1;
      if (canScrollY) {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  private async initPushNotifications(): Promise<void> {
    if (this.pushInitDone) {
      return;
    }
    this.pushInitDone = true;
    this.pushService.syncEnabledWithPermission();
    if (this.pushService.isActive()) {
      await this.pushService.ensureRegistered();
    }
  }

  private startPolling(): void {
    this.stopPolling();
    this.loadUnreadCount();
    this.loadNewMeetingsCount();
    this.pollingIntervalId = setInterval(() => {
      this.loadUnreadCount();
      this.loadNewMeetingsCount();
    }, 30000);
  }

  private stopPolling(): void {
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = null;
    }
    this.unreadBaselineSet = false;
    this.meetingsBaselineSet = false;
    this.prevUnreadCount = 0;
    this.prevMeetingsCount = 0;
  }

  private destroy$ = new Subject<void>();
  private isLoadingUnread = false;
  private isLoadingMeetings = false;
  private loadUnreadCount(): void {
    if (this.isLoadingUnread) return;
    this.isLoadingUnread = true;
    const lastReadTime = localStorage.getItem('mailbox_last_read');
    const since = lastReadTime ? parseInt(lastReadTime, 10) : 0;
    this.mailboxService.getBadgeCount(since).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.isLoadingUnread = false;
        if (!this.unreadBaselineSet) {
          this.unreadBaselineSet = true;
        } else if (res.count > this.prevUnreadCount && this.pushService.getMode() !== 'fcm') {
          this.pushService.showLocalNotification('Новое сообщение', 'У вас новые сообщения', 'mailbox');
        }
        this.prevUnreadCount = res.count;
        this.unreadCount = res.count;
      },
      error: () => { this.isLoadingUnread = false; }
    });
  }

  private loadNewMeetingsCount(): void {
    if (this.isLoadingMeetings) return;
    this.isLoadingMeetings = true;
    const lastReadTime = localStorage.getItem('meetings_last_read');
    const since = lastReadTime ? parseInt(lastReadTime, 10) : 0;
    this.meetingsService.getBadgeCount(since).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.isLoadingMeetings = false;
        if (!this.meetingsBaselineSet) {
          this.meetingsBaselineSet = true;
        } else if (res.count > this.prevMeetingsCount && this.pushService.getMode() !== 'fcm') {
          this.pushService.showLocalNotification('Новая встреча', 'У вас новые предложения встреч', {
            type: 'meeting',
            url: '/meetings',
          });
        }
        this.prevMeetingsCount = res.count;
        this.newMeetingsCount = res.count;
      },
      error: () => { this.isLoadingMeetings = false; }
    });
  }

  private markMessagesAsRead(): void {
    localStorage.setItem('mailbox_last_read', Date.now().toString());
    this.unreadCount = 0;
    this.prevUnreadCount = 0;
  }

  private markMeetingsAsRead(): void {
    localStorage.setItem('meetings_last_read', Date.now().toString());
    this.newMeetingsCount = 0;
    this.prevMeetingsCount = 0;
  }

  private loadUserPhoto(userId: string): void {
    this.userService.getPhoto(userId).subscribe({
      next: (bytes: Uint8Array) => {
        this.userService.releasePhotoUrl(this.userPhoto);
        this.userPhoto = UserService.createPhotoUrl(bytes);
      },
      error: () => {
        this.userPhoto = null;
      }
    });
  }

  resendVerificationEmail(): void {
    if (this.resendLoading || this.resendCooldown > 0) {
      return;
    }
    this.resendLoading = true;
    this.authService.resendVerificationEmail().pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.resendLoading = false;
        this.resendCooldown = 60;
        if (this.resendCooldownInterval) {
          clearInterval(this.resendCooldownInterval);
        }
        this.resendCooldownInterval = setInterval(() => {
          this.resendCooldown--;
          if (this.resendCooldown <= 0 && this.resendCooldownInterval) {
            clearInterval(this.resendCooldownInterval);
            this.resendCooldownInterval = null;
          }
        }, 1000);
      },
      error: () => {
        this.resendLoading = false;
      }
    });
  }

  logout(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    void this.performLogout();
  }

  private async performLogout(): Promise<void> {
    try {
      await this.pushService.disable();
    } catch {
      this.pushService.clearLocalPushState();
    }
    this.authService.logout().subscribe({
      complete: () => {
        clearLayoutRouteCache();
        this.authService.clearAuth();
        this.router.navigate(['/auth/login']);
      },
      error: () => {
        clearLayoutRouteCache();
        this.authService.clearAuth();
        this.router.navigate(['/auth/login']);
      }
    });
  }
}
