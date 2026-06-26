import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { CookieService } from './cookie.service';
import { UserToken, UserInfo, AuthorizationModel } from '../models/user.model';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let cookieService: CookieService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService, CookieService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    cookieService = TestBed.inject(CookieService);
    cookieService.clear();
  });

  afterEach(() => {
    httpMock.verify();
    cookieService.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('login', () => {
    it('should POST to /api/v1/authorization', () => {
      const creds: AuthorizationModel = { email: 'test@test.com', password: '123' };
      const mockToken: UserToken = { accessToken: 'abc', refreshToken: 'xyz', name: 'Test', email: 'test@test.com', expireTime: 999 };

      service.login(creds).subscribe(token => {
        expect(token).toEqual(mockToken);
      });

      const req = httpMock.expectOne('/api/v1/authorization');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(creds);
      req.flush(mockToken);
    });
  });

  describe('register', () => {
    it('should POST to /api/v1/registration', () => {
      const user = { name: 'Test', email: 'test@test.com', password: '123', birthday: '1990-01-01' };

      service.register(user as any).subscribe(res => {
        expect(res.name).toBe('Test');
      });

      const req = httpMock.expectOne('/api/v1/registration');
      expect(req.request.method).toBe('POST');
      req.flush({ id: 1, ...user });
    });
  });

  describe('logout', () => {
    it('should DELETE /api/v1/logout', () => {
      service.logout().subscribe();

      const req = httpMock.expectOne('/api/v1/logout');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('refreshToken', () => {
    it('should POST to /api/v1/refresh-token', () => {
      const token: UserToken = { accessToken: 'old', refreshToken: 'rt', name: 'T', email: 'e', expireTime: 0 };
      const newToken: UserToken = { accessToken: 'new', refreshToken: 'rt2', name: 'T', email: 'e', expireTime: 999 };

      service.refreshToken(token).subscribe(t => {
        expect(t.accessToken).toBe('new');
      });

      const req = httpMock.expectOne('/api/v1/refresh-token');
      expect(req.request.method).toBe('POST');
      req.flush(newToken);
    });
  });

  describe('recovery', () => {
    it('should POST to /api/v1/recovery', () => {
      service.recovery('test@test.com').subscribe();

      const req = httpMock.expectOne('/api/v1/recovery');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'test@test.com' });
      req.flush(null);
    });
  });

  describe('resetPassword', () => {
    it('should GET /api/v1/reset-password with code param', () => {
      service.resetPassword('code123', 'newpass').subscribe();

      const req = httpMock.expectOne(r => r.url === '/api/v1/reset-password');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('code')).toBe('code123');
      req.flush(null);
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when no token', () => {
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('should return true when token exists', () => {
      cookieService.set('access_token', 'tok', 1);
      expect(service.isAuthenticated()).toBeTrue();
    });
  });

  describe('getToken', () => {
    it('should return null when no token', () => {
      expect(service.getToken()).toBeNull();
    });

    it('should return token value', () => {
      cookieService.set('access_token', 'mytoken', 1);
      expect(service.getToken()).toBe('mytoken');
    });
  });

  describe('getCurrentUser', () => {
    it('should return null initially', () => {
      expect(service.getCurrentUser()).toBeNull();
    });
  });

  describe('clearAuth', () => {
    it('should remove all cookies and set user to null', () => {
      cookieService.set('access_token', 'tok', 1);
      cookieService.set('refresh_token', 'ref', 1);
      cookieService.set('current_user', '{"name":"X"}', 1);
      service.clearAuth();
      expect(cookieService.get('access_token')).toBeNull();
      expect(cookieService.get('refresh_token')).toBeNull();
      expect(cookieService.get('current_user')).toBeNull();
      expect(service.getCurrentUser()).toBeNull();
    });

    it('should make isAuthenticated return false after clearAuth', () => {
      cookieService.set('access_token', 'tok', 1);
      expect(service.isAuthenticated()).toBeTrue();
      service.clearAuth();
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('should make getToken return null after clearAuth', () => {
      cookieService.set('access_token', 'tok', 1);
      expect(service.getToken()).toBe('tok');
      service.clearAuth();
      expect(service.getToken()).toBeNull();
    });

    it('should make getCurrentUser return null after clearAuth', () => {
      const token: UserToken = { accessToken: 'at', refreshToken: 'rt', name: 'Test', email: 't@t.com', expireTime: 999 };
      service.setAuth(token);
      expect(service.getCurrentUser()).toBeTruthy();
      service.clearAuth();
      expect(service.getCurrentUser()).toBeNull();
    });

    it('should be idempotent - calling clearAuth twice does not throw', () => {
      service.clearAuth();
      expect(() => service.clearAuth()).not.toThrow();
      expect(service.isAuthenticated()).toBeFalse();
    });
  });

  describe('setAuth', () => {
    it('should store tokens and user', () => {
      const token: UserToken = { accessToken: 'at', refreshToken: 'rt', name: 'John', email: 'j@t.com', expireTime: 999 };
      service.setAuth(token);
      expect(cookieService.get('access_token')).toBe('at');
      expect(cookieService.get('refresh_token')).toBe('rt');
      expect(service.getCurrentUser()?.name).toBe('John');
    });

    it('should allow full login-logout cycle', () => {
      const token: UserToken = { accessToken: 'at', refreshToken: 'rt', name: 'John', email: 'j@t.com', expireTime: 999 };
      service.setAuth(token);
      expect(service.isAuthenticated()).toBeTrue();
      expect(service.getCurrentUser()?.name).toBe('John');

      service.clearAuth();
      expect(service.isAuthenticated()).toBeFalse();
      expect(service.getCurrentUser()).toBeNull();
      expect(service.getToken()).toBeNull();
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

    it('should clear auth on 401', () => {
      cookieService.set('access_token', 'tok', 1);

      service.loadCurrentUser().subscribe({
        error: () => {
          expect(cookieService.get('access_token')).toBeNull();
        }
      });

      const req = httpMock.expectOne('/api/v1/user/me');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should clear auth on 404', () => {
      cookieService.set('access_token', 'tok', 1);

      service.loadCurrentUser().subscribe({
        error: () => {
          expect(cookieService.get('access_token')).toBeNull();
        }
      });

      const req = httpMock.expectOne('/api/v1/user/me');
      req.flush('Not found', { status: 404, statusText: 'Not Found' });
    });
  });
});
