import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SettingsService } from '../../core/services/settings.service';
import { UserService } from '../../core/services/user.service';
import { UserSettings, Gender } from '../../core/models/user.model';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="row">
      <div class="col-md-8 mx-auto">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">Настройки поиска</h5>
          </div>
          <div class="card-body">
            @if (loading) {
              <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Загрузка...</span>
                </div>
              </div>
            } @else {
              <form (ngSubmit)="save()">
                <div class="mb-3">
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

                <div class="row">
                  <div class="col-md-6 mb-3">
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

                  <div class="col-md-6 mb-3">
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

                <div class="mb-3">
                  <label for="distance" class="form-label">Расстояние (км)</label>
                  <input
                    type="range"
                    class="form-range"
                    id="distance"
                    [(ngModel)]="settings.distance"
                    name="distance"
                    min="0.05"
                    max="30"
                    step="0.05">
                  <span class="text-muted">{{ settings.distance }} км</span>
                </div>

                <div class="d-flex justify-content-end">
                  <button type="submit" class="btn btn-primary">
                    Сохранить настройки
                  </button>
                </div>
              </form>
            }
          </div>
        </div>

        <div class="card mt-3">
          <div class="card-header">
            <h5 class="mb-0">Дополнительно</h5>
          </div>
          <div class="card-body">
            <div class="list-group">
              <a routerLink="/settings/location" class="list-group-item list-group-item-action">
                <div class="d-flex w-100 justify-content-between">
                  <h6 class="mb-1">Моё местоположение</h6>
                  <small class="text-muted">GIS</small>
                </div>
                <p class="mb-1 small text-muted">
                  Укажите ваше местоположение для поиска людей рядом
                </p>
              </a>
              <a routerLink="/settings/blocked" class="list-group-item list-group-item-action">
                <div class="d-flex w-100 justify-content-between">
                  <h6 class="mb-1">Заблокированные пользователи</h6>
                  <small class="text-muted">{{ blockedCount }}</small>
                </div>
                <p class="mb-1 small text-muted">
                  Управление списком заблокированных пользователей
                </p>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SettingsComponent implements OnInit {
  settings: UserSettings = {
    gender: Gender.WOMAN,
    ageMin: 18,
    ageMax: 45,
    distance: 10
  };
  loading = false;
  blockedCount = 0;

  Gender = Gender;

  constructor(
    private settingsService: SettingsService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadSettings();
    this.loadBlockedCount();
  }

  private loadBlockedCount(): void {
    this.userService.getBlockedUsers({ page: 0, size: 1 }).subscribe({
      next: (users) => {
        this.blockedCount = users.length;
      },
      error: () => {
        this.blockedCount = 0;
      }
    });
  }

  private loadSettings(): void {
    this.loading = true;
    this.settingsService.getSettings().subscribe({
      next: (settings) => {
        this.settings = { ...this.settings, ...settings };
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  save(): void {
    this.settingsService.updateSettings(this.settings).subscribe({
      next: () => {
        alert('Настройки сохранены!');
      },
      error: (error) => {
        console.error('Failed to save settings', error);
        alert('Ошибка сохранения настроек');
      }
    });
  }
}
