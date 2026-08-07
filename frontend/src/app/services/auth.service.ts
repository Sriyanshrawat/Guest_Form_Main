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

  // restores the user from localStorage at start-up
  private loadUser(): AuthResponse | null {
    try {
      const raw = localStorage.getItem(AuthService.STORAGE_KEY);
      return raw ? JSON.parse(raw) as AuthResponse : null;
    } catch {
      return null;
    }
  }

  // persists or clears the user in localStorage
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

  // logs in and stores the returned user
  login(credentials: Credentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/Auth/login`, credentials).pipe(
      tap((res) => {
        this.currentUserSubject.next(res);
        this.saveUser(res);
      })
    );
  }

  // registers a new account and stores the returned user
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

  // clears the stored user and returns a completed observable
  logout(): Observable<void> {
    this.currentUserSubject.next(null);
    this.saveUser(null);
    return new Observable<void>((subscriber) => {
      subscriber.next();
      subscriber.complete();
    });
  }

  // returns the current user's bearer token, if any
  getToken(): string | null {
    return this.currentUserSubject.getValue()?.token ?? null;
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