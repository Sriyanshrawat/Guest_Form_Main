import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// send the auth cookie with every request and handle 401
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Authenticate via the HttpOnly cookie set by the server, so the browser
  // must attach credentials (cookies) on every request. Also add the header
  // ngrok's free-tier interstitial demands, otherwise HttpClient requests to
  // a tunneled backend get blocked.
  req = req.clone({
    setHeaders: { 'ngrok-skip-browser-warning': 'true' },
    withCredentials: true,
  });

  // handle response errors
  return next(req).pipe(
    catchError((err) => {
      // logout on 401, except for the genuinely public auth endpoints where a
      // 401 just means invalid credentials. change-password, profile-picture
      // and username are protected — a 401 there means an expired session.
      const isPublicAuthEndpoint =
        req.url.includes('/Auth/login') ||
        req.url.includes('/Auth/register') ||
        req.url.includes('/Auth/captcha');
      if (err.status === 401 && !isPublicAuthEndpoint) {
        authService.logout();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};