import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { NgClass } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { UserInfo } from '../../core/models/user.model';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { UserService } from '../../core/services/user.service';
import { ModalComponent } from '../../core/services/modal.service';
import { MailboxService } from '../../core/services/mailbox.service';
import { ThemeService } from '../../core/services/theme.service';
import { Subscription } from 'rxjs';

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
          </a>
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
      top: 2px;
      right: 2px;
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
      border: 2px solid #fd297b;
      animation: badgePulse 2s ease infinite;
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
  userPhoto: SafeUrl | null = null;
  unreadCount = 0;
  isUserAdmin = false;
  private pollingSubscription: Subscription | null = null;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private sanitizer: DomSanitizer,
    private mailboxService: MailboxService,
    public themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isUserAdmin = !!(user?.role && user.role.includes('ADMIN'));
      if (user?.id) {
        this.loadUserPhoto(user.id);
        this.startUnreadPolling();
      } else {
        this.stopUnreadPolling();
      }
    });
  }

  ngOnDestroy(): void {
    this.stopUnreadPolling();
  }

  private startUnreadPolling(): void {
    this.stopUnreadPolling();
    this.loadUnreadCount();
    this.pollingSubscription = new Subscription();
    const intervalId = setInterval(() => this.loadUnreadCount(), 30000);
    this.pollingSubscription.add({ unsubscribe: () => clearInterval(intervalId) });
  }

  private stopUnreadPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }

  private loadUnreadCount(): void {
    this.mailboxService.getMailbox({ page: 0, size: 100 }).subscribe({
      next: (messages) => {
        const lastReadTime = localStorage.getItem('mailbox_last_read');
        const lastRead = lastReadTime ? parseInt(lastReadTime, 10) : 0;
        const unread = messages.filter(m => {
          if (!m.timestamp) return false;
          const msgTime = (m.timestamp.seconds || m.timestamp.time || 0) * 1000;
          return msgTime > lastRead && m.from !== this.currentUser?.id;
        });
        const uniqueSenders = new Set(unread.map(m => m.from));
        this.unreadCount = uniqueSenders.size;
      },
      error: () => {}
    });
  }

  private loadUserPhoto(userId: number): void {
    this.userService.getPhoto(userId).subscribe({
      next: (bytes: Uint8Array) => {
        this.userPhoto = this.bytesToDataUrl(bytes);
      },
      error: () => {
        this.userPhoto = null;
      }
    });
  }

  private bytesToDataUrl(bytes: Uint8Array): SafeUrl {
    const base64 = this.uint8ArrayToBase64(bytes);
    const dataUrl = `data:image/jpeg;base64,${base64}`;
    return this.sanitizer.bypassSecurityTrustUrl(dataUrl);
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
    this.authService.logout().subscribe({
      next: () => {
        this.authService.clearAuth();
        window.location.reload();
      },
      error: () => {
        this.authService.clearAuth();
        window.location.reload();
      }
    });
  }
}
