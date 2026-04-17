import { inject } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard = (): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    // Проверяем, есть ли текущий пользователь
    const user = authService.getCurrentUser();
    if (user) {
      return true;
    }
    // Пользователь не загружен - возможно, он удалён с сервера
    authService.clearAuth();
  }

  return router.createUrlTree(['/auth/login']);
};
