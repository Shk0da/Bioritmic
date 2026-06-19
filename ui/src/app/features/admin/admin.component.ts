import { Component, OnInit, OnDestroy, DestroyRef, inject } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AdminService, Report, Verification } from '../../core/services/admin.service';
import { ToastService } from '../../core/services/toast.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-admin',
  standalone: true,
  template: `
    <div class="page-header mb-4">
      <h1 class="page-title">
        <i class="bi bi-shield-lock me-2"></i>Админ-панель
      </h1>
      <p class="text-muted">Управление жалобами и верификациями</p>
    </div>

    @if (accessDenied) {
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>Доступ запрещён. У вас нет прав администратора.
      </div>
    } @else {
      <ul class="nav nav-tabs mb-4">
        <li class="nav-item">
          <button class="nav-link" [class.active]="activeTab === 'reports'" (click)="activeTab = 'reports'">
            <i class="bi bi-flag me-1"></i>Жалобы
            @if (reports.length > 0) {
              <span class="badge bg-danger ms-1">{{ reports.length }}</span>
            }
          </button>
        </li>
        <li class="nav-item">
          <button class="nav-link" [class.active]="activeTab === 'verifications'" (click)="activeTab = 'verifications'">
            <i class="bi bi-person-check me-1"></i>Верификации
            @if (verifications.length > 0) {
              <span class="badge bg-warning ms-1">{{ verifications.length }}</span>
            }
          </button>
        </li>
      </ul>

      @if (activeTab === 'reports') {
        @if (loadingReports) {
          <div class="text-center py-4">
            <div class="spinner-border" role="status">
              <span class="visually-hidden">Загрузка...</span>
            </div>
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
                      <span class="badge" [class]="getStatusClass(report.status)">{{ report.status }}</span>
                    </td>
                    <td>
                      <div class="btn-group btn-group-sm">
                        <button class="btn btn-success" (click)="approveReport(report.id)" title="Одобрить">
                          <i class="bi bi-check-lg"></i>
                        </button>
                        <button class="btn btn-danger" (click)="rejectReport(report.id)" title="Отклонить">
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

      @if (activeTab === 'verifications') {
        @if (loadingVerifications) {
          <div class="text-center py-4">
            <div class="spinner-border" role="status">
              <span class="visually-hidden">Загрузка...</span>
            </div>
          </div>
        } @else if (verifications.length === 0) {
          <div class="text-center py-4 text-muted">
            <i class="bi bi-check-circle fs-1 d-block mb-2"></i>
            Нет ожидающих верификаций
          </div>
        } @else {
          <div class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Имя</th>
                  <th>Email</th>
                  <th>Фото</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                @for (v of verifications; track v.id) {
                  <tr>
                    <td>{{ v.id }}</td>
                    <td>{{ v.userName || 'User #' + v.userId }}</td>
                    <td>{{ v.userEmail }}</td>
                    <td>
                      @if (v.photoUrl) {
                        <img [src]="v.photoUrl" class="verification-photo" alt="verification">
                      } @else {
                        <span class="text-muted">Нет фото</span>
                      }
                    </td>
                    <td>
                      <div class="btn-group btn-group-sm">
                        <button class="btn btn-success" (click)="approveVerification(v.userId)" title="Одобрить">
                          <i class="bi bi-check-lg"></i>
                        </button>
                        <button class="btn btn-danger" (click)="rejectVerification(v.userId)" title="Отклонить">
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
    }
  `,
  styles: [`
    .page-header {
      padding: 1rem 0;
    }

    .page-title {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      background: var(--primary-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .verification-photo {
      width: 48px;
      height: 48px;
      object-fit: cover;
      border-radius: 8px;
    }
  `]
})
export class AdminComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private destroyRef = inject(DestroyRef);

  activeTab: 'reports' | 'verifications' = 'reports';
  loadingReports = false;
  loadingVerifications = false;
  accessDenied = false;
  reports: Report[] = [];
  verifications: Verification[] = [];

  constructor(
    private adminService: AdminService,
    private toastService: ToastService
  ) {
    this.destroyRef.onDestroy(() => this.destroy$.next());
  }

  ngOnInit(): void {
    this.loadReports();
    this.loadVerifications();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadReports(): void {
    this.loadingReports = true;
    this.adminService.getPendingReports().pipe(takeUntil(this.destroy$)).subscribe({
      next: (reports) => {
        this.reports = reports;
        this.loadingReports = false;
      },
      error: (err) => {
        this.loadingReports = false;
        if (err.status === 403) {
          this.accessDenied = true;
        }
      }
    });
  }

  private loadVerifications(): void {
    this.loadingVerifications = true;
    this.adminService.getPendingVerifications().pipe(takeUntil(this.destroy$)).subscribe({
      next: (verifications) => {
        this.verifications = verifications;
        this.loadingVerifications = false;
      },
      error: (err) => {
        this.loadingVerifications = false;
        if (err.status === 403) {
          this.accessDenied = true;
        }
      }
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING': return 'bg-warning';
      case 'APPROVED': return 'bg-success';
      case 'REJECTED': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  approveReport(id: number): void {
    this.adminService.updateReport(id, 'APPROVED').pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.reports = this.reports.filter(r => r.id !== id);
        this.toastService.success('Жалоба одобрена');
      },
      error: () => this.toastService.error('Ошибка')
    });
  }

  rejectReport(id: number): void {
    this.adminService.updateReport(id, 'REJECTED').pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.reports = this.reports.filter(r => r.id !== id);
        this.toastService.success('Жалоба отклонена');
      },
      error: () => this.toastService.error('Ошибка')
    });
  }

  approveVerification(userId: number): void {
    this.adminService.approveVerification(userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.verifications = this.verifications.filter(v => v.userId !== userId);
        this.toastService.success('Верификация одобрена');
      },
      error: () => this.toastService.error('Ошибка')
    });
  }

  rejectVerification(userId: number): void {
    this.adminService.rejectVerification(userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.verifications = this.verifications.filter(v => v.userId !== userId);
        this.toastService.success('Верификация отклонена');
      },
      error: () => this.toastService.error('Ошибка')
    });
  }
}
