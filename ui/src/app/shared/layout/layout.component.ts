import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { NgClass } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { UserInfo } from '../../core/models/user.model';
import { UserService } from '../../core/services/user.service';
import { ModalComponent } from '../../core/services/modal.service';
import { MailboxService } from '../../core/services/mailbox.service';
import { MeetingsService } from '../../core/services/meetings.service';
import { ThemeService } from '../../core/services/theme.service';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterLink, RouterOutlet, RouterLinkActive, ModalComponent, NgClass],
  template: `
    <app-modal></app-modal>
    
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
        <div class="alert alert-warning d-flex align-items-center mb-3" role="alert">
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
  private pollingIntervalId: any = null;
  private routerSubscription: Subscription | null = null;
  private userSubscription: Subscription | null = null;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private mailboxService: MailboxService,
    private meetingsService: MeetingsService,
    private router: Router,
    public themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isUserAdmin = !!(user?.role && user.role.includes('ADMIN'));
      this.isUserVerified = user?.isVerified !== false;
      if (user?.id) {
        this.loadUserPhoto(user.id);
        this.startPolling();
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
    this.routerSubscription?.unsubscribe();
    this.userSubscription?.unsubscribe();
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

  private loadUnreadCount(): void {
    this.mailboxService.getMailbox({ page: 0, size: 100 }).subscribe({
      next: (messages) => {
        const lastReadTime = localStorage.getItem('mailbox_last_read');
        const lastRead = lastReadTime ? parseInt(lastReadTime, 10) : 0;
        const unread = messages.filter(m => {
          if (!m.timestamp) return false;
          const msgTime = this.parseTimestamp(m.timestamp);
          return msgTime > lastRead && m.from !== this.currentUser?.id;
        });
        const uniqueSenders = new Set(unread.map(m => m.from));
        this.unreadCount = uniqueSenders.size;
      },
      error: () => {}
    });
  }

  private loadNewMeetingsCount(): void {
    this.meetingsService.getMeetings({ page: 0, size: 100 }).subscribe({
      next: (meetings) => {
        const lastReadTime = localStorage.getItem('meetings_last_read');
        const lastRead = lastReadTime ? parseInt(lastReadTime, 10) : 0;
        const newMeetings = meetings.filter(m => {
          if (!m.timestamp) return false;
          const mTime = this.parseTimestamp(m.timestamp);
          return mTime > lastRead && m.userId !== this.currentUser?.id;
        });
        this.newMeetingsCount = newMeetings.length;
      },
      error: () => {}
    });
  }

  private parseTimestamp(timestamp: any): number {
    if (!timestamp) return 0;
    if (typeof timestamp === 'string') {
      return new Date(timestamp).getTime();
    }
    if (typeof timestamp === 'number') {
      return timestamp > 1e12 ? timestamp : timestamp * 1000;
    }
    if (timestamp.seconds) return timestamp.seconds * 1000;
    if (timestamp.time) return timestamp.time * 1000;
    return 0;
  }

  private markMessagesAsRead(): void {
    localStorage.setItem('mailbox_last_read', Date.now().toString());
    this.unreadCount = 0;
  }

  private markMeetingsAsRead(): void {
    localStorage.setItem('meetings_last_read', Date.now().toString());
    this.newMeetingsCount = 0;
  }

  private loadUserPhoto(userId: string): void {
    this.userService.getPhoto(userId).subscribe({
      next: (bytes: Uint8Array) => {
        this.userPhoto = this.bytesToDataUrl(bytes);
      },
      error: () => {
        this.userPhoto = null;
      }
    });
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

  logout(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    this.authService.clearAuth();
    this.router.navigate(['/auth/login']);
  }
}
