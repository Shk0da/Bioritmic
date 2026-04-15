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
        <div class="card-body p-4">
          <h2 class="text-center mb-4">Вход</h2>
          
          <form (ngSubmit)="onSubmit()">
            <div class="mb-3">
              <label for="email" class="form-label">Email</label>
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
              <label for="password" class="form-label">Пароль</label>
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
              <button type="submit" class="btn btn-primary" [disabled]="!credentials.email || !credentials.password">
                Войти
              </button>
            </div>
          </form>
          
          <div class="text-center mt-3">
            <a routerLink="/auth/recovery" class="text-decoration-none">Забыли пароль?</a>
          </div>
          
          <div class="text-center mt-3">
            <span>Нет аккаунта?</span>
            <a routerLink="/auth/registration" class="text-decoration-none ms-1">Зарегистрироваться</a>
          </div>
        </div>
      </div>
    </div>
  `
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
        // Auth service handles token storage
        this.router.navigate(['/search']);
      },
      error: (error) => {
        console.error('Login failed', error);
        alert('Неверный email или пароль');
      }
    });
  }
}
