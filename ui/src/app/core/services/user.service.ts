import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { User, UserInfo, GisData, PageableRequest } from '../models/user.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly apiUrl = '/api/v1/user';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getCurrentUser(): Observable<UserInfo> {
    return this.http.get<UserInfo>(`${this.apiUrl}/me`);
  }

  getUserById(id: number): Observable<UserInfo> {
    return this.http.get<UserInfo>(`${this.apiUrl}/${id}`);
  }

  updateUser(user: Partial<UserInfo>): Observable<UserInfo> {
    return this.http.patch<UserInfo>(`${this.apiUrl}/me`, user);
  }

  deleteUser(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/me`);
  }

  getBlockedUsers(pageable: PageableRequest): Observable<UserInfo[]> {
    let params = new HttpParams()
      .set('page', pageable.page.toString())
      .set('size', pageable.size.toString());
    return this.http.get<UserInfo[]>(`${this.apiUrl}/blocked`, { params });
  }

  blockUser(userId: number): Observable<UserInfo> {
    return this.http.put<UserInfo>(`${this.apiUrl}/${userId}/block`, {});
  }

  unblockUser(userId: number): Observable<UserInfo> {
    return this.http.put<UserInfo>(`${this.apiUrl}/${userId}/unblock`, {});
  }

  getGisData(): Observable<GisData> {
    return this.http.get<GisData>(`${this.apiUrl}/me/gis`);
  }

  saveGisData(gisData: GisData): Observable<GisData> {
    return this.http.post<GisData>(`${this.apiUrl}/me/gis`, gisData);
  }

  getPhoto(userId?: number): Observable<Uint8Array> {
    const url = userId ? `${this.apiUrl}/${userId}/photo` : `${this.apiUrl}/me/photo`;
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token || ''}`
    });
    return this.http.get(url, { headers, responseType: 'arraybuffer' }).pipe(
      map((buffer: ArrayBuffer) => new Uint8Array(buffer))
    );
  }

  uploadPhoto(file: File): Observable<void> {
    const formData = new FormData();
    formData.append('file', file);
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token || ''}`
    });
    return this.http.post<void>(`${this.apiUrl}/me/photo`, formData, { headers });
  }

  deletePhoto(): Observable<void> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token || ''}`
    });
    return this.http.delete<void>(`${this.apiUrl}/me/photo`, { headers });
  }
}
