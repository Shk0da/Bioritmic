import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/** Set on a request to skip redirect to /error/500 (e.g. badge polling). */
export const SKIP_SERVER_ERROR_REDIRECT = new HttpContextToken<boolean>(() => false);

const SILENT_PATH_SUFFIXES = [
  '/badge',
  '/synchronization',
  '/config/client',
  '/me/gis',
  '/refresh-token'
];

function isSilentPath(url: string): boolean {
  return SILENT_PATH_SUFFIXES.some((suffix) => url.includes(suffix));
}

function shouldRedirectToErrorPage(error: HttpErrorResponse, req: HttpRequest<unknown>): boolean {
  if (req.context.get(SKIP_SERVER_ERROR_REDIRECT)) {
    return false;
  }
  if (isSilentPath(req.url)) {
    return false;
  }

  const status = error.status;
  if (status === 0) {
    return req.method === 'GET';
  }
  if (status >= 500) {
    return req.method === 'GET';
  }
  return false;
}

export const serverErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (shouldRedirectToErrorPage(error, req) && !router.url.startsWith('/error')) {
        void router.navigate(['/error', '500']);
      }
      return throwError(() => error);
    })
  );
};
