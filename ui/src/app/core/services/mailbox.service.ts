import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserMail, PageableRequest, MailMediaType, MailReactionType, MailReactionCounts } from '../models/user.model';

/** Spring multipart rejects codec params (e.g. video/webm;codecs=vp9,opus). */
export function normalizeMediaMimeType(mimeType: string, mediaType: MailMediaType): string {
  const base = (mimeType || '').split(';')[0].trim().toLowerCase();
  switch (mediaType) {
    case 'VOICE':
      return base.startsWith('audio/') ? base : 'audio/webm';
    case 'VIDEO_NOTE':
      return base.startsWith('video/') ? base : 'video/webm';
    case 'PHOTO':
      return base.startsWith('image/') ? base : 'image/jpeg';
    default:
      return base || 'application/octet-stream';
  }
}

export interface MailReactionResponse {
  reaction: MailReactionType | null;
  reactionCounts: MailReactionCounts;
}

export const MAIL_REACTIONS: { type: MailReactionType; emoji: string; label: string }[] = [
  { type: 'LIKE', emoji: '👍', label: 'Лайк' },
  { type: 'HEART', emoji: '❤️', label: 'Сердце' },
  { type: 'FIRE', emoji: '🔥', label: 'Огонь' },
  { type: 'POOP', emoji: '💩', label: 'Какашка' },
  { type: 'CLOWN', emoji: '🤡', label: 'Клоун' },
  { type: 'LOL', emoji: '😂', label: 'LOL' },
];

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

  sendMediaMail(
    to: string,
    mediaType: MailMediaType,
    file: File | Blob,
    filename: string,
    caption?: string,
    replyToMessageId?: number
  ): Observable<UserMail[]> {
    const formData = new FormData();
    formData.append('to', to);
    formData.append('mediaType', mediaType);
    const uploadType = normalizeMediaMimeType(file.type, mediaType);
    const uploadFile = new File([file], filename, { type: uploadType });
    formData.append('file', uploadFile, filename);
    if (caption?.trim()) {
      formData.append('message', caption.trim());
    }
    if (replyToMessageId != null) {
      formData.append('replyToMessageId', String(replyToMessageId));
    }
    return this.http.post<UserMail[]>(`${this.apiUrl}/media`, formData);
  }

  deleteMail(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${userId}`);
  }

  getConversation(userId: string): Observable<UserMail[]> {
    return this.http.get<UserMail[]>(`${this.apiUrl}/conversation/${userId}`);
  }

  reactToMessage(messageId: number, reaction: MailReactionType): Observable<MailReactionResponse> {
    return this.http.post<MailReactionResponse>(`${this.apiUrl}/${messageId}/react`, { reaction });
  }

  getBadgeCount(sinceMs: number): Observable<{ count: number }> {
    const params = new HttpParams().set('since', sinceMs.toString());
    return this.http.get<{ count: number }>(`${this.apiUrl}/badge`, { params });
  }
}
