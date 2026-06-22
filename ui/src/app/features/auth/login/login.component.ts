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
            <p class="tagline">Найди свою половинку по биоритмам</p>
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

            @if (error) {
              <div class="error-toast">
                <i class="bi bi-exclamation-circle me-2"></i>{{ error }}
              </div>
            }

            <div class="d-grid gap-2">
              <button type="submit" class="btn btn-primary btn-lg login-btn" [disabled]="!credentials.email || !credentials.password || loading">
                @if (loading) {
                  <span class="spinner-border spinner-border-sm me-2"></span>
                }
                <i class="bi bi-box-arrow-in-right me-2"></i>Войти
              </button>
            </div>
          </form>

          <div class="divider">
            <span>или</span>
          </div>

          <div class="social-buttons">
            <button type="button" class="btn btn-social btn-google" (click)="loginWithGoogle()" [disabled]="loading">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Войти через Google
            </button>
            <button type="button" class="btn btn-social btn-apple" (click)="loginWithApple()" [disabled]="loading">
              <i class="bi bi-apple"></i>
              Войти через Apple
            </button>
          </div>

          <div class="text-center mt-3">
            <a routerLink="/auth/recovery" class="recovery-link">
              Забыли пароль?
            </a>
          </div>

          <div class="register-prompt">
            <span>Нет аккаунта?</span>
            <a routerLink="/auth/registration" class="register-link">
              Зарегистрироваться
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tagline {
      color: var(--text-secondary, #6b7280);
      font-size: 0.95rem;
      margin: 0;
    }

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

    .login-btn {
      padding: 0.85rem;
      font-size: 1.05rem;
    }

    .error-toast {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 10px;
      padding: 0.6rem 1rem;
      font-size: 0.85rem;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .divider {
      display: flex;
      align-items: center;
      margin: 1.5rem 0;
      gap: 1rem;

      &::before, &::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--border-color, #e5e7eb);
      }

      span {
        color: var(--text-muted, #9ca3af);
        font-size: 0.85rem;
      }
    }

    .social-buttons {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .btn-social {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 0.75rem 1.25rem;
      border-radius: 12px;
      font-weight: 600;
      font-size: 0.95rem;
      transition: all 0.3s ease;
      border: 2px solid var(--border-color, #e5e7eb);
      background: var(--card-bg, white);
      color: var(--text-primary, #1f2937);

      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &.btn-google:hover {
        border-color: #4285F4;
        background: rgba(66, 133, 244, 0.05);
      }

      &.btn-apple:hover {
        border-color: #1f2937;
        background: rgba(31, 41, 55, 0.05);
      }

      i, svg {
        font-size: 1.2rem;
      }
    }

    .recovery-link {
      color: var(--text-secondary, #6b7280);
      text-decoration: none;
      font-size: 0.9rem;
      transition: color 0.2s ease;

      &:hover {
        color: #fd297b;
      }
    }

    .register-prompt {
      text-align: center;
      margin-top: 1.25rem;
      color: var(--text-secondary, #6b7280);
      font-size: 0.95rem;
    }

    .register-link {
      text-decoration: none;
      font-weight: 700;
      color: #fd297b;
      margin-left: 0.5rem;
      transition: opacity 0.2s ease;

      &:hover {
        opacity: 0.8;
      }
    }
  `]
})
export class LoginComponent {
  credentials: AuthorizationModel = {
    email: '',
    password: ''
  };
  error = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    this.error = '';
    this.loading = true;
    this.authService.login(this.credentials).subscribe({
      next: (token) => {
        this.authService.setAuth(token);
        this.authService.loadCurrentUser().subscribe(() => {
          this.loading = false;
          this.router.navigate(['/swipe']);
        });
      },
      error: (error) => {
        this.loading = false;
        this.error = 'Неверный email или пароль';
      }
    });
  }

  loginWithGoogle(): void {
    this.loading = true;
    const mockToken = 'mock-google-token-' + Date.now();
    this.authService.googleLogin(mockToken).subscribe({
      next: (token) => {
        this.authService.setAuth(token);
        this.authService.loadCurrentUser().subscribe(() => {
          this.loading = false;
          this.router.navigate(['/swipe']);
        });
      },
      error: (error) => {
        this.loading = false;
        this.error = 'Ошибка входа через Google';
      }
    });
  }

  loginWithApple(): void {
    this.loading = true;
    const mockToken = 'mock-apple-token-' + Date.now();
    this.authService.appleLogin(mockToken).subscribe({
      next: (token) => {
        this.authService.setAuth(token);
        this.authService.loadCurrentUser().subscribe(() => {
          this.loading = false;
          this.router.navigate(['/swipe']);
        });
      },
      error: (error) => {
        this.loading = false;
        this.error = 'Ошибка входа через Apple';
      }
    });
  }
}
