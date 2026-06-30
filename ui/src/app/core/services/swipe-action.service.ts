import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SwipeActionService {
  private readonly apiUrl = '/api/v1/swipe';

  constructor(private http: HttpClient) {}

  skipUser(userId: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/${userId}/skip`, {});
  }
}
