import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { NgClass } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { UserInfo } from '../../core/models/user.model';
import { UserService } from '../../core/services/user.service';
import { MailboxService } from '../../core/services/mailbox.service';
import { MeetingsService } from '../../core/services/meetings.service';
import { ThemeService } from '../../core/services/theme.service';
import { PushNotificationService } from '../../core/services/push-notification.service';
import { Subject, Subscription, filter, takeUntil } from 'rxjs';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterLink, RouterOutlet, RouterLinkActive, NgClass],
  template: `
    <header class="site-header">
      <div class="header-content">
        <a class="header-logo" routerLink="/swipe">
          <div class="logo-couple">
            <i class="bi bi-person-heart"></i>
            <i class="bi bi-person-hearts"></i>
          </div>
          <span>Bioritmic</span>
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

    <main class="main-container">
      @if (!isUserVerified) {
        <div class="alert alert-warning verification-alert d-flex align-items-center mb-3" role="alert">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          <div>
            <strong>Аккаунт не верифицирован.</strong> Подтвердите email для полного доступа к функционалу.
          </div>
        </div>
      }
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
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
  `]
})
export class LayoutComponent implements OnInit, OnDestroy {
  currentUser: UserInfo | null = null;
  userPhoto: string | null = null;
  unreadCount = 0;
  newMeetingsCount = 0;
  isUserAdmin = false;
  isUserVerified = true;
  private pollingIntervalId: ReturnType<typeof setInterval> | null = null;
  private routerSubscription: Subscription | null = null;
  private userSubscription: Subscription | null = null;
  private prevUnreadCount = 0;
  private prevMeetingsCount = 0;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private mailboxService: MailboxService,
    private meetingsService: MeetingsService,
    private router: Router,
    public themeService: ThemeService,
    private pushService: PushNotificationService
  ) {}

  ngOnInit(): void {
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
      }
    });

    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        if (event.urlAfterRedirects?.startsWith('/mailbox')) {
          this.markMessagesAsRead();
        }
        if (event.urlAfterRedirects?.startsWith('/meetings')) {
          this.markMeetingsAsRead();
        }
      });
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.destroy$.next();
    this.destroy$.complete();
    this.routerSubscription?.unsubscribe();
    this.userSubscription?.unsubscribe();
    UserService.revokePhotoUrl(this.userPhoto);
  }

  private async initPushNotifications(): Promise<void> {
    this.pushService.syncEnabledWithPermission();
    if (this.pushService.isActive()) {
      await this.pushService.requestPermission();
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
        if (res.count > this.prevUnreadCount && this.prevUnreadCount > 0) {
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
        if (res.count > this.prevMeetingsCount && this.prevMeetingsCount > 0) {
          this.pushService.showLocalNotification('Новая встреча', 'У вас новые предложения встреч', 'meeting');
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
        UserService.revokePhotoUrl(this.userPhoto);
        this.userPhoto = UserService.createPhotoUrl(bytes);
      },
      error: () => {
        this.userPhoto = null;
      }
    });
  }

  logout(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    this.authService.logout().subscribe({
      complete: () => {
        this.authService.clearAuth();
        this.router.navigate(['/auth/login']);
      },
      error: () => {
        this.authService.clearAuth();
        this.router.navigate(['/auth/login']);
      }
    });
  }
}
