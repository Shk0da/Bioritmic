import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { UserService } from '../../../core/services/user.service';
import { GeolocationService } from '../../../core/services/geolocation.service';
import { GeoCountry, GeoPlace, GeoService } from '../../../core/services/geo.service';
import { GisData } from '../../../core/models/user.model';

@Component({
  selector: 'app-location',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe],
  template: `
    <div class="row">
      <div class="col-md-8 mx-auto">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">Моё местоположение</h5>
          </div>
          <div class="card-body">
            @if (loading) {
              <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Загрузка...</span>
                </div>
              </div>
            } @else if (error) {
              <div class="alert alert-warning">
                <p>Геоданные не найдены. Добавьте своё местоположение для поиска людей рядом.</p>
              </div>
            } @else if (gisData) {
              <div class="alert alert-info">
                @if (savedPlaceLabel) {
                  <p><strong>Населённый пункт:</strong> {{ savedPlaceLabel }}</p>
                }
                <p><strong>Координаты:</strong> {{ gisData.lat | number:'1.4-4' }}, {{ gisData.lon | number:'1.4-4' }}</p>
                <p><strong>Обновлено:</strong> {{ getTimestamp() }}</p>
              </div>
            }

            <hr>

            <h6 class="mb-3">Обновить местоположение</h6>

            @if (locationMessage) {
              <div class="alert alert-warning py-2">{{ locationMessage }}</div>
            }

            <div class="mb-3">
              <button class="btn btn-outline-primary me-2" (click)="getCurrentLocation()" [disabled]="detectingLocation">
                @if (detectingLocation) {
                  <span class="spinner-border spinner-border-sm me-1"></span>
                  Определяем...
                } @else {
                  <i class="bi bi-geo-alt"></i> Использовать текущее местоположение
                }
              </button>
              <button class="btn btn-outline-secondary" (click)="saveLocation()" [disabled]="!canSave">
                Сохранить
              </button>
            </div>

            <div class="row">
              <div class="col-md-5 mb-3">
                <label for="country" class="form-label">Страна</label>
                <select
                  class="form-select"
                  id="country"
                  name="country"
                  [(ngModel)]="selectedCountryCode"
                  (ngModelChange)="onCountryChange()">
                  @for (country of countries; track country.code) {
                    <option [value]="country.code">{{ country.name }}</option>
                  }
                </select>
              </div>

              <div class="col-md-7 mb-3">
                <label for="city" class="form-label">Город или населённый пункт</label>
                <div class="position-relative">
                  <input
                    type="text"
                    class="form-control"
                    id="city"
                    name="city"
                    autocomplete="off"
                    [(ngModel)]="cityQuery"
                    (ngModelChange)="onCityQueryChange()"
                    (focus)="onCityFocus()"
                    (blur)="hideSuggestionsLater()"
                    placeholder="Начните вводить название...">
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
                          class="list-group-item list-group-item-action"
                          (mousedown)="selectPlace(place)">
                          <div class="fw-semibold">{{ place.name }}</div>
                          <small class="text-muted">{{ place.displayName }}</small>
                        </button>
                      }
                    </div>
                  }
                  @if (showSuggestions && !searchingPlaces && cityQuery.trim().length >= 2 && placeSuggestions.length === 0) {
                    <div class="list-group position-absolute w-100 shadow-sm city-suggestions">
                      <div class="list-group-item text-muted">Ничего не найдено</div>
                    </div>
                  }
                </div>
              </div>
            </div>

            @if (formData.lat != null && formData.lon != null) {
              <div class="alert alert-light border py-2 mb-3">
                <small class="text-muted">
                  Координаты: {{ formData.lat | number:'1.4-4' }}, {{ formData.lon | number:'1.4-4' }}
                </small>
              </div>
            }

            <div class="alert alert-info">
              <small>
                <i class="bi bi-info-circle"></i>
                Выберите страну и начните вводить название города или населённого пункта — координаты подставятся автоматически.
                Также можно определить местоположение по GPS или IP.
              </small>
            </div>

            <div class="d-flex justify-content-between">
              <a routerLink="/settings" class="btn btn-outline-secondary">Назад к настройкам</a>
              @if (gisData) {
                <button type="button" class="btn btn-outline-danger" (click)="deleteLocation()">
                  Удалить местоположение
                </button>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .city-suggestions {
      z-index: 1050;
      max-height: 240px;
      overflow-y: auto;
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
