import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MeetingsService } from '../../core/services/meetings.service';
import { UserService } from '../../core/services/user.service';
import { UserMeeting, PageableRequest, UserInfo, Timestamp } from '../../core/models/user.model';
import { ModalService } from '../../core/services/modal.service';
import { ToastService } from '../../core/services/toast.service';
import { Subject, takeUntil } from 'rxjs';

interface MeetingWithUser extends UserMeeting {
  userName?: string;
  userPhotoUrl?: string | null;
  isDeclining?: boolean;
  isAccepting?: boolean;
}

@Component({
  selector: 'app-meetings',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-header mb-4">
      <h1 class="page-title">
        <i class="bi bi-calendar-event me-2"></i>Встречи
      </h1>
      <p class="text-muted page-subtitle d-none d-md-block">Предложения встреч от других пользователей</p>
    </div>

    @if (loading) {
      <div class="card">
        <div class="card-body text-center py-5">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Загрузка...</span>
          </div>
        </div>
      </div>
    } @else if (meetings.length === 0) {
      <div class="card empty-state">
        <div class="card-body text-center py-5">
          <i class="bi bi-calendar-x display-1 text-muted mb-3"></i>
          <h4 class="text-muted">Пока нет встреч</h4>
          <p class="text-muted">Предложения встреч появятся, когда кто-то предложит вам встречу</p>
          <a routerLink="/swipe" class="btn btn-primary mt-3">
            <i class="bi bi-people me-2"></i>К поиску
          </a>
        </div>
      </div>
    } @else {
      @if (acceptedOutgoingMeetings.length > 0) {
        <div class="accepted-meetings mb-4">
          @for (meeting of acceptedOutgoingMeetings; track meeting.userId) {
            <div class="accepted-meeting-banner">
              <div class="accepted-meeting-icon">
                <i class="bi bi-check-circle-fill"></i>
              </div>
              <img
                [src]="meeting.userPhotoUrl || 'assets/img/default-avatar.svg'"
                class="rounded-circle accepted-meeting-photo"
                [alt]="meeting.userName || 'User'">
              <div class="accepted-meeting-content flex-grow-1">
                <div class="accepted-meeting-title">Встреча принята!</div>
                <p class="accepted-meeting-text mb-1">
                  <strong>{{ meeting.userName || 'Пользователь' }}</strong> принял(а) ваше предложение встречи.
                </p>
                <p class="accepted-meeting-meta mb-0">
                  @if (meeting.description) {
                    <span class="d-block mb-1">
                      <i class="bi bi-geo-alt me-1"></i>{{ meeting.description }}
                    </span>
                  }
                  <span class="d-block">
                    <i class="bi bi-calendar-event me-1"></i>{{ formatMeetingDateTime(meeting.scheduledAt) }}
                  </span>
                </p>
              </div>
              <div class="accepted-meeting-actions d-flex gap-2">
                <a [routerLink]="['/user', meeting.userId]" class="btn btn-outline-success btn-sm">
                  <i class="bi bi-person me-1"></i>Профиль
                </a>
                <a [routerLink]="['/mailbox', meeting.userId]" class="btn btn-success btn-sm">
                  <i class="bi bi-chat-heart me-1"></i>Написать
                </a>
              </div>
            </div>
          }
        </div>
      }

      @if (acceptedIncomingMeetings.length > 0) {
        <div class="accepted-meetings mb-4">
          @for (meeting of acceptedIncomingMeetings; track meeting.userId) {
            <div class="accepted-meeting-banner accepted-meeting-banner-incoming">
              <div class="accepted-meeting-icon">
                <i class="bi bi-check-circle-fill"></i>
              </div>
              <img
                [src]="meeting.userPhotoUrl || 'assets/img/default-avatar.svg'"
                class="rounded-circle accepted-meeting-photo"
                [alt]="meeting.userName || 'User'">
              <div class="accepted-meeting-content flex-grow-1">
                <div class="accepted-meeting-title">Встреча подтверждена</div>
                <p class="accepted-meeting-text mb-1">
                  Вы приняли предложение встречи от <strong>{{ meeting.userName || 'пользователя' }}</strong>.
                </p>
                <p class="accepted-meeting-meta mb-0">
                  @if (meeting.description) {
                    <span class="d-block mb-1">
                      <i class="bi bi-geo-alt me-1"></i>{{ meeting.description }}
                    </span>
                  }
                  <span class="d-block">
                    <i class="bi bi-calendar-event me-1"></i>{{ formatMeetingDateTime(meeting.scheduledAt) }}
                  </span>
                </p>
              </div>
              <div class="accepted-meeting-actions d-flex gap-2">
                <a [routerLink]="['/user', meeting.userId]" class="btn btn-outline-success btn-sm">
                  <i class="bi bi-person me-1"></i>Профиль
                </a>
                <a [routerLink]="['/mailbox', meeting.userId]" class="btn btn-success btn-sm">
                  <i class="bi bi-chat-heart me-1"></i>Написать
                </a>
              </div>
            </div>
          }
        </div>
      }

      @if (pendingIncomingMeetings.length === 0 && acceptedOutgoingMeetings.length > 0 && acceptedIncomingMeetings.length === 0) {
        <p class="text-muted mb-4">Новых предложений встреч пока нет</p>
      }

      <div class="meetings-list">
        @for (meeting of pendingIncomingMeetings; track meeting.userId) {
          <div class="meeting-card-wrap">
            <div class="card meeting-card">
              <div class="card-body meeting-card-body">
                <div class="meeting-header">
                  <img
                    [src]="meeting.userPhotoUrl || 'assets/img/default-avatar.svg'"
                    class="rounded-circle meeting-user-photo"
                    [alt]="meeting.userName || 'User'">
                  <div class="meeting-header-main">
                    <div class="meeting-title-row">
                      <h6 class="card-title mb-0">
                        {{ meeting.userName || 'Пользователь #' + meeting.userId }}
                      </h6>
                      <span class="badge bg-warning">Ожидает ответа</span>
                    </div>
                    <div class="meeting-details">
                      @if (meeting.description) {
                        <p class="small text-muted mb-1">
                          <i class="bi bi-geo-alt me-1"></i>
                          <strong>{{ meeting.description }}</strong>
                        </p>
                      }
                      <p class="small text-muted mb-0">
                        <i class="bi bi-calendar-event me-1"></i>
                        {{ formatMeetingDateTime(meeting.scheduledAt) }}
                      </p>
                    </div>
                  </div>
                </div>
                <div class="meeting-actions">
                  <a [routerLink]="['/user', meeting.userId]" class="btn btn-outline-primary btn-sm">
                    <i class="bi bi-person me-1"></i>Профиль
                  </a>
                  <button
                    class="btn btn-outline-success btn-sm"
                    (click)="acceptMeeting(meeting)"
                    [disabled]="meeting.isAccepting || meeting.isDeclining"
                    title="Принять">
                    @if (meeting.isAccepting) {
                      <span class="spinner-border spinner-border-sm me-1"></span>
                    } @else {
                      <i class="bi bi-check-lg me-1"></i>
                    }
                    Принять
                  </button>
                  <button
                    class="btn btn-outline-danger btn-sm"
                    (click)="declineMeeting(meeting)"
                    [disabled]="meeting.isDeclining || meeting.isAccepting"
                    title="Отказаться">
                    @if (meeting.isDeclining) {
                      <span class="spinner-border spinner-border-sm me-1"></span>
                    } @else {
                      <i class="bi bi-x-lg me-1"></i>
                    }
                    Отказаться
                  </button>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
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
      background: linear-gradient(135deg, #fd297b 0%, #ff655b 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .empty-state {
      max-width: 500px;
      margin: 2rem auto;
    }

    .meetings-list {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
      min-width: 0;
    }

    @media (min-width: 768px) {
      .meetings-list {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    .meeting-card-wrap {
      min-width: 0;
    }

    .meeting-card {
      transition: box-shadow 0.3s ease;
      overflow: hidden;

      @media (hover: hover) {
        &:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
      }
    }

    .meeting-card-body {
      min-width: 0;
    }

    .meeting-header {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      min-width: 0;
    }

    .meeting-header-main {
      flex: 1;
      min-width: 0;
    }

    .meeting-title-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.35rem 0.5rem;
      margin-bottom: 0.5rem;
    }

    .meeting-title-row .card-title {
      min-width: 0;
      word-break: break-word;
    }

    .meeting-user-photo {
      width: 56px;
      height: 56px;
      object-fit: cover;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      flex-shrink: 0;
    }

    .meeting-details {
      background: rgba(253, 41, 123, 0.03);
      padding: 0.75rem;
      border-radius: 8px;
    }

    .meeting-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.875rem;
    }

    .meeting-actions .btn {
      flex: 1 1 auto;
      min-width: 0;
      white-space: nowrap;
    }

    .accepted-meeting-banner {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.25rem;
      margin-bottom: 1rem;
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%);
      border: 1px solid rgba(34, 197, 94, 0.25);
      box-shadow: 0 4px 16px rgba(34, 197, 94, 0.08);
    }

    .accepted-meeting-icon {
      color: #22c55e;
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .accepted-meeting-photo {
      width: 52px;
      height: 52px;
      object-fit: cover;
      border: 2px solid #22c55e;
      flex-shrink: 0;
    }

    .accepted-meeting-title {
      font-weight: 700;
      color: #15803d;
      margin-bottom: 0.25rem;
    }

    .accepted-meeting-text,
    .accepted-meeting-meta {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    @media (max-width: 768px) {
      .page-header {
        padding: 0.25rem 0;
      }

      .page-title {
        font-size: 1.45rem;
      }

      .accepted-meeting-banner {
        flex-wrap: wrap;
        padding: 0.875rem 1rem;
        gap: 0.75rem;
      }

      .accepted-meeting-actions {
        width: 100%;
        flex-direction: column;
      }

      .accepted-meeting-actions .btn {
        width: 100%;
        justify-content: center;
      }

      .meeting-user-photo {
        width: 48px;
        height: 48px;
      }

      .meeting-actions {
        flex-direction: column;
      }

      .meeting-actions .btn {
        width: 100%;
        justify-content: center;
      }
    }

  `]
})
export class MeetingsComponent implements OnInit, OnDestroy {
  meetings: MeetingWithUser[] = [];
  loading = false;
  pageable: PageableRequest = { page: 0, size: 20 };
  private destroy$ = new Subject<void>();

  get incomingMeetings(): MeetingWithUser[] {
    return this.meetings.filter((meeting) => !meeting.outgoing);
  }

  get pendingIncomingMeetings(): MeetingWithUser[] {
    return this.incomingMeetings.filter((meeting) => {
      const status = meeting.status ?? 'PENDING';
      return status !== 'DECLINED' && status !== 'ACCEPTED';
    });
  }

  get acceptedIncomingMeetings(): MeetingWithUser[] {
    return this.incomingMeetings.filter((meeting) => (meeting.status ?? 'PENDING') === 'ACCEPTED');
  }

  get acceptedOutgoingMeetings(): MeetingWithUser[] {
    return this.meetings.filter((meeting) => meeting.outgoing && meeting.status === 'ACCEPTED');
  }

  constructor(
    private meetingsService: MeetingsService,
    private userService: UserService,
    private modalService: ModalService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadMeetings();
    localStorage.setItem('meetings_last_read', Date.now().toString());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.meetings.forEach(m => UserService.revokePhotoUrl(m.userPhotoUrl));
  }

  private loadMeetings(silent = false): void {
    if (!silent) {
      this.loading = true;
    }
    this.meetingsService.getMeetings(this.pageable).pipe(takeUntil(this.destroy$)).subscribe({
      next: (meetings) => {
        this.meetings.forEach(m => UserService.revokePhotoUrl(m.userPhotoUrl));
        this.meetings = meetings;
        this.loadUserData();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private loadUserData(): void {
    this.meetings.forEach(meeting => {
      if (meeting.userId) {
        this.userService.getUserById(meeting.userId).pipe(takeUntil(this.destroy$)).subscribe({
          next: (user: UserInfo) => {
            meeting.userName = user.name;
            this.loadUserPhoto(meeting.userId!, meeting);
          },
          error: () => {
            meeting.userName = 'Пользователь #' + meeting.userId;
          }
        });
      }
    });
  }

  private loadUserPhoto(userId: string, meeting: MeetingWithUser): void {
    this.userService.getPhoto(userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (bytes: Uint8Array) => {
        UserService.revokePhotoUrl(meeting.userPhotoUrl);
        meeting.userPhotoUrl = UserService.createPhotoUrl(bytes);
      },
      error: () => {
        meeting.userPhotoUrl = null;
      }
    });
  }

  deleteMeeting(userId: string): void {
    this.meetingsService.deleteMeeting(userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.loadMeetings();
      },
      error: () => {
        this.toastService.error('Ошибка удаления встречи');
      }
    });
  }

  acceptMeeting(meeting: MeetingWithUser): void {
    if (meeting.isAccepting || meeting.isDeclining) {
      return;
    }
    meeting.isAccepting = true;
    this.meetingsService.acceptMeeting(meeting.userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        meeting.isAccepting = false;
        meeting.status = 'ACCEPTED';
        this.toastService.success('Встреча принята!');
        this.loadMeetings(true);
      },
      error: () => {
        meeting.isAccepting = false;
        this.toastService.error('Ошибка принятия встречи');
      }
    });
  }

  async declineMeeting(meeting: MeetingWithUser): Promise<void> {
    const confirmed = await this.modalService.confirm(
      `Отказать ${meeting.userName || 'пользователю'} во встрече?`,
      'Отказ от встречи'
    );
    if (!confirmed) return;

    meeting.isDeclining = true;
    this.meetingsService.declineMeeting(meeting.userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        meeting.isDeclining = false;
        meeting.status = 'DECLINED';
        this.toastService.success('Вы отказались от встречи. Пользователь уведомлён.');
        this.loadMeetings(true);
      },
      error: () => {
        meeting.isDeclining = false;
        this.toastService.error('Ошибка отказа от встречи');
      }
    });
  }

  formatMeetingDateTime(timestamp?: Timestamp | string): string {
    const ms = this.toTimestampMs(timestamp);
    if (!ms) {
      return 'Время не указано';
    }
    return new Date(ms).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private toTimestampMs(timestamp?: Timestamp | string): number {
    if (!timestamp) {
      return 0;
    }
    if (typeof timestamp === 'string') {
      const ms = Date.parse(timestamp);
      return Number.isFinite(ms) ? ms : 0;
    }
    if (typeof timestamp !== 'object') {
      return 0;
    }
    const ts = timestamp as { seconds?: number; time?: number };
    return ts.time || (ts.seconds ? ts.seconds * 1000 : 0);
  }
}
