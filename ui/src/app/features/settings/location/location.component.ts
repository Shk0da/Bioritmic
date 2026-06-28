import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { UserService } from '../../../core/services/user.service';
import { GeolocationService } from '../../../core/services/geolocation.service';
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
                <p><strong>Широта:</strong> {{ gisData.lat | number:'1.6-6' }}</p>
                <p><strong>Долгота:</strong> {{ gisData.lon | number:'1.6-6' }}</p>
                <p><strong>Обновлено:</strong> {{ getTimestamp() }}</p>
              </div>
            }

            <hr>

            <h6 class="mb-3">Обновить местоположение</h6>
            
            <div class="mb-3">
              <button class="btn btn-outline-primary me-2" (click)="getCurrentLocation()">
                <i class="bi bi-geo-alt"></i> Использовать текущее местоположение
              </button>
              <button class="btn btn-outline-secondary" (click)="saveLocation()">
                Сохранить
              </button>
            </div>

            <div class="row">
              <div class="col-md-6 mb-3">
                <label for="lat" class="form-label">Широта (lat)</label>
                <input
                  type="number"
                  step="any"
                  class="form-control"
                  id="lat"
                  [(ngModel)]="formData.lat"
                  name="lat"
                  placeholder="Например: 55.7558">
              </div>

              <div class="col-md-6 mb-3">
                <label for="lon" class="form-label">Долгота (lon)</label>
                <input
                  type="number"
                  step="any"
                  class="form-control"
                  id="lon"
                  [(ngModel)]="formData.lon"
                  name="lon"
                  placeholder="Например: 37.6173">
              </div>
            </div>

            <div class="alert alert-info">
              <small>
                <i class="bi bi-info-circle"></i>
                Для поиска людей рядом с вами необходимо указать ваше местоположение.
                Вы можете использовать кнопку "Использовать текущее местоположение" или ввести координаты вручную.
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
  `
})
export class LocationComponent implements OnInit {
  gisData: GisData | null = null;
  formData: Partial<GisData> = {};
  loading = true;
  error = false;

  constructor(
    private userService: UserService,
    private geolocationService: GeolocationService
  ) {}

  ngOnInit(): void {
    this.loadLocation();
  }

  private loadLocation(): void {
    this.userService.getGisData().subscribe({
      next: (data) => {
        if (data) {
          this.gisData = data;
          this.formData = { ...data };
          this.error = false;
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

  getCurrentLocation(): void {
    void this.geolocationService.getCurrentPosition()
      .then((coords) => {
        this.formData = {
          lat: coords.latitude,
          lon: coords.longitude
        };
      })
      .catch((error: Error) => {
        alert(error.message);
      });
  }

  saveLocation(): void {
    if (!this.formData.lat || !this.formData.lon) {
      alert('Пожалуйста, укажите широту и долготу.');
      return;
    }

    this.userService.saveGisData(this.formData as GisData).subscribe({
      next: (data) => {
        this.gisData = data;
        this.error = false;
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
    this.userService.deleteGisData().subscribe({
      next: () => {
        this.geolocationService.stopTracking();
        this.gisData = null;
        this.formData = {};
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
    } else if ((ts as any).time) {
      date = new Date((ts as any).time);
    } else if ((ts as any).seconds) {
      date = new Date((ts as any).seconds * 1000);
    } else {
      return '';
    }
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString('ru-RU');
  }
}
