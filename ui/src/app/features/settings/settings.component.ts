import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SettingsService } from '../../core/services/settings.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { UserSettings, Gender } from '../../core/models/user.model';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page-header mb-4">
      <h1 class="page-title">
        <i class="bi bi-gear me-2"></i>Настройки
      </h1>
      <p class="text-muted">Параметры поиска и приложения</p>
    </div>

    <div class="row">
      <div class="col-12 col-lg-8 mx-auto">
        <div class="card mb-4">
          <div class="card-header">
            <h6 class="mb-0"><i class="bi bi-funnel me-2"></i>Параметры поиска</h6>
          </div>
          <div class="card-body">
            @if (loading) {
              <div class="text-center py-4">
                <div class="spinner-border" role="status">
                  <span class="visually-hidden">Загрузка...</span>
                </div>
              </div>
            } @else {
              <form (ngSubmit)="save()">
                <div class="mb-4">
                  <label for="gender" class="form-label">Кого ищем</label>
                  <select
                    class="form-select"
                    id="gender"
                    [(ngModel)]="settings.gender"
                    name="gender">
                    <option [value]="Gender.MAN">Мужчин</option>
                    <option [value]="Gender.WOMAN">Женщин</option>
                  </select>
                </div>

                <div class="row mb-4">
                  <div class="col-6">
                    <label for="ageMin" class="form-label">Возраст от</label>
                    <input
                      type="number"
                      class="form-control"
                      id="ageMin"
                      [(ngModel)]="settings.ageMin"
                      name="ageMin"
                      min="14"
                      max="100">
                  </div>
                  <div class="col-6">
                    <label for="ageMax" class="form-label">Возраст до</label>
                    <input
                      type="number"
                      class="form-control"
                      id="ageMax"
                      [(ngModel)]="settings.ageMax"
                      name="ageMax"
                      min="14"
                      max="100">
                  </div>
                </div>

                <div class="mb-4">
                  <label for="distance" class="form-label">
                    Расстояние: <strong class="text-primary">{{ settings.distance }} км</strong>
                  </label>
                  <input
                    type="range"
                    class="form-range"
                    id="distance"
                    [(ngModel)]="settings.distance"
                    name="distance"
                    min="0.05"
                    max="100"
                    step="0.05">
                  <div class="d-flex justify-content-between small text-muted mt-1">
                    <span>0.05 км</span>
                    <span>100 км</span>
                  </div>
                </div>

                <div class="d-grid">
                  <button type="submit" class="btn btn-primary btn-lg" [disabled]="saving">
                    @if (saving) {
                      <span class="spinner-border spinner-border-sm me-2"></span>
                    }
                    <i class="bi bi-check-lg me-2"></i>Сохранить настройки
                  </button>
                </div>
              </form>
            }
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h6 class="mb-0"><i class="bi bi-list-ul me-2"></i>Дополнительно</h6>
          </div>
          <div class="card-body p-0">
            <div class="list-group list-group-flush">
              <a routerLink="/settings/location" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                <div>
                  <i class="bi bi-geo-alt me-2"></i>Моё местоположение
                  <p class="small text-muted mb-0 mt-1">Укажите местоположение для поиска рядом</p>
                </div>
                <i class="bi bi-chevron-right text-muted small"></i>
              </a>
              <a routerLink="/settings/blocked" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                <div>
                  <i class="bi bi-slash-circle me-2"></i>Заблокированные пользователи
                  <p class="small text-muted mb-0 mt-1">Управление чёрным списком</p>
                </div>
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
      background: var(--tinder-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  `]
})
export class SettingsComponent implements OnInit {
  settings: UserSettings = {
    gender: Gender.WOMAN,
    ageMin: 18,
    ageMax: 45,
    distance: 50
  };
  loading = false;
  saving = false;
  blockedCount = 0;

  Gender = Gender;

  constructor(
    private settingsService: SettingsService,
    private userService: UserService,
    private authService: AuthService
  ) {
    const user = this.authService.getCurrentUser();
    if (user?.gender === Gender.MAN) {
      this.settings.gender = Gender.WOMAN;
    } else {
      this.settings.gender = Gender.MAN;
    }
  }

  ngOnInit(): void {
    this.loadSettings();
    this.loadBlockedCount();
  }

  private loadBlockedCount(): void {
    this.userService.getBlockedCount().subscribe({
      next: (res) => { this.blockedCount = res.count; },
      error: () => { this.blockedCount = 0; }
    });
  }

  private loadSettings(): void {
    this.loading = true;
    this.settingsService.getSettings().subscribe({
      next: (settings) => {
        if (settings.gender !== undefined && settings.gender !== null) {
          this.settings.gender = settings.gender;
        }
        if (settings.ageMin !== undefined && settings.ageMin !== null) {
          this.settings.ageMin = settings.ageMin;
        }
        if (settings.ageMax !== undefined && settings.ageMax !== null) {
          this.settings.ageMax = settings.ageMax;
        }
        if (settings.distance !== undefined && settings.distance !== null) {
          this.settings.distance = settings.distance;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  save(): void {
    this.saving = true;
    this.settingsService.updateSettings(this.settings).subscribe({
      next: () => {
        this.saving = false;
        alert('Настройки сохранены!');
      },
      error: () => {
        this.saving = false;
        alert('Ошибка сохранения настроек');
      }
    });
  }
}
