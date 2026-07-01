import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

const route = {} as ActivatedRouteSnapshot;

function runGuard(url: string): Observable<boolean | UrlTree> {
  return TestBed.runInInjectionContext(() =>
    authGuard(route, { url } as RouterStateSnapshot)
  ) as Observable<boolean | UrlTree>;
}

describe('authGuard', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', [
      'isAuthenticated',
      'getCurrentUser',
      'clearAuth',
      'ensureSessionRestored'
    ]);
    authSpy.ensureSessionRestored.and.returnValue(of(true));

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

  it('should return true when authenticated and user exists', (done) => {
    authService.isAuthenticated.and.returnValue(true);
    authService.getCurrentUser.and.returnValue({ id: '1', name: 'Test', email: 't@t.com' });

    runGuard('/swipe').subscribe(value => {
      expect(value).toBeTrue();
      done();
    });
  });

  it('should redirect to /auth/login when not authenticated', (done) => {
    authService.isAuthenticated.and.returnValue(false);
    const urlTree = {} as UrlTree;
    router.createUrlTree.and.returnValue(urlTree);

    runGuard('/profile/me').subscribe(value => {
      expect(value).toBe(urlTree);
      expect(router.createUrlTree).toHaveBeenCalledWith(
        ['/auth/login'],
        jasmine.objectContaining({ queryParams: { returnUrl: '/profile/me' } }),
      );
      done();
    });
  });

  it('should clear auth and redirect when authenticated but no user', (done) => {
    authService.isAuthenticated.and.returnValue(true);
    authService.getCurrentUser.and.returnValue(null);
    const urlTree = {} as UrlTree;
    router.createUrlTree.and.returnValue(urlTree);

    runGuard('/swipe').subscribe(value => {
      expect(authService.clearAuth).toHaveBeenCalled();
      expect(value).toBe(urlTree);
      done();
    });
  });

  it('should allow unverified user to navigate to swipe', (done) => {
    authService.isAuthenticated.and.returnValue(true);
    authService.getCurrentUser.and.returnValue({
      id: '1',
      name: 'Test',
      email: 't@t.com',
      isVerified: false
    });

    runGuard('/swipe').subscribe(value => {
      expect(value).toBeTrue();
      done();
    });
  });

  it('should allow unverified user to view and edit own profile', (done) => {
    authService.isAuthenticated.and.returnValue(true);
    authService.getCurrentUser.and.returnValue({
      id: '1',
      name: 'Test',
      email: 't@t.com',
      isVerified: false
    });

    runGuard('/profile/me').subscribe(value => {
      expect(value).toBeTrue();
      runGuard('/profile/me/edit').subscribe(value2 => {
        expect(value2).toBeTrue();
        done();
      });
    });
  });

  it('should allow unverified user to open search settings and location', (done) => {
    authService.isAuthenticated.and.returnValue(true);
    authService.getCurrentUser.and.returnValue({
      id: '1',
      name: 'Test',
      email: 't@t.com',
      isVerified: false
    });

    runGuard('/search').subscribe(value => {
      expect(value).toBeTrue();
      runGuard('/settings').subscribe(value2 => {
        expect(value2).toBeTrue();
        runGuard('/settings/search').subscribe(value3 => {
          expect(value3).toBeTrue();
          runGuard('/settings/location').subscribe(value4 => {
            expect(value4).toBeTrue();
            runGuard('/settings/notifications').subscribe(value5 => {
              expect(value5).toBeTrue();
              runGuard('/settings/feedback').subscribe(value6 => {
                expect(value6).toBeTrue();
                runGuard('/settings/danger').subscribe(value7 => {
                  expect(value7).toBeTrue();
                  runGuard('/settings/blocked').subscribe(value8 => {
                    expect(value8).toBeTrue();
                    done();
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  it('should redirect unverified user away from payments and mailbox to swipe', (done) => {
    authService.isAuthenticated.and.returnValue(true);
    authService.getCurrentUser.and.returnValue({
      id: '1',
      name: 'Test',
      email: 't@t.com',
      isVerified: false
    });
    const urlTree = {} as UrlTree;
    router.createUrlTree.and.returnValue(urlTree);

    runGuard('/payments').subscribe(value => {
      expect(value).toBe(urlTree);
      expect(router.createUrlTree).toHaveBeenCalledWith(['/swipe']);
      runGuard('/mailbox').subscribe(value2 => {
        expect(value2).toBe(urlTree);
        done();
      });
    });
  });

  it('should redirect unverified user away from restricted routes to swipe', (done) => {
    authService.isAuthenticated.and.returnValue(true);
    authService.getCurrentUser.and.returnValue({
      id: '1',
      name: 'Test',
      email: 't@t.com',
      isVerified: false
    });
    const urlTree = {} as UrlTree;
    router.createUrlTree.and.returnValue(urlTree);

    runGuard('/bookmarks').subscribe(value => {
      expect(value).toBe(urlTree);
      expect(router.createUrlTree).toHaveBeenCalledWith(['/swipe']);
      done();
    });
  });
});
