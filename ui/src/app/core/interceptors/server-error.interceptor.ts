import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ModalService } from '../services/modal.service';
import { isMutationMethod, resolveHttpErrorMessage } from '../utils/http-error.util';

/** Set on a request to skip redirect to /error/500 (e.g. badge polling). */
export const SKIP_SERVER_ERROR_REDIRECT = new HttpContextToken<boolean>(() => false);

/** Set when a component shows its own error UI for this request. */
export const SKIP_HTTP_ERROR_ALERT = new HttpContextToken<boolean>(() => false);

const SILENT_PATH_SUFFIXES = [
  '/badge',
  '/synchronization',
  '/config/client',
  '/me/gis',
  '/geo/',
  '/refresh-token',
];

function isSilentPath(url: string, method: string): boolean {
  if (SILENT_PATH_SUFFIXES.some((suffix) => url.includes(suffix))) {
    return true;
  }
  if (method === 'POST' && url.includes('/stories/') && url.endsWith('/view')) {
    return true;
  }
  return false;
}

function shouldRedirectToErrorPage(error: HttpErrorResponse, req: HttpRequest<unknown>): boolean {
  if (req.context.get(SKIP_SERVER_ERROR_REDIRECT)) {
    return false;
  }
  if (isSilentPath(req.url, req.method)) {
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

function shouldShowErrorAlert(error: HttpErrorResponse, req: HttpRequest<unknown>): boolean {
  if (req.context.get(SKIP_HTTP_ERROR_ALERT)) {
    return false;
  }
  if (isSilentPath(req.url, req.method)) {
    return false;
  }

  const status = error.status;
  if (status === 401 || status === 403) {
    return false;
  }

  if (status === 0) {
    return true;
  }

  if (isMutationMethod(req.method)) {
    return status >= 400;
  }

  if (req.method === 'GET' && status >= 500) {
    return false;
  }

  return status === 413 || status === 429 || status === 408;
}

export const serverErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const modalService = inject(ModalService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (shouldRedirectToErrorPage(error, req) && !router.url.startsWith('/error')) {
        void router.navigate(['/error', '500']);
      }

      if (shouldShowErrorAlert(error, req)) {
        void modalService.show({
          title: 'Ошибка',
          message: resolveHttpErrorMessage(error),
          icon: 'error',
          confirmText: 'OK',
        });
      }

      return throwError(() => error);
    })
  );
};
