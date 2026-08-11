import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthResponse, CaptchaResponse, Credentials } from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private static readonly STORAGE_KEY = 'auth_user';
  private currentUserSubject = new BehaviorSubject<AuthResponse | null>(this.loadUser());
  currentUser$: Observable<AuthResponse | null> = this.currentUserSubject.asObservable();

  // injects HttpClient
  constructor(private http: HttpClient) {}

  // getter for the currently stored user
  get currentUser(): AuthResponse | null {
    return this.currentUserSubject.getValue();
  }

  // restores the user profile from localStorage. The JWT itself is an
  // HttpOnly cookie set by the server, so it is never persisted here (it
  // would otherwise be readable by any XSS payload).
  private loadUser(): AuthResponse | null {
    try {
      const raw = localStorage.getItem(AuthService.STORAGE_KEY);
      return raw ? JSON.parse(raw) as AuthResponse : null;
    } catch {
      return null;
    }
  }

  // persists or clears the non-sensitive user profile in localStorage
  private saveUser(user: AuthResponse | null): void {
    if (user) {
      localStorage.setItem(AuthService.STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AuthService.STORAGE_KEY);
    }
  }

  // fetches a fresh captcha from the server
  getCaptcha(): Observable<CaptchaResponse> {
    return this.http.get<CaptchaResponse>(`${this.apiUrl}/Auth/captcha`);
  }

  // logs in and stores the returned user. The auth cookie is set by the
  // server on this response.
  login(credentials: Credentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/Auth/login`, credentials).pipe(
      tap((res) => {
        this.currentUserSubject.next(res);
        this.saveUser(res);
      })
    );
  }

  // registers a new account and stores the returned user. The auth cookie is
  // set by the server on this response.
  register(payload: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/Auth/register`, payload).pipe(
      tap((res) => {
        this.currentUserSubject.next(res);
        this.saveUser(res);
      })
    );
  }

  // requests a password change for the current user
  changePassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/Auth/change-password`, {
      currentPassword,
      newPassword,
    });
  }

  // updates the current user's profile picture and stores the refreshed user
  updateProfilePicture(profilePicture: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/Auth/profile-picture`, { profilePicture }).pipe(
      tap((res) => {
        this.currentUserSubject.next(res);
        this.saveUser(res);
      })
    );
  }

  // renames the current user's account and stores the refreshed user
  updateUsername(newUsername: string, currentPassword: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/Auth/username`, {
      newUsername,
      currentPassword,
    }).pipe(
      tap((res) => {
        this.currentUserSubject.next(res);
        this.saveUser(res);
      })
    );
  }

  // clears the stored user. The HttpOnly cookie must be expired server-side,
  // so this fires a logout request best-effort before clearing local state.
  logout(): Observable<void> {
    this.http.post<void>(`${this.apiUrl}/Auth/logout`, {}).subscribe({
      error: () => {
        // ignore network failures; local state is cleared regardless
      },
      complete: () => {},
    });
    this.currentUserSubject.next(null);
    this.saveUser(null);
    return new Observable<void>((subscriber) => {
      subscriber.next();
      subscriber.complete();
    });
  }

  // whether a user is currently logged in
  isLoggedIn(): boolean {
    return !!this.currentUserSubject.getValue();
  }

  // whether the current user has the Admin role
  isAdmin(): boolean {
    return this.currentUserSubject.getValue()?.role === 'Admin';
  }
}