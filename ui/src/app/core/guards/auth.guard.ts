import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

const UNVERIFIED_ALLOWED_ROUTES = ['/swipe', '/search', '/auth', '/profile', '/settings'];

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.ensureSessionRestored().pipe(
    map((): boolean | UrlTree => {
      if (!authService.isAuthenticated()) {
        return router.createUrlTree(['/auth/login'], {
          queryParams: state.url && state.url !== '/' ? { returnUrl: state.url } : undefined,
        });
      }

      const user = authService.getCurrentUser();
      if (!user) {
        authService.clearAuth();
        return router.createUrlTree(['/auth/login']);
      }

      if (user.isVerified === false) {
        const targetUrl = state.url;
        const isAllowed = UNVERIFIED_ALLOWED_ROUTES.some(r => targetUrl.startsWith(r));
        if (!isAllowed) {
          return router.createUrlTree(['/swipe']);
        }
      }

      return true;
    })
  );
};
