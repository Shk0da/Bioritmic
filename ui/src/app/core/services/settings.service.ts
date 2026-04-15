import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserSettings } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly apiUrl = '/api/v1/user/settings';

  constructor(private http: HttpClient) {}

  getSettings(): Observable<UserSettings> {
    return this.http.get<UserSettings>(this.apiUrl);
  }

  updateSettings(settings: UserSettings, name?: string): Observable<UserSettings> {
    let params = new HttpParams();
    if (name) {
      params = params.set('name', name);
    }
    return this.http.post<UserSettings>(this.apiUrl, settings, { params });
  }
}
