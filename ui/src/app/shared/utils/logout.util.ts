import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PushNotificationService } from '../../core/services/push-notification.service';
import { clearLayoutRouteCache } from '../../core/routing/mobile-route-reuse.strategy';

export function logoutFromApp(
  authService: AuthService,
  pushService: PushNotificationService,
  router: Router,
): void {
  void (async () => {
    try {
      await pushService.disable();
    } catch {
      pushService.clearLocalPushState();
    }

    authService.logout().subscribe({
      complete: () => {
        clearLayoutRouteCache();
        authService.clearAuth();
        void router.navigate(['/auth/login']);
      },
      error: () => {
        clearLayoutRouteCache();
        authService.clearAuth();
        void router.navigate(['/auth/login']);
      },
    });
  })();
}
