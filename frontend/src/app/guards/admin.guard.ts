// admin guard
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// check admin role
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // allow admin
  if (auth.isLoggedIn() && auth.isAdmin()) return true;

  // redirect user to submit
  if (auth.isLoggedIn()) {
    router.navigate(['/submit']);
    return false;
  }

  // redirect to login
  router.navigate(['/login']);
  return false;
};
