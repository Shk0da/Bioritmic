import { Injectable, OnDestroy } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Subscription } from 'rxjs';
import { UserService } from './user.service';
import { GisData } from '../models/user.model';
import { AuthService } from './auth.service';

export interface ResolvedLocation {
  latitude: number;
  longitude: number;
  approximate: boolean;
}

const LOW_ACCURACY_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 20000,
  maximumAge: 300000
};

const HIGH_ACCURACY_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 25000,
  maximumAge: 0
};

const GEOLOCATION_ERROR = {
  PERMISSION_DENIED: 1,
  POSITION_UNAVAILABLE: 2,
  TIMEOUT: 3
} as const;

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

  getCurrentPosition(): Promise<ResolvedLocation> {
    if (!navigator.geolocation) {
      return this.requestApproximateLocation();
    }

    if (!window.isSecureContext) {
      return Promise.reject(new Error(
        'Геолокация доступна только по HTTPS или на localhost. Откройте сайт через https:// или http://localhost.'
      ));
    }

    return this.resolveBrowserPosition()
      .then((coords) => ({
        latitude: coords.latitude,
        longitude: coords.longitude,
        approximate: false
      }))
      .catch((error: GeolocationPositionError) => {
        if (error?.code === GEOLOCATION_ERROR.PERMISSION_DENIED) {
          throw new Error(this.describeGeolocationError(error));
        }
        return this.requestApproximateLocation();
      });
  }

  private retryIfRecoverable(
    error: GeolocationPositionError,
    retry: () => Promise<GeolocationCoordinates>
  ): Promise<GeolocationCoordinates> {
    const code = error?.code;
    if (code === GEOLOCATION_ERROR.PERMISSION_DENIED) {
      return Promise.reject(error);
    }
    if (code === GEOLOCATION_ERROR.POSITION_UNAVAILABLE || code === GEOLOCATION_ERROR.TIMEOUT) {
      return retry();
    }
    return Promise.reject(error);
  }

  private resolveBrowserPosition(): Promise<GeolocationCoordinates> {
    return this.requestPosition(HIGH_ACCURACY_OPTIONS)
      .catch((error) => this.retryIfRecoverable(error, () => this.requestPosition(LOW_ACCURACY_OPTIONS)))
      .catch((error) => this.retryIfRecoverable(error, () => this.requestPositionViaWatch(HIGH_ACCURACY_OPTIONS)))
      .catch((error) => this.retryIfRecoverable(error, () => this.requestPositionViaWatch(LOW_ACCURACY_OPTIONS)));
  }

  private requestApproximateLocation(): Promise<ResolvedLocation> {
    return firstValueFrom(this.userService.estimateGisLocation())
      .then((estimate) => ({
        latitude: estimate.lat,
        longitude: estimate.lon,
        approximate: true
      }))
      .catch(() => {
        throw new Error(
          'Браузер не смог определить координаты (на Mac без GPS это нормально). ' +
          'Не удалось получить приблизительное местоположение по IP — введите координаты вручную.'
        );
      });
  }

  private requestPosition(options: PositionOptions): Promise<GeolocationCoordinates> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position.coords),
        (error) => reject(error),
        options
      );
    });
  }

  private requestPositionViaWatch(options: PositionOptions): Promise<GeolocationCoordinates> {
    return new Promise((resolve, reject) => {
      let watchId: number | null = null;
      const timeoutMs = options.timeout ?? 25000;

      const cleanup = () => {
        window.clearTimeout(timeoutId);
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }
      };

      const timeoutId = window.setTimeout(() => {
        cleanup();
        reject({ code: 3 } as GeolocationPositionError);
      }, timeoutMs);

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          cleanup();
          resolve(position.coords);
        },
        (error) => {
          cleanup();
          reject(error);
        },
        options
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
      LOW_ACCURACY_OPTIONS
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
    if (error.code === GEOLOCATION_ERROR.PERMISSION_DENIED) {
      this.stopTracking();
      return;
    }

    if (error.code === GEOLOCATION_ERROR.POSITION_UNAVAILABLE || error.code === GEOLOCATION_ERROR.TIMEOUT) {
      if (!this.unavailableLogged) {
        this.unavailableLogged = true;
        console.debug('Geolocation unavailable, automatic updates paused.');
      }
      this.stopTracking();
    }
  }

  private describeGeolocationError(error: GeolocationPositionError): string {
    switch (error.code) {
      case GEOLOCATION_ERROR.PERMISSION_DENIED:
        return 'Разрешите доступ к геолокации в настройках браузера или введите координаты вручную.';
      case GEOLOCATION_ERROR.POSITION_UNAVAILABLE:
        return 'Браузер не смог определить координаты. На macOS откройте «Системные настройки → Конфиденциальность и безопасность → Службы геолокации» и включите доступ для вашего браузера. Также можно ввести координаты вручную.';
      case GEOLOCATION_ERROR.TIMEOUT:
        return 'Не удалось определить местоположение вовремя. Попробуйте ещё раз или введите координаты вручную.';
      default:
        return 'Не удалось получить местоположение. Введите координаты вручную.';
    }
  }
}
