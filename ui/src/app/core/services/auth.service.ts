import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, Subscription, tap, catchError, throwError, timeout } from 'rxjs';
import { User, UserToken, AuthorizationModel, Gender, UserInfo } from '../models/user.model';

const USER_KEY = 'current_user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = '/api/v1';
  private currentUserSubject = new BehaviorSubject<UserInfo | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private legacyToken: string | null = null;
  private authSubscriptions: Subscription[] = [];

  constructor(private http: HttpClient) {
    const userStr = sessionStorage.getItem(USER_KEY);
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUserSubject.next(user);
        const sub = this.http.get<UserInfo>(`${this.apiUrl}/user/me`).subscribe({
          next: (user) => {
            sessionStorage.setItem(USER_KEY, JSON.stringify(user));
            this.currentUserSubject.next(user);
          },
          error: (error: HttpErrorResponse) => {
            if (error.status === 404 || error.status === 401 || error.status === 403) {
              this.clearAuth();
            }
          }
        });
        this.authSubscriptions.push(sub);
      } catch {
        this.clearAuth();
      }
    }
  }

  login(credentials: AuthorizationModel): Observable<UserToken> {
    return this.http.post<UserToken>(`${this.apiUrl}/authorization`, credentials);
  }

  register(user: Partial<User> & { password: string }): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/registration`, user);
  }

  logout(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/logout`).pipe(timeout(10000));
  }

  refreshToken(userToken: Partial<UserToken>): Observable<UserToken> {
    return this.http.post<UserToken>(`${this.apiUrl}/refresh-token`, userToken);
  }

  recovery(email: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/recovery`, { email });
  }

  resetPassword(code: string, password: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/reset-password`, { code, password });
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value != null;
  }

  getToken(): string | null {
    return this.legacyToken;
  }

  getCurrentUser(): UserInfo | null {
    return this.currentUserSubject.value;
  }

  clearAuth(): void {
    this.legacyToken = null;
    sessionStorage.removeItem(USER_KEY);
    this.currentUserSubject.next(null);
    this.authSubscriptions.forEach(s => s.unsubscribe());
    this.authSubscriptions = [];
  }

  setAuth(token: UserToken): void {
    this.legacyToken = token.accessToken ?? null;
    const user = { name: token.name, email: token.email };
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  loadCurrentUser(): Observable<UserInfo> {
    return this.http.get<UserInfo>(`${this.apiUrl}/user/me`).pipe(
      tap(user => {
        sessionStorage.setItem(USER_KEY, JSON.stringify(user));
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
