import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { UserService } from './user.service';
import { GisData } from '../models/user.model';
import { AuthService } from './auth.service';

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 15000,
  maximumAge: 300000
};

@Injectable({
  providedIn: 'root'
})
export class GeolocationService implements OnDestroy {
  private watchId: number | null = null;
  private readonly UPDATE_INTERVAL = 60000;
  private lastUpdate = 0;
  private locationSubscription: Subscription | null = null;
  private unavailableLogged = false;

  constructor(
    private userService: UserService,
    private authService: AuthService
  ) {}

  ngOnDestroy(): void {
    this.stopTracking();
  }

  /**
   * Starts periodic location updates only when the user already saved coordinates.
   */
  startTracking(): void {
    if (!this.authService.isAuthenticated() || !navigator.geolocation) {
      return;
    }

    this.stopTracking();

    this.userService.getGisData().subscribe({
      next: (gis) => {
        if (gis) {
          this.beginWatch();
        }
      }
    });
  }

  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.locationSubscription?.unsubscribe();
    this.locationSubscription = null;
    this.unavailableLogged = false;
  }

  getCurrentPosition(): Promise<GeolocationCoordinates> {
    if (!navigator.geolocation) {
      return Promise.reject(new Error('Ваш браузер не поддерживает геолокацию.'));
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position.coords),
        (error) => reject(new Error(this.describeGeolocationError(error))),
        GEOLOCATION_OPTIONS
      );
    });
  }

  private beginWatch(): void {
    if (!navigator.geolocation) {
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        if (now - this.lastUpdate > this.UPDATE_INTERVAL) {
          this.sendLocation(position.coords.latitude, position.coords.longitude);
          this.lastUpdate = now;
        }
      },
      (error) => this.handleSilentGeolocationError(error),
      GEOLOCATION_OPTIONS
    );
  }

  private sendLocation(lat: number, lon: number): void {
    if (!this.authService.isAuthenticated()) {
      return;
    }

    const gisData: GisData = {
      userId: '',
      lat,
      lon
    };

    this.locationSubscription?.unsubscribe();
    this.locationSubscription = this.userService.saveGisData(gisData).subscribe({
      error: () => {
        // Location sync is best-effort; manual update remains available in settings.
      }
    });
  }

  private handleSilentGeolocationError(error: GeolocationPositionError): void {
    if (error.code === error.PERMISSION_DENIED) {
      this.stopTracking();
      return;
    }

    if (error.code === error.POSITION_UNAVAILABLE && !this.unavailableLogged) {
      this.unavailableLogged = true;
      console.debug('Geolocation unavailable, automatic updates paused.');
    }
  }

  private describeGeolocationError(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Разрешите доступ к геолокации в настройках браузера или введите координаты вручную.';
      case error.POSITION_UNAVAILABLE:
        return 'Местоположение недоступно. Включите службы геолокации на устройстве или введите координаты вручную.';
      case error.TIMEOUT:
        return 'Не удалось определить местоположение вовремя. Попробуйте ещё раз или введите координаты вручную.';
      default:
        return 'Не удалось получить местоположение. Введите координаты вручную.';
    }
  }
}
