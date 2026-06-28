import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-verify-email',
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
            <h2 class="gradient-text mb-2">Подтверждение email</h2>
            <p class="tagline">Введите код из письма или перейдите по ссылке из письма</p>
          </div>

          @if (success) {
            <div class="success-toast mb-3">
              <i class="bi bi-check-circle me-2"></i>
              Email подтверждён! Теперь доступны все функции приложения.
            </div>
            <div class="d-grid gap-2">
              <a routerLink="/swipe" class="btn btn-primary btn-lg login-btn">
                <i class="bi bi-people me-2"></i>Перейти к поиску
              </a>
            </div>
          } @else {
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

              @if (error) {
                <div class="error-toast">
                  <i class="bi bi-exclamation-circle me-2"></i>{{ error }}
                </div>
              }

              <div class="d-grid gap-2">
                <button
                  type="submit"
                  class="btn btn-primary btn-lg login-btn"
                  [disabled]="!code || loading">
                  @if (loading) {
                    <span class="spinner-border spinner-border-sm me-2"></span>
                  }
                  <i class="bi bi-check-lg me-2"></i>Подтвердить email
                </button>
              </div>
            </form>

            @if (authService.isAuthenticated()) {
              <div class="text-center mt-3">
                <button
                  type="button"
                  class="btn btn-link resend-link"
                  [disabled]="resendLoading || resendCooldown > 0"
                  (click)="resend()">
                  @if (resendLoading) {
                    <span class="spinner-border spinner-border-sm me-1"></span>
                  }
                  @if (resendCooldown > 0) {
                    Отправить письмо повторно ({{ resendCooldown }}с)
                  } @else {
                    Отправить письмо повторно
                  }
                </button>
              </div>
            }
          }

          <div class="text-center mt-4">
            <a routerLink="/auth/login" class="recovery-link">Вернуться ко входу</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .logo-large .logo-couple {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      font-size: 3rem;
    }

    .logo-large .logo-couple i {
      color: #fd297b;
      filter: drop-shadow(0 4px 12px rgba(253, 41, 123, 0.4));
    }

    .logo-large .logo-couple i:first-child { transform: rotate(-10deg); }
    .logo-large .logo-couple i:last-child { transform: rotate(10deg); }

    .tagline {
      color: var(--text-muted, #888);
      margin: 0;
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
    }

    .success-toast {
      background: rgba(34, 197, 94, 0.1);
      color: #16a34a;
      border: 1px solid rgba(34, 197, 94, 0.2);
      border-radius: 10px;
      padding: 0.75rem 1rem;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
    }

    .recovery-link, .resend-link {
      color: #fd297b;
      font-weight: 600;
      text-decoration: none;
    }

    .resend-link {
      font-size: 0.9rem;
    }
  `]
})
export class VerifyEmailComponent implements OnInit {
  code = '';
  error = '';
  success = false;
  loading = false;
  resendLoading = false;
  resendCooldown = 0;

  constructor(
    readonly authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const codeFromUrl = this.route.snapshot.queryParamMap.get('code');
    if (codeFromUrl) {
      this.code = codeFromUrl;
      this.onSubmit();
    }
  }

  onSubmit(): void {
    if (!this.code || this.loading) {
      return;
    }

    this.error = '';
    this.loading = true;
    this.authService.verifyEmail(this.code).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        if (this.authService.isAuthenticated()) {
          this.authService.loadCurrentUser().subscribe();
        }
      },
      error: () => {
        this.loading = false;
        this.error = 'Код недействителен или устарел. Запросите новое письмо.';
      }
    });
  }

  resend(): void {
    if (this.resendLoading || this.resendCooldown > 0) {
      return;
    }

    this.error = '';
    this.resendLoading = true;
    this.authService.resendVerificationEmail().subscribe({
      next: () => {
        this.resendLoading = false;
        this.startResendCooldown();
      },
      error: () => {
        this.resendLoading = false;
        this.error = 'Не удалось отправить письмо. Попробуйте позже.';
      }
    });
  }

  private startResendCooldown(): void {
    this.resendCooldown = 60;
    const interval = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) {
        clearInterval(interval);
      }
    }, 1000);
  }
}
