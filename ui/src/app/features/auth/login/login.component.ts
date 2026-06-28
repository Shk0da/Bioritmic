import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
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

            @if (success) {
              <div class="success-toast">
                <i class="bi bi-check-circle me-2"></i>{{ success }}
              </div>
            }

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

          <div class="text-center mt-4">
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

    .success-toast {
      background: rgba(34, 197, 94, 0.1);
      color: #16a34a;
      border: 1px solid rgba(34, 197, 94, 0.2);
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
export class LoginComponent implements OnInit {
  credentials: AuthorizationModel = {
    email: '',
    password: ''
  };
  error = '';
  success = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('reset') === 'success') {
      this.success = 'Пароль успешно изменён. Войдите с новым паролем.';
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { reset: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }
  }

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

}
