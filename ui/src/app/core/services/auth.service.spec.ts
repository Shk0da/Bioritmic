import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { UserToken, UserInfo, AuthorizationModel } from '../models/user.model';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('login', () => {
    it('should POST to /api/v1/authorization', () => {
      const creds: AuthorizationModel = { email: 'test@test.com', password: 'Test12345' };
      const mockToken: UserToken = { accessToken: 'abc', refreshToken: 'xyz', name: 'Test', email: 'test@test.com', expireTime: 999 };

      service.login(creds).subscribe(token => {
        expect(token).toEqual(mockToken);
      });

      const req = httpMock.expectOne('/api/v1/authorization');
      expect(req.request.method).toBe('POST');
      expect(req.request.withCredentials).toBeTrue();
      req.flush(mockToken);
    });
  });

  describe('resetPassword', () => {
    it('should POST to /api/v1/reset-password', () => {
      service.resetPassword('code123', 'NewPass123').subscribe();

      const req = httpMock.expectOne('/api/v1/reset-password');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ code: 'code123', password: 'NewPass123' });
      req.flush(null);
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when no user', () => {
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('should return true when user is set', () => {
      service.setAuth({ accessToken: 'at', refreshToken: 'rt', name: 'John', email: 'j@t.com', expireTime: 999 });
      expect(service.isAuthenticated()).toBeTrue();
    });
  });

  describe('setAuth and clearAuth', () => {
    it('should store user in session and clear on logout', () => {
      service.setAuth({ accessToken: 'at', refreshToken: 'rt', name: 'John', email: 'j@t.com', expireTime: 999 });
      expect(service.getCurrentUser()?.name).toBe('John');
      service.clearAuth();
      expect(service.getCurrentUser()).toBeNull();
    });
  });

  describe('loadCurrentUser', () => {
    it('should GET /api/v1/user/me and update user', () => {
      const user: UserInfo = { id: '1', name: 'Loaded', email: 'l@t.com' };

      service.loadCurrentUser().subscribe(u => {
        expect(u.name).toBe('Loaded');
      });

      const req = httpMock.expectOne('/api/v1/user/me');
      expect(req.request.method).toBe('GET');
      req.flush(user);
    });
  });
});
