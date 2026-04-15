import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { UserService } from '../../../core/services/user.service';
import { UserInfo, Gender } from '../../../core/models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, NgClass],
  template: `
    <div class="row">
      <div class="col-md-4">
        <div class="card">
          <img
            [src]="photoUrl || user?.image || 'assets/default-avatar.png'"
            class="card-img-top profile-avatar mx-auto mt-3"
            [alt]="user?.name">
          <div class="card-body text-center">
            <h4 class="card-title">{{ user?.name }}</h4>
            <p class="text-muted">{{ user?.email }}</p>
          </div>
        </div>
      </div>

      <div class="col-md-8">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Информация о профиле</h5>
            <a [routerLink]="['/profile/me/edit']" class="btn btn-sm btn-outline-primary">
              Редактировать
            </a>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="text-muted small">Дата рождения</label>
                <p>{{ getBirthday() }}</p>
              </div>
              <div class="col-md-6 mb-3">
                <label class="text-muted small">Пол</label>
                <p>{{ getGenderText() }}</p>
              </div>
              @if (user?.age) {
                <div class="col-md-6 mb-3">
                  <label class="text-muted small">Возраст</label>
                  <p>{{ user?.age }} лет</p>
                </div>
              }
            </div>

            <hr>

            @if (user?.isBioCompatible !== undefined || user?.isHoroCompatible !== undefined) {
              <div class="mb-3">
                <label class="text-muted small">Совместимость</label>
                <div>
                  @if (user?.isBioCompatible !== undefined) {
                    <span class="badge me-2" [ngClass]="user?.isBioCompatible ? 'bg-success' : 'bg-danger'">
                      Био: {{ user?.isBioCompatible ? 'Да' : 'Нет' }}
                    </span>
                  }
                  @if (user?.isHoroCompatible !== undefined) {
                    <span class="badge" [ngClass]="user?.isHoroCompatible ? 'bg-success' : 'bg-danger'">
                      Гороскоп: {{ user?.isHoroCompatible ? 'Да' : 'Нет' }}
                    </span>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <div class="card mt-3">
          <div class="card-header">
            <h5 class="mb-0">Статистика</h5>
          </div>
          <div class="card-body">
            <div class="row text-center">
              <div class="col-4">
                <h3 class="text-primary">0</h3>
                <p class="text-muted small">Закладок</p>
              </div>
              <div class="col-4">
                <h3 class="text-primary">0</h3>
                <p class="text-muted small">Встреч</p>
              </div>
              <div class="col-4">
                <h3 class="text-primary">0</h3>
                <p class="text-muted small">Сообщений</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ProfileComponent implements OnInit {
  user: UserInfo | null = null;
  photoUrl: string | null = null;

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  private loadProfile(): void {
    this.userService.getCurrentUser().subscribe({
      next: (user: UserInfo) => {
        this.user = user;
        this.loadPhoto();
      }
    });
  }

  private loadPhoto(): void {
    this.userService.getPhoto().subscribe({
      next: (blob: Blob) => {
        this.photoUrl = URL.createObjectURL(blob);
      },
      error: () => {
        this.photoUrl = null;
      }
    });
  }

  getBirthday(): string {
    if (!this.user?.birthday) return '';
    return this.user.birthday;
  }

  getGenderText(): string {
    return this.user?.gender === Gender.MAN ? 'Мужской' : 'Женский';
  }
}
