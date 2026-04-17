import { HttpInterceptorFn, HttpErrorResponse, HttpEvent, HttpRequest } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, Observable, throwError, of } from 'rxjs';

function addAuthHeader(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  // Если заголовок уже есть, не добавляем (чтобы не дублировать)
  if (req.headers.has('Authorization')) {
    return req;
  }
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  // Если токена нет и запрос требует авторизации (не публичный endpoint)
  const publicEndpoints = ['/api/v1/authorization', '/api/v1/registration', '/api/v1/recovery', '/api/v1/reset-password'];
  const isPublicEndpoint = publicEndpoints.some(endpoint => req.url.includes(endpoint));

  if (!token && !isPublicEndpoint) {
    // Токена нет, запрос не публичный - очищаем и перенаправляем на логин
    authService.clearAuth();
    router.navigate(['/auth/login']);
    return throwError(() => new Error('No authentication token'));
  }

  let authReq = req;
  if (token) {
    authReq = addAuthHeader(req, token);
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authService.clearAuth();
        router.navigate(['/auth/login']);
      }
      return throwError(() => error);
    })
  ) as Observable<HttpEvent<unknown>>;
};
