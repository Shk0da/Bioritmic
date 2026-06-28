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
    const userSpy = jasmine.createSpyObj('UserService', ['saveGisData', 'getGisData']);
    const authSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated']);

    userSpy.getGisData.and.returnValue(of(null));
    userSpy.saveGisData.and.returnValue(of({ lat: 55, lon: 37 }));

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
  });

  describe('stopTracking', () => {
    it('should set watchId to null', () => {
      service.stopTracking();
      expect(service['watchId']).toBeNull();
    });
  });
});
