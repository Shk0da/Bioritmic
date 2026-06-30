import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../core/services/settings.service';
import { AuthService } from '../../core/services/auth.service';
import { ModalService } from '../../core/services/modal.service';
import { UserSettings, Gender } from '../../core/models/user.model';
import { PageBackLinkComponent } from '../../shared/components/page-back-link/page-back-link.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, PageBackLinkComponent],
  template: `
    <app-page-back-link link="/settings" label="Назад к настройкам"></app-page-back-link>

    <div class="page-header mb-4">
      <h1 class="page-title">
        <i class="bi bi-funnel me-2"></i>Параметры поиска
      </h1>
      <p class="text-muted">Кого и в каком радиусе показывать в ленте</p>
    </div>

    <div class="row">
      <div class="col-12 col-lg-8 mx-auto">
        <div class="card mb-4">
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
      </div>
    </div>
  `
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

  Gender = Gender;

  constructor(
    private settingsService: SettingsService,
    private authService: AuthService,
    private modalService: ModalService
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
        void this.modalService.alert('Настройки сохранены!', 'Готово');
      },
      error: () => {
        this.saving = false;
        void this.modalService.alert('Ошибка сохранения настроек', 'Ошибка');
      }
    });
  }
}
