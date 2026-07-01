import { inject } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { hasAdminPanelAccess } from '../utils/admin-access.util';

export const adminGuard = (): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const user = authService.getCurrentUser();
    if (user && hasAdminPanelAccess(user.role)) {
      return true;
    }
  }

  return router.createUrlTree(['/swipe']);
};
