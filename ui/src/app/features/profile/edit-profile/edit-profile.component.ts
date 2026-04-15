import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { UserInfo, Gender } from '../../../core/models/user.model';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="row">
      <div class="col-md-8 mx-auto">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">Редактирование профиля</h5>
          </div>
          <div class="card-body">
            <form (ngSubmit)="save()">
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label for="name" class="form-label">Имя</label>
                  <input
                    type="text"
                    class="form-control"
                    id="name"
                    [(ngModel)]="user.name"
                    name="name"
                    required>
                </div>

                <div class="col-md-6 mb-3">
                  <label for="email" class="form-label">Email</label>
                  <input
                    type="email"
                    class="form-control"
                    id="email"
                    [(ngModel)]="user.email"
                    name="email"
                    required
                    disabled>
                  <small class="text-muted">Email нельзя изменить</small>
                </div>
              </div>

              <div class="row">
                <div class="col-md-6 mb-3">
                  <label for="birthday" class="form-label">Дата рождения</label>
                  <input
                    type="text"
                    class="form-control"
                    id="birthday"
                    [(ngModel)]="user.birthday"
                    name="birthday"
                    placeholder="yyyy-MM-dd"
                    required>
                </div>

                <div class="col-md-6 mb-3">
                  <label for="gender" class="form-label">Пол</label>
                  <select
                    class="form-control"
                    id="gender"
                    [(ngModel)]="user.gender"
                    name="gender"
                    required>
                    <option [ngValue]="Gender.MAN">Мужской</option>
                    <option [ngValue]="Gender.WOMAN">Женский</option>
                  </select>
                </div>
              </div>

              <div class="d-flex justify-content-between">
                <a routerLink="/profile/me" class="btn btn-outline-secondary">Отмена</a>
                <button type="submit" class="btn btn-primary" [disabled]="!isFormValid()">
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `
})
export class EditProfileComponent implements OnInit {
  user: Partial<UserInfo> = {};
  Gender = Gender;

  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  private loadProfile(): void {
    this.userService.getCurrentUser().subscribe({
      next: (user: UserInfo) => {
        this.user = { ...user };
      }
    });
  }

  isFormValid(): boolean {
    return !!(this.user.name && this.user.email && this.user.birthday && this.user.gender);
  }

  save(): void {
    this.userService.updateUser(this.user).subscribe({
      next: () => {
        this.router.navigate(['/profile/me']);
      },
      error: (error: any) => {
        console.error('Failed to update profile', error);
        alert('Ошибка сохранения профиля');
      }
    });
  }
}
