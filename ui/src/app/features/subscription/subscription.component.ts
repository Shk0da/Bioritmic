import { Component, OnInit, OnDestroy, DestroyRef, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { SubscriptionService } from '../../core/services/subscription.service';
import { UserService } from '../../core/services/user.service';
import { ToastService } from '../../core/services/toast.service';
import { UserInfo } from '../../core/models/user.model';

@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="page-header mb-4">
      <h1 class="page-title">
        <i class="bi bi-star me-2"></i>Подписка
      </h1>
      <p class="text-muted">Управление вашим тарифом</p>
    </div>

    <div class="row">
      <div class="col-12 col-lg-8 mx-auto">
        @if (loading) {
          <div class="text-center py-4">
            <div class="spinner-border" role="status">
              <span class="visually-hidden">Загрузка...</span>
            </div>
          </div>
        } @else {
          @if (isPro) {
            <div class="card mb-4">
              <div class="card-body text-center py-4">
                <div class="pro-icon mb-3">
                  <i class="bi bi-star-fill"></i>
                </div>
                <h4 class="text-warning mb-2">Bioritmic PRO</h4>
                <p class="text-muted mb-3">Ваша подписка активна</p>
                @if (subscription?.expireDate) {
                  <p class="small text-muted">
                    Действует до: <strong>{{ subscription.expireDate | date:'dd.MM.yyyy' }}</strong>
                  </p>
                }
                <div class="mt-3">
                  <button class="btn btn-outline-danger" (click)="cancelSubscription()" [disabled]="cancelling">
                    @if (cancelling) {
                      <span class="spinner-border spinner-border-sm me-2"></span>
                    }
                    Отменить подписку
                  </button>
                </div>
              </div>
            </div>
          } @else {
            <div class="row g-4">
              <div class="col-md-6">
                <div class="card h-100">
                  <div class="card-body text-center py-4">
                    <div class="plan-icon mb-3">
                      <i class="bi bi-person"></i>
                    </div>
                    <h5>Free</h5>
                    <p class="text-muted small">Бесплатно</p>
                    <hr>
                    <ul class="list-unstyled text-start small">
                      <li class="mb-2"><i class="bi bi-check-circle text-success me-2"></i>10 свайпов в день</li>
                      <li class="mb-2"><i class="bi bi-check-circle text-success me-2"></i>Базовый поиск</li>
                      <li class="mb-2"><i class="bi bi-check-circle text-success me-2"></i>Общение с совпадениями</li>
                      <li class="mb-2"><i class="bi bi-x-circle text-muted me-2"></i>Без приоритета в выдаче</li>
                      <li class="mb-2"><i class="bi bi-x-circle text-muted me-2"></i>Без расширенных фильтров</li>
                    </ul>
                  </div>
                  <div class="card-footer text-center bg-transparent border-0">
                    <span class="badge bg-secondary">Текущий план</span>
                  </div>
                </div>
              </div>

              <div class="col-md-6">
                <div class="card h-100 pro-card">
                  <div class="card-body text-center py-4">
                    <div class="plan-icon pro-icon mb-3">
                      <i class="bi bi-star-fill"></i>
                    </div>
                    <h5 class="text-warning">Pro</h5>
                    <p class="text-muted small">299 ₽ / месяц</p>
                    <hr>
                    <ul class="list-unstyled text-start small">
                      <li class="mb-2"><i class="bi bi-check-circle text-success me-2"></i>Безлимитные свайпы</li>
                      <li class="mb-2"><i class="bi bi-check-circle text-success me-2"></i>Приоритет в выдаче</li>
                      <li class="mb-2"><i class="bi bi-check-circle text-success me-2"></i>Расширенные фильтры</li>
                      <li class="mb-2"><i class="bi bi-check-circle text-success me-2"></i>Видно кто вас лайкнул</li>
                      <li class="mb-2"><i class="bi bi-check-circle text-success me-2"></i>Супер-лайки</li>
                    </ul>
                  </div>
                  <div class="card-footer text-center bg-transparent border-0">
                    <button class="btn btn-warning w-100" (click)="subscribe()" [disabled]="subscribing">
                      @if (subscribing) {
                        <span class="spinner-border spinner-border-sm me-2"></span>
                      }
                      <i class="bi bi-star-fill me-1"></i>Подписаться
                    </button>
                  </div>
                </div>
              </div>
            </div>
          }
        }
      </div>
    </div>
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

    .pro-icon {
      font-size: 3rem;
      color: #f59e0b;
    }

    .plan-icon {
      font-size: 2.5rem;
      color: #6c757d;
    }

    .plan-icon.pro-icon {
      color: #f59e0b;
    }

    .pro-card {
      border: 2px solid #f59e0b;
    }
  `]
})
export class SubscriptionComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private destroyRef = inject(DestroyRef);

  loading = true;
  isPro = false;
  subscribing = false;
  cancelling = false;
  subscription: any = null;

  constructor(
    private subscriptionService: SubscriptionService,
    private userService: UserService,
    private toastService: ToastService
  ) {
    this.destroyRef.onDestroy(() => this.destroy$.next());
  }

  ngOnInit(): void {
    this.loadSubscription();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadSubscription(): void {
    this.loading = true;
    this.userService.getCurrentUser().pipe(takeUntil(this.destroy$)).subscribe({
      next: (user) => {
        this.isPro = user.isPro === true;
        this.subscriptionService.getCurrentSubscription().pipe(takeUntil(this.destroy$)).subscribe({
          next: (sub) => {
            this.subscription = sub;
            this.loading = false;
          },
          error: () => {
            this.loading = false;
          }
        });
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  subscribe(): void {
    this.subscribing = true;
    this.subscriptionService.verifyReceipt('mock-receipt-token').pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.success('Подписка активирована!');
        this.isPro = true;
        this.subscribing = false;
        this.loadSubscription();
      },
      error: () => {
        this.toastService.error('Ошибка активации подписки');
        this.subscribing = false;
      }
    });
  }

  cancelSubscription(): void {
    this.cancelling = true;
    this.subscriptionService.cancelSubscription().pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.success('Подписка отменена');
        this.isPro = false;
        this.cancelling = false;
        this.loadSubscription();
      },
      error: () => {
        this.toastService.error('Ошибка отмены подписки');
        this.cancelling = false;
      }
    });
  }
}
