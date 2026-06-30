import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { UserService } from '../../../core/services/user.service';
import { GeolocationService } from '../../../core/services/geolocation.service';
import { GeoCountry, GeoPlace, GeoService } from '../../../core/services/geo.service';
import { GisData } from '../../../core/models/user.model';
import { PageBackLinkComponent } from '../../../shared/components/page-back-link/page-back-link.component';

@Component({
  selector: 'app-location',
  standalone: true,
  imports: [FormsModule, DecimalPipe, PageBackLinkComponent],
  template: `
    <div class="location-page">
      <app-page-back-link link="/settings" label="Назад к настройкам"></app-page-back-link>

      <div class="page-header location-page-header">
        <h1 class="page-title">
          <i class="bi bi-geo-alt me-2"></i>Моё местоположение
        </h1>
        <p class="text-muted location-page-subtitle">Для поиска людей рядом</p>
      </div>

      <div class="row">
        <div class="col-md-8 mx-auto">
          <div class="card location-card">
            <div class="card-body">
              @if (loading) {
                <div class="text-center py-3">
                  <div class="spinner-border spinner-border-sm text-primary" role="status">
                    <span class="visually-hidden">Загрузка...</span>
                  </div>
                </div>
              } @else {
                @if (error && !gisData) {
                  <div class="location-status location-status--warning">
                    <i class="bi bi-exclamation-circle"></i>
                    <span>Местоположение не указано</span>
                  </div>
                } @else if (gisData) {
                  <div class="location-status location-status--saved">
                    <div class="location-status__main">
                      <i class="bi bi-geo-alt-fill"></i>
                      <div class="location-status__text">
                        @if (savedPlaceLabel) {
                          <div class="location-status__place">{{ savedPlaceLabel }}</div>
                        }
                        <div class="location-status__meta">
                          {{ gisData.lat | number:'1.4-4' }}, {{ gisData.lon | number:'1.4-4' }}
                          @if (getTimestamp()) {
                            <span class="location-status__dot">·</span>{{ getTimestamp() }}
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                }

                @if (locationMessage) {
                  <div class="location-message">{{ locationMessage }}</div>
                }

                <button
                  type="button"
                  class="btn btn-outline-primary w-100 location-gps-btn"
                  (click)="getCurrentLocation()"
                  [disabled]="detectingLocation">
                  @if (detectingLocation) {
                    <span class="spinner-border spinner-border-sm me-1"></span>
                    Определяем...
                  } @else {
                    <i class="bi bi-crosshair me-1"></i>Текущее местоположение
                  }
                </button>

                <div class="location-divider">
                  <span>или укажите вручную</span>
                </div>

                <div class="location-form">
                  <div class="mb-2">
                    <label for="country" class="form-label">Страна</label>
                    <select
                      class="form-select form-select-sm"
                      id="country"
                      name="country"
                      [(ngModel)]="selectedCountryCode"
                      (ngModelChange)="onCountryChange()">
                      @for (country of countries; track country.code) {
                        <option [value]="country.code">{{ country.name }}</option>
                      }
                    </select>
                  </div>

                  <div class="mb-2">
                    <label for="city" class="form-label">Город или населённый пункт</label>
                    <div class="position-relative">
                      <input
                        type="text"
                        class="form-control form-control-sm"
                        id="city"
                        name="city"
                        autocomplete="off"
                        [(ngModel)]="cityQuery"
                        (ngModelChange)="onCityQueryChange()"
                        (focus)="onCityFocus()"
                        (blur)="hideSuggestionsLater()"
                        placeholder="Начните вводить...">
                      @if (searchingPlaces) {
                        <div class="position-absolute top-50 end-0 translate-middle-y me-3">
                          <span class="spinner-border spinner-border-sm text-secondary"></span>
                        </div>
                      }
                      @if (showSuggestions && placeSuggestions.length > 0) {
                        <div class="list-group position-absolute w-100 shadow-sm city-suggestions">
                          @for (place of placeSuggestions; track place.displayName + place.lat) {
                            <button
                              type="button"
                              class="list-group-item list-group-item-action py-2"
                              (mousedown)="selectPlace(place)">
                              <div class="fw-semibold small">{{ place.name }}</div>
                              <small class="text-muted">{{ place.displayName }}</small>
                            </button>
                          }
                        </div>
                      }
                      @if (showSuggestions && !searchingPlaces && cityQuery.trim().length >= 2 && placeSuggestions.length === 0) {
                        <div class="list-group position-absolute w-100 shadow-sm city-suggestions">
                          <div class="list-group-item text-muted small py-2">Ничего не найдено</div>
                        </div>
                      }
                    </div>
                  </div>

                  @if (formData.lat != null && formData.lon != null) {
                    <div class="coords-preview">
                      <i class="bi bi-crosshair2 me-1"></i>
                      {{ formData.lat | number:'1.4-4' }}, {{ formData.lon | number:'1.4-4' }}
                    </div>
                  }
                </div>

                <p class="location-hint">
                  <i class="bi bi-info-circle me-1"></i>
                  Выберите город из списка или определите местоположение по GPS.
                </p>

                <div class="location-actions">
                  <button
                    type="button"
                    class="btn btn-primary location-actions__save"
                    (click)="saveLocation()"
                    [disabled]="!canSave">
                    <i class="bi bi-check-lg me-1"></i>Сохранить
                  </button>
                  @if (gisData) {
                    <button
                      type="button"
                      class="btn btn-outline-danger location-actions__delete"
                      (click)="deleteLocation()">
                      <i class="bi bi-trash"></i>
                      <span class="location-actions__delete-text">Удалить</span>
                    </button>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .location-page-header {
      margin-bottom: 0.75rem;
      padding: 0.25rem 0;
    }

    .location-page-subtitle {
      margin-bottom: 0;
      font-size: 0.9rem;
    }

    .location-card .card-body {
      padding: 1rem;
    }

    .location-status {
      border-radius: 12px;
      padding: 0.65rem 0.75rem;
      margin-bottom: 0.75rem;
      font-size: 0.85rem;
    }

    .location-status--warning {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.25);
      color: var(--text-primary);
    }

    .location-status--saved {
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.2);
    }

    .location-status__main {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      min-width: 0;

      > i {
        color: #3b82f6;
        margin-top: 0.1rem;
        flex-shrink: 0;
      }
    }

    .location-status__text {
      min-width: 0;
      flex: 1;
    }

    .location-status__place {
      font-weight: 600;
      line-height: 1.3;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .location-status__meta {
      margin-top: 0.2rem;
      font-size: 0.78rem;
      color: var(--text-secondary);
      line-height: 1.3;
    }

    .location-status__dot {
      margin: 0 0.25rem;
    }

    .location-message {
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.25);
      border-radius: 10px;
      padding: 0.5rem 0.65rem;
      margin-bottom: 0.75rem;
      font-size: 0.8rem;
      line-height: 1.35;
      color: var(--text-primary);
    }

    .location-gps-btn {
      font-size: 0.9rem;
      padding: 0.55rem 0.75rem;
      border-radius: 12px;
    }

    .location-divider {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin: 0.75rem 0;
      color: var(--text-muted);
      font-size: 0.78rem;

      &::before,
      &::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--border-color);
      }
    }

    .location-form {
      .form-label {
        font-size: 0.8rem;
        margin-bottom: 0.25rem;
        color: var(--text-secondary);
      }
    }

    .coords-preview {
      font-size: 0.78rem;
      color: var(--text-secondary);
      padding: 0.35rem 0.5rem;
      background: var(--bg-secondary);
      border-radius: 8px;
      margin-top: 0.25rem;
    }

    .location-hint {
      margin: 0.65rem 0 0;
      font-size: 0.75rem;
      color: var(--text-muted);
      line-height: 1.35;
    }

    .location-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.85rem;
      padding-top: 0.85rem;
      border-top: 1px solid var(--border-color);
    }

    .location-actions__save {
      flex: 1;
      border-radius: 12px;
      font-weight: 600;
      padding: 0.6rem 1rem;
    }

    .location-actions__delete {
      border-radius: 12px;
      padding: 0.6rem 0.85rem;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      flex-shrink: 0;
    }

    .city-suggestions {
      z-index: 1050;
      max-height: 160px;
      overflow-y: auto;
    }

    @media (max-width: 767.98px) {
      .location-page-header .page-title {
        font-size: 1.35rem;
      }

      .location-card {
        border: none;
        background: transparent;
        box-shadow: none;
      }

      .location-card .card-body {
        padding: 0;
      }

      .location-actions {
        position: sticky;
        bottom: 0;
        z-index: 2;
        margin-top: 0.75rem;
        padding: 0.75rem 0 calc(0.75rem + env(safe-area-inset-bottom));
        background: linear-gradient(to top, var(--bg-primary) 75%, transparent);
      }

      .location-actions__delete-text {
        display: none;
      }

      .location-hint {
        margin-bottom: 0.25rem;
      }
    }

    @media (min-width: 768px) {
      .location-page-header {
        margin-bottom: 1.5rem;
        padding: 1rem 0;
      }

      .location-card .card-body {
        padding: 1.25rem;
      }

      .location-gps-btn {
        width: auto;
      }
    }
  `]
})
export class LocationComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly citySearch$ = new Subject<string>();

  gisData: GisData | null = null;
  formData: Partial<GisData> = {};
  countries: GeoCountry[] = [];
  selectedCountryCode = 'RU';
  cityQuery = '';
  placeSuggestions: GeoPlace[] = [];
  showSuggestions = false;
  savedPlaceLabel = '';
  loading = true;
  error = false;
  detectingLocation = false;
  searchingPlaces = false;
  locationMessage = '';
  private selectedPlaceKey: string | null = null;
  private hideSuggestionsTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private userService: UserService,
    private geolocationService: GeolocationService,
    private geoService: GeoService
  ) {}

  ngOnInit(): void {
    this.setupCitySearch();
    this.loadCountries();
    this.loadLocation();
  }

  get canSave(): boolean {
    return this.formData.lat != null && this.formData.lon != null;
  }

  private setupCitySearch(): void {
    this.citySearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((query) => {
        const trimmed = query.trim();
        if (trimmed.length < 2) {
          this.searchingPlaces = false;
          this.placeSuggestions = [];
          return of([]);
        }
        this.searchingPlaces = true;
        return this.geoService.searchPlaces(this.selectedCountryCode, trimmed).pipe(
          catchError(() => of([] as GeoPlace[]))
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((places) => {
      this.placeSuggestions = places;
      this.searchingPlaces = false;
      this.showSuggestions = this.cityQuery.trim().length >= 2;
    });
  }

  private loadCountries(): void {
    this.geoService.getCountries().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (countries) => {
        this.countries = countries;
        if (!countries.some((country) => country.code === this.selectedCountryCode)) {
          this.selectedCountryCode = countries[0]?.code ?? 'RU';
        }
      },
      error: () => {
        this.countries = [{ code: 'RU', name: 'Россия' }];
      }
    });
  }

  private loadLocation(): void {
    this.userService.getGisData().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        if (data) {
          this.gisData = data;
          this.formData = { ...data };
          this.error = false;
          this.resolveSavedLocation(data.lat!, data.lon!);
        } else {
          this.gisData = null;
          this.error = true;
        }
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      }
    });
  }

  private resolveSavedLocation(lat: number, lon: number): void {
    this.geoService.reverseGeocode(lat, lon).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (details) => this.applyLocationDetails(details, true),
      error: () => {
        this.savedPlaceLabel = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      }
    });
  }

  private applyLocationDetails(
    details: { countryCode?: string | null; placeName?: string | null; displayName?: string | null; lat: number; lon: number },
    saved = false
  ): void {
    if (details.countryCode) {
      this.selectedCountryCode = details.countryCode.toUpperCase();
    }
    if (details.placeName) {
      this.cityQuery = details.placeName;
      this.selectedPlaceKey = this.buildPlaceKey(details.placeName, details.lat, details.lon);
    }
    this.formData = {
      ...this.formData,
      lat: details.lat,
      lon: details.lon
    };
    const label = details.displayName || details.placeName;
    if (saved) {
      this.savedPlaceLabel = label || '';
    }
    this.locationMessage = '';
  }

  onCountryChange(): void {
    this.cityQuery = '';
    this.placeSuggestions = [];
    this.showSuggestions = false;
    this.selectedPlaceKey = null;
    this.formData = { ...this.formData, lat: undefined, lon: undefined };
    this.locationMessage = '';
  }

  onCityQueryChange(): void {
    if (this.selectedPlaceKey) {
      const selectedName = this.selectedPlaceKey.split('|')[0];
      if (this.cityQuery.trim().toLowerCase() !== selectedName) {
        this.selectedPlaceKey = null;
        this.formData = { ...this.formData, lat: undefined, lon: undefined };
      }
    }
    this.citySearch$.next(this.cityQuery);
  }

  onCityFocus(): void {
    if (this.cityQuery.trim().length >= 2) {
      this.showSuggestions = true;
    }
  }

  hideSuggestionsLater(): void {
    if (this.hideSuggestionsTimer) {
      clearTimeout(this.hideSuggestionsTimer);
    }
    this.hideSuggestionsTimer = setTimeout(() => {
      this.showSuggestions = false;
    }, 150);
  }

  selectPlace(place: GeoPlace): void {
    if (this.hideSuggestionsTimer) {
      clearTimeout(this.hideSuggestionsTimer);
    }
    this.cityQuery = place.name;
    this.selectedPlaceKey = this.buildPlaceKey(place.name, place.lat, place.lon);
    this.formData = {
      ...this.formData,
      lat: place.lat,
      lon: place.lon
    };
    this.placeSuggestions = [];
    this.showSuggestions = false;
    this.locationMessage = '';
  }

  getCurrentLocation(): void {
    this.locationMessage = '';
    this.detectingLocation = true;

    void this.geolocationService.getCurrentPosition()
      .then((location) => {
        this.formData = {
          ...this.formData,
          lat: location.latitude,
          lon: location.longitude
        };
        this.geoService.reverseGeocode(location.latitude, location.longitude)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (details) => this.applyLocationDetails(details),
            error: () => {
              this.cityQuery = '';
              this.selectedPlaceKey = null;
            }
          });
        this.locationMessage = location.approximate
          ? 'Определено приблизительное местоположение по IP. При необходимости уточните населённый пункт и нажмите «Сохранить».'
          : '';
      })
      .catch((error: Error) => {
        this.locationMessage = error.message;
      })
      .finally(() => {
        this.detectingLocation = false;
      });
  }

  saveLocation(): void {
    if (!this.canSave) {
      alert('Выберите населённый пункт из списка или определите местоположение автоматически.');
      return;
    }

    this.userService.saveGisData(this.formData as GisData).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.gisData = data;
        this.error = false;
        this.savedPlaceLabel = this.cityQuery
          ? `${this.cityQuery}, ${this.getCountryName(this.selectedCountryCode)}`
          : `${data.lat}, ${data.lon}`;
        this.geolocationService.startTracking();
        alert('Местоположение сохранено!');
      },
      error: (error) => {
        console.error('Failed to save location', error);
        alert('Ошибка сохранения местоположения.');
      }
    });
  }

  deleteLocation(): void {
    if (!confirm('Вы уверены, что хотите удалить своё местоположение?')) {
      return;
    }
    this.userService.deleteGisData().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.geolocationService.stopTracking();
        this.gisData = null;
        this.formData = {};
        this.cityQuery = '';
        this.savedPlaceLabel = '';
        this.selectedPlaceKey = null;
        this.error = true;
        alert('Местоположение удалено.');
      },
      error: (error) => {
        console.error('Failed to delete location', error);
        alert('Ошибка удаления местоположения.');
      }
    });
  }

  getTimestamp(): string {
    if (!this.gisData?.timestamp) return '';
    const ts = this.gisData.timestamp;
    let date: Date;
    if (typeof ts === 'number') {
      date = new Date(ts);
    } else if (typeof ts === 'string') {
      date = new Date(ts);
    } else if (typeof ts === 'object' && ts !== null && 'time' in ts) {
      date = new Date((ts as { time: number }).time);
    } else if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
      date = new Date((ts as { seconds: number }).seconds * 1000);
    } else {
      return '';
    }
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString('ru-RU');
  }

  private getCountryName(code: string): string {
    return this.countries.find((country) => country.code === code)?.name ?? code;
  }

  private buildPlaceKey(name: string, lat: number, lon: number): string {
    return `${name.trim().toLowerCase()}|${lat.toFixed(4)}|${lon.toFixed(4)}`;
  }
}
