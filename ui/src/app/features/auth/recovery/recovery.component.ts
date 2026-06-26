import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-recovery',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card card">
        <div class="card-body p-4">
          <h2 class="text-center mb-4">Восстановление пароля</h2>
          
          @if (!codeSent) {
            <form (ngSubmit)="sendRecoveryCode()">
              <p class="text-muted mb-4">
                Введите ваш email, и мы отправим код для восстановления пароля.
              </p>
              
              <div class="mb-3">
                <label for="email" class="form-label">Email</label>
                <input 
                  type="email" 
                  class="form-control" 
                  id="email" 
                  [(ngModel)]="email" 
                  name="email"
                  required
                  placeholder="Введите email">
              </div>
              
              <div class="d-grid gap-2">
                <button type="submit" class="btn btn-primary" [disabled]="!email">
                  Отправить код
                </button>
              </div>
            </form>
          } @else {
            <form (ngSubmit)="resetPassword()">
              <div class="mb-3">
                <label for="code" class="form-label">Код из письма</label>
                <input 
                  type="text" 
                  class="form-control" 
                  id="code" 
                  [(ngModel)]="code" 
                  name="code"
                  required
                  placeholder="Введите код">
              </div>
              
              <div class="mb-3">
                <label for="newPassword" class="form-label">Новый пароль</label>
                <input 
                  type="password" 
                  class="form-control" 
                  id="newPassword" 
                  [(ngModel)]="newPassword" 
                  name="newPassword"
                  required
                  placeholder="Минимум 8 символов, буквы и цифры">
              </div>
              
              <div class="d-grid gap-2">
                <button type="submit" class="btn btn-primary" [disabled]="!code || !newPassword">
                  Сбросить пароль
                </button>
              </div>
            </form>
          }
          
          <div class="text-center mt-3">
            <a routerLink="/auth/login" class="text-decoration-none">Вернуться ко входу</a>
          </div>
        </div>
      </div>
    </div>
  `
})
export class RecoveryComponent implements OnInit {
  email = '';
  code = '';
  newPassword = '';
  codeSent = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const code = this.route.snapshot.queryParamMap.get('code');
    if (code) {
      this.code = code;
      this.codeSent = true;
    }
  }

  sendRecoveryCode(): void {
    this.authService.recovery(this.email).subscribe({
      next: () => {
        this.codeSent = true;
        alert('Код восстановления отправлен на ваш email');
      },
      error: (error) => {
        console.error('Recovery failed', error);
        alert('Ошибка отправки кода. Проверьте email.');
      }
    });
  }

  resetPassword(): void {
    this.authService.resetPassword(this.code, this.newPassword).subscribe({
      next: () => {
        alert('Пароль успешно изменён! Теперь вы можете войти.');
        this.router.navigate(['/auth/login']);
      },
      error: (error) => {
        console.error('Password reset failed', error);
        alert('Ошибка сброса пароля. Проверьте код.');
      }
    });
  }
}
