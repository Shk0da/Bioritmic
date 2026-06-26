import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserMeeting, PageableRequest } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class MeetingsService {
  private readonly apiUrl = '/api/v1/meetings';

  constructor(private http: HttpClient) {}

  getMeetings(pageable: PageableRequest): Observable<UserMeeting[]> {
    let params = new HttpParams()
      .set('page', pageable.page.toString())
      .set('size', pageable.size.toString());
    return this.http.get<UserMeeting[]>(this.apiUrl, { params });
  }

  createMeeting(meeting: UserMeeting, name?: string): Observable<UserMeeting[]> {
    let params = new HttpParams();
    if (name) {
      params = params.set('name', name);
    }
    return this.http.post<UserMeeting[]>(this.apiUrl, [meeting], { params });
  }

  deleteMeeting(userId: string): Observable<UserMeeting[]> {
    return this.http.delete<UserMeeting[]>(`${this.apiUrl}/${userId}`);
  }

  declineMeeting(userId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${userId}/decline`, {});
  }

  acceptMeeting(userId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${userId}/accept`, {});
  }

  hasSentMeeting(userId: string): Observable<{ sent: boolean }> {
    return this.http.get<{ sent: boolean }>(`${this.apiUrl}/${userId}/sent`);
  }

  getBadgeCount(sinceMs: number): Observable<{ count: number }> {
    const params = new HttpParams().set('since', sinceMs.toString());
    return this.http.get<{ count: number }>(`${this.apiUrl}/badge`, { params });
  }
}
