import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Gender, User } from '../../../core/models/user.model';

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card card">
        <div class="card-body p-4">
          <h2 class="text-center mb-4">Регистрация</h2>
          
          <form (ngSubmit)="onSubmit()">
            <div class="mb-3">
              <label for="name" class="form-label">Имя</label>
              <input 
                type="text" 
                class="form-control" 
                id="name" 
                [(ngModel)]="user.name" 
                name="name"
                required
                placeholder="Введите имя">
            </div>
            
            <div class="mb-3">
              <label for="email" class="form-label">Email</label>
              <input 
                type="email" 
                class="form-control" 
                id="email" 
                [(ngModel)]="user.email" 
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
                [(ngModel)]="user.password" 
                name="password"
                required
                placeholder="Придумайте пароль">
            </div>
            
            <div class="mb-3">
              <label for="birthday" class="form-label">Дата рождения</label>
              <input
                type="date"
                class="form-control"
                id="birthday"
                [ngModel]="user.birthday"
                (ngModelChange)="onBirthdayChange($event)"
                name="birthday"
                required>
            </div>
            
            <div class="mb-3">
              <label for="gender" class="form-label">Пол</label>
              <select 
                class="form-select" 
                id="gender" 
                [(ngModel)]="user.gender" 
                name="gender"
                required>
                <option value="" disabled>Выберите пол</option>
                <option value="MAN">Мужской</option>
                <option value="WOMAN">Женский</option>
              </select>
            </div>
            
            <div class="d-grid gap-2">
              <button type="submit" class="btn btn-primary" [disabled]="!isFormValid()">
                Зарегистрироваться
              </button>
            </div>
          </form>
          
          <div class="text-center mt-3">
            <span>Уже есть аккаунт?</span>
            <a routerLink="/auth/login" class="text-decoration-none ms-1">Войти</a>
          </div>
        </div>
      </div>
    </div>
  `
})
export class RegistrationComponent {
  user: Partial<User> & { password: string; birthday: string } = {
    name: '',
    email: '',
    password: '',
    birthday: this.formatDate(new Date()),
    gender: Gender.MAN
  };

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onBirthdayChange(value: string): void {
    this.user.birthday = value;
  }

  isFormValid(): boolean {
    return !!(this.user.name && this.user.email && this.user.password && this.user.birthday && this.user.gender);
  }

  onSubmit(): void {
    this.authService.register(this.user).subscribe({
      next: () => {
        alert('Регистрация успешна! Проверьте email для подтверждения.');
        this.router.navigate(['/auth/login']);
      },
      error: (error) => {
        console.error('Registration failed', error);
        alert('Ошибка регистрации. Возможно, пользователь с таким email уже существует.');
      }
    });
  }
}
