import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Protects routes that require authentication.
 * Requires both accessToken (sessionStorage) and refId (localStorage).
 * Redirects to /select-role if not authenticated.
 */
export const authGuard: CanActivateFn = (_route, _state) => {
  const router = inject(Router);
  const token = sessionStorage.getItem('accessToken');
  const refId = localStorage.getItem('refId');
  let isAuthenticated = false;

  try {
    if (token && refId) {
      const parsedToken = JSON.parse(token);
      const parsedRefId = JSON.parse(refId);
      if (parsedToken && parsedRefId?._id) {
        isAuthenticated = true;
      }
    }
  } catch {
    // Invalid JSON in storage
  }

  if (!isAuthenticated) {
    sessionStorage.removeItem('accessToken');
    localStorage.removeItem('refId');
    router.navigate(['/select-role']);
    return false;
  }

  return true;
};
