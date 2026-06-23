import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly apiUrl = '/api/v1/subscription';

  constructor(private http: HttpClient) {}

  getCurrentSubscription(): Observable<any> {
    return this.http.get(`${this.apiUrl}/current`);
  }

  verifyReceipt(receiptToken: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify`, { receiptToken });
  }

  cancelSubscription(): Observable<any> {
    return this.http.post(`${this.apiUrl}/cancel`, {});
  }
}
