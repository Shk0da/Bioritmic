import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
  HttpEvent
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { PushNotificationService } from '../services/push-notification.service';
import { UserToken } from '../models/user.model';
import { isUserBannedHttpError } from '../utils/http-error.util';

let isRefreshing = false;
const refreshTokenSubject: BehaviorSubject<UserToken | null> = new BehaviorSubject<UserToken | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const pushService = inject(PushNotificationService);
  const router = inject(Router);
  const token = authService.getToken();

  let authReq = req.clone({ withCredentials: true });
  if (token && !req.headers.has('Authorization')) {
    authReq = authReq.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (isUserBannedHttpError(error)) {
        authService.clearAuth({ banned: true });
        pushService.clearLocalPushState();
        if (!router.url.startsWith('/auth/login')) {
          void router.navigate(['/auth/login'], { queryParams: { banned: '1' } });
        }
        return throwError(() => error);
      }
      // Only 401 means expired/missing session. Business 403 (not verified, access denied, banned) must not trigger refresh.
      if (error.status === 401) {
        if (authReq.url.includes('/logout')) {
          authService.clearAuth();
          pushService.clearLocalPushState();
          return throwError(() => error);
        }
        return handle401Error(authReq, next, authService, pushService, router);
      }
      return throwError(() => error);
    })
  );
};

function handle401Error(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
  pushService: PushNotificationService,
  router: Router,
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    const user = authService.getCurrentUser();
    const token: Partial<UserToken> = {
      email: user?.email || '',
      name: user?.name || '',
      accessToken: '',
      refreshToken: '',
      expireTime: 0
    };

    return authService.refreshToken(token).pipe(
      switchMap((newToken: UserToken) => {
        isRefreshing = false;
        authService.setAuth(newToken);
        refreshTokenSubject.next(newToken);
        const retry = request.clone({ withCredentials: true });
        if (newToken.accessToken) {
          return next(retry.clone({
            setHeaders: { Authorization: `Bearer ${newToken.accessToken}` }
          }));
        }
        return next(retry);
      }),
      catchError((error) => {
        isRefreshing = false;
        if (isUserBannedHttpError(error)) {
          authService.clearAuth({ banned: true });
          pushService.clearLocalPushState();
          if (!router.url.startsWith('/auth/login')) {
            void router.navigate(['/auth/login'], { queryParams: { banned: '1' } });
          }
        } else {
          authService.clearAuth();
          pushService.clearLocalPushState();
        }
        return throwError(() => error);
      })
    );
  }

  return refreshTokenSubject.pipe(
    filter((token): token is UserToken => token != null),
    take(1),
    switchMap(token => {
      const retry = request.clone({ withCredentials: true });
      if (token.accessToken) {
        return next(retry.clone({
          setHeaders: { Authorization: `Bearer ${token.accessToken}` }
        }));
      }
      return next(retry);
    })
  );
}
