import { inject } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

const UNVERIFIED_ALLOWED_ROUTES = ['/swipe', '/auth'];

export const authGuard = (): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const user = authService.getCurrentUser();
    if (user) {
      if (user.isVerified === false) {
        const currentUrl = router.url;
        const isAllowed = UNVERIFIED_ALLOWED_ROUTES.some(r => currentUrl.startsWith(r));
        if (!isAllowed) {
          return router.createUrlTree(['/swipe']);
        }
      }
      return true;
    }
    authService.clearAuth();
  }

  return router.createUrlTree(['/auth/login']);
};
