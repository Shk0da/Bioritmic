import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

const route = {} as ActivatedRouteSnapshot;

describe('authGuard', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'getCurrentUser', 'clearAuth']);
    const routerSpy = jasmine.createSpyObj('Router', ['createUrlTree']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should return true when authenticated and user exists', () => {
    authService.isAuthenticated.and.returnValue(true);
    authService.getCurrentUser.and.returnValue({ id: '1', name: 'Test', email: 't@t.com' });

    TestBed.runInInjectionContext(() => {
      const result = authGuard(route, { url: '/swipe' } as RouterStateSnapshot);
      expect(result).toBeTrue();
    });
  });

  it('should redirect to /auth/login when not authenticated', () => {
    authService.isAuthenticated.and.returnValue(false);
    const urlTree = {} as UrlTree;
    router.createUrlTree.and.returnValue(urlTree);

    TestBed.runInInjectionContext(() => {
      const result = authGuard(route, { url: '/profile/me' } as RouterStateSnapshot);
      expect(result).toBe(urlTree);
      expect(router.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
    });
  });

  it('should clear auth and redirect when authenticated but no user', () => {
    authService.isAuthenticated.and.returnValue(true);
    authService.getCurrentUser.and.returnValue(null);
    const urlTree = {} as UrlTree;
    router.createUrlTree.and.returnValue(urlTree);

    TestBed.runInInjectionContext(() => {
      const result = authGuard(route, { url: '/swipe' } as RouterStateSnapshot);
      expect(authService.clearAuth).toHaveBeenCalled();
      expect(result).toBe(urlTree);
    });
  });

  it('should allow unverified user to navigate to swipe', () => {
    authService.isAuthenticated.and.returnValue(true);
    authService.getCurrentUser.and.returnValue({
      id: '1',
      name: 'Test',
      email: 't@t.com',
      isVerified: false
    });

    TestBed.runInInjectionContext(() => {
      const result = authGuard(route, { url: '/swipe' } as RouterStateSnapshot);
      expect(result).toBeTrue();
    });
  });

  it('should allow unverified user to view and edit own profile', () => {
    authService.isAuthenticated.and.returnValue(true);
    authService.getCurrentUser.and.returnValue({
      id: '1',
      name: 'Test',
      email: 't@t.com',
      isVerified: false
    });

    TestBed.runInInjectionContext(() => {
      expect(authGuard(route, { url: '/profile/me' } as RouterStateSnapshot)).toBeTrue();
      expect(authGuard(route, { url: '/profile/me/edit' } as RouterStateSnapshot)).toBeTrue();
    });
  });

  it('should redirect unverified user away from restricted routes to swipe', () => {
    authService.isAuthenticated.and.returnValue(true);
    authService.getCurrentUser.and.returnValue({
      id: '1',
      name: 'Test',
      email: 't@t.com',
      isVerified: false
    });
    const urlTree = {} as UrlTree;
    router.createUrlTree.and.returnValue(urlTree);

    TestBed.runInInjectionContext(() => {
      const result = authGuard(route, { url: '/settings' } as RouterStateSnapshot);
      expect(result).toBe(urlTree);
      expect(router.createUrlTree).toHaveBeenCalledWith(['/swipe']);
    });
  });
});
