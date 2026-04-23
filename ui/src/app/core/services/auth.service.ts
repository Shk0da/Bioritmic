import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError } from 'rxjs';
import { User, UserToken, AuthorizationModel, Gender, UserInfo } from '../models/user.model';
import { CookieService } from './cookie.service';

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'current_user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = '/api/v1';
  private currentUserSubject = new BehaviorSubject<UserInfo | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private cookieService: CookieService
  ) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const userStr = this.cookieService.get(USER_KEY);
    const token = this.cookieService.get(TOKEN_KEY);
    if (userStr && token) {
      const user = JSON.parse(userStr);
      this.currentUserSubject.next(user);
      // Проверяем, действителен ли пользователь на сервере
      this.http.get<UserInfo>(`${this.apiUrl}/user/me`).subscribe({
        next: (user) => {
          this.cookieService.set(USER_KEY, JSON.stringify(user), 7);
          this.currentUserSubject.next(user);
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 404 || error.status === 401 || error.status === 403) {
            this.clearAuth();
          }
        }
      });
    } else if (userStr) {
      // Токена нет, но пользователь есть - очищаем
      this.clearAuth();
    }
  }

  login(credentials: AuthorizationModel): Observable<UserToken> {
    return this.http.post<UserToken>(`${this.apiUrl}/authorization`, credentials);
  }

  register(user: Partial<User> & { password: string }): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/registration`, user);
  }

  logout(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/logout`);
  }

  refreshToken(userToken: UserToken): Observable<UserToken> {
    return this.http.post<UserToken>(`${this.apiUrl}/refresh-token`, userToken);
  }

  recovery(email: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/recovery`, { email });
  }

  resetPassword(code: string, newPassword: string): Observable<void> {
    return this.http.get<void>(`${this.apiUrl}/reset-password`, {
      params: { code }
    });
  }

  isAuthenticated(): boolean {
    return !!this.cookieService.get(TOKEN_KEY);
  }

  getToken(): string | null {
    return this.cookieService.get(TOKEN_KEY);
  }

  getCurrentUser(): UserInfo | null {
    return this.currentUserSubject.value;
  }

  clearAuth(): void {
    this.cookieService.remove(TOKEN_KEY);
    this.cookieService.remove(REFRESH_TOKEN_KEY);
    this.cookieService.remove(USER_KEY);
    this.currentUserSubject.next(null);
  }

  setAuth(token: UserToken): void {
    // Сохраняем токены и пользователя в cookies на 7 дней
    this.cookieService.set(TOKEN_KEY, token.accessToken, 7);
    this.cookieService.set(REFRESH_TOKEN_KEY, token.refreshToken, 7);
    const user = { name: token.name, email: token.email };
    this.cookieService.set(USER_KEY, JSON.stringify(user), 7);
    this.currentUserSubject.next(user);
  }

  loadCurrentUser(): Observable<UserInfo> {
    return this.http.get<UserInfo>(`${this.apiUrl}/user/me`).pipe(
      tap(user => {
        this.cookieService.set(USER_KEY, JSON.stringify(user), 7);
        this.currentUserSubject.next(user);
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404 || error.status === 401 || error.status === 403) {
          this.clearAuth();
        }
        return throwError(() => error);
      })
    );
  }
}
