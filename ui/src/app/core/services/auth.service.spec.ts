import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { UserToken, UserInfo, AuthorizationModel } from '../models/user.model';
import { firstValueFrom } from 'rxjs';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
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
      req.flush(mockToken);
    });
  });

  describe('recovery', () => {
    it('should POST to /api/v1/recovery', () => {
      service.recovery('user@test.com').subscribe();

      const req = httpMock.expectOne('/api/v1/recovery');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'user@test.com' });
      req.flush(null);
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
    it('should store user in localStorage and clear on logout', () => {
      service.setAuth({ accessToken: 'at', refreshToken: 'rt', name: 'John', email: 'j@t.com', expireTime: 999 });
      expect(service.getCurrentUser()?.name).toBe('John');
      expect(localStorage.getItem('current_user')).toContain('John');
      service.clearAuth();
      expect(service.getCurrentUser()).toBeNull();
      expect(localStorage.getItem('current_user')).toBeNull();
    });
  });

  describe('ensureSessionRestored', () => {
    it('should restore user from cookies via /user/me', async () => {
      const restored = firstValueFrom(service.ensureSessionRestored());
      const req = httpMock.expectOne('/api/v1/user/me');
      req.flush({ id: '1', name: 'John', email: 'j@t.com', isVerified: true });
      expect(await restored).toBeTrue();
      expect(service.getCurrentUser()?.name).toBe('John');
    });

    it('should clear auth when session cookie is missing', async () => {
      localStorage.setItem('current_user', JSON.stringify({ id: '1', name: 'John', email: 'j@t.com' }));
      const restored = firstValueFrom(service.ensureSessionRestored());
      const req = httpMock.expectOne('/api/v1/user/me');
      req.flush(null, { status: 401, statusText: 'Unauthorized' });
      expect(await restored).toBeFalse();
      expect(service.getCurrentUser()).toBeNull();
    });
  });

  describe('current user polling', () => {
    beforeEach(() => {
      jasmine.clock().install();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should poll /user/me and update verification status', () => {
      service.loadCurrentUser().subscribe();
      httpMock.expectOne('/api/v1/user/me').flush({ id: '1', name: 'John', email: 'j@t.com', isVerified: false });

      jasmine.clock().tick(30_000);

      const req = httpMock.expectOne('/api/v1/user/me');
      expect(req.request.method).toBe('GET');
      req.flush({ id: '1', name: 'John', email: 'j@t.com', isVerified: true });
      expect(service.getCurrentUser()?.isVerified).toBeTrue();
    });

    it('should poll /user/me and update role', () => {
      service.loadCurrentUser().subscribe();
      httpMock.expectOne('/api/v1/user/me').flush({ id: '1', name: 'John', email: 'j@t.com', role: 'USER', isVerified: true });

      jasmine.clock().tick(30_000);

      const req = httpMock.expectOne('/api/v1/user/me');
      req.flush({ id: '1', name: 'John', email: 'j@t.com', role: 'ADMIN', isVerified: true });
      expect(service.getCurrentUser()?.role).toBe('ADMIN');
    });

    it('should stop polling after logout', () => {
      service.loadCurrentUser().subscribe();
      httpMock.expectOne('/api/v1/user/me').flush({ id: '1', name: 'John', email: 'j@t.com', isVerified: true });

      service.clearAuth();

      jasmine.clock().tick(60_000);
      httpMock.expectNone('/api/v1/user/me');
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
