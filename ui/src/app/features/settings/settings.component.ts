import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../core/services/settings.service';
import { AuthService } from '../../core/services/auth.service';
import { ModalService } from '../../core/services/modal.service';
import { UserSettings, Gender } from '../../core/models/user.model';
import { PageBackLinkComponent } from '../../shared/components/page-back-link/page-back-link.component';
import { registerPullToRefresh } from '../../core/routing/register-pull-to-refresh.util';
import { PullToRefreshService } from '../../core/routing/pull-to-refresh.service';
import { normalizeAgeRange } from '../../shared/utils/age-range.util';

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

                <div class="mb-4">
                  <label class="form-label">
                    Возраст: {{ settings.ageMin }} - {{ settings.ageMax }}
                  </label>
                  <input
                    type="range"
                    class="form-range"
                    id="ageMin"
                    [(ngModel)]="settings.ageMin"
                    name="ageMin"
                    min="14"
                    max="100"
                    (ngModelChange)="onAgeRangeChange()">
                  <input
                    type="range"
                    class="form-range"
                    id="ageMax"
                    [(ngModel)]="settings.ageMax"
                    name="ageMax"
                    min="14"
                    max="100"
                    (ngModelChange)="onAgeRangeChange()">
                </div>

                <div class="mb-4">
                  <label for="distance" class="form-label">
                    Расстояние: {{ settings.distance }} км
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly pullToRefreshService = inject(PullToRefreshService);

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
    registerPullToRefresh(this.pullToRefreshService, this.destroyRef, '/settings/search', () => ({
      refresh: () => this.loadSettings(),
      isEnabled: () => !this.loading && !this.saving,
    }));
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
        this.applyAgeRangeConstraints();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  save(): void {
    this.applyAgeRangeConstraints();
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

  onAgeRangeChange(): void {
    this.applyAgeRangeConstraints();
  }

  private applyAgeRangeConstraints(): void {
    if (this.settings.ageMin === undefined || this.settings.ageMax === undefined) {
      return;
    }
    const normalized = normalizeAgeRange(this.settings.ageMin, this.settings.ageMax);
    this.settings.ageMin = normalized.ageMin;
    this.settings.ageMax = normalized.ageMax;
  }
}
