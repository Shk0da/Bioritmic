import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { adminGuard } from './admin.guard';

describe('adminGuard', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'getCurrentUser']);
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

  it('should return true when authenticated and user has ADMIN role', () => {
    authService.isAuthenticated.and.returnValue(true);
    authService.getCurrentUser.and.returnValue({ id: '1', name: 'Admin', email: 'a@t.com', role: 'ADMIN' });

    TestBed.runInInjectionContext(() => {
      const result = adminGuard();
      expect(result).toBeTrue();
    });
  });

  it('should redirect to /swipe when not authenticated', () => {
    authService.isAuthenticated.and.returnValue(false);
    const urlTree = {} as UrlTree;
    router.createUrlTree.and.returnValue(urlTree);

    TestBed.runInInjectionContext(() => {
      const result = adminGuard();
      expect(router.createUrlTree).toHaveBeenCalledWith(['/swipe']);
      expect(result).toBe(urlTree);
    });
  });

  it('should redirect to /swipe when user has no ADMIN role', () => {
    authService.isAuthenticated.and.returnValue(true);
    authService.getCurrentUser.and.returnValue({ id: '1', name: 'User', email: 'u@t.com', role: 'USER' });
    const urlTree = {} as UrlTree;
    router.createUrlTree.and.returnValue(urlTree);

    TestBed.runInInjectionContext(() => {
      const result = adminGuard();
      expect(router.createUrlTree).toHaveBeenCalledWith(['/swipe']);
      expect(result).toBe(urlTree);
    });
  });

  it('should redirect to /swipe when user has no role', () => {
    authService.isAuthenticated.and.returnValue(true);
    authService.getCurrentUser.and.returnValue({ id: '1', name: 'User', email: 'u@t.com' });
    const urlTree = {} as UrlTree;
    router.createUrlTree.and.returnValue(urlTree);

    TestBed.runInInjectionContext(() => {
      const result = adminGuard();
      expect(result).toBe(urlTree);
    });
  });

  it('should redirect to /swipe when user is null', () => {
    authService.isAuthenticated.and.returnValue(true);
    authService.getCurrentUser.and.returnValue(null);
    const urlTree = {} as UrlTree;
    router.createUrlTree.and.returnValue(urlTree);

    TestBed.runInInjectionContext(() => {
      const result = adminGuard();
      expect(result).toBe(urlTree);
    });
  });
});
