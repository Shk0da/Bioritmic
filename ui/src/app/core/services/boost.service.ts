import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BoostActivateResponse {
  success: boolean;
  expiresAt: number;
  balance?: number;
  cost?: number;
}

export interface BoostInfo {
  startedAt: number;
  expiresAt: number;
  cost?: number;
}

export const BOOST_DIAMOND_COST = 50;

@Injectable({
  providedIn: 'root'
})
export class BoostService {
  private readonly apiUrl = '/api/v1/boost';

  constructor(private http: HttpClient) {}

  activateBoost(): Observable<BoostActivateResponse> {
    return this.http.post<BoostActivateResponse>(`${this.apiUrl}/activate`, {});
  }

  getCurrentBoost(): Observable<BoostInfo | null> {
    return this.http.get<BoostInfo | null>(`${this.apiUrl}/current`);
  }
}
