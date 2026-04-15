import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { User, UserToken, AuthorizationModel, Gender } from '../models/user.model';

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'current_user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = '/api/v1';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const userStr = localStorage.getItem(USER_KEY);
    if (userStr) {
      this.currentUserSubject.next(JSON.parse(userStr));
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
    return !!localStorage.getItem(TOKEN_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  private clearAuth(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUserSubject.next(null);
  }

  protected setAuth(token: UserToken): void {
    localStorage.setItem(TOKEN_KEY, token.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, token.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(token.user));
    this.currentUserSubject.next(token.user);
  }
}
