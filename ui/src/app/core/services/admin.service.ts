import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AdminDashboard {
  totalUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  pendingReports: number;
}

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

export interface AdminUser {
  id?: number;
  name?: string;
  email?: string;
  role?: string;
  age?: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly apiUrl = '/api/v1/admin';

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<AdminDashboard> {
    return this.http.get<AdminDashboard>(`${this.apiUrl}/dashboard`);
  }

  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.apiUrl}/users`);
  }

  banUser(userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/${userId}/ban`, {});
  }

  unbanUser(userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/${userId}/unban`, {});
  }

  deleteUser(userId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${userId}`);
  }

  getPendingReports(): Observable<Report[]> {
    return this.http.get<Report[]>(`${this.apiUrl}/reports`);
  }

  resolveReport(reportId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/reports/${reportId}/resolve`, {});
  }

  getMetrics(): Observable<SystemMetrics> {
    return this.http.get<SystemMetrics>(`${this.apiUrl}/metrics`);
  }
}

export interface SystemMetrics {
  jvm: JvmMetrics;
  database: DatabaseMetrics;
  system: SystemInfo;
}

export interface JvmMetrics {
  version: string;
  uptime: string;
  cpuCores: number;
  heapUsed: string;
  heapMax: string;
  heapUsedPercent: number;
  nonHeapUsed: string;
  threadCount: number;
  peakThreadCount: number;
}

export interface DatabaseMetrics {
  poolActive: number;
  poolIdle: number;
  poolPending: number;
}

export interface SystemInfo {
  osName: string;
  osVersion: string;
  availableMemory: string;
  totalMemory: string;
  freeMemory: string;
}
