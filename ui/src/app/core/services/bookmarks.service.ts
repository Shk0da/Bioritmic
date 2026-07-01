import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserBookmark, UserInfo, PageableRequest } from '../models/user.model';
import { BOOKMARK_LIMIT } from '../constants/bookmarks.constants';

export interface BookmarkLimitResponse {
  count: number;
  limit: number;
}

@Injectable({
  providedIn: 'root'
})
export class BookmarksService {
  private readonly apiUrl = '/api/v1/bookmarks';
  readonly bookmarkLimit = BOOKMARK_LIMIT;

  constructor(private http: HttpClient) {}

  getBookmarks(pageable: PageableRequest): Observable<UserInfo[]> {
    let params = new HttpParams()
      .set('page', pageable.page.toString())
      .set('size', pageable.size.toString());
    return this.http.get<UserInfo[]>(this.apiUrl, { params });
  }

  getBookmarkLimit(): Observable<BookmarkLimitResponse> {
    return this.http.get<BookmarkLimitResponse>(`${this.apiUrl}/limit`);
  }

  addBookmark(bookmark: UserBookmark, name?: string): Observable<UserInfo[]> {
    let params = new HttpParams();
    if (name) {
      params = params.set('name', name);
    }
    return this.http.post<UserInfo[]>(this.apiUrl, [bookmark], { params });
  }

  deleteBookmark(userId: string): Observable<UserInfo[]> {
    return this.http.delete<UserInfo[]>(`${this.apiUrl}/${userId}`);
  }

  isBookmarked(userId: string): Observable<{ bookmarked: boolean }> {
    return this.http.get<{ bookmarked: boolean }>(`${this.apiUrl}/${userId}/exists`);
  }
}
