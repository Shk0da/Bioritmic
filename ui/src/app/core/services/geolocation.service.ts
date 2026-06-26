import { Injectable } from '@angular/core';
import { UserService } from './user.service';
import { GisData } from '../models/user.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  private watchId: number | null = null;
  private readonly UPDATE_INTERVAL = 60000; // 1 минута
  private lastUpdate: number = 0;

  constructor(
    private userService: UserService,
    private authService: AuthService
  ) {}

  /**
   * Запускает периодическую отправку координат
   */
  startTracking(): void {
    if (!this.authService.isAuthenticated()) {
      return;
    }

    this.stopTracking();

    // Отправляем координаты сразу
    this.sendLocation();

    // Затем отправляем периодически
    if (navigator.geolocation) {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const now = Date.now();
          // Отправляем не чаще чем раз в UPDATE_INTERVAL
          if (now - this.lastUpdate > this.UPDATE_INTERVAL) {
            this.sendLocation(position.coords.latitude, position.coords.longitude);
            this.lastUpdate = now;
          }
        },
        (error) => {
          if (error.code !== 3) {
            console.error('Geolocation watch error:', error);
          }
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    }
  }

  /**
   * Останавливает отслеживание координат
   */
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Отправляет координаты на сервер
   */
  private sendLocation(lat?: number, lon?: number): void {
    if (!this.authService.isAuthenticated()) {
      return;
    }

    if (lat === undefined || lon === undefined) {
      // Получаем текущее местоположение
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            this.doSendLocation(position.coords.latitude, position.coords.longitude);
          },
          (error) => {
            if (error.code !== 3) {
              console.error('Failed to get current location:', error);
            }
          }
        );
      }
    } else {
      this.doSendLocation(lat, lon);
    }
  }

  /**
   * Фактическая отправка координат на сервер
   */
  private doSendLocation(lat: number, lon: number): void {
    const gisData: GisData = {
      userId: '', // Сервер определит по токену
      lat,
      lon
    };

    this.userService.saveGisData(gisData).subscribe({
      next: () => {
        console.log('Location updated:', lat, lon);
      },
      error: (error) => {
        console.error('Failed to update location:', error);
      }
    });
  }
}
