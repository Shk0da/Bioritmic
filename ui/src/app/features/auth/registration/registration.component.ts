import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { resolveHttpErrorMessage } from '../../../core/utils/http-error.util';
import { Gender, User } from '../../../core/models/user.model';
import {
  formatDateForInput,
  maxBirthdayForMinAge,
  meetsMinimumAge,
  MIN_AGE_REGISTRATION_MESSAGE
} from '../../../shared/utils/age-validation.util';

@Component({
  selector: 'app-registration',
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
            <h2 class="gradient-text mb-1">Создать аккаунт</h2>
            <p class="text-muted">Начните поиск своей половинки</p>
          </div>

          @if (registered) {
            <div class="success-toast mb-3">
              <i class="bi bi-envelope-check me-2"></i>
              Аккаунт создан! Мы отправили письмо с кодом подтверждения на {{ user.email }}.
              <a routerLink="/auth/verify-email" class="ms-1">Подтвердить email</a>
            </div>
          }
          
          <form (ngSubmit)="onSubmit()">
            <div class="mb-3">
              <label for="name" class="form-label">
                <i class="bi bi-person me-2"></i>Имя
              </label>
              <input 
                type="text" 
                class="form-control" 
                id="name" 
                [(ngModel)]="user.name" 
                name="name"
                required
                placeholder="Как вас зовут?">
            </div>
            
            <div class="mb-3">
              <label for="email" class="form-label">
                <i class="bi bi-envelope me-2"></i>Email
              </label>
              <input 
                type="email" 
                class="form-control" 
                id="email" 
                [(ngModel)]="user.email" 
                name="email"
                required
                placeholder="your@email.com">
            </div>
            
            <div class="mb-3">
              <label for="password" class="form-label">
                <i class="bi bi-lock me-2"></i>Пароль
              </label>
              <input 
                type="password" 
                class="form-control" 
                id="password" 
                [(ngModel)]="user.password" 
                name="password"
                required
                placeholder="Минимум 6 символов">
            </div>
            
            <div class="row mb-3">
              <div class="col-7">
                <label for="birthday" class="form-label">
                  <i class="bi bi-calendar me-2"></i>Дата рождения
                </label>
                <input
                  type="date"
                  class="form-control"
                  id="birthday"
                  [ngModel]="user.birthday"
                  (ngModelChange)="onBirthdayChange($event)"
                  [max]="maxBirthday"
                  name="birthday"
                  required>
              </div>
              <div class="col-5">
                <label for="gender" class="form-label">
                  <i class="bi bi-gender-ambiguous me-2"></i>Пол
                </label>
                <select 
                  class="form-select" 
                  id="gender" 
                  [(ngModel)]="user.gender" 
                  name="gender"
                  required>
                  <option value="" disabled>Пол</option>
                  <option value="MAN">Мужской</option>
                  <option value="WOMAN">Женский</option>
                </select>
              </div>
            </div>

            @if (error) {
              <div class="error-toast">
                <i class="bi bi-exclamation-circle me-2"></i>{{ error }}
              </div>
            }
            
            <div class="d-grid gap-2">
              <button type="submit" class="btn btn-primary btn-lg register-btn" [disabled]="!isFormValid() || loading">
                @if (loading) {
                  <span class="spinner-border spinner-border-sm me-2"></span>
                }
                <i class="bi bi-rocket-takeoff me-2"></i>Зарегистрироваться
              </button>
            </div>
          </form>
          
          <div class="text-center mt-4">
            <span class="text-muted">Уже есть аккаунт?</span>
            <a routerLink="/auth/login" class="register-link">Войти</a>
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
        font-size: 3rem;
        
        i {
          color: #fd297b;
          filter: drop-shadow(0 4px 12px rgba(253, 41, 123, 0.4));
          
          &:first-child { transform: rotate(-10deg); }
          &:last-child { transform: rotate(10deg); }
        }
      }
    }

    .register-btn {
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
      padding: 0.75rem 1rem;
      font-size: 0.85rem;
      display: flex;
      align-items: flex-start;
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .register-link {
      text-decoration: none;
      font-weight: 700;
      color: #fd297b;
      margin-left: 0.5rem;
    }
  `]
})
export class RegistrationComponent {
  readonly maxBirthday = maxBirthdayForMinAge();

  user: Partial<User> & { password: string; birthday: string } = {
    name: '',
    email: '',
    password: '',
    birthday: this.defaultBirthday(),
    gender: Gender.MAN
  };
  error = '';
  loading = false;
  registered = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  private defaultBirthday(): string {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 18);
    return formatDateForInput(date);
  }

  onBirthdayChange(value: string): void {
    this.user.birthday = value;
    if (this.user.birthday && !meetsMinimumAge(this.user.birthday)) {
      this.error = MIN_AGE_REGISTRATION_MESSAGE;
    } else if (this.error === MIN_AGE_REGISTRATION_MESSAGE) {
      this.error = '';
    }
  }

  isFormValid(): boolean {
    return !!(
      this.user.name &&
      this.user.email &&
      this.user.password &&
      this.user.birthday &&
      this.user.gender &&
      meetsMinimumAge(this.user.birthday)
    );
  }

  onSubmit(): void {
    if (!meetsMinimumAge(this.user.birthday)) {
      this.error = MIN_AGE_REGISTRATION_MESSAGE;
      return;
    }

    this.error = '';
    this.loading = true;
    this.authService.register(this.user).subscribe({
      next: () => {
        this.registered = true;
        this.authService.login({ email: this.user.email!, password: this.user.password! }).subscribe({
          next: (token) => {
            this.authService.setAuth(token);
            this.authService.loadCurrentUser().subscribe({
              next: () => {
                this.loading = false;
                this.router.navigate(['/swipe']);
              },
              error: () => {
                this.loading = false;
                this.router.navigate(['/swipe']);
              }
            });
          },
          error: () => {
            this.loading = false;
            this.router.navigate(['/auth/login']);
          }
        });
      },
      error: (error) => {
        this.loading = false;
        this.error = resolveHttpErrorMessage(error);
      }
    });
  }
}
