import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserInfo } from '../../core/models/user.model';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { UserService } from '../../core/services/user.service';
import { ModalComponent } from '../../core/services/modal.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterLink, RouterOutlet, RouterLinkActive, ModalComponent],
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
          </a>
          <a routerLink="/meetings" routerLinkActive="active" class="nav-btn" title="Встречи">
            <i class="bi bi-calendar-event"></i>
          </a>
        </nav>

        <div class="user-menu">
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
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
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
  `]
})
export class LayoutComponent implements OnInit {
  currentUser: UserInfo | null = null;
  userPhoto: SafeUrl | null = null;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user?.id) {
        this.loadUserPhoto(user.id);
      }
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
