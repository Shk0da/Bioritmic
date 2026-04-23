import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { CookieService } from '../services/cookie.service';
import { UserToken } from '../models/user.model';

let isRefreshing = false;
const refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const cookieService = inject(CookieService);
  
  const token = authService.getToken();
  
  // Добавляем токен только если его ещё нет в заголовках
  if (token && !req.headers.has('Authorization')) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 || error.status === 403) {
        return handle401Error(req, next, authService, cookieService);
      }
      return throwError(() => error);
    })
  );
};

function handle401Error(
  request: HttpRequest<any>,
  next: HttpHandlerFn,
  authService: AuthService,
  cookieService: CookieService
): Observable<any> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    const refreshToken = cookieService.get('refresh_token');
    const userStr = cookieService.get('current_user');
    
    if (refreshToken && userStr) {
      const user = JSON.parse(userStr);
      const token: UserToken = {
        accessToken: '',
        refreshToken: refreshToken,
        name: user.name || '',
        email: user.email || '',
        expireTime: 0
      };
      
      return authService.refreshToken(token).pipe(
        switchMap((newToken: UserToken) => {
          isRefreshing = false;
          authService.setAuth(newToken);
          refreshTokenSubject.next(newToken);
          return next(request.clone({
            setHeaders: {
              Authorization: `Bearer ${newToken.accessToken}`
            }
          }));
        }),
        catchError((error) => {
          isRefreshing = false;
          authService.clearAuth();
          return throwError(() => error);
        })
      );
    } else {
      isRefreshing = false;
      authService.clearAuth();
      return throwError(() => new Error('No refresh token'));
    }
  } else {
    return refreshTokenSubject.pipe(
      filter(token => token != null),
      take(1),
      switchMap(token => next(request.clone({
        setHeaders: {
          Authorization: `Bearer ${token.accessToken}`
        }
      })))
    );
  }
}
