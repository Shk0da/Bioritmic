import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MeetingsService } from '../../core/services/meetings.service';
import { UserService } from '../../core/services/user.service';
import { UserMeeting, PageableRequest } from '../../core/models/user.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-meetings',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="card">
      <div class="card-header">
        <h5 class="mb-0">Встречи</h5>
      </div>
      <div class="card-body">
        @if (loading) {
          <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Загрузка...</span>
            </div>
          </div>
        } @else if (meetings.length === 0) {
          <div class="alert alert-info">
            У вас пока нет предложений встреч
          </div>
        } @else {
          <div class="row">
            @for (meeting of meetings; track meeting.id) {
              <div class="col-md-6 mb-3">
                <div class="card meeting-card">
                  <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                      <div>
                        <h6 class="card-title">Пользователь #{{ meeting.userId }}</h6>
                        <p class="card-text small text-muted">
                          Координаты: {{ meeting.lat }}, {{ meeting.lon }}
                        </p>
                        <p class="card-text small text-muted">
                          Расстояние: {{ meeting.distance }} км
                        </p>
                      </div>
                    </div>

                    <a [routerLink]="['/user', meeting.userId]" class="btn btn-outline-primary btn-sm mt-2">
                      Посмотреть профиль
                    </a>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class MeetingsComponent implements OnInit {
  meetings: UserMeeting[] = [];
  loading = false;
  pageable: PageableRequest = { page: 0, size: 20 };

  constructor(
    private meetingsService: MeetingsService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadMeetings();
  }

  private loadMeetings(): void {
    this.loading = true;
    this.meetingsService.getMeetings(this.pageable).subscribe({
      next: (meetings) => {
        this.meetings = meetings;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  deleteMeeting(userId: number): void {
    this.meetingsService.deleteMeeting(userId).subscribe({
      next: () => {
        this.loadMeetings();
      },
      error: () => {
        alert('Ошибка удаления встречи');
      }
    });
  }
}
