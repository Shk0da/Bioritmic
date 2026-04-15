import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserBookmark, UserInfo, PageableRequest } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class BookmarksService {
  private readonly apiUrl = '/api/v1/bookmarks';

  constructor(private http: HttpClient) {}

  getBookmarks(pageable: PageableRequest): Observable<UserInfo[]> {
    let params = new HttpParams()
      .set('page', pageable.page.toString())
      .set('size', pageable.size.toString());
    return this.http.get<UserInfo[]>(this.apiUrl, { params });
  }

  addBookmark(bookmark: UserBookmark, name?: string): Observable<UserInfo[]> {
    let params = new HttpParams();
    if (name) {
      params = params.set('name', name);
    }
    return this.http.post<UserInfo[]>(this.apiUrl, [bookmark], { params });
  }

  deleteBookmark(userId: number): Observable<UserInfo[]> {
    return this.http.delete<UserInfo[]>(`${this.apiUrl}/${userId}`);
  }
}
