import { Component, OnInit, OnDestroy, DestroyRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { Subject, takeUntil, switchMap, EMPTY, catchError } from 'rxjs';
import { UserService, photoSizeForLargeDisplay } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserInfo, Gender } from '../../../core/models/user.model';
import { BoostService, BoostInfo } from '../../../core/services/boost.service';
import { ShareService } from '../../../core/services/share.service';
import { ModalService } from '../../../core/services/modal.service';
import { AvatarStatusBadgeComponent } from '../../../shared/components/avatar-status-badge/avatar-status-badge.component';
import {
  DEFAULT_USER_STATUS_POSITION,
  normalizeUserStatusPosition,
  PROFILE_STATUS_EMOJIS,
} from '../../../shared/utils/user-status.util';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, NgClass, AvatarStatusBadgeComponent],
  template: `
    <div class="page-header mb-4">
      <h1 class="page-title">
        <i class="bi bi-person-circle me-2"></i>Мой профиль
      </h1>
      <p class="text-muted page-subtitle d-none d-md-block">Информация о вашем аккаунте</p>
    </div>

    <div class="row profile-layout">
      <div class="col-12 col-lg-4 mb-4 profile-col">
        <div class="card profile-card text-center">
          <div class="card-body py-4">
            <div class="profile-avatar-wrap mx-auto mb-3">
              <img
                [src]="photoDataUrl || user?.image || ''"
                class="profile-avatar"
                [alt]="user?.name">
              <app-avatar-status-badge
                [emoji]="user?.statusEmoji"
                [position]="user?.statusPosition"
                size="lg">
              </app-avatar-status-badge>
            </div>
            <h4 class="mb-1">{{ user?.name }}</h4>
            <p class="text-muted small mb-3">{{ user?.email }}</p>

            <div class="status-collapse mb-3 text-start">
              <button
                type="button"
                class="status-collapse-toggle"
                (click)="toggleStatusPanel()"
                [attr.aria-expanded]="statusPanelOpen">
                <span class="status-collapse-title">
                  <i class="bi bi-emoji-smile me-2"></i>Поставить статус на фото
                </span>
                <i class="bi status-collapse-chevron" [class.bi-chevron-up]="statusPanelOpen" [class.bi-chevron-down]="!statusPanelOpen"></i>
              </button>

              @if (statusPanelOpen) {
                <div class="status-collapse-body">
                  <p class="text-muted small mb-3">Эмодзи будет виден на вашей карточке в поиске</p>
                  <div class="status-emoji-grid">
                    @for (emoji of statusEmojis; track emoji) {
                      <button
                        type="button"
                        class="status-emoji-btn"
                        [class.selected]="user?.statusEmoji === emoji"
                        [disabled]="statusSaving"
                        (click)="selectStatusEmoji(emoji)">
                        {{ emoji }}
                      </button>
                    }
                  </div>
                  <button
                    type="button"
                    class="btn btn-outline-secondary btn-sm mt-2"
                    (click)="clearStatusEmoji()"
                    [disabled]="!user?.statusEmoji || statusSaving">
                    Убрать статус
                  </button>

                  @if (user?.statusEmoji) {
                    <div class="status-position-picker mt-3">
                      <div class="form-label mb-2">Перетащите эмодзи в нужное место на фото</div>
                      <div
                        class="status-position-stage"
                        (pointerdown)="onStatusStagePointerDown($event)"
                        (pointermove)="onStatusStagePointerMove($event)"
                        (pointerup)="onStatusStagePointerUp($event)"
                        (pointercancel)="onStatusStagePointerCancel($event)">
                        <img
                          [src]="photoDataUrl || user?.image || ''"
                          class="status-position-stage-avatar"
                          [alt]="user?.name">
                        <app-avatar-status-badge
                          [emoji]="user?.statusEmoji"
                          [position]="user?.statusPosition"
                          size="lg">
                        </app-avatar-status-badge>
                      </div>
                    </div>
                  }

                  @if (statusSaving) {
                    <div class="status-saving-indicator mt-2">
                      <span class="spinner-border spinner-border-sm me-2"></span>
                      <span class="text-muted small">Сохранение...</span>
                    </div>
                  }
                </div>
              }
            </div>

            <div class="profile-actions">
              <a [routerLink]="['/profile/me/edit']" class="btn btn-outline-primary">
                <i class="bi bi-pencil me-2"></i>Редактировать
              </a>
              <button
                type="button"
                class="btn btn-outline-secondary"
                (click)="shareProfile()"
                [disabled]="!user?.id || sharing">
                @if (sharing) {
                  <span class="spinner-border spinner-border-sm me-2"></span>
                } @else {
                  <i class="bi bi-share me-2"></i>
                }
                Поделиться
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="col-12 col-lg-8 profile-col">
        <div class="card">
          <div class="card-header">
            <h6 class="mb-0"><i class="bi bi-info-circle me-2"></i>Информация</h6>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-12 col-md-6 mb-3">
                <label class="text-muted small d-block">Дата рождения</label>
                <p class="mb-0 fw-medium">{{ getBirthday() || 'Не указана' }}</p>
              </div>
              <div class="col-12 col-md-6 mb-3">
                <label class="text-muted small d-block">Пол</label>
                <p class="mb-0 fw-medium">{{ getGenderText() }}</p>
              </div>
              @if (user?.age) {
                <div class="col-12 col-md-6 mb-3">
                  <label class="text-muted small d-block">Возраст</label>
                  <p class="mb-0 fw-medium">{{ user?.age }} лет</p>
                </div>
              }
            </div>

            @if (user?.bio) {
              <hr class="my-4">
              <div class="mb-0">
                <label class="text-muted small d-block mb-2">Обо мне</label>
                <p class="mb-0 bio-text">{{ user?.bio }}</p>
              </div>
            }

            @if (user?.isBioCompatible !== undefined || user?.isHoroCompatible !== undefined) {
              <hr class="my-4">
              <div class="mb-3">
                <label class="text-muted small d-block mb-2">Совместимость</label>
                <div class="d-flex flex-wrap gap-2">
                  @if (user?.isBioCompatible !== undefined) {
                    <span class="badge" [ngClass]="user?.isBioCompatible ? 'bg-success' : 'bg-danger'">
                      <i class="bi bi-dna me-1"></i>Био: {{ user?.isBioCompatible ? 'Да' : 'Нет' }}
                    </span>
                  }
                  @if (user?.isHoroCompatible !== undefined) {
                    <span class="badge" [ngClass]="user?.isHoroCompatible ? 'bg-success' : 'bg-danger'">
                      <i class="bi bi-moon-stars me-1"></i>Гороскоп: {{ user?.isHoroCompatible ? 'Да' : 'Нет' }}
                    </span>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <div class="card mt-3">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h6 class="mb-0"><i class="bi bi-lightning me-2"></i>Профиль Boost</h6>
          </div>
          <div class="card-body">
            @if (activeBoost) {
              <div class="boost-active">
                <div class="boost-timer">
                  <i class="bi bi-lightning-charge-fill text-warning"></i>
                  <span class="boost-countdown">{{ getBoostCountdown() }}</span>
                </div>
                <p class="text-muted small mb-2">Ваш профиль выделен и показывается выше в поиске</p>
              </div>
            } @else if (user?.isPro) {
              <p class="mb-3">Активируйте Boost, чтобы ваш профиль показывался выше в поиске на 24 часа.</p>
              <button class="btn btn-warning" (click)="activateBoost()" [disabled]="boostActivating">
                @if (boostActivating) {
                  <span class="spinner-border spinner-border-sm me-2"></span>
                } @else {
                  <i class="bi bi-lightning-charge me-2"></i>
                }
                Boost на 24 часа
              </button>
            } @else {
              <p class="text-muted mb-0">Обновите до Pro чтобы использовать Boost</p>
            }
          </div>
        </div>

        <div class="card mt-3">
          <div class="card-header">
            <h6 class="mb-0"><i class="bi bi-gear me-2"></i>Настройки</h6>
          </div>
          <div class="card-body p-0">
            <div class="list-group list-group-flush">
              <a routerLink="/settings/search" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                <span><i class="bi bi-sliders me-2"></i>Параметры поиска</span>
                <i class="bi bi-chevron-right text-muted small"></i>
              </a>
              <a routerLink="/settings/notifications" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                <span><i class="bi bi-bell me-2"></i>Уведомления и приложение</span>
                <i class="bi bi-chevron-right text-muted small"></i>
              </a>
              <a routerLink="/settings/location" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                <span><i class="bi bi-geo-alt me-2"></i>Моё местоположение</span>
                <i class="bi bi-chevron-right text-muted small"></i>
              </a>
              <a routerLink="/settings/feedback" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                <span><i class="bi bi-chat-left-text me-2"></i>Обратная связь</span>
                <i class="bi bi-chevron-right text-muted small"></i>
              </a>
              <a routerLink="/settings/blocked" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                <span><i class="bi bi-slash-circle me-2"></i>Заблокированные</span>
                <span class="badge bg-secondary">{{ blockedCount }}</span>
              </a>
              <a routerLink="/settings/danger" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center text-danger">
                <span><i class="bi bi-exclamation-triangle me-2"></i>Опасная зона</span>
                <i class="bi bi-chevron-right text-muted small"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      max-width: 100%;
      min-width: 0;
    }

    .page-header {
      padding: 1rem 0;
    }

    .page-title {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, #fd297b 0%, #ff655b 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .profile-card {
      .profile-avatar-wrap {
        position: relative;
        width: 180px;
        height: 180px;
      }

      .profile-avatar {
        width: 180px;
        height: 180px;
        border-radius: 50%;
        object-fit: cover;
        display: block;
      }
    }

    .profile-actions {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .profile-actions .btn {
      width: 100%;
    }

    .status-collapse {
      border-top: 1px solid var(--border-color, #e5e7eb);
      border-bottom: 1px solid var(--border-color, #e5e7eb);
      padding: 0.75rem 0;
    }

    .status-collapse-toggle {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.5rem 0;
      border: none;
      background: transparent;
      color: var(--text-primary, #1f2937);
      font-weight: 600;
      font-size: 0.92rem;
      cursor: pointer;
      text-align: left;
    }

    .status-collapse-title {
      display: inline-flex;
      align-items: center;
    }

    .status-collapse-chevron {
      color: var(--text-muted, #6b7280);
      flex-shrink: 0;
    }

    .status-collapse-body {
      padding-top: 0.25rem;
    }

    .status-emoji-grid {
      display: grid;
      grid-template-columns: repeat(8, minmax(0, 1fr));
      gap: 0.35rem;
    }

    .status-emoji-btn {
      border: 1px solid var(--border-color);
      background: var(--bg-secondary);
      border-radius: 10px;
      font-size: 1.25rem;
      line-height: 1;
      padding: 0.35rem;
      cursor: pointer;
      transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;

      &:hover:not(:disabled) {
        transform: translateY(-1px);
        border-color: var(--accent-pink);
      }

      &.selected {
        border-color: var(--accent-pink);
        background: rgba(253, 41, 123, 0.1);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .status-position-stage {
      position: relative;
      width: 160px;
      height: 160px;
      border-radius: 50%;
      overflow: hidden;
      border: 1px solid var(--border-color);
      background: var(--bg-secondary);
      margin: 0 auto;
      cursor: grab;
      touch-action: none;
      user-select: none;

      &:active {
        cursor: grabbing;
      }
    }

    .status-position-stage-avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      pointer-events: none;
    }

    .status-saving-indicator {
      display: flex;
      align-items: center;
    }

    @media (max-width: 576px) {
      .status-emoji-grid {
        grid-template-columns: repeat(6, minmax(0, 1fr));
      }
    }

    .boost-active {
      text-align: center;
      padding: 0.5rem 0;
    }

    .boost-timer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-size: 1.5rem;
      font-weight: 700;
      color: #f59e0b;
      margin-bottom: 0.5rem;

      i {
        font-size: 1.75rem;
      }
    }

    @media (max-width: 767.98px), (hover: none) and (pointer: coarse) {
      .profile-layout {
        margin-left: 0;
        margin-right: 0;
      }

      .profile-col {
        padding-left: 0;
        padding-right: 0;
      }
    }
  `]
})
export class ProfileComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private destroyRef = inject(DestroyRef);
  readonly statusEmojis = PROFILE_STATUS_EMOJIS;
  user: UserInfo | null = null;
  photoDataUrl: string | null = null;
  blockedCount = 0;
  activeBoost: BoostInfo | null = null;
  boostActivating = false;
  sharing = false;
  statusPanelOpen = false;
  statusSaving = false;

  private statusSaveTrigger$ = new Subject<void>();
  private boostCountdownInterval: ReturnType<typeof setInterval> | null = null;
  private statusDragPointerId: number | null = null;

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private boostService: BoostService,
    private shareService: ShareService,
    private modalService: ModalService,
    private toastService: ToastService
  ) {
    this.destroyRef.onDestroy(() => {
      this.destroy$.next();
      if (this.boostCountdownInterval) {
        clearInterval(this.boostCountdownInterval);
      }
    });
  }

  ngOnInit(): void {
    this.setupStatusAutoSave();
    this.loadProfile();
    this.loadBlockedCount();
    this.loadActiveBoost();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    UserService.revokePhotoUrl(this.photoDataUrl);
  }

  private loadBlockedCount(): void {
    this.userService.getBlockedCount().pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ count }) => {
        this.blockedCount = count;
      },
      error: () => {
        this.blockedCount = 0;
      }
    });
  }

  private loadProfile(): void {
    this.userService.getCurrentUser().pipe(takeUntil(this.destroy$)).subscribe({
      next: (user: UserInfo) => {
        this.user = {
          ...user,
          statusEmoji: user.statusEmoji ?? null,
          statusPosition: user.statusEmoji
            ? normalizeUserStatusPosition(user.statusPosition)
            : null,
        };
        this.loadPhoto();
      }
    });
  }

  toggleStatusPanel(): void {
    this.statusPanelOpen = !this.statusPanelOpen;
  }

  selectStatusEmoji(emoji: string): void {
    if (!this.user) return;
    if (this.user.statusEmoji === emoji) {
      this.clearStatusEmoji();
      return;
    }
    this.user = {
      ...this.user,
      statusEmoji: emoji,
      statusPosition: this.user.statusPosition || DEFAULT_USER_STATUS_POSITION,
    };
    this.saveStatus();
  }

  clearStatusEmoji(): void {
    if (!this.user?.statusEmoji) return;
    this.user = {
      ...this.user,
      statusEmoji: null,
      statusPosition: null,
    };
    this.saveStatus();
  }

  onStatusStagePointerDown(event: PointerEvent): void {
    if (!this.user?.statusEmoji || this.statusSaving) return;
    const target = event.currentTarget as HTMLElement | null;
    if (!target) return;
    this.statusDragPointerId = event.pointerId;
    target.setPointerCapture(event.pointerId);
    this.updateStatusPositionFromPointer(event, target, false);
  }

  onStatusStagePointerMove(event: PointerEvent): void {
    if (this.statusDragPointerId !== event.pointerId) return;
    const target = event.currentTarget as HTMLElement | null;
    if (!target) return;
    this.updateStatusPositionFromPointer(event, target, false);
  }

  onStatusStagePointerUp(event: PointerEvent): void {
    if (this.statusDragPointerId !== event.pointerId) return;
    const target = event.currentTarget as HTMLElement | null;
    if (!target) return;
    this.updateStatusPositionFromPointer(event, target, true);
    target.releasePointerCapture(event.pointerId);
    this.statusDragPointerId = null;
  }

  onStatusStagePointerCancel(event: PointerEvent): void {
    if (this.statusDragPointerId !== event.pointerId) return;
    const target = event.currentTarget as HTMLElement | null;
    if (target?.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
    const shouldSave = this.statusDragPointerId != null;
    this.statusDragPointerId = null;
    if (shouldSave) {
      this.saveStatus();
    }
  }

  private updateStatusPositionFromPointer(event: PointerEvent, target: HTMLElement, saveAfterMove: boolean): void {
    if (!this.user?.statusEmoji) return;
    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.round(((event.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((event.clientY - rect.top) / rect.height) * 100);
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));
    const nextPosition = `CUSTOM:${clampedX}:${clampedY}`;
    if (this.user.statusPosition !== nextPosition) {
      this.user = {
        ...this.user,
        statusPosition: nextPosition,
      };
    }
    if (saveAfterMove) {
      this.saveStatus();
    }
  }

  private saveStatus(): void {
    this.statusSaveTrigger$.next();
  }

  private setupStatusAutoSave(): void {
    this.statusSaveTrigger$.pipe(
      switchMap(() => {
        if (!this.user) {
          return EMPTY;
        }
        this.statusSaving = true;
        return this.userService.updateUser({
          statusEmoji: this.user.statusEmoji || '',
          ...(this.user.statusEmoji
            ? { statusPosition: this.user.statusPosition || DEFAULT_USER_STATUS_POSITION }
            : {}),
        }).pipe(
          catchError(() => {
            this.statusSaving = false;
            this.toastService.error('Не удалось сохранить статус');
            this.loadProfile();
            return EMPTY;
          })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe((user) => {
      this.user = {
        ...this.user,
        ...user,
        statusEmoji: user.statusEmoji ?? null,
        statusPosition: user.statusEmoji
          ? normalizeUserStatusPosition(user.statusPosition)
          : null,
      };
      this.statusSaving = false;
    });
  }

  private loadPhoto(): void {
    const userId = this.user?.id;
    if (!userId) {
      this.photoDataUrl = null;
      return;
    }

    this.userService.resolveProfilePhotoUrl(userId, undefined, photoSizeForLargeDisplay()).pipe(takeUntil(this.destroy$)).subscribe({
      next: (url) => {
        UserService.revokePhotoUrl(this.photoDataUrl);
        this.photoDataUrl = url;
      },
      error: () => {
        UserService.revokePhotoUrl(this.photoDataUrl);
        this.photoDataUrl = null;
      }
    });
  }

  getBirthday(): string {
    if (!this.user?.birthday) return '';
    return new Date(this.user.birthday).toLocaleDateString('ru-RU');
  }

  getGenderText(): string {
    return this.user?.gender === Gender.MAN ? 'Мужской' : 'Женский';
  }

  private loadActiveBoost(): void {
    this.boostService.getCurrentBoost().pipe(takeUntil(this.destroy$)).subscribe({
      next: (boost) => {
        this.activeBoost = boost;
        if (boost) {
          this.startBoostCountdown();
        }
      },
      error: () => {
        this.activeBoost = null;
      }
    });
  }

  activateBoost(): void {
    this.boostActivating = true;
    this.boostService.activateBoost().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.boostActivating = false;
        if (response.success) {
          this.loadActiveBoost();
        }
      },
      error: () => {
        this.boostActivating = false;
      }
    });
  }

  async shareProfile(): Promise<void> {
    if (!this.user?.id || this.sharing) {
      return;
    }
    this.sharing = true;
    try {
      const result = await this.shareService.shareProfile(this.user.id, this.user.name || 'Профиль');
      if (result === 'copied') {
        await this.modalService.alert('Ссылка на профиль скопирована в буфер обмена');
      } else if (result === 'failed') {
        await this.modalService.alert('Не удалось поделиться профилем. Попробуйте ещё раз.');
      }
    } finally {
      this.sharing = false;
    }
  }

  getBoostCountdown(): string {
    if (!this.activeBoost) return '';
    const now = Date.now();
    const remaining = this.activeBoost.expiresAt - now;
    if (remaining <= 0) return 'Закончился';
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${hours}ч ${minutes}м ${seconds}с`;
  }

  private startBoostCountdown(): void {
    if (this.boostCountdownInterval) {
      clearInterval(this.boostCountdownInterval);
    }
    this.boostCountdownInterval = setInterval(() => {
      if (this.activeBoost && Date.now() >= this.activeBoost.expiresAt) {
        this.activeBoost = null;
        if (this.boostCountdownInterval) {
          clearInterval(this.boostCountdownInterval);
        }
        this.boostCountdownInterval = null;
      }
    }, 1000);
  }
}
