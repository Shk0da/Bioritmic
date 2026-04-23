import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { UserService } from '../../../core/services/user.service';
import { UserInfo, Gender } from '../../../core/models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, NgClass],
  template: `
    <div class="page-header mb-4">
      <h1 class="page-title">
        <i class="bi bi-person-circle me-2"></i>Мой профиль
      </h1>
      <p class="text-muted">Информация о вашем аккаунте</p>
    </div>

    <div class="row">
      <div class="col-12 col-lg-4 mb-4">
        <div class="card profile-card text-center">
          <div class="card-body py-4">
            <img
              [src]="photoDataUrl || user?.image || ''"
              class="profile-avatar mx-auto mb-3"
              [alt]="user?.name">
            <h4 class="mb-1">{{ user?.name }}</h4>
            <p class="text-muted small mb-3">{{ user?.email }}</p>
            <a [routerLink]="['/profile/me/edit']" class="btn btn-outline-primary">
              <i class="bi bi-pencil me-2"></i>Редактировать
            </a>
          </div>
        </div>
      </div>

      <div class="col-12 col-lg-8">
        <div class="card">
          <div class="card-header">
            <h6 class="mb-0"><i class="bi bi-info-circle me-2"></i>Информация</h6>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-12 col-md-6 mb-3">
                <label class="text-muted small d-block">Дата рождения</label>
                <p class="mb-0 fw-medium">{{ getBirthday() || 'Не указана' }}</p>
              </div>
              <div class="col-12 col-md-6 mb-3">
                <label class="text-muted small d-block">Пол</label>
                <p class="mb-0 fw-medium">{{ getGenderText() }}</p>
              </div>
              @if (user?.age) {
                <div class="col-12 col-md-6 mb-3">
                  <label class="text-muted small d-block">Возраст</label>
                  <p class="mb-0 fw-medium">{{ user?.age }} лет</p>
                </div>
              }
            </div>

            @if (user?.isBioCompatible !== undefined || user?.isHoroCompatible !== undefined) {
              <hr class="my-4">
              <div class="mb-3">
                <label class="text-muted small d-block mb-2">Совместимость</label>
                <div class="d-flex flex-wrap gap-2">
                  @if (user?.isBioCompatible !== undefined) {
                    <span class="badge" [ngClass]="user?.isBioCompatible ? 'bg-success' : 'bg-danger'">
                      <i class="bi bi-dna me-1"></i>Био: {{ user?.isBioCompatible ? 'Да' : 'Нет' }}
                    </span>
                  }
                  @if (user?.isHoroCompatible !== undefined) {
                    <span class="badge" [ngClass]="user?.isHoroCompatible ? 'bg-success' : 'bg-danger'">
                      <i class="bi bi-moon-stars me-1"></i>Гороскоп: {{ user?.isHoroCompatible ? 'Да' : 'Нет' }}
                    </span>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <div class="card mt-3">
          <div class="card-header">
            <h6 class="mb-0"><i class="bi bi-gear me-2"></i>Настройки</h6>
          </div>
          <div class="card-body p-0">
            <div class="list-group list-group-flush">
              <a routerLink="/settings" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                <span><i class="bi bi-sliders me-2"></i>Параметры поиска</span>
                <i class="bi bi-chevron-right text-muted small"></i>
              </a>
              <a routerLink="/settings/blocked" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                <span><i class="bi bi-slash-circle me-2"></i>Заблокированные</span>
                <span class="badge bg-secondary">{{ blockedCount }}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-header {
      padding: 1rem 0;
    }

    .page-title {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, #fd297b 0%, #ff655b 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .profile-card {
      .profile-avatar {
        width: 180px;
        height: 180px;
      }
    }

    .stat-item {
      padding: 0.5rem;
    }

    .stat-value {
      font-size: 1.75rem;
      font-weight: 700;
      line-height: 1;
    }

    .stat-label {
      margin-top: 0.25rem;
      font-size: 0.75rem;
    }
  `]
})
export class ProfileComponent implements OnInit {
  user: UserInfo | null = null;
  photoDataUrl: SafeUrl | null = null;
  blockedCount = 0;

  constructor(
    private userService: UserService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadProfile();
    this.loadBlockedCount();
  }

  private loadBlockedCount(): void {
    // Загружаем всех заблокированных пользователей для подсчёта
    this.userService.getBlockedUsers({ page: 0, size: 100 }).subscribe({
      next: (users) => {
        this.blockedCount = users.length;
      },
      error: () => {
        this.blockedCount = 0;
      }
    });
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
      next: (bytes: Uint8Array) => {
        this.photoDataUrl = this.bytesToDataUrl(bytes);
      },
      error: () => {
        this.photoDataUrl = null;
      }
    });
  }

  private bytesToDataUrl(bytes: Uint8Array): SafeUrl {
    const base64 = this.uint8ArrayToBase64(bytes);
    const dataUrl = `data:image/jpeg;base64,${base64}`;
    return this.sanitizer.bypassSecurityTrustUrl(dataUrl);
  }

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  getBirthday(): string {
    if (!this.user?.birthday) return '';
    return new Date(this.user.birthday).toLocaleDateString('ru-RU');
  }

  getGenderText(): string {
    return this.user?.gender === Gender.MAN ? 'Мужской' : 'Женский';
  }
}
