import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, finalize, map, shareReplay, tap } from 'rxjs/operators';
import { User, UserInfo, GisData, PageableRequest, UserSettings, UserPhoto } from '../models/user.model';
import { AuthService } from './auth.service';

const DEFAULT_USER_SETTINGS: UserSettings = {
  ageMin: 18,
  ageMax: 45,
  distance: 30,
};

export type PhotoSize = 'thumb' | 'card' | 'full';

const PHOTO_CACHE_TTL_MS = 5 * 60 * 1000;
const MOBILE_LAYOUT_MAX_WIDTH = 1024;

interface PhotoCacheEntry {
  url: string;
  expiresAt: number;
}

/** Full resolution on mobile swipe / hero; card size on desktop grids. */
export function photoSizeForLargeDisplay(): PhotoSize {
  if (typeof window !== 'undefined' && window.matchMedia(`(max-width: ${MOBILE_LAYOUT_MAX_WIDTH}px)`).matches) {
    return 'full';
  }
  return 'card';
}

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
  private readonly photoCache = new Map<string, PhotoCacheEntry>();
  private readonly photoLoadsInFlight = new Map<string, Observable<string | null>>();
  private readonly photoLoadGeneration = new Map<string, number>();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  static photoCacheVersion(): number {
    return Math.floor(Date.now() / PHOTO_CACHE_TTL_MS);
  }

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

  peekCachedPhotoUrl(userId: string, size: PhotoSize = 'card'): string | null {
    return this.getValidPhotoCacheEntry(this.photoCacheKey(userId, size))?.url ?? null;
  }

  getCachedPhotoUrl(userId: string, size: PhotoSize = 'card'): Observable<string | null> {
    const key = this.photoCacheKey(userId, size);
    const cached = this.getValidPhotoCacheEntry(key);
    if (cached) {
      return of(cached.url);
    }

    const inFlight = this.photoLoadsInFlight.get(key);
    if (inFlight) {
      return inFlight;
    }

    const loadGeneration = this.photoLoadGeneration.get(key) ?? 0;

    const load$ = this.getPhoto(userId, size).pipe(
      map((bytes) => {
        if ((this.photoLoadGeneration.get(key) ?? 0) !== loadGeneration) {
          return null;
        }
        return this.storePhotoInCache(key, UserService.createPhotoUrl(bytes));
      }),
      catchError(() => of(null)),
      finalize(() => this.photoLoadsInFlight.delete(key)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    this.photoLoadsInFlight.set(key, load$);
    return load$;
  }

  invalidatePhotoCache(userId?: string): void {
    if (!userId) {
      for (const key of new Set([
        ...this.photoCache.keys(),
        ...this.photoLoadsInFlight.keys(),
      ])) {
        this.bumpPhotoLoadGeneration(key);
        this.evictPhotoCacheEntry(key);
      }
      this.photoLoadsInFlight.clear();
      return;
    }

    const prefix = `${userId}:`;
    for (const key of new Set([
      ...this.photoCache.keys(),
      ...this.photoLoadsInFlight.keys(),
    ])) {
      if (key.startsWith(prefix)) {
        this.bumpPhotoLoadGeneration(key);
        this.evictPhotoCacheEntry(key);
        this.photoLoadsInFlight.delete(key);
      }
    }
  }

  private invalidateCurrentUserPhotoCache(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (userId) {
      this.invalidatePhotoCache(userId);
      return;
    }
    this.invalidatePhotoCache();
  }

  getPhoto(userId?: string, size: PhotoSize = 'thumb'): Observable<Uint8Array> {
    const url = userId ? `${this.apiUrl}/${userId}/photo` : `${this.apiUrl}/me/photo`;
    const options: { responseType: 'arraybuffer'; params?: HttpParams } = { responseType: 'arraybuffer' };
    if (size !== 'thumb') {
      options.params = new HttpParams().set('size', size);
    }
    return this.http.get(url, options).pipe(
      map((buffer: ArrayBuffer) => new Uint8Array(buffer))
    );
  }

  getUserPhotos(userId: string): Observable<UserPhoto[]> {
    return this.http.get<UserPhoto[]>(`${this.apiUrl}/${userId}/photos`);
  }

  getProfilePhotoUrl(userId: string, cacheBuster?: number, size: PhotoSize = 'thumb'): string {
    const version = cacheBuster ?? Date.now();
    let params = new HttpParams().set('v', String(version));
    if (size !== 'thumb') {
      params = params.set('size', size);
    }
    return `${this.apiUrl}/${userId}/photo?${params.toString()}`;
  }

  resolveProfilePhotoUrl(
    userId: string,
    cacheBuster?: number,
    size: PhotoSize = 'card'
  ): Observable<string | null> {
    return this.getUserPhotos(userId).pipe(
      map((photos) => (photos.length > 0 ? this.getProfilePhotoUrl(userId, cacheBuster, size) : null)),
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
    return this.http.post<void>(`${this.apiUrl}/me/photo`, formData, { responseType: 'text' as any }).pipe(
      tap(() => this.invalidateCurrentUserPhotoCache())
    );
  }

  deletePhoto(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/me/photo`).pipe(
      tap(() => this.invalidateCurrentUserPhotoCache())
    );
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

  private photoCacheKey(userId: string, size: PhotoSize): string {
    return `${userId}:${size}`;
  }

  private bumpPhotoLoadGeneration(key: string): void {
    this.photoLoadGeneration.set(key, (this.photoLoadGeneration.get(key) ?? 0) + 1);
  }

  private getValidPhotoCacheEntry(key: string): PhotoCacheEntry | null {
    const entry = this.photoCache.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() >= entry.expiresAt) {
      this.evictPhotoCacheEntry(key);
      return null;
    }
    return entry;
  }

  private storePhotoInCache(key: string, url: string): string {
    const existing = this.photoCache.get(key);
    if (existing && existing.url !== url && existing.url.startsWith('blob:')) {
      UserService.revokePhotoUrl(existing.url);
    }
    this.photoCache.set(key, {
      url,
      expiresAt: Date.now() + PHOTO_CACHE_TTL_MS,
    });
    return url;
  }

  private evictPhotoCacheEntry(key: string): void {
    const entry = this.photoCache.get(key);
    if (entry?.url.startsWith('blob:')) {
      UserService.revokePhotoUrl(entry.url);
    }
    this.photoCache.delete(key);
  }
}
