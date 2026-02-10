import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { catchError, switchMap, take } from 'rxjs';

/** Home API only - public, no auth. List API (/api/.../home/list) requires auth. */
const NO_AUTH_URL_PATTERN = /\/ambassador-platform\/[^/]+\/home$/;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (NO_AUTH_URL_PATTERN.test(req.url)) {
    return next(req);
  }

  const auth = inject(AuthService);

  return auth.isAuthenticated$.pipe(
    take(1),
    switchMap((isAuthenticated) => {
      if (isAuthenticated) {
        return auth.getAccessTokenSilently().pipe(
          switchMap((token) => {
            const cloned = req.clone({
              setHeaders: {
                Authorization: `Bearer ${token}`,
              },
            });
            sessionStorage.setItem('accessToken', JSON.stringify(token));
            return next(cloned);
          }),
          catchError((error) => {
            console.error('Error getting access token:', error);
            return next(req);
          }),
        );
      } else {
        return next(req);
      }
    }),
  );
};
