import { Component, OnInit, OnDestroy, DestroyRef, inject } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AdminService, AdminDashboard, Report, AdminUser } from '../../core/services/admin.service';
import { ToastService } from '../../core/services/toast.service';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [NgClass],
  template: `
    <div class="page-header mb-4">
      <h1 class="page-title">
        <i class="bi bi-shield-lock me-2"></i>Админ-панель
      </h1>
      <p class="text-muted">Управление системой и пользователями</p>
    </div>

    @if (accessDenied) {
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>Доступ запрещён. У вас нет прав администратора.
      </div>
    } @else {
      <!-- Dashboard Stats -->
      @if (dashboard) {
        <div class="row g-3 mb-4">
          <div class="col-6 col-md-3">
            <div class="stat-card">
              <div class="stat-icon" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6;">
                <i class="bi bi-people-fill"></i>
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ dashboard.totalUsers }}</span>
                <span class="stat-label">Всего пользователей</span>
              </div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="stat-card">
              <div class="stat-icon" style="background: rgba(34, 197, 94, 0.1); color: #22c55e;">
                <i class="bi bi-patch-check-fill"></i>
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ dashboard.verifiedUsers }}</span>
                <span class="stat-label">Верифицированы</span>
              </div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="stat-card">
              <div class="stat-icon" style="background: rgba(245, 158, 11, 0.1); color: #f59e0b;">
                <i class="bi bi-clock-fill"></i>
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ dashboard.unverifiedUsers }}</span>
                <span class="stat-label">Ожидают верификации</span>
              </div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="stat-card">
              <div class="stat-icon" style="background: rgba(239, 68, 68, 0.1); color: #ef4444;">
                <i class="bi bi-flag-fill"></i>
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ dashboard.pendingReports }}</span>
                <span class="stat-label">Жалоб на рассмотрении</span>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Tabs -->
      <ul class="nav nav-tabs mb-4">
        <li class="nav-item">
          <button class="nav-link" [class.active]="activeTab === 'users'" (click)="activeTab = 'users'">
            <i class="bi bi-people me-1"></i>Пользователи
          </button>
        </li>
        <li class="nav-item">
          <button class="nav-link" [class.active]="activeTab === 'reports'" (click)="activeTab = 'reports'">
            <i class="bi bi-flag me-1"></i>Жалобы
            @if (reports.length > 0) {
              <span class="badge bg-danger ms-1">{{ reports.length }}</span>
            }
          </button>
        </li>
      </ul>

      <!-- Users Tab -->
      @if (activeTab === 'users') {
        @if (loadingUsers) {
          <div class="text-center py-4">
            <div class="spinner-border" role="status"></div>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Имя</th>
                  <th>Email</th>
                  <th>Возраст</th>
                  <th>Роль</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                @for (user of users; track user.id) {
                  <tr>
                    <td>{{ user.id }}</td>
                    <td>{{ user.name || '—' }}</td>
                    <td>{{ user.email || '—' }}</td>
                    <td>{{ user.age || '—' }}</td>
                    <td>
                      <span class="badge" [ngClass]="getRoleBadgeClass(user.role)">
                        {{ user.role || 'USER' }}
                      </span>
                    </td>
                    <td>
                      <div class="btn-group btn-group-sm">
                        @if (!user.role?.includes('ADMIN')) {
                          @if (user.role?.includes('BANNED')) {
                            <button class="btn btn-success" (click)="unbanUser(user.id!)" title="Разбанить">
                              <i class="bi bi-shield-check"></i>
                            </button>
                          } @else {
                            <button class="btn btn-warning" (click)="banUser(user.id!)" title="Забанить">
                              <i class="bi bi-shield-slash"></i>
                            </button>
                          }
                          <button class="btn btn-danger" (click)="deleteUser(user.id!)" title="Удалить">
                            <i class="bi bi-trash"></i>
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }

      <!-- Reports Tab -->
      @if (activeTab === 'reports') {
        @if (loadingReports) {
          <div class="text-center py-4">
            <div class="spinner-border" role="status"></div>
          </div>
        } @else if (reports.length === 0) {
          <div class="text-center py-4 text-muted">
            <i class="bi bi-check-circle fs-1 d-block mb-2"></i>
            Нет ожидающих жалоб
          </div>
        } @else {
          <div class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Жалобщик</th>
                  <th>Цель</th>
                  <th>Причина</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                @for (report of reports; track report.id) {
                  <tr>
                    <td>{{ report.id }}</td>
                    <td>{{ report.reporterName || 'User #' + report.reporterId }}</td>
                    <td>{{ report.targetName || 'User #' + report.targetId }}</td>
                    <td class="text-truncate" style="max-width: 200px;">{{ report.reason }}</td>
                    <td>
                      <span class="badge" [ngClass]="getStatusClass(report.status)">{{ report.status }}</span>
                    </td>
                    <td>
                      <button class="btn btn-sm btn-success" (click)="resolveReport(report.id)">
                        <i class="bi bi-check-lg"></i> Решить
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    }
  `,
  styles: [`
    .page-header { padding: 1rem 0; }
    .page-title {
      font-size: 1.75rem; font-weight: 700; margin-bottom: 0.5rem;
      background: var(--tinder-gradient); -webkit-background-clip: text;
      -webkit-text-fill-color: transparent; background-clip: text;
    }
    .stat-card {
      background: var(--card-bg, white); border-radius: 12px; padding: 1.25rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06); display: flex; align-items: center; gap: 1rem;
      transition: transform 0.2s ease;
    }
    .stat-card:hover { transform: translateY(-2px); }
    .stat-icon {
      width: 48px; height: 48px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center; font-size: 1.3rem;
    }
    .stat-info { display: flex; flex-direction: column; }
    .stat-value { font-size: 1.5rem; font-weight: 700; color: var(--text-primary, #1f2937); }
    .stat-label { font-size: 0.8rem; color: var(--text-secondary, #6b7280); }
  `]
})
export class AdminComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private destroyRef = inject(DestroyRef);

  activeTab: 'users' | 'reports' = 'users';
  loadingUsers = false;
  loadingReports = false;
  accessDenied = false;
  dashboard: AdminDashboard | null = null;
  users: AdminUser[] = [];
  reports: Report[] = [];

  constructor(
    private adminService: AdminService,
    private toastService: ToastService
  ) {
    this.destroyRef.onDestroy(() => this.destroy$.next());
  }

  ngOnInit(): void {
    this.loadDashboard();
    this.loadUsers();
    this.loadReports();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboard(): void {
    this.adminService.getDashboard().pipe(takeUntil(this.destroy$)).subscribe({
      next: (d) => this.dashboard = d,
      error: (err) => {
        if (err.status === 403) this.accessDenied = true;
      }
    });
  }

  private loadUsers(): void {
    this.loadingUsers = true;
    this.adminService.getUsers().pipe(takeUntil(this.destroy$)).subscribe({
      next: (users) => { this.users = users; this.loadingUsers = false; },
      error: (err) => {
        this.loadingUsers = false;
        if (err.status === 403) this.accessDenied = true;
      }
    });
  }

  private loadReports(): void {
    this.loadingReports = true;
    this.adminService.getPendingReports().pipe(takeUntil(this.destroy$)).subscribe({
      next: (reports) => { this.reports = reports; this.loadingReports = false; },
      error: (err) => {
        this.loadingReports = false;
        if (err.status === 403) this.accessDenied = true;
      }
    });
  }

  getRoleBadgeClass(role?: string): string {
    if (!role) return 'bg-secondary';
    if (role.includes('ADMIN')) return 'bg-danger';
    if (role.includes('BANNED')) return 'bg-dark';
    return 'bg-success';
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING': return 'bg-warning';
      case 'RESOLVED': return 'bg-success';
      default: return 'bg-secondary';
    }
  }

  banUser(userId: number): void {
    this.adminService.banUser(userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.success('Пользователь заблокирован');
        this.loadUsers();
      },
      error: () => this.toastService.error('Ошибка блокировки')
    });
  }

  unbanUser(userId: number): void {
    this.adminService.unbanUser(userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.success('Пользователь разблокирован');
        this.loadUsers();
      },
      error: () => this.toastService.error('Ошибка')
    });
  }

  deleteUser(userId: number): void {
    this.adminService.deleteUser(userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.success('Пользователь удалён');
        this.loadUsers();
        this.loadDashboard();
      },
      error: () => this.toastService.error('Ошибка удаления')
    });
  }

  resolveReport(reportId: number): void {
    this.adminService.resolveReport(reportId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.reports = this.reports.filter(r => r.id !== reportId);
        this.toastService.success('Жалоба решена');
        this.loadDashboard();
      },
      error: () => this.toastService.error('Ошибка')
    });
  }
}
