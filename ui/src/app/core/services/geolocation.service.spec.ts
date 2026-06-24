import { TestBed } from '@angular/core/testing';
import { GeolocationService } from './geolocation.service';
import { UserService } from './user.service';
import { AuthService } from './auth.service';

describe('GeolocationService', () => {
  let service: GeolocationService;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    const userSpy = jasmine.createSpyObj('UserService', ['saveGisData']);
    const authSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated']);

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
      expect(userServiceSpy.saveGisData).not.toHaveBeenCalled();
    });
  });

  describe('stopTracking', () => {
    it('should set watchId to null', () => {
      service.stopTracking();
      expect(service['watchId']).toBeNull();
    });
  });
});
