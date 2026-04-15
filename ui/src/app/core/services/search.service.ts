import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserSearch, UserInfo } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private readonly apiUrl = '/api/v1/search';

  constructor(private http: HttpClient) {}

  search(): Observable<UserInfo[]> {
    return this.http.get<UserInfo[]>(this.apiUrl);
  }

  searchByFilter(searchCriteria: UserSearch, name?: string): Observable<UserInfo[]> {
    let params = new HttpParams();
    if (name) {
      params = params.set('name', name);
    }
    return this.http.post<UserInfo[]>(this.apiUrl, searchCriteria, { params });
  }
}
