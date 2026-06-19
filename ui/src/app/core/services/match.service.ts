import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserInfo } from '../models/user.model';

export interface MatchesResponse {
  matches: UserInfo[];
  count: number;
  blurred: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MatchService {
  private readonly apiUrl = '/api/v1/bookmarks';

  constructor(private http: HttpClient) {}

  getMatches(): Observable<MatchesResponse> {
    return this.http.get<MatchesResponse>(`${this.apiUrl}/matches`);
  }

  checkMatch(userId: number): Observable<{ isMatch: boolean }> {
    return this.http.get<{ isMatch: boolean }>(`${this.apiUrl}/matches/${userId}`);
  }
}
