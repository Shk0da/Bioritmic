import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Story {
  id: number;
  userId: string;
  mediaUrl: string;
  caption?: string;
  expiresAt: number;
  createdAt: number;
  viewerCount: number;
  viewedByCurrentUser: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class StoryService {
  private readonly apiUrl = '/api/v1/stories';

  constructor(private http: HttpClient) {}

  getFeed(): Observable<Story[]> {
    return this.http.get<Story[]>(this.apiUrl);
  }

  createStory(mediaUrl: string, caption?: string): Observable<Story> {
    return this.http.post<Story>(this.apiUrl, { mediaUrl, caption });
  }

  viewStory(id: number): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/${id}/view`, {});
  }
}
