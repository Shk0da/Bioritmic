import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserMail, PageableRequest } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class MailboxService {
  private readonly apiUrl = '/api/v1/mailbox';

  constructor(private http: HttpClient) {}

  getMailbox(pageable: PageableRequest): Observable<UserMail[]> {
    let params = new HttpParams()
      .set('page', pageable.page.toString())
      .set('size', pageable.size.toString());
    return this.http.get<UserMail[]>(this.apiUrl, { params });
  }

  sendMail(mail: UserMail, name?: string): Observable<UserMail[]> {
    let params = new HttpParams();
    if (name) {
      params = params.set('name', name);
    }
    return this.http.post<UserMail[]>(this.apiUrl, mail, { params });
  }

  deleteMail(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${userId}`);
  }

  getConversation(userId: string): Observable<UserMail[]> {
    return this.http.get<UserMail[]>(`${this.apiUrl}/conversation/${userId}`);
  }
}
