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

  constructor(private http: HttpClient) {}

  get currentUser(): AuthResponse | null {
    return this.currentUserSubject.getValue();
  }

  private loadUser(): AuthResponse | null {
    try {
      const raw = localStorage.getItem(AuthService.STORAGE_KEY);
      return raw ? JSON.parse(raw) as AuthResponse : null;
    } catch {
      return null;
    }
  }

  private saveUser(user: AuthResponse | null): void {
    if (user) {
      localStorage.setItem(AuthService.STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AuthService.STORAGE_KEY);
    }
  }

  getCaptcha(): Observable<CaptchaResponse> {
    return this.http.get<CaptchaResponse>(`${this.apiUrl}/Auth/captcha`);
  }

  login(credentials: Credentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/Auth/login`, credentials).pipe(
      tap((res) => {
        this.currentUserSubject.next(res);
        this.saveUser(res);
      })
    );
  }

  register(payload: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/Auth/register`, payload).pipe(
      tap((res) => {
        this.currentUserSubject.next(res);
        this.saveUser(res);
      })
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/Auth/change-password`, {
      currentPassword,
      newPassword,
    });
  }

  logout(): Observable<void> {
    this.currentUserSubject.next(null);
    this.saveUser(null);
    return new Observable<void>((subscriber) => {
      subscriber.next();
      subscriber.complete();
    });
  }

  getToken(): string | null {
    return this.currentUserSubject.getValue()?.token ?? null;
  }

  isLoggedIn(): boolean {
    return !!this.currentUserSubject.getValue();
  }

  isAdmin(): boolean {
    return this.currentUserSubject.getValue()?.role === 'Admin';
  }
}