import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil, switchMap, EMPTY } from 'rxjs';
import { SearchService } from '../../core/services/search.service';
import { UserService, photoSizeForLargeDisplay, PhotoSize } from '../../core/services/user.service';
import { GeoService } from '../../core/services/geo.service';
import { BookmarksService } from '../../core/services/bookmarks.service';
import { SwipeService, SwipeResult } from '../../core/services/swipe.service';
import { MatchService } from '../../core/services/match.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { AuthService } from '../../core/services/auth.service';
import { SwipeActionService } from '../../core/services/swipe-action.service';
import { UserInfo, Gender, UserSearch, UserSettings, SwipeDirection, SwipeCard } from '../../core/models/user.model';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';

import {
  getSummaryCompatibility,
  getSummaryCompatibilityAverage,
} from '../../shared/utils/biorhythm-labels.util';
import { StoriesBarComponent } from '../../shared/components/stories-bar/stories-bar.component';
import { MatchModalComponent } from '../../shared/components/match-modal/match-modal.component';
import { AvatarStatusBadgeComponent } from '../../shared/components/avatar-status-badge/avatar-status-badge.component';
import { ShareService } from '../../core/services/share.service';
import { ModalService } from '../../core/services/modal.service';

@Component({
  selector: 'app-swipe',
  standalone: true,
  imports: [RouterLink, FormsModule, NgClass, StoriesBarComponent, MatchModalComponent, AvatarStatusBadgeComponent],
  template: `
    <div class="swipe-container">
      <div class="stories-row">
        <app-stories-bar></app-stories-bar>
        <div class="mobile-filters-btn">
          <button type="button" class="btn-filter" (click)="openFilters()" title="Параметры поиска">
            <i class="bi bi-funnel"></i>
          </button>
        </div>
      </div>

      <!-- Мобильная версия: Tinder-карточки -->
      <div class="mobile-swipe-container">
        @if (cards.length === 0 && !loading) {
          <div class="no-cards">
            <div class="no-cards-icon">
              <i class="bi" [ngClass]="(geoDataMissing || locationRequired) ? 'bi-geo-alt' : 'bi-emoji-frown'"></i>
            </div>
            @if (geoDataMissing || locationRequired) {
              <h3>Геоданные не найдены</h3>
              <p class="text-muted">Добавьте своё местоположение для поиска людей рядом.</p>
              <a routerLink="/settings/location" class="btn btn-primary mt-3">
                <i class="bi bi-geo-alt"></i> Указать местоположение
              </a>
            } @else if (searchError) {
              <h3>Не удалось выполнить поиск</h3>
              <p class="text-muted">{{ searchError }}</p>
              @if (userPlaceLabel) {
                <p class="user-location-hint">
                  <i class="bi bi-geo-alt me-1"></i>Вы находитесь: <strong>{{ userPlaceLabel }}</strong>
                </p>
              }
              <button class="btn btn-primary mt-3" (click)="openFilters()">
                <i class="bi bi-funnel"></i> Изменить фильтры
              </button>
            } @else {
              <h3>Пользователи закончились</h3>
              <p class="text-muted">Попробуйте расширить параметры поиска</p>
              @if (userPlaceLabel) {
                <p class="user-location-hint">
                  <i class="bi bi-geo-alt me-1"></i>Вы находитесь: <strong>{{ userPlaceLabel }}</strong>
                </p>
              }
              <button class="btn btn-primary mt-3" (click)="openFilters()">
                <i class="bi bi-funnel"></i> Изменить фильтры
              </button>
              <div class="invite-friends">
                <button
                  type="button"
                  class="btn btn-outline-secondary invite-share-btn"
                  (click)="shareProfile()"
                  [disabled]="!currentUserId || sharing">
                  @if (sharing) {
                    <span class="spinner-border spinner-border-sm me-2"></span>
                  } @else {
                    <i class="bi bi-share me-2"></i>
                  }
                  Пригласи друзей
                </button>
              </div>
            }
          </div>
        } @else {
          @for (card of cards.slice(0, 2); track card.user.id; let i = $index) {
            <div
              class="swipe-card"
              [class.top-card]="i === 0"
              [class.next-card]="i === 1"
              [style.opacity]="i === 0 ? 1 : 0.95"
              [style.z-index]="10 - i"
            >
              <!-- Фото пользователя -->
              <div class="card-photo" [style.backgroundImage]="'url(' + (card.photoDataUrl || card.user.image || '') + ' '">
                <app-avatar-status-badge
                  [emoji]="card.user.statusEmoji"
                  [position]="card.user.statusPosition"
                  size="md">
                </app-avatar-status-badge>
                <div class="photo-overlay"></div>

                <!-- Информация на карточке -->
                <div class="card-info">
                  <div class="info-main">
                    <h2 class="user-name">
                      {{ card.user.name }}
                      <span class="user-age">{{ getAge(card.user.birthday, card.user.age) }}</span>
                      <span class="user-zodiac">{{ getZodiacSign(card.user.birthday, card.user.horo) }}</span>
                    </h2>
                    @if (card.user.distance) {
                      <p class="user-distance">
                        <i class="bi bi-geo-alt"></i> {{ card.user.distance.toFixed(1) }} км
                      </p>
                    }
                  </div>

                  <!-- Совместимость -->
                  @if (card.user.compare) {
                    <div class="compatibility-badges">
                      @for (item of getCompatibilityBadges(card.user); track item.name) {
                        <span class="badge" [class.heartfelt]="item.name === 'Heartfelt'" [class.physical]="item.name === 'Physical'" [class.intellectual]="item.name === 'Intellectual'">
                          {{ item.label }}: {{ item.value }}%
                        </span>
                      }
                    </div>
                  }
                </div>
              </div>
            </div>
          }
        }

        <!-- Индикатор загрузки -->
        @if (loading) {
          <div class="loading-overlay">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Загрузка...</span>
            </div>
          </div>
        }
      </div>

      <!-- Десктопная версия: Список профилей (Badoo-стиль) -->
      <div class="desktop-profiles-container">
        @if (loading) {
          <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Загрузка...</span>
            </div>
          </div>
        } @else if (cards.length === 0) {
          <div class="no-cards-desktop text-center py-5">
            <div class="no-cards-icon">
              <i class="bi" [ngClass]="(geoDataMissing || locationRequired) ? 'bi-geo-alt' : 'bi-emoji-frown'"></i>
            </div>
            @if (geoDataMissing || locationRequired) {
              <h3>Геоданные не найдены</h3>
              <p class="text-muted">Добавьте своё местоположение для поиска людей рядом.</p>
              <a routerLink="/settings/location" class="btn btn-primary mt-3">
                <i class="bi bi-geo-alt"></i> Указать местоположение
              </a>
            } @else if (searchError) {
              <h3>Не удалось выполнить поиск</h3>
              <p class="text-muted">{{ searchError }}</p>
              @if (userPlaceLabel) {
                <p class="user-location-hint">
                  <i class="bi bi-geo-alt me-1"></i>Вы находитесь: <strong>{{ userPlaceLabel }}</strong>
                </p>
              }
              <button class="btn btn-primary mt-3" (click)="openFilters()">
                <i class="bi bi-funnel"></i> Изменить фильтры
              </button>
            } @else {
              <h3>Пользователи закончились</h3>
              <p class="text-muted">Попробуйте расширить параметры поиска</p>
              @if (userPlaceLabel) {
                <p class="user-location-hint">
                  <i class="bi bi-geo-alt me-1"></i>Вы находитесь: <strong>{{ userPlaceLabel }}</strong>
                </p>
              }
              <button class="btn btn-primary mt-3" (click)="openFilters()">
                <i class="bi bi-funnel"></i> Изменить фильтры
              </button>
              <div class="invite-friends">
                <button
                  type="button"
                  class="btn btn-outline-secondary invite-share-btn"
                  (click)="shareProfile()"
                  [disabled]="!currentUserId || sharing">
                  @if (sharing) {
                    <span class="spinner-border spinner-border-sm me-2"></span>
                  } @else {
                    <i class="bi bi-share me-2"></i>
                  }
                  Пригласи друзей
                </button>
              </div>
            }
          </div>
        } @else {
          <div class="profiles-grid">
            @for (card of cards; track card.user.id) {
              <div class="profile-card">
                <div class="profile-card-photo" [style.backgroundImage]="'url(' + (card.photoDataUrl || card.user.image || '') + ' '">
                  <app-avatar-status-badge
                    [emoji]="card.user.statusEmoji"
                    [position]="card.user.statusPosition"
                    size="md">
                  </app-avatar-status-badge>
                  @if (isUserOnline(card.user)) {
                    <div class="online-badge"></div>
                  }
                </div>
                <div class="profile-card-body">
                  <div class="profile-card-header">
                    <h5>
                      {{ card.user.name }}, {{ getAge(card.user.birthday, card.user.age) }}
                      <span class="zodiac-sign">{{ getZodiacSign(card.user.birthday, card.user.horo) }}</span>
                    </h5>
                    @if (card.user.distance) {
                      <span class="distance-badge">
                        <i class="bi bi-geo-alt"></i> {{ card.user.distance.toFixed(1) }} км
                      </span>
                    }
                  </div>

                  @if (card.user.compare) {
                    <div class="compatibility-mini">
                      @for (item of getCompatibilityBadges(card.user); track item.name) {
                        <span class="compat-badge" [class.heartfelt]="item.name === 'Heartfelt'" [class.physical]="item.name === 'Physical'" [class.intellectual]="item.name === 'Intellectual'">
                          {{ item.label }}: {{ item.value }}%
                        </span>
                      }
                    </div>
                  }

                  <div class="profile-card-actions">
                    <button class="btn btn-outline-danger" (click)="removeCard(card)" title="Пропустить">
                      <i class="bi bi-x-lg"></i>
                    </button>
                    <button class="btn btn-outline-warning" (click)="superLikeProfile(card)" title="Супер-лайк">
                      <i class="bi bi-star-fill"></i>
                    </button>
                    <button
                      type="button"
                      class="btn btn-outline-primary"
                      [disabled]="!isUserVerified"
                      [title]="isUserVerified ? 'Профиль' : 'Доступно после верификации email'"
                      (click)="openProfile(card)">
                      <i class="bi bi-person"></i>
                    </button>
                    <button class="btn btn-outline-success" (click)="likeProfile(card)" title="Нравится">
                      <i class="bi bi-heart"></i>
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Кнопки управления (только мобильные) -->
      @if (showMobileSwipeControls) {
      <div class="swipe-controls">
        <button class="control-btn btn-undo" (click)="undoSwipe()" [disabled]="cards.length === 0 && !canUndo()" title="Отменить">
          <i class="bi bi-arrow-counterclockwise"></i>
        </button>
        <button class="control-btn btn-dislike" data-testid="swipe-dislike" (click)="manualSwipe(SwipeDirection.LEFT)" [disabled]="cards.length === 0 || (!isPro && swipeRemaining <= 0)">
          <i class="bi bi-x-lg"></i>
        </button>
        <button class="control-btn btn-superlike" (click)="manualSwipe(SwipeDirection.UP)" [disabled]="cards.length === 0 || (!isPro && swipeRemaining <= 0)" title="Супер-лайк">
          <i class="bi bi-star-fill"></i>
        </button>
        <button
          type="button"
          class="control-btn btn-profile"
          [disabled]="cards.length === 0 || !isUserVerified"
          [title]="isUserVerified ? 'Профиль' : 'Доступно после верификации email'"
          (click)="openProfile(cards[0])">
          <i class="bi bi-person"></i>
        </button>
        <button class="control-btn btn-like" (click)="manualSwipe(SwipeDirection.RIGHT)" [disabled]="cards.length === 0 || (!isPro && swipeRemaining <= 0)">
          <i class="bi bi-heart-fill"></i>
        </button>
      </div>
      }

      <!-- Счётчик свайпов и CTA -->
      @if (!isPro && swipeLimit > 0) {
        <div class="swipe-limit-bar">
          @if (swipeRemaining > 0) {
            <span class="swipe-limit-text">{{ swipeRemaining }}/{{ swipeLimit }} свайпов</span>
          } @else {
            <div class="swipe-limit-cta">
              <p class="cta-text">Обновите до Pro для неограниченных свайпов</p>
              @if (isUserVerified) {
                <a routerLink="/subscription" class="btn btn-pro">
                  <i class="bi bi-star-fill me-1"></i> Bioritmic Pro
                </a>
              } @else {
                <span class="cta-hint">Подтвердите email для доступа к подписке</span>
              }
            </div>
          }
        </div>
      }
    </div>

    <!-- Модальное окно фильтров -->
    @if (showFilters) {
      <div class="modal-backdrop" (click)="closeFilters()"></div>
      <div class="filters-modal">
        <div class="filters-header">
          <h5>Параметры поиска</h5>
          <button class="btn-close" (click)="closeFilters()"></button>
        </div>
        <div class="filters-body">
          <div class="filter-group">
            <label class="filter-label">Пол</label>
            <select class="form-select" [(ngModel)]="searchCriteria.gender">
              <option [value]="Gender.MAN">Мужчин</option>
              <option [value]="Gender.WOMAN">Женщин</option>
            </select>
          </div>

          <div class="filter-group">
            <label class="filter-label">
              Возраст: {{ searchCriteria.ageMin }} - {{ searchCriteria.ageMax }}
            </label>
            <input type="range" class="form-range" [(ngModel)]="searchCriteria.ageMin" min="14" max="100" (ngModelChange)="onAgeMinChange()">
            <input type="range" class="form-range" [(ngModel)]="searchCriteria.ageMax" min="14" max="100">
          </div>

          <div class="filter-group">
            <label class="filter-label">Расстояние: {{ searchCriteria.distance }} км</label>
            <input type="range" class="form-range" [(ngModel)]="searchCriteria.distance" min="0.05" max="100" step="0.05">
          </div>

          <a routerLink="/settings/location" class="filter-location-link" (click)="closeFilters()">
            <i class="bi bi-geo-alt me-1"></i>Моё местоположение
          </a>
        </div>
        <div class="filters-footer">
          <button class="btn btn-secondary" (click)="closeFilters()">Отмена</button>
          <button class="btn btn-primary" (click)="applyFilters()">Применить</button>
        </div>
      </div>
    }

    @if (showMatchModal) {
      <app-match-modal
        [visible]="true"
        [matchedUser]="matchedUser"
        [matchedUserPhoto]="matchedUserPhoto"
        [currentUserPhoto]="currentUserPhoto"
        (closed)="closeMatchModal()">
      </app-match-modal>
    }
  `,
  styleUrls: ['./swipe.component.scss']
})
export class SwipeComponent implements OnInit, OnDestroy, AfterViewInit {
  cards: SwipeCard[] = [];
  loading = false;
  showFilters = false;
  searchError: string | null = null;
  locationRequired = false;
  geoDataMissing = false;
  userPlaceLabel: string | null = null;
  SwipeDirection = SwipeDirection;
  Gender = Gender;
  Math = Math;

  searchCriteria: UserSearch = {
    gender: Gender.WOMAN,
    ageMin: 18,
    ageMax: 65,
    distance: 50
  };

  private boundOnKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private destroy$ = new Subject<void>();
  private onlineTickInterval: ReturnType<typeof setInterval> | null = null;
  private onlineTickMs = Date.now();

  // Swipe limit state
  swipeLimit = -1;
  swipeRemaining = -1;
  isPro = false;
  isUserVerified = true;
  swipeHistory: Array<{ direction: SwipeDirection; card: SwipeCard }> = [];
  showMatchModal = false;
  matchedUser: UserInfo | null = null;
  matchedUserPhoto: string | null = null;
  currentUserPhoto: string | null = null;
  currentUserId: string | null = null;
  currentUserName = '';
  sharing = false;

  constructor(
    private searchService: SearchService,
    private userService: UserService,
    private geoService: GeoService,
    private bookmarksService: BookmarksService,
    private swipeService: SwipeService,
    private matchService: MatchService,
    private subscriptionService: SubscriptionService,
    private authService: AuthService,
    private swipeActionService: SwipeActionService,
    private shareService: ShareService,
    private modalService: ModalService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.currentUserId = user?.id ?? null;
    this.currentUserName = user?.name ?? 'Профиль';
    this.isUserVerified = user?.isVerified !== false;
    this.loadUserSettings();
    this.loadSwipeLimit();

    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.currentUserId = user?.id ?? null;
      this.currentUserName = user?.name ?? 'Профиль';
      this.isUserVerified = user?.isVerified !== false;
      if (user?.isPro !== undefined) {
        this.isPro = user.isPro;
        if (this.isPro) {
          this.swipeLimit = -1;
          this.swipeRemaining = -1;
        }
      }
    });

    this.swipeService.onSwipe
      .pipe(takeUntil(this.destroy$))
      .subscribe((result: SwipeResult) => {
        this.handleSwipeResult(result);
      });

    this.swipeService.onUndo
      .pipe(takeUntil(this.destroy$))
      .subscribe((card: SwipeCard) => {
        this.cards = this.swipeService.getCards().slice(this.swipeService.getCurrentIndex());
        this.loadVisiblePhotos();
      });

    this.onlineTickInterval = setInterval(() => {
      this.onlineTickMs = Date.now();
    }, 30_000);
  }

  ngAfterViewInit(): void {
    this.boundOnKeyDown = this.onKeyDown.bind(this);
    document.addEventListener('keydown', this.boundOnKeyDown);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.boundOnKeyDown) {
      document.removeEventListener('keydown', this.boundOnKeyDown);
    }
    this.cards.forEach(card => UserService.revokePhotoUrl(card.photoDataUrl));
    if (this.onlineTickInterval) {
      clearInterval(this.onlineTickInterval);
      this.onlineTickInterval = null;
    }
  }

  isUserOnline(user: UserInfo | null | undefined): boolean {
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

  private loadUserSettings(): void {
    this.userService.getUserSettings().subscribe({
      next: (settings: UserSettings) => {
        if (settings.gender !== undefined && settings.gender !== null) {
          this.searchCriteria.gender = settings.gender;
        }
        if (settings.ageMin !== undefined && settings.ageMin !== null) {
          this.searchCriteria.ageMin = settings.ageMin;
        }
        if (settings.ageMax !== undefined && settings.ageMax !== null) {
          this.searchCriteria.ageMax = settings.ageMax;
        }
        if (settings.distance !== undefined && settings.distance !== null) {
          this.searchCriteria.distance = settings.distance;
        }
        this.search();
      },
      error: () => {
        const user = this.authService.getCurrentUser();
        if (user?.gender === Gender.MAN) {
          this.searchCriteria.gender = Gender.WOMAN;
        } else if (user?.gender === Gender.WOMAN) {
          this.searchCriteria.gender = Gender.MAN;
        }
        this.search();
      }
    });
  }

  private loadSwipeLimit(): void {
    const user = this.authService.getCurrentUser();
    this.isPro = user?.isPro === true;
    if (this.isPro) {
      this.swipeLimit = -1;
      this.swipeRemaining = -1;
    }
  }

  private search(): void {
    this.loading = true;
    this.searchError = null;
    this.locationRequired = false;
    this.geoDataMissing = false;

    this.userService.getGisData().pipe(
      takeUntil(this.destroy$),
      switchMap((gis) => {
        if (gis?.lat == null || gis?.lon == null) {
          this.geoDataMissing = true;
          this.locationRequired = true;
          this.userPlaceLabel = null;
          this.cards = [];
          this.loading = false;
          return EMPTY;
        }

        this.resolveUserPlace(gis.lat, gis.lon);
        return this.searchService.searchByFilter(this.searchCriteria);
      })
    ).subscribe({
      next: (users) => {
        this.swipeService.setCards(users);
        this.cards = this.swipeService.getCards();
        this.loadVisiblePhotos();
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.cards = [];
        const message = err?.error?.errors?.[0]?.message || err?.error?.message || '';
        if (err?.status === 404 && message.toLowerCase().includes('coordinates')) {
          this.geoDataMissing = true;
          this.locationRequired = true;
          this.userPlaceLabel = null;
        } else {
          this.searchError = message || 'Не удалось выполнить поиск';
        }
      }
    });
  }

  private resolveUserPlace(lat: number, lon: number): void {
    this.geoService.reverseGeocode(lat, lon).pipe(takeUntil(this.destroy$)).subscribe({
      next: (details) => {
        this.userPlaceLabel = details.placeName || details.displayName || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      },
      error: () => {
        this.userPlaceLabel = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      }
    });
  }

  private loadVisiblePhotos(): void {
    const isMobileLayout = window.matchMedia('(max-width: 1024px)').matches;
    const photoSize: PhotoSize = photoSizeForLargeDisplay();
    const cardsToLoad = isMobileLayout ? this.cards.slice(0, 2) : this.cards;
    cardsToLoad.forEach(card => {
      if (card.user.id && !card.photoDataUrl) {
        this.userService.getPhoto(card.user.id, photoSize).pipe(takeUntil(this.destroy$)).subscribe({
          next: (bytes: Uint8Array) => {
            UserService.revokePhotoUrl(card.photoDataUrl);
            card.photoDataUrl = UserService.createPhotoUrl(bytes);
          },
          error: () => {
            card.photoDataUrl = this.userService.getProfilePhotoUrl(card.user.id!, undefined, photoSize);
          }
        });
      }
    });
  }

  loadNextPhoto(): void {
    const nextIndex = 2;
    if (this.cards.length > nextIndex) {
      const card = this.cards[nextIndex];
      if (card.user.id && !card.photoDataUrl) {
        const photoSize = photoSizeForLargeDisplay();
        this.userService.getPhoto(card.user.id, photoSize).pipe(takeUntil(this.destroy$)).subscribe({
          next: (bytes: Uint8Array) => {
            UserService.revokePhotoUrl(card.photoDataUrl);
            card.photoDataUrl = UserService.createPhotoUrl(bytes);
          },
          error: () => {
            card.photoDataUrl = this.userService.getProfilePhotoUrl(card.user.id!, undefined, photoSize);
          }
        });
      }
    }
  }

  getAge(birthday?: string, age?: number): number {
    if (age !== undefined && age !== null) return age;
    if (!birthday) return 0;
    const today = new Date();
    const birth = new Date(birthday);
    let ageCalc = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      ageCalc--;
    }
    return ageCalc;
  }

  getZodiacSignByNumber(horo?: number): string {
    if (!horo || horo < 1 || horo > 12) return '';
    const signs = ['♑', '♒', '♓', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐'];
    return signs[horo - 1] || '';
  }

  getZodiacSign(birthday?: string, horo?: number): string {
    // Если есть horo (порядковый номер знака), используем его
    if (horo && horo >= 1 && horo <= 12) {
      return this.getZodiacSignByNumber(horo);
    }

    // Fallback: вычисляем по дате рождения
    if (!birthday) return '';
    const date = new Date(birthday);
    const day = date.getDate();
    const month = date.getMonth() + 1;

    const zodiacSigns: Array<{ sign: string; startDay: number; endDay: number; month: number }> = [
      { sign: '♑', startDay: 22, endDay: 31, month: 12 },
      { sign: '♑', startDay: 1, endDay: 19, month: 1 },
      { sign: '♒', startDay: 20, endDay: 31, month: 1 },
      { sign: '♒', startDay: 1, endDay: 18, month: 2 },
      { sign: '♓', startDay: 19, endDay: 29, month: 2 },
      { sign: '♓', startDay: 1, endDay: 20, month: 3 },
      { sign: '♈', startDay: 21, endDay: 31, month: 3 },
      { sign: '♈', startDay: 1, endDay: 19, month: 4 },
      { sign: '♉', startDay: 20, endDay: 30, month: 4 },
      { sign: '♉', startDay: 1, endDay: 20, month: 5 },
      { sign: '♊', startDay: 21, endDay: 31, month: 5 },
      { sign: '♊', startDay: 1, endDay: 20, month: 6 },
      { sign: '♋', startDay: 21, endDay: 30, month: 6 },
      { sign: '♋', startDay: 1, endDay: 22, month: 7 },
      { sign: '♌', startDay: 23, endDay: 31, month: 7 },
      { sign: '♌', startDay: 1, endDay: 22, month: 8 },
      { sign: '♍', startDay: 23, endDay: 31, month: 8 },
      { sign: '♍', startDay: 1, endDay: 22, month: 9 },
      { sign: '♎', startDay: 23, endDay: 30, month: 9 },
      { sign: '♎', startDay: 1, endDay: 22, month: 10 },
      { sign: '♏', startDay: 23, endDay: 31, month: 10 },
      { sign: '♏', startDay: 1, endDay: 21, month: 11 },
      { sign: '♐', startDay: 22, endDay: 30, month: 11 },
      { sign: '♐', startDay: 1, endDay: 21, month: 12 },
      { sign: '♑', startDay: 22, endDay: 31, month: 12 }
    ];

    for (const z of zodiacSigns) {
      if (month === z.month && day >= z.startDay && day <= z.endDay) {
        return z.sign;
      }
    }
    return '';
  }

  getCompatibilityPercent(user: UserInfo): number {
    return getSummaryCompatibilityAverage(user.compare);
  }

  getCompatibilityDetails(user: UserInfo): Array<{ name: string; label: string; value: number }> {
    return getSummaryCompatibility(user.compare);
  }

  getCompatibilityBadges(user: UserInfo): Array<{ name: string; label: string; value: number }> {
    return this.getCompatibilityDetails(user);
  }

  // Методы для десктопной версии
  removeCard(card: SwipeCard): void {
    this.decrementSwipeLimit();
    this.trackSwipeDecision(card, SwipeDirection.LEFT);
    this.removeCardFromLists(card);
  }

  likeProfile(card: SwipeCard): void {
    this.decrementSwipeLimit();
    this.trackSwipeDecision(card, SwipeDirection.RIGHT);
    this.removeCardFromLists(card);
  }

  superLikeProfile(card: SwipeCard): void {
    const swiped = this.swipeService.swipe(SwipeDirection.UP);
    if (swiped) {
      this.decrementSwipeLimit();
    }
  }

  openProfile(card?: SwipeCard): void {
    if (!this.isUserVerified || !card?.user.id) {
      return;
    }
    void this.router.navigate(['/user', card.user.id]);
  }

  undoSwipe(): void {
    const card = this.swipeService.undo();
    if (card) {
      if (!this.isPro && this.swipeRemaining < this.swipeLimit) {
        this.swipeRemaining++;
      }
    }
  }

  canUndo(): boolean {
    return this.swipeService.canUndo();
  }

  manualSwipe(direction: SwipeDirection): void {
    if (this.cards.length === 0) return;

    const card = this.swipeService.swipe(direction);
    if (card) {
      this.decrementSwipeLimit();
    }
  }

  private decrementSwipeLimit(): void {
    if (!this.isPro && this.swipeRemaining > 0) {
      this.swipeRemaining--;
    }
  }

  private handleSwipeResult(result: SwipeResult): void {
    this.trackSwipeDecision(result.card, result.direction);

    // Обновляем список карточек
    setTimeout(() => {
      this.cards = this.swipeService.getCards().slice(this.swipeService.getCurrentIndex());
      this.loadNextPhoto();
    }, 300);
  }

  private trackSwipeDecision(card: SwipeCard, direction: SwipeDirection): void {
    const targetUserId = card.user.id;
    if (!targetUserId) {
      return;
    }

    if (direction === SwipeDirection.RIGHT || direction === SwipeDirection.UP) {
      this.bookmarksService.addBookmark({ userId: targetUserId }).pipe(
        switchMap(() => this.matchService.checkMatch(targetUserId)),
        takeUntil(this.destroy$)
      ).subscribe({
        next: ({ isMatch }) => {
          if (isMatch) {
            this.openMatchModal(card);
          }
        },
        error: () => { /* bookmark or match check failed — non-critical */ }
      });
      return;
    }

    if (direction === SwipeDirection.LEFT) {
      this.swipeActionService.skipUser(targetUserId).pipe(takeUntil(this.destroy$)).subscribe({
        error: () => { /* skip tracking failed — non-critical */ }
      });
    }
  }

  private removeCardFromLists(card: SwipeCard): void {
    const index = this.cards.indexOf(card);
    if (index >= 0) {
      this.cards.splice(index, 1);
      this.cards = [...this.cards];
    }

    const serviceCards = this.swipeService.getCards();
    const serviceIndex = serviceCards.findIndex((item) => item.user.id === card.user.id);
    if (serviceIndex >= 0) {
      serviceCards.splice(serviceIndex, 1);
    }
  }

  get showMobileSwipeControls(): boolean {
    if (this.cards.length > 0 || this.loading) {
      return true;
    }
    return this.geoDataMissing || this.locationRequired || !!this.searchError;
  }

  openFilters(): void {
    this.showFilters = true;
  }

  async shareProfile(): Promise<void> {
    if (!this.currentUserId || this.sharing) {
      return;
    }
    this.sharing = true;
    try {
      const result = await this.shareService.shareProfile(this.currentUserId, this.currentUserName);
      if (result === 'copied') {
        await this.modalService.alert('Ссылка на профиль скопирована в буфер обмена');
      } else if (result === 'failed') {
        await this.modalService.alert('Не удалось поделиться профилем. Попробуйте ещё раз.');
      }
    } finally {
      this.sharing = false;
    }
  }

  closeMatchModal(): void {
    this.showMatchModal = false;
    this.matchedUser = null;
    this.matchedUserPhoto = null;
    this.currentUserPhoto = null;
  }

  private openMatchModal(card: SwipeCard): void {
    if (this.showMatchModal) {
      return;
    }
    this.matchedUser = card.user;
    this.matchedUserPhoto = card.photoDataUrl
      ?? (card.user.id ? this.userService.getProfilePhotoUrl(card.user.id, 0, 'card') : null);
    const currentUser = this.authService.getCurrentUser();
    this.currentUserPhoto = currentUser?.id
      ? this.userService.getProfilePhotoUrl(currentUser.id, 0, 'card')
      : null;
    this.showMatchModal = true;
  }

  closeFilters(): void {
    this.showFilters = false;
  }

  applyFilters(): void {
    const settings: UserSettings = {
      gender: this.searchCriteria.gender,
      ageMin: this.searchCriteria.ageMin,
      ageMax: this.searchCriteria.ageMax,
      distance: this.searchCriteria.distance
    };

    this.userService.saveUserSettings(settings).subscribe({
      next: () => {
        this.search();
        this.closeFilters();
      },
      error: () => {
        this.search();
        this.closeFilters();
      }
    });
  }

  onAgeMinChange(): void {
    if (this.searchCriteria.ageMin !== undefined &&
        this.searchCriteria.ageMax !== undefined &&
        this.searchCriteria.ageMin >= this.searchCriteria.ageMax) {
      this.searchCriteria.ageMax = this.searchCriteria.ageMin + 1;
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (this.showFilters || this.loading) return;
    if (this.cards.length === 0) return;

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        this.manualSwipe(SwipeDirection.RIGHT);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.manualSwipe(SwipeDirection.LEFT);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.manualSwipe(SwipeDirection.UP);
        break;
      case 'z':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.undoSwipe();
        }
        break;
    }
  }
}
