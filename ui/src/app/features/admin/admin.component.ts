import { Component, OnInit, OnDestroy, DestroyRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AdminService, AdminDashboard, Report, AdminUser, SystemMetrics, PaginatedUsersResponse } from '../../core/services/admin.service';
import { ModalService } from '../../core/services/modal.service';
import { ToastService } from '../../core/services/toast.service';
import { NgClass, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [NgClass, DecimalPipe, RouterLink, FormsModule],
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
        <li class="nav-item">
          <button class="nav-link" [class.active]="activeTab === 'metrics'" (click)="activeTab = 'metrics'; loadMetrics()">
            <i class="bi bi-speedometer me-1"></i>Метрики
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
          <div class="card mb-3">
            <div class="card-body py-2">
              <div class="row g-2 align-items-end">
                <div class="col-md-6">
                  <label class="form-label form-label-sm mb-0">Поиск</label>
                  <input type="text" class="form-control form-control-sm" placeholder="Имя или email..."
                    [(ngModel)]="filterSearch" (ngModelChange)="applyFilters()">
                </div>
                <div class="col-md-4">
                  <label class="form-label form-label-sm mb-0">Роль</label>
                  <select class="form-select form-select-sm" [(ngModel)]="filterRole" (ngModelChange)="applyFilters()">
                    <option value="">Все роли</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="USER">USER</option>
                    <option value="MODERATOR">MODERATOR</option>
                    <option value="BANNED">BANNED</option>
                  </select>
                </div>
                <div class="col-md-2">
                  <label class="form-label form-label-sm mb-0">Верификация</label>
                  <select class="form-select form-select-sm" [(ngModel)]="filterVerified" (ngModelChange)="applyFilters()">
                    <option value="">Все</option>
                    <option value="verified">Верифицированы</option>
                    <option value="unverified">Не верифицированы</option>
                  </select>
                </div>
                <div class="col-md-2">
                  <button class="btn btn-sm btn-outline-secondary w-100" (click)="filterSearch = ''; filterRole = ''; filterVerified = ''; applyFilters()">
                    <i class="bi bi-x-lg me-1"></i>Сброс
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Имя</th>
                  <th>Email</th>
                  <th>Возраст</th>
                  <th>Роль</th>
                  <th>Верификация</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                @for (user of filteredUsers; track user.id) {
                  <tr>
                    <td class="text-truncate" style="max-width: 80px;">{{ user.id }}</td>
                    <td>
                      <a [routerLink]="['/user', user.id]" class="text-decoration-none fw-semibold">
                        {{ user.name || '—' }}
                      </a>
                    </td>
                    <td class="text-truncate" style="max-width: 150px;">{{ user.email || '—' }}</td>
                    <td>{{ user.age || '—' }}</td>
                    <td>
                      <span class="badge" [ngClass]="getRoleBadgeClass(user.role)">
                        {{ user.role || 'USER' }}
                      </span>
                    </td>
                    <td>
                      @if (user.isVerified) {
                        <span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Да</span>
                      } @else {
                        <span class="badge bg-secondary"><i class="bi bi-clock me-1"></i>Нет</span>
                      }
                    </td>
                    <td>
                      <div class="btn-group btn-group-sm flex-wrap">
                        <a [routerLink]="['/user', user.id]" class="btn btn-outline-info" title="Профиль">
                          <i class="bi bi-eye"></i>
                        </a>
                        @if (!user.role?.includes('ADMIN')) {
                          @if (user.isVerified) {
                            <button class="btn btn-outline-warning" (click)="unverifyUser(user)" title="Снять верификацию">
                              <i class="bi bi-person-x"></i>
                            </button>
                          } @else {
                            <button class="btn btn-outline-success" (click)="verifyUser(user)" title="Верифицировать">
                              <i class="bi bi-person-check"></i>
                            </button>
                          }
                          @if (user.role?.includes('BANNED')) {
                            <button class="btn btn-success" (click)="unbanUser(user)" title="Разбанить">
                              <i class="bi bi-shield-check"></i>
                            </button>
                          } @else {
                            <button class="btn btn-warning" (click)="banUser(user)" title="Забанить">
                              <i class="bi bi-shield-slash"></i>
                            </button>
                          }
                          <button class="btn btn-outline-primary" (click)="resetPassword(user)" title="Сбросить пароль">
                            <i class="bi bi-key"></i>
                          </button>
                          <select class="form-select form-select-sm" style="width: auto; display: inline-block;"
                            (change)="onRoleChange(user, $event)" title="Изменить роль">
                            <option value="" disabled selected>Роль</option>
                            <option value="USER">USER</option>
                            <option value="MODERATOR">MODERATOR</option>
                            <option value="BANNED">BANNED</option>
                          </select>
                          <button class="btn btn-danger" (click)="deleteUser(user)" title="Удалить">
                            <i class="bi bi-trash"></i>
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="text-center text-muted py-3">
                      @if (filterSearch || filterRole) {
                        <i class="bi bi-search fs-4 d-block mb-1"></i>Нет пользователей по фильтру
                      } @else {
                        <i class="bi bi-people fs-4 d-block mb-1"></i>Нет пользователей
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (totalUsers > pageSize) {
            <div class="d-flex justify-content-between align-items-center mt-3">
              <span class="text-muted small">Всего: {{ totalUsers }} пользователей</span>
              <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-secondary" (click)="changePage(-1)" [disabled]="currentPage === 0">
                  <i class="bi bi-chevron-left"></i>
                </button>
                <button class="btn btn-outline-secondary" disabled>
                  {{ currentPage + 1 }} / {{ totalPages }}
                </button>
                <button class="btn btn-outline-secondary" (click)="changePage(1)" [disabled]="currentPage + 1 >= totalPages">
                  <i class="bi bi-chevron-right"></i>
                </button>
              </div>
            </div>
          }
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

      <!-- Metrics Tab -->
      @if (activeTab === 'metrics') {
        @if (loadingMetrics) {
          <div class="text-center py-4">
            <div class="spinner-border" role="status"></div>
          </div>
        } @else if (metrics) {
          <div class="row g-3">
            <div class="col-md-6">
              <div class="card mb-3">
                <div class="card-header fw-bold">
                  <i class="bi bi-cpu me-2"></i>JVM
                </div>
                <div class="card-body">
                  <table class="table table-sm mb-0">
                    <tr><td class="text-muted">Версия</td><td>{{ metrics.jvm.version }}</td></tr>
                    <tr><td class="text-muted">Аптайм</td><td>{{ metrics.jvm.uptime }}</td></tr>
                    <tr><td class="text-muted">CPU ядра</td><td>{{ metrics.jvm.cpuCores }}</td></tr>
                    <tr><td class="text-muted">Heap использовано</td><td>{{ metrics.jvm.heapUsed }} / {{ metrics.jvm.heapMax }}</td></tr>
                    <tr><td class="text-muted">Heap %</td><td>
                      <div class="progress" style="height: 20px;">
                        <div class="progress-bar" [ngClass]="metrics.jvm.heapUsedPercent > 80 ? 'bg-danger' : metrics.jvm.heapUsedPercent > 60 ? 'bg-warning' : 'bg-success'"
                             [style.width.%]="metrics.jvm.heapUsedPercent">{{ metrics.jvm.heapUsedPercent | number:'1.1-1' }}%</div>
                      </div>
                    </td></tr>
                    <tr><td class="text-muted">Non-Heap</td><td>{{ metrics.jvm.nonHeapUsed }}</td></tr>
                    <tr><td class="text-muted">Потоки</td><td>{{ metrics.jvm.threadCount }} (пик: {{ metrics.jvm.peakThreadCount }})</td></tr>
                  </table>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="card mb-3">
                <div class="card-header fw-bold">
                  <i class="bi bi-database me-2"></i>База данных
                </div>
                <div class="card-body">
                  <table class="table table-sm mb-0">
                    <tr><td class="text-muted">Активные соединения</td><td>{{ metrics.database.poolActive }}</td></tr>
                    <tr><td class="text-muted">Простаивающие</td><td>{{ metrics.database.poolIdle }}</td></tr>
                    <tr><td class="text-muted">Ожидающие</td><td>{{ metrics.database.poolPending }}</td></tr>
                  </table>
                </div>
              </div>
              <div class="card mb-3">
                <div class="card-header fw-bold">
                  <i class="bi bi-pc-display me-2"></i>Система
                </div>
                <div class="card-body">
                  <table class="table table-sm mb-0">
                    <tr><td class="text-muted">ОС</td><td>{{ metrics.system.osName }} {{ metrics.system.osVersion }}</td></tr>
                    <tr><td class="text-muted">Всего памяти</td><td>{{ metrics.system.totalMemory }}</td></tr>
                    <tr><td class="text-muted">Свободно</td><td>{{ metrics.system.freeMemory }}</td></tr>
                  </table>
                </div>
              </div>
            </div>
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

  activeTab: 'users' | 'reports' | 'metrics' = 'users';
  loadingUsers = false;
  loadingReports = false;
  loadingMetrics = false;
  accessDenied = false;
  dashboard: AdminDashboard | null = null;
  users: AdminUser[] = [];
  reports: Report[] = [];
  metrics: SystemMetrics | null = null;

  filterSearch = '';
  filterRole = '';
  filterVerified = '';
  filteredUsers: AdminUser[] = [];
  currentPage = 0;
  pageSize = 50;
  totalUsers = 0;

  constructor(
    private adminService: AdminService,
    private modalService: ModalService,
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

  get totalPages(): number {
    return Math.ceil(this.totalUsers / this.pageSize);
  }

  applyFilters(): void {
    this.filteredUsers = this.users.filter(u => {
      const matchSearch = !this.filterSearch ||
        (u.name?.toLowerCase().includes(this.filterSearch.toLowerCase())) ||
        (u.email?.toLowerCase().includes(this.filterSearch.toLowerCase()));
      const matchRole = !this.filterRole || (u.role?.includes(this.filterRole) ?? false);
      const matchVerified = this.filterVerified === '' || this.filterVerified === 'all' ||
        (this.filterVerified === 'verified' && u.isVerified === true) ||
        (this.filterVerified === 'unverified' && u.isVerified !== true);
      return matchSearch && matchRole && matchVerified;
    });
  }

  private loadDashboard(): void {
    this.adminService.getDashboard().pipe(takeUntil(this.destroy$)).subscribe({
      next: (d) => this.dashboard = d,
      error: (err) => {
        if (err.status === 403) this.accessDenied = true;
      }
    });
  }

  private loadUsers(page = 0): void {
    this.loadingUsers = true;
    this.adminService.getUsers(page, this.pageSize).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.users = response.users;
        this.totalUsers = response.total;
        this.currentPage = response.page;
        this.loadingUsers = false;
        this.applyFilters();
      },
      error: (err) => {
        this.loadingUsers = false;
        if (err.status === 403) this.accessDenied = true;
      }
    });
  }

  changePage(delta: number): void {
    const newPage = this.currentPage + delta;
    if (newPage < 0 || newPage >= Math.ceil(this.totalUsers / this.pageSize)) return;
    this.loadUsers(newPage);
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

  loadMetrics(): void {
    if (this.metrics) return;
    this.loadingMetrics = true;
    this.adminService.getMetrics().pipe(takeUntil(this.destroy$)).subscribe({
      next: (m) => { this.metrics = m; this.loadingMetrics = false; },
      error: (err) => {
        this.loadingMetrics = false;
        if (err.status === 403) this.accessDenied = true;
      }
    });
  }

  getRoleBadgeClass(role?: string): string {
    if (!role) return 'bg-secondary';
    if (role.includes('ADMIN')) return 'bg-danger';
    if (role.includes('MODERATOR')) return 'bg-info';
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

  async banUser(user: AdminUser): Promise<void> {
    const confirmed = await this.modalService.confirm(
      `Заблокировать пользователя ${user.name || user.email}?`,
      'Блокировка пользователя'
    );
    if (!confirmed) return;

    this.adminService.banUser(user.id!).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.success('Пользователь заблокирован');
        const idx = this.users.findIndex(u => u.id === user.id);
        if (idx >= 0) { this.users[idx].role = 'BANNED'; this.applyFilters(); }
      },
      error: () => this.toastService.error('Ошибка блокировки')
    });
  }

  async unbanUser(user: AdminUser): Promise<void> {
    const confirmed = await this.modalService.confirm(
      `Разблокировать пользователя ${user.name || user.email}?`,
      'Разблокировка пользователя'
    );
    if (!confirmed) return;

    this.adminService.unbanUser(user.id!).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.success('Пользователь разблокирован');
        const idx = this.users.findIndex(u => u.id === user.id);
        if (idx >= 0) { this.users[idx].role = 'USER'; this.applyFilters(); }
      },
      error: () => this.toastService.error('Ошибка')
    });
  }

  async verifyUser(user: AdminUser): Promise<void> {
    const confirmed = await this.modalService.confirm(
      `Верифицировать пользователя ${user.name || user.email}?`,
      'Верификация пользователя'
    );
    if (!confirmed) return;

    this.adminService.verifyUser(user.id!).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.success('Пользователь верифицирован');
        const idx = this.users.findIndex(u => u.id === user.id);
        if (idx >= 0) { this.users[idx].isVerified = true; this.applyFilters(); }
        this.loadDashboard();
      },
      error: () => this.toastService.error('Ошибка верификации')
    });
  }

  async unverifyUser(user: AdminUser): Promise<void> {
    const confirmed = await this.modalService.confirm(
      `Снять верификацию у пользователя ${user.name || user.email}?`,
      'Снятие верификации'
    );
    if (!confirmed) return;

    this.adminService.unverifyUser(user.id!).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.success('Верификация снята');
        const idx = this.users.findIndex(u => u.id === user.id);
        if (idx >= 0) { this.users[idx].isVerified = false; this.applyFilters(); }
        this.loadDashboard();
      },
      error: () => this.toastService.error('Ошибка')
    });
  }

  async deleteUser(user: AdminUser): Promise<void> {
    const confirmed = await this.modalService.confirm(
      `Удалить пользователя ${user.name || user.email}? Это действие необратимо!`,
      'Удаление пользователя'
    );
    if (!confirmed) return;

    this.adminService.deleteUser(user.id!).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.success('Пользователь удалён');
        this.users = this.users.filter(u => u.id !== user.id);
        this.applyFilters();
        this.loadDashboard();
      },
      error: () => this.toastService.error('Ошибка удаления')
    });
  }

  async changeRole(user: AdminUser, newRole: string): Promise<void> {
    const currentRole = user.role || 'USER';
    if (currentRole === newRole) return;

    const confirmed = await this.modalService.confirm(
      `Изменить роль пользователя ${user.name || user.email} с "${currentRole}" на "${newRole}"?`,
      'Смена роли'
    );
    if (!confirmed) return;

    this.adminService.changeRole(user.id!, newRole).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.success(`Роль изменена на ${newRole}`);
        const idx = this.users.findIndex(u => u.id === user.id);
        if (idx >= 0) { this.users[idx].role = newRole; this.applyFilters(); }
      },
      error: (err) => this.toastService.error(err.error?.error || 'Ошибка смены роли')
    });
  }

  async resetPassword(user: AdminUser): Promise<void> {
    const confirmed = await this.modalService.confirm(
      `Сгенерировать новый пароль для ${user.name || user.email}? Новый пароль будет отправлен на email.`,
      'Сброс пароля'
    );
    if (!confirmed) return;

    this.adminService.resetPassword(user.id!).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.toastService.success(`Новый пароль: ${response.newPassword}`);
      },
      error: () => this.toastService.error('Ошибка сброса пароля')
    });
  }

  onRoleChange(user: AdminUser, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newRole = select.value;
    if (newRole) {
      this.changeRole(user, newRole);
      select.value = '';
    }
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
