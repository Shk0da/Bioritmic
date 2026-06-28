import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AdminDashboard {
  totalUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  pendingReports: number;
  newFeedback: number;
}

export interface Report {
  id: number;
  reporterId: string;
  reporterName?: string;
  targetId: string;
  targetName?: string;
  reason: string;
  status: string;
  createdAt?: string;
}

export type FeedbackStatus = 'NEW' | 'PROCESSED' | 'TRASH';

export interface FeedbackItem {
  id: number;
  userId: string;
  userName?: string;
  userEmail?: string;
  topic: string;
  message: string;
  status: FeedbackStatus;
  attachmentUrl?: string;
  attachmentFilename?: string;
  createdAt?: string;
}

export interface PaginatedFeedbackResponse {
  items: FeedbackItem[];
  total: number;
  page: number;
  size: number;
}

export interface AdminUser {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  age?: number;
  isVerified?: boolean;
}

export interface PaginatedUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly apiUrl = '/api/v1/admin';

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<AdminDashboard> {
    return this.http.get<AdminDashboard>(`${this.apiUrl}/dashboard`);
  }

  getUsers(page = 0, size = 50, search?: string): Observable<PaginatedUsersResponse> {
    const searchParam = search?.trim() ? `&search=${encodeURIComponent(search.trim())}` : '';
    return this.http.get<PaginatedUsersResponse>(`${this.apiUrl}/users?page=${page}&size=${size}${searchParam}`);
  }

  banUser(userId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/${userId}/ban`, {});
  }

  unbanUser(userId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/${userId}/unban`, {});
  }

  deleteUser(userId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${userId}`);
  }

  getPendingReports(): Observable<Report[]> {
    return this.http.get<Report[]>(`${this.apiUrl}/reports`);
  }

  resolveReport(reportId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/reports/${reportId}/resolve`, {});
  }

  getFeedback(status?: FeedbackStatus, page = 0, size = 50): Observable<PaginatedFeedbackResponse> {
    const statusParam = status ? `&status=${status}` : '';
    return this.http.get<PaginatedFeedbackResponse>(
      `${this.apiUrl}/feedback?page=${page}&size=${size}${statusParam}`
    );
  }

  updateFeedbackStatus(feedbackId: number, status: FeedbackStatus): Observable<any> {
    return this.http.post(`${this.apiUrl}/feedback/${feedbackId}/status`, { status });
  }

  deleteFeedback(feedbackId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/feedback/${feedbackId}`);
  }

  getMetrics(): Observable<SystemMetrics> {
    return this.http.get<SystemMetrics>(`${this.apiUrl}/metrics`);
  }

  createReport(reportedUserId: string, reason: string, description?: string): Observable<any> {
    return this.http.post('/api/v1/report', {
      reported_user_id: reportedUserId,
      reason,
      description: description || null
    });
  }

  verifyUser(userId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/${userId}/verify`, {});
  }

  unverifyUser(userId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/${userId}/unverify`, {});
  }

  changeRole(userId: string, role: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/${userId}/role`, { role });
  }

  resetPassword(userId: string): Observable<{ success: boolean; userId: string }> {
    return this.http.post<{ success: boolean; userId: string }>(`${this.apiUrl}/users/${userId}/reset-password`, {});
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
