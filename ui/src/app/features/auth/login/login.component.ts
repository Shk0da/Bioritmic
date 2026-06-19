import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AuthorizationModel } from '../../../core/models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card card">
        <div class="card-body">
          <div class="text-center mb-4">
            <div class="logo-large mb-3">
              <div class="logo-couple">
                <i class="bi bi-person-heart"></i>
                <i class="bi bi-person-hearts"></i>
              </div>
            </div>
            <h2 class="gradient-text mb-2">Bioritmic</h2>
            <p class="text-muted">Найди свою половинку</p>
          </div>

          <form (ngSubmit)="onSubmit()">
            <div class="mb-3">
              <label for="email" class="form-label">
                <i class="bi bi-envelope me-2"></i>Email
              </label>
              <input
                type="email"
                class="form-control"
                id="email"
                [(ngModel)]="credentials.email"
                name="email"
                required
                placeholder="Введите email">
            </div>

            <div class="mb-3">
              <label for="password" class="form-label">
                <i class="bi bi-lock me-2"></i>Пароль
              </label>
              <input
                type="password"
                class="form-control"
                id="password"
                [(ngModel)]="credentials.password"
                name="password"
                required
                placeholder="Введите пароль">
            </div>

            <div class="d-grid gap-2">
              <button type="submit" class="btn btn-primary btn-lg" [disabled]="!credentials.email || !credentials.password">
                <i class="bi bi-box-arrow-in-right me-2"></i>Войти
              </button>
            </div>
          </form>

          <div class="text-center mt-3">
            <span class="text-muted small">или</span>
          </div>

          <div class="d-grid gap-2 mt-3">
            <button type="button" class="btn btn-outline-danger btn-lg" (click)="loginWithGoogle()">
              <i class="bi bi-google me-2"></i>Войти через Google
            </button>
            <button type="button" class="btn btn-outline-dark btn-lg" (click)="loginWithApple()">
              <i class="bi bi-apple me-2"></i>Войти через Apple
            </button>
          </div>

          <div class="text-center mt-4">
            <a routerLink="/auth/recovery" class="text-muted text-decoration-none small">
              Забыли пароль?
            </a>
          </div>

          <div class="text-center mt-3">
            <span class="text-muted">Нет аккаунта?</span>
            <a routerLink="/auth/registration" class="text-decoration-none fw-bold ms-1" style="color: #fd297b;">
              Зарегистрироваться
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .logo-large {
      .logo-couple {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        font-size: 4rem;
        
        i {
          color: #fd297b;
          filter: drop-shadow(0 4px 12px rgba(253, 41, 123, 0.4));
          
          &:first-child {
            transform: rotate(-10deg);
          }
          
          &:last-child {
            transform: rotate(10deg);
          }
        }
      }
    }
  `]
})
export class LoginComponent {
  credentials: AuthorizationModel = {
    email: '',
    password: ''
  };

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    this.authService.login(this.credentials).subscribe({
      next: (token) => {
        this.authService.setAuth(token);
        this.authService.loadCurrentUser().subscribe(() => {
          this.router.navigate(['/swipe']);
        });
      },
      error: (error) => {
        console.error('Login failed', error);
        alert('Неверный email или пароль');
      }
    });
  }

  loginWithGoogle(): void {
    const mockToken = 'mock-google-token-' + Date.now();
    this.authService.googleLogin(mockToken).subscribe({
      next: (token) => {
        this.authService.setAuth(token);
        this.authService.loadCurrentUser().subscribe(() => {
          this.router.navigate(['/swipe']);
        });
      },
      error: (error) => {
        console.error('Google login failed', error);
        alert('Ошибка входа через Google');
      }
    });
  }

  loginWithApple(): void {
    const mockToken = 'mock-apple-token-' + Date.now();
    this.authService.appleLogin(mockToken).subscribe({
      next: (token) => {
        this.authService.setAuth(token);
        this.authService.loadCurrentUser().subscribe(() => {
          this.router.navigate(['/swipe']);
        });
      },
      error: (error) => {
        console.error('Apple login failed', error);
        alert('Ошибка входа через Apple');
      }
    });
  }
}
