import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MeetingsService } from '../../core/services/meetings.service';
import { UserService } from '../../core/services/user.service';
import { UserMeeting, PageableRequest, UserInfo } from '../../core/models/user.model';
import { ModalService } from '../../core/services/modal.service';
import { ToastService } from '../../core/services/toast.service';
import { NgClass } from '@angular/common';

interface MeetingWithUser extends UserMeeting {
  userName?: string;
  userPhotoUrl?: string | null;
  isDeclining?: boolean;
  isAccepting?: boolean;
}

@Component({
  selector: 'app-meetings',
  standalone: true,
  imports: [RouterLink, NgClass],
  template: `
    <div class="page-header mb-4">
      <h1 class="page-title">
        <i class="bi bi-calendar-event me-2"></i>Встречи
      </h1>
      <p class="text-muted">Предложения встреч рядом с вами</p>
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
      <div class="row">
        @for (meeting of meetings; track meeting.userId) {
          @if (meeting.status !== 'DECLINED') {
          <div class="col-12 col-md-6 mb-4">
            <div class="card meeting-card h-100">
              <div class="card-body">
                <div class="d-flex align-items-start">
                  <img
                    [src]="meeting.userPhotoUrl || ''"
                    class="rounded-circle me-3 meeting-user-photo"
                    [alt]="meeting.userName || 'User'">
                  <div class="flex-grow-1">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                      <h6 class="card-title mb-0">
                        {{ meeting.userName || 'Пользователь #' + meeting.userId }}
                      </h6>
                      @if (meeting.status) {
                        <span class="badge" [ngClass]="{
                          'bg-warning': meeting.status === 'PENDING',
                          'bg-success': meeting.status === 'ACCEPTED'
                        }">
                          @if (meeting.status === 'ACCEPTED') { Принято }
                          @if (meeting.status === 'PENDING') { Ожидает }
                        </span>
                      }
                    </div>
                    <div class="meeting-details mb-3">
                      <p class="small text-muted mb-0">
                        <i class="bi bi-signpost-2 me-1"></i>
                        Расстояние: <strong>{{ meeting.distance.toFixed(1) }} км</strong>
                      </p>
                    </div>
                    <div class="d-flex gap-2">
                      <a [routerLink]="['/user', meeting.userId]" class="btn btn-outline-primary btn-sm">
                        <i class="bi bi-person me-1"></i>Профиль
                      </a>
                      <button
                        class="btn btn-outline-success btn-sm"
                        (click)="acceptMeeting(meeting)"
                        [disabled]="meeting.status !== 'PENDING' || meeting.isAccepting"
                        title="Принять">
                        <i class="bi bi-check-lg me-1"></i>Принять
                      </button>
                      <button
                        class="btn btn-outline-danger btn-sm"
                        (click)="declineMeeting(meeting)"
                        [disabled]="!includesStatus(meeting.status) || meeting.isDeclining"
                        title="Отказаться">
                        @if (meeting.isDeclining) {
                          <span class="spinner-border spinner-border-sm"></span>
                        } @else {
                          <i class="bi bi-x-lg me-1"></i>Отказаться
                        }
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          }
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

    .meeting-card {
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-3px);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      }
    }

    .meeting-user-photo {
      width: 60px;
      height: 60px;
      object-fit: cover;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .meeting-details {
      background: rgba(253, 41, 123, 0.03);
      padding: 0.75rem;
      border-radius: 8px;
      margin-bottom: 1rem;
    }
  `]
})
export class MeetingsComponent implements OnInit {
  meetings: MeetingWithUser[] = [];
  loading = false;
  pageable: PageableRequest = { page: 0, size: 20 };

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

  includesStatus(status: string | undefined): boolean {
    return status === 'PENDING' || status === 'ACCEPTED';
  }

  private loadMeetings(): void {
    this.loading = true;
    this.meetingsService.getMeetings(this.pageable).subscribe({
      next: (meetings) => {
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
        this.userService.getUserById(meeting.userId).subscribe({
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
    this.userService.getPhoto(userId).subscribe({
      next: (bytes: Uint8Array) => {
        meeting.userPhotoUrl = this.bytesToDataUrl(bytes);
      },
      error: () => {
        meeting.userPhotoUrl = null;
      }
    });
  }

  private bytesToDataUrl(bytes: Uint8Array): string {
    const base64 = this.uint8ArrayToBase64(bytes);
    return `data:image/jpeg;base64,${base64}`;
  }

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  deleteMeeting(userId: string): void {
    this.meetingsService.deleteMeeting(userId).subscribe({
      next: () => {
        this.loadMeetings();
      },
      error: () => {
        this.toastService.error('Ошибка удаления встречи');
      }
    });
  }

  acceptMeeting(meeting: MeetingWithUser): void {
    meeting.isAccepting = true;
    this.meetingsService.acceptMeeting(meeting.userId).subscribe({
      next: () => {
        meeting.isAccepting = false;
        meeting.status = 'ACCEPTED';
        this.toastService.success('Встреча принята!');
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
    this.meetingsService.declineMeeting(meeting.userId).subscribe({
      next: () => {
        meeting.isDeclining = false;
        meeting.status = 'DECLINED';
        this.toastService.success('Вы отказались от встречи. Пользователь уведомлён.');
      },
      error: () => {
        meeting.isDeclining = false;
        this.toastService.error('Ошибка отказа от встречи');
      }
    });
  }
}
