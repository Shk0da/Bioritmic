import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { UserService } from '../../core/services/user.service';
import { BookmarksService } from '../../core/services/bookmarks.service';
import { MailboxService } from '../../core/services/mailbox.service';
import { MeetingsService } from '../../core/services/meetings.service';
import { UserInfo, Gender, UserMail, UserMeeting } from '../../core/models/user.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [RouterLink, FormsModule, NgClass],
  template: `
    @if (loading) {
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Загрузка...</span>
        </div>
      </div>
    } @else if (user) {
      <div class="row">
        <div class="col-md-4">
          <div class="card">
            <img
              [src]="photoDataUrl || user.image || 'assets/default-avatar.png'"
              class="card-img-top profile-avatar mx-auto mt-3"
              [alt]="user.name">
            <div class="card-body text-center">
              <h4 class="card-title">{{ user.name }}</h4>
              <p class="text-muted">{{ user.age || (user.birthday ? getAge(user.birthday) : 'N/A') }} лет</p>
            </div>
          </div>

          <div class="card mt-3">
            <div class="card-body">
              <div class="d-grid gap-2">
                <button class="btn btn-primary" (click)="sendMeetingRequest()">
                  Предложить встречу
                </button>
                <button class="btn btn-outline-primary" (click)="toggleBookmark()">
                  {{ isBookmarked ? 'Удалить из закладок' : 'В закладки' }}
                </button>
                <button class="btn btn-outline-secondary" (click)="showMessageForm = !showMessageForm">
                  Написать сообщение
                </button>
                <button class="btn" [ngClass]="isBlocked ? 'btn-outline-success' : 'btn-outline-danger'" (click)="toggleBlockUser()">
                  {{ isBlocked ? 'Разблокировать' : 'Заблокировать' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-8">
          <div class="card">
            <div class="card-header">
              <h5 class="mb-0">Информация</h5>
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="text-muted small">Пол</label>
                  <p>{{ getGenderText() }}</p>
                </div>
                <div class="col-md-6 mb-3">
                  <label class="text-muted small">Дата рождения</label>
                  <p>{{ getBirthday() }}</p>
                </div>
              </div>

              <hr>

              @if (user.isBioCompatible !== undefined || user.isHoroCompatible !== undefined || user.isFullCompatible !== undefined) {
                <div class="mb-3">
                  <label class="text-muted small">Совместимость</label>
                  <div>
                    @if (user.isBioCompatible !== undefined) {
                      <span class="badge me-2" [ngClass]="user.isBioCompatible ? 'bg-success' : 'bg-danger'">
                        Био: {{ user.isBioCompatible ? 'Да' : 'Нет' }}
                      </span>
                    }
                    @if (user.isHoroCompatible !== undefined) {
                      <span class="badge me-2" [ngClass]="user.isHoroCompatible ? 'bg-success' : 'bg-danger'">
                        Гороскоп: {{ user.isHoroCompatible ? 'Да' : 'Нет' }}
                      </span>
                    }
                    @if (user.isFullCompatible !== undefined) {
                      <span class="badge" [ngClass]="user.isFullCompatible ? 'bg-success' : 'bg-danger'">
                        Полная: {{ user.isFullCompatible ? 'Да' : 'Нет' }}
                      </span>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          @if (showMessageForm) {
            <div class="card mt-3">
              <div class="card-header">
                <h5 class="mb-0">Написать сообщение</h5>
              </div>
              <div class="card-body">
                <form (ngSubmit)="sendMessage()">
                  <div class="mb-3">
                    <label for="message" class="form-label">Сообщение</label>
                    <textarea
                      class="form-control"
                      id="message"
                      [(ngModel)]="messageText"
                      name="message"
                      rows="4"
                      required></textarea>
                  </div>
                  <div class="d-flex justify-content-between">
                    <button type="button" class="btn btn-outline-secondary" (click)="showMessageForm = false">
                      Отмена
                    </button>
                    <button type="submit" class="btn btn-primary" [disabled]="!messageText">
                      Отправить
                    </button>
                  </div>
                </form>
              </div>
            </div>
          }
        </div>
      </div>
    }
  `
})
export class UserDetailComponent implements OnInit {
  @Input() id?: string;
  user: UserInfo | null = null;
  photoDataUrl: SafeUrl | null = null;
  loading = true;
  isBookmarked = false;
  isBlocked = false;
  showMessageForm = false;
  messageText = '';

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private bookmarksService: BookmarksService,
    private mailboxService: MailboxService,
    private meetingsService: MeetingsService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('id');
    if (userId) {
      this.loadUser(parseInt(userId, 10));
    }
  }

  private loadUser(userId: number): void {
    this.userService.getUserById(userId).subscribe({
      next: (user) => {
        this.user = user;
        this.loadPhoto(userId);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private loadPhoto(userId: number): void {
    this.userService.getPhoto(userId).subscribe({
      next: (bytes: Uint8Array) => {
        this.photoDataUrl = this.bytesToDataUrl(bytes);
      },
      error: () => {
        this.photoDataUrl = null;
      }
    });
  }

  private bytesToDataUrl(bytes: Uint8Array): SafeUrl {
    const base64 = this.uint8ArrayToBase64(bytes);
    const dataUrl = `data:image/jpeg;base64,${base64}`;
    return this.sanitizer.bypassSecurityTrustUrl(dataUrl);
  }

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  getAge(birthdate: string): number {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  getBirthday(): string {
    if (!this.user?.birthday) return '';
    return new Date(this.user.birthday).toLocaleDateString('ru-RU');
  }

  getGenderText(): string {
    return this.user?.gender === Gender.MAN ? 'Мужской' : 'Женский';
  }

  toggleBookmark(): void {
    if (!this.user?.id) return;

    if (this.isBookmarked) {
      this.bookmarksService.deleteBookmark(this.user.id).subscribe({
        next: () => {
          this.isBookmarked = false;
        }
      });
    } else {
      this.bookmarksService.addBookmark({ userId: this.user.id }).subscribe({
        next: () => {
          this.isBookmarked = true;
        }
      });
    }
  }

  sendMeetingRequest(): void {
    if (!this.user?.id) return;

    const meeting: UserMeeting = {
      userId: this.user.id,
      lat: this.user.lat || 0,
      lon: this.user.lon || 0,
      distance: this.user.distance || 1
    };

    this.meetingsService.createMeeting(meeting).subscribe({
      next: () => {
        alert('Предложение встречи отправлено!');
      },
      error: () => {
        alert('Ошибка отправки предложения встречи');
      }
    });
  }

  sendMessage(): void {
    if (!this.user?.id || !this.messageText) return;

    const mail: UserMail = {
      to: this.user.id,
      message: this.messageText
    };

    this.mailboxService.sendMail(mail).subscribe({
      next: () => {
        alert('Сообщение отправлено!');
        this.showMessageForm = false;
        this.messageText = '';
      },
      error: () => {
        alert('Ошибка отправки сообщения');
      }
    });
  }

  toggleBlockUser(): void {
    if (!this.user?.id) return;

    if (this.isBlocked) {
      // Unblock
      this.userService.unblockUser(this.user.id).subscribe({
        next: () => {
          this.isBlocked = false;
          alert('Пользователь разблокирован');
        },
        error: () => {
          alert('Ошибка разблокировки пользователя');
        }
      });
    } else {
      // Block
      if (confirm('Вы уверены, что хотите заблокировать этого пользователя?')) {
        this.userService.blockUser(this.user.id).subscribe({
          next: () => {
            this.isBlocked = true;
            alert('Пользователь заблокирован');
          },
          error: () => {
            alert('Ошибка блокировки пользователя');
          }
        });
      }
    }
  }
}
