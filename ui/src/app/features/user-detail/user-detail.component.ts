import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgClass, NgStyle } from '@angular/common';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { UserService } from '../../core/services/user.service';
import { BookmarksService } from '../../core/services/bookmarks.service';
import { MailboxService } from '../../core/services/mailbox.service';
import { MeetingsService } from '../../core/services/meetings.service';
import { UserInfo, Gender, UserMeeting } from '../../core/models/user.model';
import { FormsModule } from '@angular/forms';
import { BiorhythmDetailComponent } from '../../shared/components/biorhythm-detail/biorhythm-detail.component';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [RouterLink, NgClass, NgStyle, FormsModule, BiorhythmDetailComponent],
  template: `
    @if (loading) {
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Загрузка...</span>
        </div>
      </div>
    } @else if (error) {
      <div class="alert alert-danger" role="alert">
        {{ error }}
        <a routerLink="/search" class="alert-link ms-2">Вернуться к поиску</a>
      </div>
    } @else if (user) {
      <div class="row">
        <div class="col-md-4">
          <div class="card">
            <img
              [src]="photoDataUrl || user.image || ''"
              class="card-img-top profile-avatar mx-auto mt-3"
              [alt]="user.name">
            <div class="card-body text-center">
              <h4 class="card-title">{{ user.name }}</h4>
              <p class="text-muted">Возраст: {{ user.age || (user.birthday ? getAge(user.birthday) : 'N/A') }}</p>
            </div>
          </div>

          <div class="card mt-3">
            <div class="card-body">
              <div class="d-grid gap-2">
                <button class="btn btn-primary" (click)="sendMeetingRequest()">
                  Предложить встречу
                </button>
                <button class="btn btn-outline-primary" (click)="toggleBookmark()">
                  {{ isBookmarked ? 'Удалить из избранного' : 'В избранное' }}
                </button>
                <button class="btn btn-outline-secondary" (click)="openChat()">
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
                  <label class="text-muted small">Знак зодиака</label>
                  <p>{{ getZodiacSign() }}</p>
                </div>
                <div class="col-md-6 mb-3">
                  <label class="text-muted small">Возраст</label>
                  <p>{{ user.age || (user.birthday ? getAge(user.birthday) : 'N/A') }}</p>
                </div>
              </div>

              <hr>

              @if (user.isBioCompatible !== undefined || user.isHoroCompatible !== undefined || user.isFullCompatible !== undefined) {
                <div class="mb-3">
                  <label class="text-muted small">Совместимость</label>
                  <div class="compatibility-section">
                    <div class="row text-center mb-3">
                      @if (user.isBioCompatible !== undefined) {
                        <div class="col-4">
                          <div class="compatibility-score">
                            <div class="score-value" [class.text-success]="user.isBioCompatible" [class.text-danger]="!user.isBioCompatible">
                              {{ user.isBioCompatible ? '✓' : '✗' }}
                            </div>
                            <div class="score-label small text-muted">Био</div>
                          </div>
                        </div>
                      }
                      @if (user.isHoroCompatible !== undefined) {
                        <div class="col-4">
                          <div class="compatibility-score">
                            <div class="score-value" [class.text-success]="user.isHoroCompatible" [class.text-danger]="!user.isHoroCompatible">
                              {{ user.isHoroCompatible ? '✓' : '✗' }}
                            </div>
                            <div class="score-label small text-muted">Гороскоп</div>
                          </div>
                        </div>
                      }
                      @if (user.isFullCompatible !== undefined) {
                        <div class="col-4">
                          <div class="compatibility-score">
                            <div class="score-value" [class.text-success]="user.isFullCompatible" [class.text-danger]="!user.isFullCompatible">
                              {{ user.isFullCompatible ? '✓' : '✗' }}
                            </div>
                            <div class="score-label small text-muted">Полная</div>
                          </div>
                        </div>
                      }
                    </div>

                    @if (user.compare) {
                      <div class="compatibility-details">
                        <h6 class="small text-muted mb-2">Детальная совместимость</h6>
                        @for (item of getCompareDetails(); track item.name) {
                          <div class="compatibility-item mb-2">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                              <span class="small text-muted">{{ item.label }}</span>
                              <span class="small fw-bold" [class.text-success]="item.value >= 70" [class.text-warning]="item.value >= 40 && item.value < 70" [class.text-danger]="item.value < 40">
                                {{ item.value }}%
                              </span>
                            </div>
                            <div class="progress" style="height: 8px;">
                              <div
                                class="progress-bar"
                                [class.bg-success]="item.value >= 70"
                                [class.bg-warning]="item.value >= 40 && item.value < 70"
                                [class.bg-danger]="item.value < 40"
                                [ngStyle]="{ 'width.%': item.value }">
                              </div>
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>
                </div>
              }

              @if (user.id) {
                <hr>
                <div class="mb-3">
                  <label class="text-muted small">Биоритмическая совместимость</label>
                  <app-biorhythm-detail [userId]="user.id"></app-biorhythm-detail>
                </div>
              }
            </div>
          </div>
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
  error: string | null = null;
  isBookmarked = false;
  isBlocked = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
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
    } else {
      this.error = 'Пользователь не найден';
      this.loading = false;
    }
  }

  openChat(): void {
    if (this.user?.id) {
      this.router.navigate(['/mailbox/conversation', this.user.id]);
    }
  }

  private loadUser(userId: number): void {
    this.userService.getUserById(userId).subscribe({
      next: (user) => {
        this.user = user;
        this.loadPhoto(userId);
        this.loadBookmarkStatus(userId);
        this.loadBlockStatus(userId);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading user:', err);
        this.error = 'Ошибка загрузки профиля пользователя';
        this.loading = false;
      }
    });
  }

  private loadBookmarkStatus(userId: number): void {
    this.bookmarksService.getBookmarks({ page: 0, size: 100 }).subscribe({
      next: (bookmarks: UserInfo[]) => {
        this.isBookmarked = bookmarks.some(b => b.id === userId);
      },
      error: () => {
        this.isBookmarked = false;
      }
    });
  }

  private loadBlockStatus(userId: number): void {
    this.userService.getBlockedUsers({ page: 0, size: 100 }).subscribe({
      next: (blockedUsers) => {
        this.isBlocked = blockedUsers.some(u => u.id === userId);
      },
      error: () => {
        this.isBlocked = false;
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

  getZodiacSign(): string {
    // Если есть horo (порядковый номер знака), используем его
    if (this.user?.horo && this.user.horo >= 1 && this.user.horo <= 12) {
      const signs = ['Козерог', 'Водолей', 'Рыбы', 'Овен', 'Телец', 'Близнецы',
                     'Рак', 'Лев', 'Дева', 'Весы', 'Скорпион', 'Стрелец'];
      return signs[this.user.horo - 1];
    }
    
    // Fallback: вычисляем по дате рождения
    if (!this.user?.birthday) return '';
    const date = new Date(this.user.birthday);
    const day = date.getDate();
    const month = date.getMonth() + 1;

    // Границы знаков зодиака (день начала знака в каждом месяце)
    const zodiacSigns: Record<string, { day: number; sign: string }> = {
      '1': { day: 20, sign: 'Водолей' },   // 20 янв - 18 фев
      '2': { day: 19, sign: 'Рыбы' },      // 19 фев - 20 мар
      '3': { day: 21, sign: 'Овен' },      // 21 мар - 19 апр
      '4': { day: 20, sign: 'Телец' },     // 20 апр - 20 май
      '5': { day: 21, sign: 'Близнецы' },  // 21 май - 20 июн
      '6': { day: 21, sign: 'Рак' },       // 21 июн - 22 июл
      '7': { day: 23, sign: 'Лев' },       // 23 июл - 22 авг
      '8': { day: 23, sign: 'Дева' },      // 23 авг - 22 сен
      '9': { day: 23, sign: 'Весы' },      // 23 сен - 22 окт
      '10': { day: 23, sign: 'Скорпион' }, // 23 окт - 21 ноя
      '11': { day: 22, sign: 'Стрелец' },  // 22 ноя - 21 дек
      '12': { day: 22, sign: 'Козерог' }   // 22 дек - 19 янв
    };
    
    const sign = zodiacSigns[month.toString()];
    if (day >= sign.day) {
      return sign.sign;
    } else {
      // Если день меньше границы, то это предыдущий знак
      const prevMonth = month === 1 ? 12 : month - 1;
      return zodiacSigns[prevMonth.toString()]?.sign || '';
    }
  }

  getGenderText(): string {
    return this.user?.gender === Gender.MAN ? 'Мужской' : 'Женский';
  }

  getComparePercent(): number {
    if (!this.user?.compare) return 0;
    const values = Object.values(this.user.compare);
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / values.length * 100);
  }

  getCompareDetails(): Array<{ name: string; label: string; value: number }> {
    if (!this.user?.compare) return [];
    
    const labels: Record<string, string> = {
      'Creative': 'Креативность',
      'Emotional': 'Эмоциональность',
      'Heartfelt': 'Сердечность',
      'HighestChakra': 'Высшая чакра',
      'Intellectual': 'Интеллект',
      'Intuitive': 'Интуиция',
      'Physical': 'Физическая'
    };
    
    return Object.entries(this.user.compare).map(([name, value]) => ({
      name,
      label: labels[name] || name,
      value: Math.round(value)
    }));
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
