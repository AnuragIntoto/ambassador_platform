import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { catchError, switchMap, take } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
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
