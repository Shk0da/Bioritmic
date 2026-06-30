import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { GeolocationService } from './geolocation.service';
import { UserService } from './user.service';
import { AuthService } from './auth.service';

describe('GeolocationService', () => {
  let service: GeolocationService;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    const userSpy = jasmine.createSpyObj('UserService', ['saveGisData', 'getGisData', 'estimateGisLocation']);
    const authSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated']);

    userSpy.getGisData.and.returnValue(of(null));
    userSpy.saveGisData.and.returnValue(of({ lat: 55, lon: 37 }));
    userSpy.estimateGisLocation.and.returnValue(of({ lat: 55.75, lon: 37.61, approximate: true }));

    TestBed.configureTestingModule({
      providers: [
        GeolocationService,
        { provide: UserService, useValue: userSpy },
        { provide: AuthService, useValue: authSpy }
      ]
    });

    service = TestBed.inject(GeolocationService);
    userServiceSpy = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('startTracking', () => {
    it('should not start if not authenticated', () => {
      authServiceSpy.isAuthenticated.and.returnValue(false);
      service.startTracking();
      expect(userServiceSpy.getGisData).not.toHaveBeenCalled();
    });

    it('should not watch when user has no saved location', () => {
      authServiceSpy.isAuthenticated.and.returnValue(true);
      userServiceSpy.getGisData.and.returnValue(of(null));
      service.startTracking();
      expect(userServiceSpy.getGisData).toHaveBeenCalled();
      expect(service['watchId']).toBeNull();
    });

    it('should not restart tracking when watch is already active', () => {
      authServiceSpy.isAuthenticated.and.returnValue(true);
      service['watchId'] = 1;
      service.startTracking();
      expect(userServiceSpy.getGisData).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentPosition', () => {
    let getCurrentPositionSpy: jasmine.Spy;
    let watchPositionSpy: jasmine.Spy;
    let clearWatchSpy: jasmine.Spy;

    beforeEach(() => {
      getCurrentPositionSpy = jasmine.createSpy('getCurrentPosition');
      watchPositionSpy = jasmine.createSpy('watchPosition');
      clearWatchSpy = jasmine.createSpy('clearWatch');

      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: {
          getCurrentPosition: getCurrentPositionSpy,
          watchPosition: watchPositionSpy,
          clearWatch: clearWatchSpy
        }
      });
    });

    it('should resolve coordinates on first attempt', async () => {
      getCurrentPositionSpy.and.callFake((_success: PositionCallback) => {
        _success({ coords: { latitude: 55.75, longitude: 37.61 } as GeolocationCoordinates } as GeolocationPosition);
      });

      const location = await service.getCurrentPosition();
      expect(location.latitude).toBe(55.75);
      expect(location.longitude).toBe(37.61);
      expect(location.approximate).toBeFalse();
    });

    it('should retry with watchPosition when getCurrentPosition is unavailable', async () => {
      getCurrentPositionSpy.and.callFake(
        (_success: PositionCallback, error: PositionErrorCallback) => {
          error({ code: 2 } as GeolocationPositionError);
        }
      );

      watchPositionSpy.and.callFake((success: PositionCallback) => {
        window.setTimeout(() => {
          success({ coords: { latitude: 59.93, longitude: 30.33 } as GeolocationCoordinates } as GeolocationPosition);
        }, 0);
        return 1;
      });

      const location = await service.getCurrentPosition();
      expect(location.latitude).toBe(59.93);
      expect(watchPositionSpy).toHaveBeenCalled();
      expect(clearWatchSpy).toHaveBeenCalledWith(1);
      expect(location.approximate).toBeFalse();
    });

    it('should reject when permission denied', async () => {
      getCurrentPositionSpy.and.callFake(
        (_success: PositionCallback, error: PositionErrorCallback) => {
          error({ code: 1 } as GeolocationPositionError);
        }
      );

      await expectAsync(service.getCurrentPosition()).toBeRejectedWithError(/Разрешите доступ/);
      expect(watchPositionSpy).not.toHaveBeenCalled();
      expect(userServiceSpy.estimateGisLocation).not.toHaveBeenCalled();
    });

    it('should fall back to IP estimate when browser geolocation is unavailable', async () => {
      getCurrentPositionSpy.and.callFake(
        (_success: PositionCallback, error: PositionErrorCallback) => {
          error({ code: 2 } as GeolocationPositionError);
        }
      );
      watchPositionSpy.and.callFake(
        (_success: PositionCallback, error: PositionErrorCallback) => {
          error({ code: 2 } as GeolocationPositionError);
          return 1;
        }
      );

      const location = await service.getCurrentPosition();
      expect(location.latitude).toBe(55.75);
      expect(location.approximate).toBeTrue();
      expect(userServiceSpy.estimateGisLocation).toHaveBeenCalled();
    });
  });

  describe('stopTracking', () => {
    it('should set watchId to null', () => {
      service.stopTracking();
      expect(service['watchId']).toBeNull();
    });
  });
});
