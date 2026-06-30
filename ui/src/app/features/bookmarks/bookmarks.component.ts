import { Component, OnInit, OnDestroy, DestroyRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BookmarksService } from '../../core/services/bookmarks.service';
import { UserService } from '../../core/services/user.service';
import { MatchService, MatchesResponse } from '../../core/services/match.service';
import { UserInfo, PageableRequest } from '../../core/models/user.model';
import {
  getGenderLabel,
  getGenderSymbol,
  getZodiacEmoji,
  getZodiacSignName,
} from '../../shared/utils/user-profile-display.util';
import { AvatarStatusBadgeComponent } from '../../shared/components/avatar-status-badge/avatar-status-badge.component';

interface UserWithPhoto extends UserInfo {
  photoDataUrl?: string | null;
}

@Component({
  selector: 'app-bookmarks',
  standalone: true,
  imports: [RouterLink, AvatarStatusBadgeComponent],
  template: `
    <div class="page-header mb-4">
      <h1 class="page-title">
        <i class="bi bi-bookmark-heart me-2"></i>Избранное
      </h1>
      <p class="text-muted">Сохранённые профили</p>
    </div>

    @if (matchesLoading) {
      <div class="card mb-4">
        <div class="card-body text-center py-4">
          <div class="spinner-border spinner-border-sm" role="status">
            <span class="visually-hidden">Загрузка...</span>
          </div>
        </div>
      </div>
    } @else if (matchesCount > 0) {
      <div class="matches-section mb-4">
        <h5 class="matches-title">
          <i class="bi bi-heart-fill text-danger me-2"></i>Совпадения по лайкам
          <span class="badge bg-danger ms-2">{{ matchesCount }}</span>
        </h5>
        @if (matchesBlurred) {
          <div class="matches-blurred">
            <div class="blurred-cards">
              @for (i of getPlaceholderArray(matchesCount); track i) {
                <div class="blurred-card">
                  <div class="blurred-card-inner">
                    <div class="blurred-avatar">
                      <i class="bi bi-person-fill"></i>
                    </div>
                    <div class="blurred-lock">
                      <i class="bi bi-lock-fill"></i>
                    </div>
                  </div>
                </div>
              }
            </div>
            <div class="blurred-overlay">
              <i class="bi bi-lock-fill"></i>
              <p>Обновите до Pro чтобы увидеть кто вас лайкнул</p>
              <a routerLink="/subscription" class="btn btn-pro-sm">
                <i class="bi bi-star-fill me-1"></i> Bioritmic Pro
              </a>
            </div>
          </div>
        } @else {
          <div class="matches-grid">
            @for (user of matches; track user.id; let i = $index) {
              <div class="match-item" [style.animation-delay]="i * 100 + 'ms'">
                <a [routerLink]="['/user', user.id]" class="match-link">
                  <div class="match-avatar-wrapper">
                    <img
                      [src]="getMatchPhotoUrl(user)"
                      class="match-avatar"
                      [alt]="user.name">
                    <app-avatar-status-badge
                      [emoji]="user.statusEmoji"
                      [position]="user.statusPosition"
                      size="sm">
                    </app-avatar-status-badge>
                    @if (isUserOnline(user)) {
                      <span class="online-dot"></span>
                    }
                  </div>
                  <span class="match-name">{{ user.name }}</span>
                </a>
                <a [routerLink]="['/mailbox', 'conversation', user.id]" class="match-message-btn" title="Написать">
                  <i class="bi bi-chat-dots-fill"></i>
                </a>
              </div>
            }
          </div>
        }
      </div>
    }

    <h5 class="section-title mb-3">
      <i class="bi bi-bookmark me-2"></i>Избранное
    </h5>

    @if (loading) {
      <div class="card">
        <div class="card-body text-center py-5">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Загрузка...</span>
          </div>
        </div>
      </div>
    } @else if (users.length === 0) {
      <div class="card empty-state">
        <div class="card-body text-center py-5">
          <i class="bi bi-bookmark display-1 text-muted mb-3"></i>
          <h4 class="text-muted">Пока пусто</h4>
          <p class="text-muted">Добавляйте пользователей в избранное со страницы поиска</p>
          <a routerLink="/swipe" class="btn btn-primary mt-3">
            <i class="bi bi-people me-2"></i>К поиску
          </a>
        </div>
      </div>
    } @else {
      <div class="row bookmarks-grid">
        @for (user of users; track user.id) {
          <div class="col-12 col-md-6 col-lg-4 mb-4 bookmarks-col">
            <div class="card user-card h-100">
              <div class="user-card-image-wrapper">
                <img
                  [src]="user.photoDataUrl || ''"
                  class="card-img-top user-card-img"
                  [alt]="user.name">
                <app-avatar-status-badge
                  [emoji]="user.statusEmoji"
                  [position]="user.statusPosition"
                  size="md">
                </app-avatar-status-badge>
                <div class="user-card-overlay">
                  <button class="btn-remove" (click)="removeBookmark(user.id)" title="Удалить">
                    <i class="bi bi-x-lg"></i>
                  </button>
                </div>
              </div>
              <div class="card-body">
                <h5 class="user-card-name">{{ user.name }}</h5>
                <p class="user-card-info text-muted">
                  {{ user.age || (user.birthday ? getAge(user.birthday) : 'N/A') }} лет,
                  <span class="user-card-gender" [attr.title]="getGenderLabel(user.gender)">
                    <span class="gender-symbol">{{ getGenderSymbol(user.gender) }}</span>
                    {{ getGenderLabel(user.gender) }}
                  </span>
                  @if (getZodiacEmoji(user.horo, user.birthday)) {
                    <span class="user-card-zodiac" [attr.title]="getZodiacSignName(user.horo, user.birthday)">
                      {{ getZodiacEmoji(user.horo, user.birthday) }}
                    </span>
                  }
                </p>
                @if (user.distance) {
                  <p class="user-card-distance small text-muted">
                    <i class="bi bi-geo-alt me-1"></i>{{ user.distance.toFixed(1) }} км
                  </p>
                }
                @if (user.bio?.trim()) {
                  <div class="user-card-bio">
                    <span class="user-card-bio-label">Обо мне</span>
                    <p class="user-card-bio-text">{{ user.bio }}</p>
                  </div>
                }
              </div>
              <div class="card-footer">
                <a [routerLink]="['/user', user.id]" class="btn btn-outline-primary w-100">
                  <i class="bi bi-person me-2"></i>Профиль
                </a>
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

    .section-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-primary, #374151);
    }

    .empty-state {
      max-width: 500px;
      margin: 2rem auto;
    }

    .bookmarks-grid {
      justify-content: center;
    }

    .bookmarks-col {
      display: flex;
      justify-content: center;
    }

    .user-card {
      transition: all 0.3s ease;
      overflow: hidden;
      width: 100%;

      &:hover {
        transform: translateY(-5px);
        box-shadow: 0 15px 35px rgba(253, 41, 123, 0.2);
      }
    }

    .user-card-image-wrapper {
      position: relative;
      overflow: hidden;
      aspect-ratio: 4 / 3;
      background: var(--bg-secondary, #f3f4f6);
    }

    .user-card-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: center;
    }

    .user-card-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to bottom, transparent 50%, rgba(0, 0, 0, 0.7) 100%);
      display: flex;
      align-items: flex-start;
      justify-content: flex-end;
      padding: 0.75rem;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .user-card:hover .user-card-overlay {
      opacity: 1;
    }

    .btn-remove {
      background: rgba(239, 68, 68, 0.9);
      color: white;
      border: none;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;

      &:hover {
        background: #dc3545;
        transform: scale(1.1);
      }
    }

    .user-card-name {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: var(--text-primary, #1f2937);
    }

    .user-card-info {
      font-size: 0.9rem;
      margin-bottom: 0.25rem;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.35rem;
    }

    .user-card-gender {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
    }

    .gender-symbol {
      font-size: 1rem;
      line-height: 1;
      color: var(--accent-pink, #fd297b);
      font-weight: 600;
    }

    .user-card-zodiac {
      font-size: 1rem;
      line-height: 1;
    }

    .user-card-distance {
      margin-bottom: 0;
    }

    .user-card-bio {
      margin-top: 0.75rem;
    }

    .user-card-bio-label {
      display: block;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted, #9ca3af);
      margin-bottom: 0.25rem;
    }

    .user-card-bio-text {
      margin: 0;
      font-size: 0.85rem;
      line-height: 1.45;
      color: var(--text-secondary, #6b7280);
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* Matches section */
    .matches-section {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 1.25rem;
      box-shadow: var(--shadow-sm);
    }

    .matches-title {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      color: var(--text-primary);
    }

    .matches-blurred {
      position: relative;
    }

    .blurred-cards {
      display: flex;
      gap: 0.75rem;
      filter: blur(10px);
      pointer-events: none;
      opacity: 0.5;
    }

    .blurred-card {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
      background: var(--border-color);
    }

    .blurred-card-inner {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--border-color) 100%);
    }

    .blurred-avatar {
      font-size: 2rem;
      color: var(--text-muted);
    }

    .blurred-lock {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.2);
      color: var(--text-secondary);
      font-size: 1.25rem;
    }

    .blurred-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      background: color-mix(in srgb, var(--card-bg) 88%, transparent);
      border-radius: 8px;

      i {
        font-size: 1.5rem;
        color: var(--text-secondary);
      }

      p {
        margin: 0;
        font-size: 0.85rem;
        color: var(--text-primary);
        font-weight: 500;
        text-align: center;
        max-width: 250px;
      }
    }

    .btn-pro-sm {
      background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
      color: white;
      border: none;
      padding: 0.35rem 1rem;
      border-radius: 16px;
      font-weight: 600;
      font-size: 0.8rem;
      text-decoration: none;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 3px 10px rgba(245, 158, 11, 0.4);
        color: white;
      }
    }

    /* Matches grid */
    .matches-grid {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .match-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      animation: fadeInUp 0.5s ease forwards;
      opacity: 0;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .match-link {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
      text-decoration: none;
      color: var(--text-primary);
      transition: transform 0.2s ease;

      &:hover {
        transform: translateY(-3px);
        color: var(--text-primary);
      }
    }

    .match-avatar-wrapper {
      position: relative;
    }

    .match-avatar {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid #fd297b;
      box-shadow: 0 4px 12px rgba(253, 41, 123, 0.3);
      transition: box-shadow 0.2s ease;
    }

    .online-dot {
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 14px;
      height: 14px;
      background: var(--accent-green);
      border: 2.5px solid var(--card-bg);
      border-radius: 50%;
      box-shadow: 0 0 6px rgba(34, 197, 94, 0.5);
    }

    .match-name {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-primary);
      max-width: 80px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: center;
    }

    .match-message-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #fd297b 0%, #ff655b 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      text-decoration: none;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px rgba(253, 41, 123, 0.3);

      &:hover {
        transform: scale(1.15);
        box-shadow: 0 4px 12px rgba(253, 41, 123, 0.5);
        color: white;
      }
    }

    .match-card {
      transition: all 0.3s ease;
      overflow: hidden;
      border-radius: 10px;
      background: var(--card-bg);
      border: 1px solid var(--border-color);

      &:hover {
        transform: translateY(-3px);
        box-shadow: var(--shadow-md);
      }
    }

    .match-card-image-wrapper {
      height: 140px;
      overflow: hidden;
    }

    .match-card-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .match-card-name {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    @media (max-width: 767.98px) {
      .bookmarks-grid {
        margin-left: 0;
        margin-right: 0;
      }

      .bookmarks-col {
        padding-left: 0;
        padding-right: 0;
      }

      .user-card {
        max-width: 560px;
      }
    }
  `]
})
export class BookmarksComponent implements OnInit, OnDestroy {
  users: UserWithPhoto[] = [];
  matches: UserWithPhoto[] = [];
  matchesCount = 0;
  matchesBlurred = false;
  matchesLoading = false;
  loading = false;
  pageable: PageableRequest = { page: 0, size: 20 };
  private readonly destroyRef = inject(DestroyRef);
  private onlineTickInterval: ReturnType<typeof setInterval> | null = null;
  private onlineTickMs = Date.now();

  constructor(
    private bookmarksService: BookmarksService,
    private userService: UserService,
    private matchService: MatchService
  ) {}

  ngOnInit(): void {
    this.loadMatches();
    this.loadBookmarks();
    this.onlineTickInterval = setInterval(() => {
      this.onlineTickMs = Date.now();
    }, 30_000);
  }

  ngOnDestroy(): void {
    if (this.onlineTickInterval) {
      clearInterval(this.onlineTickInterval);
      this.onlineTickInterval = null;
    }
  }

  isUserOnline(user: UserWithPhoto | null | undefined): boolean {
    if (!user) {
      return false;
    }
    if (!user.lastActiveAt) {
      return user.isOnline === true;
    }
    const lastActiveMs = Date.parse(user.lastActiveAt);
    if (Number.isNaN(lastActiveMs)) {
      return user.isOnline === true;
    }
    return this.onlineTickMs - lastActiveMs <= 60_000;
  }

  private loadMatches(): void {
    this.matchesLoading = true;
    this.matchService.getMatches().subscribe({
      next: (response: MatchesResponse) => {
        this.matchesCount = response.count;
        this.matchesBlurred = response.blurred;
        if (!response.blurred && response.matches.length > 0) {
          this.matches = response.matches.map(m => this.withCachedPhoto(m));
          this.loadMatchPhotos();
        } else {
          this.matches = [];
        }
        this.matchesLoading = false;
      },
      error: () => {
        this.matchesLoading = false;
      }
    });
  }

  private loadMatchPhotos(): void {
    this.matches.forEach(user => this.loadUserPhoto(user));
  }

  getMatchPhotoUrl(user: UserWithPhoto): string {
    if (user.photoDataUrl) {
      return user.photoDataUrl;
    }
    if (user.id) {
      const cached = this.userService.peekCachedPhotoUrl(user.id, 'card');
      if (cached) {
        return cached;
      }
      return this.userService.getProfilePhotoUrl(user.id, UserService.photoCacheVersion(), 'card');
    }
    return '';
  }

  getPlaceholderArray(count: number): number[] {
    return Array.from({ length: Math.min(count, 6) }, (_, i) => i);
  }

  private loadBookmarks(): void {
    this.loading = true;
    this.bookmarksService.getBookmarks(this.pageable).subscribe({
      next: (users) => {
        this.users = users.map(user => this.withCachedPhoto(user));
        this.loadPhotos();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private loadPhotos(): void {
    this.users.forEach(user => this.loadUserPhoto(user));
  }

  private withCachedPhoto(user: UserWithPhoto): UserWithPhoto {
    if (!user.id) {
      return { ...user, photoDataUrl: null };
    }
    return {
      ...user,
      photoDataUrl: this.userService.peekCachedPhotoUrl(user.id, 'card'),
    };
  }

  private loadUserPhoto(user: UserWithPhoto): void {
    if (!user.id) {
      return;
    }
    this.userService.getCachedPhotoUrl(user.id, 'card').pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (url) => {
        user.photoDataUrl = url;
      },
      error: () => {
        user.photoDataUrl = null;
      }
    });
  }

  removeBookmark(userId: string | undefined): void {
    if (!userId) return;
    this.bookmarksService.deleteBookmark(userId).subscribe({
      next: () => {
        this.loadBookmarks();
      },
      error: () => {
        alert('Ошибка удаления из избранного');
      }
    });
  }

  getAge(birthday: string): number {
    const today = new Date();
    const birth = new Date(birthday);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  getGenderSymbol = getGenderSymbol;
  getGenderLabel = getGenderLabel;
  getZodiacEmoji = getZodiacEmoji;
  getZodiacSignName = getZodiacSignName;
}
