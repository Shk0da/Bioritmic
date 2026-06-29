import { Component, OnInit, OnDestroy, Input, inject, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgClass, NgStyle, NgIf, NgFor } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { UserService } from '../../core/services/user.service';
import { BookmarksService } from '../../core/services/bookmarks.service';
import { MailboxService } from '../../core/services/mailbox.service';
import { MeetingsService } from '../../core/services/meetings.service';
import { AdminService } from '../../core/services/admin.service';
import { ToastService } from '../../core/services/toast.service';
import { UserInfo, Gender, UserMeeting } from '../../core/models/user.model';
import { FormsModule } from '@angular/forms';
import { BiorhythmDetailComponent } from '../../shared/components/biorhythm-detail/biorhythm-detail.component';
import { Subject, takeUntil } from 'rxjs';
import { ModalService } from '../../core/services/modal.service';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [RouterLink, NgClass, NgStyle, NgIf, NgFor, FormsModule, BiorhythmDetailComponent],
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
        <a routerLink="/swipe" class="alert-link ms-2">Вернуться к поиску</a>
      </div>
    } @else if (user) {
      <div class="profile-detail-container">
        <!-- Hero Section -->
        <div class="profile-hero">
          <div class="hero-photo" [style.backgroundImage]="'url(' + (photoDataUrl || user.image || '') + ')'">
            <div class="hero-overlay"></div>
            @if (user.isOnline) {
              <span class="hero-online-badge">В сети</span>
            }
            <button class="hero-back-btn" (click)="goBack()">
              <i class="bi bi-arrow-left"></i>
            </button>
            <div class="hero-info">
              <h2 class="hero-name">
                {{ user.name }}
                <span class="hero-age">{{ user.age || (user.birthday ? getAge(user.birthday) : '') }}</span>
                @if (getZodiacSign()) {
                  <span class="hero-zodiac" title="{{ getZodiacSign() }}">{{ getZodiacEmoji() }}</span>
                }
              </h2>
              @if (user.distance) {
                <p class="hero-distance">
                  <i class="bi bi-geo-alt"></i> {{ user.distance.toFixed(1) }} км от вас
                </p>
              }
            </div>
          </div>

          <!-- Compatibility Section -->
          @if (user.compare) {
            <div class="compatibility-section">
              <h6 class="section-label">Совместимость</h6>
              <div class="compat-bars">
                @for (item of getCompareDetails(); track item.name) {
                  <div class="compat-row">
                    <span class="compat-label">{{ item.label }}</span>
                    <div class="compat-track">
                      <div class="compat-fill" [ngStyle]="{ 'width.%': item.value }"
                           [class.high]="item.value >= 70"
                           [class.medium]="item.value >= 40 && item.value < 70"
                           [class.low]="item.value < 40"></div>
                    </div>
                    <span class="compat-value" [class.text-success]="item.value >= 70" [class.text-warning]="item.value >= 40 && item.value < 70" [class.text-danger]="item.value < 40">{{ item.value }}%</span>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Bio -->
          @if (user.bio) {
            <div class="bio-section">
              <h6 class="section-label">Обо мне</h6>
              <p class="bio-text">{{ user.bio }}</p>
            </div>
          }

          <!-- Actions -->
          @if (user.isBanned) {
            <div class="banned-notice">
              <i class="bi bi-shield-exclamation"></i>
              <span>Пользователь нарушал правила и был забанен</span>
            </div>
          } @else {
          <div class="actions-grid">
            <button class="action-btn action-message" (click)="openChat()">
              <i class="bi bi-chat-dots-fill"></i>
              <span>Написать</span>
            </button>
            @if (meetingSent) {
              <button class="action-btn action-meeting-sent" (click)="cancelMeeting()">
                <i class="bi bi-calendar-check"></i>
                <span>Встреча отправлена</span>
              </button>
            } @else {
              <button class="action-btn action-meeting" (click)="sendMeetingRequest()">
                <i class="bi bi-calendar-heart"></i>
                <span>Встреча</span>
              </button>
            }
            <button class="action-btn" [class.action-bookmark-active]="isBookmarked" [class.action-bookmark]="!isBookmarked" (click)="toggleBookmark()">
              <i class="bi" [ngClass]="isBookmarked ? 'bi-bookmark-fill' : 'bi-bookmark'"></i>
              <span>{{ isBookmarked ? 'В избранном' : 'В избранное' }}</span>
            </button>
            <button class="action-btn" [class.action-blocked]="isBlocked" [class.action-block]="!isBlocked" (click)="toggleBlockUser()">
              <i class="bi" [ngClass]="isBlocked ? 'bi-shield-fill-check' : 'bi-shield-slash'"></i>
              <span>{{ isBlocked ? 'Разблокировать' : 'Заблокировать' }}</span>
            </button>
            @if (!isReported) {
              <button class="action-btn action-report" (click)="openReportModal()">
                <i class="bi bi-flag"></i>
                <span>Пожаловаться</span>
              </button>
            } @else {
              <button class="action-btn action-reported" disabled>
                <i class="bi bi-flag-fill"></i>
                <span>Жалоба отправлена</span>
              </button>
            }
          </div>
          }

          @if (showReportModal) {
            <div class="report-modal-overlay" (click)="closeReportModal()">
              <div class="report-modal" (click)="$event.stopPropagation()">
                <div class="report-modal-header">
                  <h5><i class="bi bi-flag me-2"></i>Жалоба на пользователя</h5>
                  <button class="report-modal-close" (click)="closeReportModal()"><i class="bi bi-x-lg"></i></button>
                </div>
                <div class="report-modal-body">
                  <p class="report-modal-user">Пожаловаться на <strong>{{ user?.name }}</strong>?</p>
                  <label class="form-label">Причина жалобы</label>
                  <div class="report-reasons">
                    @for (reason of reportReasons; track reason.value) {
                      <label class="report-reason-item" [class.selected]="selectedReason === reason.value">
                        <input type="radio" name="reportReason" [value]="reason.value" [(ngModel)]="selectedReason">
                        <i class="bi" [ngClass]="reason.icon"></i>
                        <span>{{ reason.label }}</span>
                      </label>
                    }
                  </div>
                  <div class="report-description">
                    <label class="form-label">Дополнительная информация (необязательно)</label>
                    <textarea
                      class="form-control"
                      rows="3"
                      [(ngModel)]="reportDescription"
                      placeholder="Опишите ситуацию подробнее..."></textarea>
                  </div>
                </div>
                <div class="report-modal-footer">
                  <button class="btn btn-cancel" (click)="closeReportModal()">Отмена</button>
                  <button
                    class="btn btn-report"
                    [disabled]="!selectedReason || reportSending"
                    (click)="submitReport()">
                    @if (reportSending) {
                      <span class="spinner-border spinner-border-sm me-1"></span>
                    }
                    <i class="bi bi-send me-1"></i>Отправить жалобу
                  </button>
                </div>
              </div>
            </div>
          }

          <!-- Biorhythm -->
          @if (user.id) {
            <div class="biorhythm-section">
              <h6 class="section-label">Биоритмическая совместимость</h6>
              <app-biorhythm-detail [userId]="user.id"></app-biorhythm-detail>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .profile-detail-container {
      max-width: 600px;
      margin: 0 auto;
    }

    .profile-hero {
      background: var(--card-bg, white);
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    }

    .hero-photo {
      position: relative;
      height: 450px;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    }

    .hero-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, transparent 30%, transparent 50%, rgba(0,0,0,0.85) 100%);
    }

    .hero-online-badge {
      position: absolute;
      top: 16px;
      right: 16px;
      background: rgba(34, 197, 94, 0.9);
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      backdrop-filter: blur(8px);
      z-index: 2;
    }

    .hero-back-btn {
      position: absolute;
      top: 16px;
      left: 16px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(8px);
      border: none;
      color: white;
      font-size: 1.2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 2;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(0, 0, 0, 0.6);
        transform: scale(1.1);
      }
    }

    .hero-info {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 1.5rem;
      z-index: 2;
      color: white;
    }

    .hero-name {
      font-size: 1.8rem;
      font-weight: 700;
      margin: 0;
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .hero-age {
      font-size: 1.3rem;
      font-weight: 400;
    }

    .hero-zodiac {
      font-size: 1.2rem;
    }

    .hero-distance {
      margin: 0.5rem 0 0;
      font-size: 0.9rem;
      opacity: 0.9;

      i { margin-right: 0.25rem; }
    }

    .section-label {
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted, #9ca3af);
      margin-bottom: 0.75rem;
    }

    .compatibility-section,
    .bio-section,
    .biorhythm-section {
      padding: 1.25rem 1.5rem;
      border-top: 1px solid var(--border-light, #f3f4f6);
    }

    .compat-bars {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .compat-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .compat-label {
      font-size: 0.85rem;
      color: #6b7280;
      min-width: 100px;
    }

    .compat-track {
      flex: 1;
      height: 6px;
      background: var(--border-color, #f3f4f6);
      border-radius: 3px;
      overflow: hidden;
    }

    .compat-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.6s ease;

      &.high { background: linear-gradient(90deg, #22c55e, #16a34a); }
      &.medium { background: linear-gradient(90deg, #f59e0b, #d97706); }
      &.low { background: linear-gradient(90deg, #ef4444, #dc2626); }
    }

    .compat-value {
      font-size: 0.8rem;
      font-weight: 700;
      min-width: 40px;
      text-align: right;
    }

    .bio-text {
      font-size: 0.95rem;
      color: var(--text-secondary, #4b5563);
      line-height: 1.6;
      margin: 0;
    }

    .banned-notice {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      margin: 1.25rem 1.5rem;
      padding: 1rem 1.25rem;
      border-radius: 12px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: #b91c1c;
      font-size: 0.95rem;
      font-weight: 600;
      text-align: center;

      i {
        font-size: 1.25rem;
        flex-shrink: 0;
      }
    }

    .actions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      padding: 1.25rem 1.5rem;
      border-top: 1px solid var(--border-light, #f3f4f6);
    }

    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-radius: 12px;
      border: 2px solid var(--border-color, #e5e7eb);
      background: var(--card-bg, white);
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-secondary, #4b5563);
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }

      &.action-message {
        background: linear-gradient(135deg, #fd297b 0%, #ff655b 100%);
        color: white;
        border-color: transparent;
        grid-column: 1 / -1;
        padding: 0.85rem;

        &:hover { box-shadow: 0 6px 20px rgba(253, 41, 123, 0.4); }
      }

      &.action-meeting {
        border-color: #8b5cf6;
        color: #8b5cf6;
        grid-column: 1 / -1;

        &:hover { background: #8b5cf6; color: white; }
      }

      &.action-meeting-sent {
        border-color: #8b5cf6;
        color: #8b5cf6;
        background: rgba(139, 92, 246, 0.08);
        grid-column: 1 / -1;

        &:hover { background: rgba(239, 68, 68, 0.08); border-color: #ef4444; color: #ef4444; }
      }

      &.action-bookmark {
        &:hover { border-color: #f59e0b; color: #f59e0b; }
      }

      &.action-bookmark-active {
        border-color: #f59e0b;
        color: #f59e0b;
        background: rgba(245, 158, 11, 0.05);

        &:hover { background: #f59e0b; color: white; }
      }

      &.action-block {
        &:hover { border-color: #ef4444; color: #ef4444; }
      }

      &.action-blocked {
        border-color: #22c55e;
        color: #22c55e;

        &:hover { background: #22c55e; color: white; }
      }

      &.action-report {
        grid-column: 1 / -1;
        border-color: #ef4444;
        color: #ef4444;

        &:hover { background: #ef4444; color: white; }
      }

      &.action-reported {
        grid-column: 1 / -1;
        border-color: #9ca3af;
        color: #9ca3af;
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .report-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 1rem;
      backdrop-filter: blur(4px);
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .report-modal {
      background: var(--card-bg, white);
      border-radius: 20px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.3s ease;
      overflow: hidden;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .report-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-color, #e5e7eb);

      h5 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--text-primary, #1f2937);
      }
    }

    .report-modal-close {
      background: none;
      border: none;
      color: var(--text-secondary, #6b7280);
      font-size: 1.1rem;
      cursor: pointer;
      padding: 4px;
      border-radius: 8px;
      transition: all 0.2s;

      &:hover { background: var(--bg-secondary, #f3f4f6); color: var(--text-primary); }
    }

    .report-modal-body {
      padding: 1.25rem 1.5rem;
    }

    .report-modal-user {
      color: var(--text-secondary, #6b7280);
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }

    .report-reasons {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .report-reason-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border: 2px solid var(--border-color, #e5e7eb);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.9rem;
      color: var(--text-secondary, #4b5563);

      input[type="radio"] { display: none; }

      i { font-size: 1rem; color: var(--text-muted, #9ca3af); }

      &:hover {
        border-color: #ef4444;
        background: rgba(239, 68, 68, 0.03);
      }

      &.selected {
        border-color: #ef4444;
        background: rgba(239, 68, 68, 0.06);
        color: #ef4444;
        font-weight: 600;

        i { color: #ef4444; }
      }
    }

    .report-description {
      textarea {
        border-radius: 12px;
        resize: vertical;
        min-height: 80px;
      }
    }

    .report-modal-footer {
      display: flex;
      gap: 0.75rem;
      padding: 1rem 1.5rem 1.25rem;
      justify-content: flex-end;

      .btn {
        padding: 0.6rem 1.25rem;
        border-radius: 10px;
        font-weight: 600;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
      }

      .btn-cancel {
        background: var(--bg-secondary, #f3f4f6);
        color: var(--text-secondary, #6b7280);

        &:hover { background: var(--border-color, #e5e7eb); }
      }

      .btn-report {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;

        &:hover:not(:disabled) { box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4); transform: translateY(-1px); }
        &:disabled { opacity: 0.5; cursor: not-allowed; }
      }
    }

    @media (max-width: 768px) {
      .hero-photo { height: 380px; }
      .hero-name { font-size: 1.5rem; }
      .actions-grid { grid-template-columns: 1fr 1fr; }
    }
  `]
})
export class UserDetailComponent implements OnInit, OnDestroy {
  @Input() id?: string;
  user: UserInfo | null = null;
  photoDataUrl: string | null = null;
  loading = true;
  error: string | null = null;
  isBookmarked = false;
  isBlocked = false;
  meetingSent = false;
  isReported = false;
  showReportModal = false;
  selectedReason = '';
  reportDescription = '';
  reportSending = false;

  reportReasons = [
    { value: 'SPAM', label: 'Спам или фейковый профиль', icon: 'bi-envelope-exclamation' },
    { value: 'INAPPROPRIATE', label: 'Неприемлемый контент', icon: 'bi-emoji-angry' },
    { value: 'HARASSMENT', label: 'Преследование или оскорбления', icon: 'bi-shield-exclamation' },
    { value: 'FAKE', label: 'Фото не принадлежит пользователю', icon: 'bi-person-x' },
    { value: 'UNDERAGE', label: 'Пользователь несовершеннолетний', icon: 'bi-exclamation-triangle' },
    { value: 'OTHER', label: 'Другое', icon: 'bi-three-dots' },
  ];

  private destroy$ = new Subject<void>();
  private destroyRef = inject(DestroyRef);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private bookmarksService: BookmarksService,
    private mailboxService: MailboxService,
    private meetingsService: MeetingsService,
    private adminService: AdminService,
    private toastService: ToastService,
    private sanitizer: DomSanitizer,
    private modalService: ModalService
  ) {
    this.destroyRef.onDestroy(() => this.destroy$.next());
  }

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('id');
    if (userId) {
      this.loadUser(userId);
    } else {
      this.error = 'Пользователь не найден';
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack(): void {
    window.history.back();
  }

  openChat(): void {
    if (this.user?.id) {
      this.router.navigate(['/mailbox', this.user.id]);
    }
  }

  private loadUser(userId: string): void {
    this.userService.getUserById(userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (user) => {
        this.user = user;
        this.loadPhoto(userId);
        if (!user.isBanned) {
          this.loadBookmarkStatus(userId);
          this.loadBlockStatus(userId);
          this.loadMeetingStatus(userId);
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Ошибка загрузки профиля пользователя';
        this.loading = false;
      }
    });
  }

  private loadBookmarkStatus(userId: string): void {
    this.bookmarksService.isBookmarked(userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { this.isBookmarked = res.bookmarked; },
      error: () => { this.isBookmarked = false; }
    });
  }

  private loadBlockStatus(userId: string): void {
    this.userService.isBlocked(userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { this.isBlocked = res.blocked; },
      error: () => { this.isBlocked = false; }
    });
  }

  private loadMeetingStatus(userId: string): void {
    this.meetingsService.hasSentMeeting(userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { this.meetingSent = res.sent; },
      error: () => { this.meetingSent = false; }
    });
  }

  private loadPhoto(userId: string): void {
    this.userService.getPhoto(userId, 'full').pipe(takeUntil(this.destroy$)).subscribe({
      next: (bytes: Uint8Array) => {
        this.photoDataUrl = this.bytesToDataUrl(bytes);
      },
      error: () => {
        this.photoDataUrl = null;
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

  getZodiacSign(): string {
    if (this.user?.horo && this.user.horo >= 1 && this.user.horo <= 12) {
      const signs = ['Козерог', 'Водолей', 'Рыбы', 'Овен', 'Телец', 'Близнецы',
                     'Рак', 'Лев', 'Дева', 'Весы', 'Скорпион', 'Стрелец'];
      return signs[this.user.horo - 1];
    }
    
    if (!this.user?.birthday) return '';
    const date = new Date(this.user.birthday);
    const day = date.getDate();
    const month = date.getMonth() + 1;

    const zodiacSigns: Record<string, { day: number; sign: string }> = {
      '1': { day: 20, sign: 'Водолей' },
      '2': { day: 19, sign: 'Рыбы' },
      '3': { day: 21, sign: 'Овен' },
      '4': { day: 20, sign: 'Телец' },
      '5': { day: 21, sign: 'Близнецы' },
      '6': { day: 21, sign: 'Рак' },
      '7': { day: 23, sign: 'Лев' },
      '8': { day: 23, sign: 'Дева' },
      '9': { day: 23, sign: 'Весы' },
      '10': { day: 23, sign: 'Скорпион' },
      '11': { day: 22, sign: 'Стрелец' },
      '12': { day: 22, sign: 'Козерог' }
    };
    
    const sign = zodiacSigns[month.toString()];
    if (day >= sign.day) {
      return sign.sign;
    } else {
      const prevMonth = month === 1 ? 12 : month - 1;
      return zodiacSigns[prevMonth.toString()]?.sign || '';
    }
  }

  getZodiacEmoji(): string {
    const horo = this.user?.horo;
    if (horo && horo >= 1 && horo <= 12) {
      const emojis = ['♑', '♒', '♓', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐'];
      return emojis[horo - 1] || '';
    }
    return '';
  }

  getGenderText(): string {
    return this.user?.gender === Gender.MAN ? 'Мужской' : 'Женский';
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
      this.bookmarksService.deleteBookmark(this.user.id).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => { this.isBookmarked = false; }
      });
    } else {
      this.bookmarksService.addBookmark({ userId: this.user.id }).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => { this.isBookmarked = true; }
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

    this.meetingsService.createMeeting(meeting).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.meetingSent = true;
        this.modalService.alert('Предложение встречи отправлено!');
      },
      error: () => { /* shown by HTTP interceptor */ }
    });
  }

  async cancelMeeting(): Promise<void> {
    if (!this.user?.id) return;

    const confirmed = await this.modalService.confirm(
      `Отменить предложение встречи для ${this.user.name || 'пользователя'}?`,
      'Отмена встречи'
    );
    if (!confirmed) return;

    this.meetingsService.deleteMeeting(this.user.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.meetingSent = false;
        this.modalService.alert('Предложение встречи отменено');
      },
      error: () => { /* shown by HTTP interceptor */ }
    });
  }

  toggleBlockUser(): void {
    if (!this.user?.id) return;

    if (this.isBlocked) {
      this.userService.unblockUser(this.user.id).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => { this.isBlocked = false; this.modalService.alert('Пользователь разблокирован'); },
        error: () => { /* shown by HTTP interceptor */ }
      });
    } else {
      this.modalService.confirm('Вы уверены, что хотите заблокировать этого пользователя?', 'Блокировка').then(confirmed => {
        if (confirmed && this.user?.id) {
          this.userService.blockUser(this.user.id).pipe(takeUntil(this.destroy$)).subscribe({
            next: () => { this.isBlocked = true; this.modalService.alert('Пользователь заблокирован'); },
            error: () => { /* shown by HTTP interceptor */ }
          });
        }
      });
    }
  }

  openReportModal(): void {
    this.showReportModal = true;
    this.selectedReason = '';
    this.reportDescription = '';
  }

  closeReportModal(): void {
    this.showReportModal = false;
  }

  submitReport(): void {
    if (!this.user?.id || !this.selectedReason) return;

    this.reportSending = true;
    this.adminService.createReport(this.user.id, this.selectedReason, this.reportDescription || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isReported = true;
          this.showReportModal = false;
          this.reportSending = false;
          this.toastService.success('Жалоба отправлена. Спасибо за бдительность!');
        },
        error: () => {
          this.reportSending = false;
          this.toastService.error('Ошибка отправки жалобы. Попробуйте позже.');
        }
      });
  }
}
