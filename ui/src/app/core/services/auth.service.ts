import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, Subscription, of, tap, catchError, throwError, timeout, map, shareReplay } from 'rxjs';
import { User, UserToken, AuthorizationModel, UserInfo } from '../models/user.model';
import { clearLayoutRouteCache } from '../routing/mobile-route-reuse.strategy';

const USER_KEY = 'current_user';
const USER_POLL_MS = 30_000;

@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnDestroy {
  private readonly apiUrl = '/api/v1';
  private currentUserSubject = new BehaviorSubject<UserInfo | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private legacyToken: string | null = null;
  private authSubscriptions: Subscription[] = [];
  private userPollIntervalId: ReturnType<typeof setInterval> | null = null;
  private sessionRestoreDone = false;
  private sessionRestore$?: Observable<boolean>;
  private readonly onVisibilityChange = () => {
    if (document.visibilityState === 'visible' && this.isAuthenticated()) {
      this.refreshCurrentUser();
    }
  };

  constructor(private http: HttpClient) {
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.restoreUserFromStorage();
  }

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.stopUserPolling();
  }

  /** Restores session from httpOnly cookies via /user/me. Safe to call multiple times. */
  ensureSessionRestored(): Observable<boolean> {
    if (this.sessionRestoreDone) {
      return of(this.isAuthenticated());
    }
    if (!this.sessionRestore$) {
      this.sessionRestore$ = this.http.get<UserInfo>(`${this.apiUrl}/user/me`).pipe(
        tap(user => this.applyCurrentUser(user)),
        map(() => true),
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401 || error.status === 403 || error.status === 404) {
            this.clearAuth();
          }
          return of(false);
        }),
        tap(() => {
          this.sessionRestoreDone = true;
        }),
        shareReplay(1)
      );
    }
    return this.sessionRestore$;
  }

  login(credentials: AuthorizationModel): Observable<UserToken> {
    return this.http.post<UserToken>(`${this.apiUrl}/authorization`, credentials);
  }

  register(user: Partial<User> & { password: string }): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/registration`, user);
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/logout`, {}).pipe(timeout(10000));
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

  verifyEmail(code: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/verify-email`, { code });
  }

  resendVerificationEmail(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/verify-email/resend`, {});
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
    clearLayoutRouteCache();
    this.legacyToken = null;
    localStorage.removeItem(USER_KEY);
    this.currentUserSubject.next(null);
    this.stopUserPolling();
    this.authSubscriptions.forEach(s => s.unsubscribe());
    this.authSubscriptions = [];
    this.sessionRestoreDone = false;
    this.sessionRestore$ = undefined;
  }

  setAuth(token: UserToken): void {
    this.legacyToken = token.accessToken ?? null;
    this.sessionRestoreDone = true;
    const user = { name: token.name, email: token.email };
    this.applyCurrentUser(user);
  }

  loadCurrentUser(): Observable<UserInfo> {
    return this.http.get<UserInfo>(`${this.apiUrl}/user/me`).pipe(
      tap(user => this.applyCurrentUser(user)),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404 || error.status === 401 || error.status === 403) {
          this.clearAuth();
        }
        return throwError(() => error);
      })
    );
  }

  private restoreUserFromStorage(): void {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) {
      return;
    }
    try {
      const user = JSON.parse(userStr) as UserInfo;
      this.currentUserSubject.next(user);
      this.syncUserPolling(user);
    } catch {
      localStorage.removeItem(USER_KEY);
    }
  }

  private applyCurrentUser(user: UserInfo): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
    this.syncUserPolling(user);
  }

  private refreshCurrentUser(): void {
    const sub = this.http.get<UserInfo>(`${this.apiUrl}/user/me`).subscribe({
      next: (user) => this.applyCurrentUser(user),
      error: (error: HttpErrorResponse) => {
        if (error.status === 404 || error.status === 401 || error.status === 403) {
          this.clearAuth();
        }
      }
    });
    this.authSubscriptions.push(sub);
  }

  private syncUserPolling(user: UserInfo | null): void {
    if (user) {
      this.startUserPolling();
    } else {
      this.stopUserPolling();
    }
  }

  private startUserPolling(): void {
    if (this.userPollIntervalId != null) {
      return;
    }
    this.userPollIntervalId = setInterval(() => this.refreshCurrentUser(), USER_POLL_MS);
  }

  private stopUserPolling(): void {
    if (this.userPollIntervalId != null) {
      clearInterval(this.userPollIntervalId);
      this.userPollIntervalId = null;
    }
  }
}
