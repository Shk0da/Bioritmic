import { inject } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard = (): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const user = authService.getCurrentUser();
    if (user && user.role && user.role.includes('ADMIN')) {
      return true;
    }
  }

  return router.createUrlTree(['/swipe']);
};
