import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Report {
  id: number;
  reporterId: number;
  reporterName?: string;
  targetId: number;
  targetName?: string;
  reason: string;
  status: string;
  createdAt?: string;
}

export interface Verification {
  id: number;
  userId: number;
  userName?: string;
  userEmail?: string;
  photoUrl?: string;
  status: string;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly apiUrl = '/api/v1/admin';

  constructor(private http: HttpClient) {}

  getPendingReports(): Observable<Report[]> {
    return this.http.get<Report[]>(`${this.apiUrl}/reports`);
  }

  updateReport(id: number, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/reports/${id}`, { status });
  }

  getPendingVerifications(): Observable<Verification[]> {
    return this.http.get<Verification[]>(`${this.apiUrl}/verifications`);
  }

  approveVerification(userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/verifications/${userId}/approve`, {});
  }

  rejectVerification(userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/verifications/${userId}/reject`, {});
  }
}
