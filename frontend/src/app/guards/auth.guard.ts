// auth guard
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// check login
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // allow if logged in
  if (auth.isLoggedIn()) return true;

  // redirect to login
  router.navigate(['/login']);
  return false;
};
