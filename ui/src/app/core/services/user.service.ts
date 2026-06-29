import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { User, UserInfo, GisData, PageableRequest, UserSettings, UserPhoto } from '../models/user.model';

const DEFAULT_USER_SETTINGS: UserSettings = {
  ageMin: 18,
  ageMax: 45,
  distance: 30,
};

export type PhotoSize = 'thumb' | 'card';

export interface BiorhythmCycle {
  name: string;
  value: number;
  label: string;
  compatibility?: number;
  period?: number;
  selfValue?: number;
  otherValue?: number;
}

export interface BiorhythmDetail {
  userId?: string;
  physical?: number;
  emotional?: number;
  intellectual?: number;
  compatibility?: number;
  overallCompatibility?: number;
  cycles?: BiorhythmCycle[];
  details?: Record<string, any>;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly apiUrl = '/api/v1/user';

  constructor(
    private http: HttpClient
  ) {}

  getCurrentUser(): Observable<UserInfo> {
    return this.http.get<UserInfo>(`${this.apiUrl}/me`);
  }

  getUserById(id: string): Observable<UserInfo> {
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

  blockUser(userId: string): Observable<UserInfo> {
    return this.http.put<UserInfo>(`${this.apiUrl}/${userId}/block`, {});
  }

  unblockUser(userId: string): Observable<UserInfo> {
    return this.http.put<UserInfo>(`${this.apiUrl}/${userId}/unblock`, {});
  }

  isBlockedBy(userId: string): Observable<{ blocked: boolean }> {
    return this.http.get<{ blocked: boolean }>(`${this.apiUrl}/${userId}/is-blocked-by`);
  }

  isBlocked(userId: string): Observable<{ blocked: boolean }> {
    return this.http.get<{ blocked: boolean }>(`${this.apiUrl}/${userId}/is-blocked`);
  }

  getBlockedCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/blocked/count`);
  }

  getGisData(): Observable<GisData | null> {
    return this.http.get<GisData>(`${this.apiUrl}/me/gis`, { observe: 'response' }).pipe(
      map((response) => (response.status === 204 ? null : response.body)),
      catchError((error: HttpErrorResponse) =>
        error.status === 404 || error.status === 204 ? of(null) : throwError(() => error)
      )
    );
  }

  saveGisData(gisData: GisData): Observable<GisData> {
    return this.http.post<GisData>(`${this.apiUrl}/me/gis`, gisData);
  }

  deleteGisData(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/me/gis`);
  }

  estimateGisLocation(): Observable<{ lat: number; lon: number; approximate: boolean }> {
    return this.http.get<{ lat: number; lon: number; approximate: boolean }>(`${this.apiUrl}/me/gis/estimate`);
  }

  getPhoto(userId?: string, size: PhotoSize = 'thumb'): Observable<Uint8Array> {
    const url = userId ? `${this.apiUrl}/${userId}/photo` : `${this.apiUrl}/me/photo`;
    const options: { responseType: 'arraybuffer'; params?: HttpParams } = { responseType: 'arraybuffer' };
    if (size === 'card') {
      options.params = new HttpParams().set('size', 'card');
    }
    return this.http.get(url, options).pipe(
      map((buffer: ArrayBuffer) => new Uint8Array(buffer))
    );
  }

  getUserPhotos(userId: string): Observable<UserPhoto[]> {
    return this.http.get<UserPhoto[]>(`${this.apiUrl}/${userId}/photos`);
  }

  getProfilePhotoUrl(userId: string, cacheBuster?: number): string {
    const version = cacheBuster ?? Date.now();
    return `${this.apiUrl}/${userId}/photo?v=${version}`;
  }

  resolveProfilePhotoUrl(userId: string, cacheBuster?: number): Observable<string | null> {
    return this.getUserPhotos(userId).pipe(
      map((photos) => (photos.length > 0 ? this.getProfilePhotoUrl(userId, cacheBuster) : null)),
      catchError(() => of(null))
    );
  }

  getPhotoFromS3(s3Key: string): Observable<Uint8Array> {
    return this.http.get(`/api/v1/photos/s3/${s3Key}`, { responseType: 'arraybuffer' }).pipe(
      map((buffer: ArrayBuffer) => new Uint8Array(buffer))
    );
  }

  uploadPhoto(file: File): Observable<void> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<void>(`${this.apiUrl}/me/photo`, formData, { responseType: 'text' as any });
  }

  deletePhoto(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/me/photo`);
  }

  getUserSettings(): Observable<UserSettings> {
    return this.http.get<UserSettings>(`${this.apiUrl}/settings`).pipe(
      catchError((error: HttpErrorResponse) =>
        error.status === 404 ? of({ ...DEFAULT_USER_SETTINGS }) : throwError(() => error)
      )
    );
  }

  saveUserSettings(settings: UserSettings): Observable<UserSettings> {
    return this.http.post<UserSettings>(`${this.apiUrl}/settings`, settings);
  }

  getBiorhythmDetail(userId: string): Observable<BiorhythmDetail> {
    return this.http.get<BiorhythmDetail>(`/api/v1/biorhythm/${userId}/detail`);
  }

  static createPhotoUrl(bytes: Uint8Array): string {
    return URL.createObjectURL(new Blob([bytes]));
  }

  static revokePhotoUrl(url: string | null | undefined): void {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
}
