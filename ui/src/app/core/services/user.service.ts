import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { User, UserInfo, GisData, PageableRequest, UserSettings, UserPhoto, Interest } from '../models/user.model';
import { AuthService } from './auth.service';

export interface Prompt {
  id?: number;
  text?: string;
  category?: string;
}

export interface PromptAnswer {
  promptId?: number;
  answer?: string;
  promptText?: string;
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
  userId?: number;
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
    return this.http.get(url, { responseType: 'arraybuffer' }).pipe(
      map((buffer: ArrayBuffer) => new Uint8Array(buffer))
    );
  }

  getUserPhotos(userId: number): Observable<UserPhoto[]> {
    return this.http.get<UserPhoto[]>(`${this.apiUrl}/${userId}/photos`);
  }

  getPhotoFromS3(s3Key: string): Observable<Uint8Array> {
    return this.http.get(`/api/v1/photos/s3/${s3Key}`, { responseType: 'arraybuffer' }).pipe(
      map((buffer: ArrayBuffer) => new Uint8Array(buffer))
    );
  }

  uploadPhoto(file: File): Observable<void> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<void>(`${this.apiUrl}/me/photo`, formData);
  }

  deletePhoto(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/me/photo`);
  }

  getUserSettings(): Observable<UserSettings> {
    return this.http.get<UserSettings>(`${this.apiUrl}/settings`);
  }

  saveUserSettings(settings: UserSettings): Observable<UserSettings> {
    return this.http.post<UserSettings>(`${this.apiUrl}/settings`, settings);
  }

  getAllInterests(): Observable<Interest[]> {
    return this.http.get<Interest[]>(`${this.apiUrl}/interests`);
  }

  getUserInterests(): Observable<Interest[]> {
    return this.http.get<Interest[]>(`${this.apiUrl}/me/interests`);
  }

  setUserInterests(interestIds: number[]): Observable<Interest[]> {
    return this.http.put<Interest[]>(`${this.apiUrl}/me/interests`, interestIds);
  }

  getRandomPrompts(count: number = 3): Observable<Prompt[]> {
    return this.http.get<Prompt[]>(`/api/v1/prompts/random?count=${count}`);
  }

  getUserPromptAnswers(): Observable<PromptAnswer[]> {
    return this.http.get<PromptAnswer[]>('/api/v1/prompts/answers');
  }

  savePromptAnswer(promptId: number, answer: string): Observable<PromptAnswer> {
    return this.http.post<PromptAnswer>('/api/v1/prompts/answers', { prompt_id: promptId, answer });
  }

  requestVerification(file: File): Observable<{ success: boolean; status: string }> {
    const formData = new FormData();
    formData.append('photo', file);
    return this.http.post<{ success: boolean; status: string }>(`${this.apiUrl}/me/verify`, formData);
  }

  getBiorhythmDetail(userId: number): Observable<BiorhythmDetail> {
    return this.http.get<BiorhythmDetail>(`/api/v1/biorhythm/${userId}/detail`);
  }
}
