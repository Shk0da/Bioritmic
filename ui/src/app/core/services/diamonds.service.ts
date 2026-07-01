import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DiamondBalanceResponse {
  balance: number;
}

export interface DiamondTransaction {
  id: number;
  amount: number;
  counterpartyId?: string;
  counterpartyName?: string;
  type: string;
  description?: string;
  createdAt?: string;
}

export interface PaginatedDiamondTransactions {
  items: DiamondTransaction[];
  total: number;
  page: number;
  size: number;
}

export interface DiamondTransferResult {
  balance: number;
  transactionId?: number;
  messageId?: number;
}

@Injectable({ providedIn: 'root' })
export class DiamondsService {
  private readonly apiUrl = '/api/v1/diamonds';

  constructor(private http: HttpClient) {}

  getBalance(): Observable<DiamondBalanceResponse> {
    return this.http.get<DiamondBalanceResponse>(`${this.apiUrl}/balance`);
  }

  getTransactions(page = 0, size = 20): Observable<PaginatedDiamondTransactions> {
    return this.http.get<PaginatedDiamondTransactions>(
      `${this.apiUrl}/transactions?page=${page}&size=${size}`
    );
  }

  transfer(toUserId: string, amount: number, requireBookmark = false): Observable<DiamondTransferResult> {
    return this.http.post<DiamondTransferResult>(`${this.apiUrl}/transfer`, {
      toUserId,
      amount,
      requireBookmark,
    });
  }
}
