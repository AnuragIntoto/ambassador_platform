import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/** Home API only - public. List API 401 should redirect to login. */
const NO_AUTH_REDIRECT_PATTERN = /\/ambassador-platform\/[^/]+\/home$/;

/**
 * Handles 401 Unauthorized: clears auth storage and redirects to login (privacy policy).
 * Skips redirect for public APIs (e.g. ambassador list).
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error) => {
      if (error?.status === 401 && !NO_AUTH_REDIRECT_PATTERN.test(req.url)) {
        sessionStorage.removeItem('accessToken');
        localStorage.removeItem('refId');
        router.navigate([''], {
          queryParams: { returnUrl: router.url },
        });
      }
      return throwError(() => error);
    }),
  );
}
