import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UserSettings, Gender } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly apiUrl = '/api/v1/user/settings';

  private defaultSettings: UserSettings = {
    gender: Gender.WOMAN,
    ageMin: 18,
    ageMax: 45,
    distance: 50
  };

  constructor(private http: HttpClient) {}

  getSettings(): Observable<UserSettings> {
    return this.http.get<UserSettings>(this.apiUrl).pipe(
      catchError(() => of(this.defaultSettings))
    );
  }

  updateSettings(settings: UserSettings, name?: string): Observable<UserSettings> {
    let params = new HttpParams();
    if (name) {
      params = params.set('name', name);
    }
    return this.http.post<UserSettings>(this.apiUrl, settings, { params });
  }
}
