import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserInfo } from '../../core/models/user.model';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  template: `
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
      <div class="container">
        <a class="navbar-brand" routerLink="/search">Bioritmic</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav me-auto">
            <li class="nav-item">
              <a class="nav-link" routerLink="/search" routerLinkActive="active">Поиск</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/bookmarks" routerLinkActive="active">Избранное</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/mailbox" routerLinkActive="active">Сообщения</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/meetings" routerLinkActive="active">Встречи</a>
            </li>
          </ul>
          <ul class="navbar-nav">
            @if (currentUser) {
              <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                  {{ currentUser.name }}
                </a>
                <ul class="dropdown-menu dropdown-menu-end">
                  <li><a class="dropdown-item" routerLink="/profile/me">Мой профиль</a></li>
                  <li><a class="dropdown-item" routerLink="/settings">Настройки</a></li>
                  <li><hr class="dropdown-divider"></li>
                  <li><a class="dropdown-item" href="#" (click)="logout($event)">Выйти</a></li>
                </ul>
              </li>
            }
          </ul>
        </div>
      </div>
    </nav>

    <main class="container mt-4">
      <router-outlet></router-outlet>
    </main>

    <footer class="bg-light mt-5 py-3">
      <div class="container text-center">
        <p class="text-muted mb-0">&copy; 2026 Bioritmic.</p>
      </div>
    </footer>
  `
})
export class LayoutComponent implements OnInit {
  currentUser: UserInfo | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
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
        // Если ошибка при logout на сервере, всё равно очищаем локально
        this.authService.clearAuth();
        window.location.reload();
      }
    });
  }
}
