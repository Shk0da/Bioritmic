import { Component, OnInit, OnDestroy, DestroyRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { AdminService, AdminDashboard, Report, AdminUser, SystemMetrics, PaginatedUsersResponse, FeedbackItem, FeedbackStatus } from '../../core/services/admin.service';
import { ModalService } from '../../core/services/modal.service';
import { ToastService } from '../../core/services/toast.service';
import { registerPullToRefresh } from '../../core/routing/register-pull-to-refresh.util';
import { PullToRefreshService } from '../../core/routing/pull-to-refresh.service';
import { NgClass, DecimalPipe, DatePipe } from '@angular/common';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [NgClass, DecimalPipe, DatePipe, RouterLink, FormsModule],
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
          <div class="col-6 col-md-3">
            <div class="stat-card">
              <div class="stat-icon" style="background: rgba(139, 92, 246, 0.1); color: #8b5cf6;">
                <i class="bi bi-chat-left-text-fill"></i>
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ dashboard.newFeedback }}</span>
                <span class="stat-label">Новых обращений</span>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Tabs -->
      <ul class="nav nav-tabs mb-4">
        <li class="nav-item">
          <button class="nav-link" [class.active]="activeTab === 'users'" (click)="setActiveTab('users')">
            <i class="bi bi-people me-1"></i>Пользователи
          </button>
        </li>
        <li class="nav-item">
          <button class="nav-link" [class.active]="activeTab === 'reports'" (click)="setActiveTab('reports')">
            <i class="bi bi-flag me-1"></i>Жалобы
            @if (reports.length > 0) {
              <span class="badge bg-danger ms-1">{{ reports.length }}</span>
            }
          </button>
        </li>
        <li class="nav-item">
          <button class="nav-link" [class.active]="activeTab === 'feedback'" (click)="setActiveTab('feedback')">
            <i class="bi bi-chat-left-text me-1"></i>Обратная связь
            @if (newFeedbackCount > 0) {
              <span class="badge bg-danger ms-1">{{ newFeedbackCount }}</span>
            }
          </button>
        </li>
        <li class="nav-item">
          <button class="nav-link" [class.active]="activeTab === 'metrics'" (click)="setActiveTab('metrics')">
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
                  <input type="text" class="form-control form-control-sm" placeholder="Имя, email или ID..."
                    [(ngModel)]="filterSearch" (ngModelChange)="onSearchChange()">
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
                  <button class="btn btn-sm btn-outline-secondary w-100" (click)="resetFilters()">
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
                      @if (filterSearch || filterRole || filterVerified) {
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
                    <td>
                      <a [routerLink]="['/user', report.reporterId]" class="text-decoration-none fw-semibold">
                        {{ report.reporterName || ('User #' + report.reporterId) }}
                      </a>
                    </td>
                    <td>
                      <a [routerLink]="['/user', report.targetId]" class="text-decoration-none fw-semibold">
                        {{ report.targetName || ('User #' + report.targetId) }}
                      </a>
                    </td>
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

      <!-- Feedback Tab -->
      @if (activeTab === 'feedback') {
        <div class="d-flex flex-wrap gap-2 mb-3">
          <select class="form-select form-select-sm w-auto" [(ngModel)]="feedbackStatusFilter" (ngModelChange)="loadFeedback()">
            <option value="">Все статусы</option>
            <option value="NEW">Новые</option>
            <option value="PROCESSED">Обработано</option>
            <option value="TRASH">Мусор</option>
          </select>
        </div>

        @if (loadingFeedback) {
          <div class="text-center py-4">
            <div class="spinner-border" role="status"></div>
          </div>
        } @else if (feedbackItems.length === 0) {
          <div class="text-center py-4 text-muted">
            <i class="bi bi-inbox fs-1 d-block mb-2"></i>
            Нет обращений
          </div>
        } @else {
          <div class="table-responsive">
            <table class="table table-hover align-middle">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Пользователь</th>
                  <th>Тема</th>
                  <th>Сообщение</th>
                  <th>Вложение</th>
                  <th>Статус</th>
                  <th>Дата</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                @for (item of feedbackItems; track item.id) {
                  <tr>
                    <td>{{ item.id }}</td>
                    <td>
                      @if (item.userId) {
                        <a [routerLink]="['/user', item.userId]" class="text-decoration-none fw-semibold">
                          {{ item.userName || ('User #' + item.userId) }}
                        </a>
                      } @else {
                        <div>{{ item.userName || '—' }}</div>
                      }
                      <div class="small text-muted">{{ item.userEmail }}</div>
                    </td>
                    <td>{{ getFeedbackTopicLabel(item.topic) }}</td>
                    <td class="text-truncate" style="max-width: 220px;" [title]="item.message">{{ item.message }}</td>
                    <td>
                      @if (item.attachmentUrl) {
                        <a [href]="item.attachmentUrl" target="_blank" rel="noopener">
                          <i class="bi bi-paperclip me-1"></i>{{ item.attachmentFilename || 'Файл' }}
                        </a>
                      } @else {
                        <span class="text-muted">—</span>
                      }
                    </td>
                    <td>
                      <span class="badge" [ngClass]="getFeedbackStatusClass(item.status)">
                        {{ getFeedbackStatusLabel(item.status) }}
                      </span>
                    </td>
                    <td class="small text-muted">{{ item.createdAt | date:'dd.MM.yyyy HH:mm' }}</td>
                    <td>
                      <div class="d-flex flex-wrap gap-1">
                        @if (item.status !== 'PROCESSED') {
                          <button class="btn btn-sm btn-success" (click)="updateFeedbackStatus(item.id, 'PROCESSED')" title="Обработано">
                            <i class="bi bi-check-lg"></i>
                          </button>
                        }
                        @if (item.status !== 'TRASH') {
                          <button class="btn btn-sm btn-outline-secondary" (click)="updateFeedbackStatus(item.id, 'TRASH')" title="В мусор">
                            <i class="bi bi-trash"></i>
                          </button>
                        }
                        @if (item.status !== 'NEW') {
                          <button class="btn btn-sm btn-outline-primary" (click)="updateFeedbackStatus(item.id, 'NEW')" title="Новый">
                            <i class="bi bi-arrow-counterclockwise"></i>
                          </button>
                        }
                        <button class="btn btn-sm btn-outline-danger" (click)="deleteFeedbackItem(item.id)" title="Удалить">
                          <i class="bi bi-x-lg"></i>
                        </button>
                      </div>
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
  private searchChange$ = new Subject<void>();
  private destroyRef = inject(DestroyRef);
  private readonly pullToRefreshService = inject(PullToRefreshService);
  private reportsLoaded = false;
  private feedbackLoaded = false;

  activeTab: 'users' | 'reports' | 'feedback' | 'metrics' = 'users';
  loadingUsers = false;
  loadingReports = false;
  loadingFeedback = false;
  loadingMetrics = false;
  accessDenied = false;
  dashboard: AdminDashboard | null = null;
  users: AdminUser[] = [];
  reports: Report[] = [];
  feedbackItems: FeedbackItem[] = [];
  feedbackStatusFilter: FeedbackStatus | '' = '';
  newFeedbackCount = 0;
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
    this.searchChange$.pipe(debounceTime(300), takeUntil(this.destroy$)).subscribe(() => this.loadUsers(0));
    this.loadDashboard();
    this.loadUsers();
    registerPullToRefresh(this.pullToRefreshService, this.destroyRef, '/admin', () => ({
      refresh: () => this.refreshAdminPage(),
      isEnabled: () => !this.loadingUsers && !this.loadingReports && !this.loadingFeedback && !this.loadingMetrics,
    }));
  }

  private refreshAdminPage(): void {
    this.loadDashboard();
    if (this.activeTab === 'users') {
      this.loadUsers(this.currentPage);
      return;
    }
    if (this.activeTab === 'reports') {
      this.loadReports();
      return;
    }
    if (this.activeTab === 'feedback') {
      this.loadFeedback();
      return;
    }
    this.loadMetrics();
  }

  setActiveTab(tab: 'users' | 'reports' | 'feedback' | 'metrics'): void {
    this.activeTab = tab;
    if (tab === 'reports' && !this.reportsLoaded) {
      this.loadReports();
    }
    if (tab === 'feedback' && !this.feedbackLoaded) {
      this.loadFeedback();
    }
    if (tab === 'metrics') {
      this.loadMetrics();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get totalPages(): number {
    return Math.ceil(this.totalUsers / this.pageSize);
  }

  onSearchChange(): void {
    this.searchChange$.next();
  }

  resetFilters(): void {
    this.filterSearch = '';
    this.filterRole = '';
    this.filterVerified = '';
    this.loadUsers(0);
  }

  applyFilters(): void {
    this.filteredUsers = this.users.filter(u => {
      const matchRole = !this.filterRole || (u.role?.includes(this.filterRole) ?? false);
      const matchVerified = this.filterVerified === '' || this.filterVerified === 'all' ||
        (this.filterVerified === 'verified' && u.isVerified === true) ||
        (this.filterVerified === 'unverified' && u.isVerified !== true);
      return matchRole && matchVerified;
    });
  }

  private loadDashboard(): void {
    this.adminService.getDashboard().pipe(takeUntil(this.destroy$)).subscribe({
      next: (d) => {
        this.dashboard = d;
        this.newFeedbackCount = d.newFeedback ?? 0;
      },
      error: (err) => {
        if (err.status === 403) this.accessDenied = true;
      }
    });
  }

  private loadUsers(page = 0): void {
    this.loadingUsers = true;
    const search = this.filterSearch.trim() || undefined;
    this.adminService.getUsers(page, this.pageSize, search).pipe(takeUntil(this.destroy$)).subscribe({
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
      next: (reports) => {
        this.reports = reports;
        this.reportsLoaded = true;
        this.loadingReports = false;
      },
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
        if (idx >= 0) { this.users[idx].role = 'ROLE_BANNED'; this.applyFilters(); }
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
        if (idx >= 0) { this.users[idx].role = 'ROLE_USER'; this.applyFilters(); }
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
      next: (response) => {
        this.toastService.success(`Роль изменена на ${response.role}`);
        const idx = this.users.findIndex(u => u.id === user.id);
        if (idx >= 0) { this.users[idx].role = response.role; this.applyFilters(); }
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
      next: () => {
        this.toastService.success('Новый пароль отправлен на email пользователя');
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

  loadFeedback(): void {
    this.loadingFeedback = true;
    const status = this.feedbackStatusFilter || undefined;
    this.adminService.getFeedback(status).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.feedbackItems = response.items;
        this.feedbackLoaded = true;
        this.loadingFeedback = false;
      },
      error: () => {
        this.loadingFeedback = false;
        this.toastService.error('Ошибка загрузки обращений');
      }
    });
  }

  updateFeedbackStatus(feedbackId: number, status: FeedbackStatus): void {
    this.adminService.updateFeedbackStatus(feedbackId, status).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        const item = this.feedbackItems.find(f => f.id === feedbackId);
        if (item) {
          item.status = status;
        }
        if (this.feedbackStatusFilter && this.feedbackStatusFilter !== status) {
          this.feedbackItems = this.feedbackItems.filter(f => f.id !== feedbackId);
        }
        this.toastService.success('Статус обновлён');
        this.loadDashboard();
      },
      error: () => this.toastService.error('Ошибка обновления статуса')
    });
  }

  async deleteFeedbackItem(feedbackId: number): Promise<void> {
    const confirmed = await this.modalService.confirm(
      'Удалить обращение безвозвратно?',
      'Удаление'
    );
    if (!confirmed) {
      return;
    }
    this.adminService.deleteFeedback(feedbackId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.feedbackItems = this.feedbackItems.filter(f => f.id !== feedbackId);
        this.toastService.success('Обращение удалено');
        this.loadDashboard();
      },
      error: () => this.toastService.error('Ошибка удаления')
    });
  }

  getFeedbackTopicLabel(topic: string): string {
    switch (topic) {
      case 'BUG': return 'Ошибка';
      case 'SUGGESTION': return 'Предложение';
      case 'ACCOUNT': return 'Аккаунт';
      case 'OTHER': return 'Другое';
      default: return topic;
    }
  }

  getFeedbackStatusLabel(status: FeedbackStatus): string {
    switch (status) {
      case 'NEW': return 'Новый';
      case 'PROCESSED': return 'Обработано';
      case 'TRASH': return 'Мусор';
      default: return status;
    }
  }

  getFeedbackStatusClass(status: FeedbackStatus): string {
    switch (status) {
      case 'NEW': return 'bg-primary';
      case 'PROCESSED': return 'bg-success';
      case 'TRASH': return 'bg-secondary';
      default: return 'bg-secondary';
    }
  }
}
