import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
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
            <h2 class="gradient-text mb-2">Новый пароль</h2>
            <p class="tagline">Задайте новый пароль для вашего аккаунта</p>
          </div>

          @if (!hasCodeFromUrl && !code) {
            <div class="warning-toast mb-3">
              <i class="bi bi-exclamation-triangle me-2"></i>
              Ссылка недействительна или устарела.
              <a routerLink="/auth/recovery" class="ms-1">Запросить новую</a>
            </div>
          }

          <form (ngSubmit)="onSubmit()">
            <div class="mb-3">
              <label for="code" class="form-label">
                <i class="bi bi-key me-2"></i>Код из письма
              </label>
              <input
                type="text"
                class="form-control"
                id="code"
                [(ngModel)]="code"
                name="code"
                required
                placeholder="Введите код из письма">
            </div>

            <div class="mb-3">
              <label for="password" class="form-label">
                <i class="bi bi-lock me-2"></i>Новый пароль
              </label>
              <input
                type="password"
                class="form-control"
                id="password"
                [(ngModel)]="password"
                name="password"
                required
                placeholder="От 5 до 128 символов">
            </div>

            <div class="mb-3">
              <label for="confirmPassword" class="form-label">
                <i class="bi bi-lock-fill me-2"></i>Подтверждение пароля
              </label>
              <input
                type="password"
                class="form-control"
                id="confirmPassword"
                [(ngModel)]="confirmPassword"
                name="confirmPassword"
                required
                placeholder="Повторите пароль">
            </div>

            @if (error) {
              <div class="error-toast">
                <i class="bi bi-exclamation-circle me-2"></i>{{ error }}
              </div>
            }

            <div class="d-grid gap-2">
              <button
                type="submit"
                class="btn btn-primary btn-lg login-btn"
                [disabled]="!code || !password || !confirmPassword || loading">
                @if (loading) {
                  <span class="spinner-border spinner-border-sm me-2"></span>
                }
                <i class="bi bi-check-lg me-2"></i>Сбросить пароль
              </button>
            </div>
          </form>

          <div class="text-center mt-4">
            <a routerLink="/auth/login" class="recovery-link">Вернуться ко входу</a>
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

    .logo-large .logo-couple {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      font-size: 4rem;
    }

    .logo-large .logo-couple i {
      color: #fd297b;
      filter: drop-shadow(0 4px 12px rgba(253, 41, 123, 0.4));
    }

    .logo-large .logo-couple i:first-child { transform: rotate(-10deg); }
    .logo-large .logo-couple i:last-child { transform: rotate(10deg); }

    .login-btn {
      padding: 0.85rem;
      font-size: 1.05rem;
    }

    .error-toast, .warning-toast {
      border-radius: 10px;
      padding: 0.6rem 1rem;
      font-size: 0.85rem;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      animation: slideIn 0.3s ease;
    }

    .error-toast {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .warning-toast {
      background: rgba(245, 158, 11, 0.1);
      color: #b45309;
      border: 1px solid rgba(245, 158, 11, 0.2);
    }

    .recovery-link {
      text-decoration: none;
      font-weight: 600;
      color: #fd297b;
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class ResetPasswordComponent implements OnInit {
  code = '';
  hasCodeFromUrl = false;
  password = '';
  confirmPassword = '';
  error = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const codeFromUrl = this.route.snapshot.queryParamMap.get('code');
    if (codeFromUrl) {
      this.code = codeFromUrl;
      this.hasCodeFromUrl = true;
    }
  }

  onSubmit(): void {
    this.error = '';

    if (this.password.length < 5 || this.password.length > 128) {
      this.error = 'Пароль должен быть от 5 до 128 символов';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error = 'Пароли не совпадают';
      return;
    }

    this.loading = true;
    this.authService.resetPassword(this.code, this.password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/auth/login'], {
          queryParams: { reset: 'success' },
          replaceUrl: true
        });
      },
      error: () => {
        this.loading = false;
        this.error = 'Не удалось сбросить пароль. Проверьте код или запросите новую ссылку.';
      }
    });
  }
}
