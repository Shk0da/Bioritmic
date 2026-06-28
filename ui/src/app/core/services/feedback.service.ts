import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type FeedbackTopic = 'BUG' | 'SUGGESTION' | 'ACCOUNT' | 'OTHER';
export type FeedbackStatus = 'NEW' | 'PROCESSED' | 'TRASH';

export interface FeedbackTopicOption {
  value: FeedbackTopic;
  label: string;
}

export const FEEDBACK_TOPICS: FeedbackTopicOption[] = [
  { value: 'BUG', label: 'Ошибка' },
  { value: 'SUGGESTION', label: 'Предложение' },
  { value: 'ACCOUNT', label: 'Аккаунт' },
  { value: 'OTHER', label: 'Другое' }
];

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly apiUrl = '/api/v1/feedback';

  constructor(private http: HttpClient) {}

  submit(topic: FeedbackTopic, message: string, file?: File): Observable<{ id: number; status: string }> {
    const formData = new FormData();
    formData.append('topic', topic);
    formData.append('message', message);
    if (file) {
      formData.append('file', file);
    }
    return this.http.post<{ id: number; status: string }>(this.apiUrl, formData);
  }
}
