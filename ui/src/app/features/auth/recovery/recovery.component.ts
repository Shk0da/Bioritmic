import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-recovery',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card card">
        <div class="card-body p-4">
          <div class="text-center mb-4">
            <div class="logo-large mb-3">
              <div class="logo-couple">
                <i class="bi bi-person-heart"></i>
                <i class="bi bi-person-hearts"></i>
              </div>
            </div>
            <h2 class="gradient-text mb-2">Восстановление пароля</h2>
          </div>

          @if (!linkSent) {
            <form (ngSubmit)="sendRecoveryLink()">
              <p class="text-muted mb-4">
                Введите email — мы отправим ссылку для сброса пароля.
              </p>

              <div class="mb-3">
                <label for="email" class="form-label">
                  <i class="bi bi-envelope me-2"></i>Email
                </label>
                <input
                  type="email"
                  class="form-control"
                  id="email"
                  [(ngModel)]="email"
                  name="email"
                  required
                  placeholder="Введите email">
              </div>

              @if (error) {
                <div class="error-toast">
                  <i class="bi bi-exclamation-circle me-2"></i>{{ error }}
                </div>
              }

              <div class="d-grid gap-2">
                <button type="submit" class="btn btn-primary btn-lg login-btn" [disabled]="!email || loading">
                  @if (loading) {
                    <span class="spinner-border spinner-border-sm me-2"></span>
                  }
                  Отправить ссылку
                </button>
              </div>
            </form>
          } @else {
            <div class="success-toast mb-3">
              <i class="bi bi-check-circle me-2"></i>
              Если аккаунт с таким email существует, мы отправили ссылку для сброса пароля.
              Проверьте почту (ссылка действует 15 минут).
            </div>
            <p class="text-muted small mb-0">
              Не пришло письмо? Проверьте папку «Спам» или попробуйте ещё раз через несколько минут.
            </p>
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

    .error-toast, .success-toast {
      border-radius: 10px;
      padding: 0.6rem 1rem;
      font-size: 0.85rem;
      display: flex;
      align-items: flex-start;
    }

    .error-toast {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.2);
      margin-bottom: 1rem;
    }

    .success-toast {
      background: rgba(34, 197, 94, 0.1);
      color: #16a34a;
      border: 1px solid rgba(34, 197, 94, 0.2);
    }

    .recovery-link {
      text-decoration: none;
      font-weight: 600;
      color: #fd297b;
    }
  `]
})
export class RecoveryComponent {
  email = '';
  linkSent = false;
  error = '';
  loading = false;

  constructor(private authService: AuthService) {}

  sendRecoveryLink(): void {
    this.error = '';
    this.loading = true;
    this.authService.recovery(this.email).subscribe({
      next: () => {
        this.loading = false;
        this.linkSent = true;
      },
      error: () => {
        this.loading = false;
        this.error = 'Не удалось отправить ссылку. Попробуйте позже.';
      }
    });
  }
}
