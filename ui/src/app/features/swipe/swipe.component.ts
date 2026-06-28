import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SearchService } from '../../core/services/search.service';
import { UserService } from '../../core/services/user.service';
import { BookmarksService } from '../../core/services/bookmarks.service';
import { SwipeService, SwipeResult } from '../../core/services/swipe.service';
import { MatchService } from '../../core/services/match.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { AuthService } from '../../core/services/auth.service';
import { UserInfo, Gender, UserSearch, UserSettings, SwipeDirection, SwipeCard } from '../../core/models/user.model';
import { FormsModule } from '@angular/forms';
import { NgClass, NgStyle } from '@angular/common';

import { StoriesBarComponent } from '../../shared/components/stories-bar/stories-bar.component';

@Component({
  selector: 'app-swipe',
  standalone: true,
  imports: [RouterLink, FormsModule, NgClass, NgStyle, StoriesBarComponent],
  template: `
    <div class="swipe-container">
      <app-stories-bar></app-stories-bar>

      <!-- Кнопка фильтров (мобильная) -->
      <div class="mobile-filters-btn">
        <button class="control-btn btn-filter" (click)="openFilters()">
          <i class="bi bi-funnel"></i>
        </button>
      </div>

      <!-- Мобильная версия: Tinder-карточки -->
      <div class="mobile-swipe-container">
        @if (cards.length === 0 && !loading) {
          <div class="no-cards">
            <div class="no-cards-icon">
              <i class="bi" [ngClass]="locationRequired ? 'bi-geo-alt' : 'bi-emoji-frown'"></i>
            </div>
            @if (locationRequired) {
              <h3>Укажите местоположение</h3>
              <p class="text-muted">Для поиска людей рядом нужно добавить геолокацию</p>
              <a routerLink="/settings/location" class="btn btn-primary mt-3">
                <i class="bi bi-geo-alt"></i> Указать местоположение
              </a>
            } @else {
              <h3>Пользователи закончились</h3>
              <p class="text-muted">{{ searchError || 'Попробуйте расширить параметры поиска' }}</p>
              <button class="btn btn-primary mt-3" (click)="openFilters()">
                <i class="bi bi-funnel"></i> Изменить фильтры
              </button>
            }
          </div>
        } @else {
          @for (card of cards.slice(0, 2); track card.user.id; let i = $index) {
            <div
              class="swipe-card"
              [class.top-card]="i === 0"
              [class.next-card]="i === 1"
              [class.swipe-left]="i === 0 && swipeDirection === SwipeDirection.LEFT"
              [class.swipe-right]="i === 0 && swipeDirection === SwipeDirection.RIGHT"
              [style.transform]="i === 0 ? cardTransform : ''"
              [style.opacity]="i === 0 ? 1 : 0.95"
              [style.z-index]="10 - i"
              (mousedown)="onDragStart($event)"
              (touchstart)="onDragStart($event)"
            >
              <!-- Фото пользователя -->
              <div class="card-photo" [style.backgroundImage]="'url(' + (card.photoDataUrl || card.user.image || '') + ' '">
                <div class="photo-overlay"></div>

                <!-- Индикаторы свайпа -->
                @if (i === 0) {
                  <div class="swipe-indicator like" [class.visible]="swipeDirection === SwipeDirection.RIGHT">
                    <i class="bi bi-heart-fill"></i>
                    <span>LIKE</span>
                  </div>
                  <div class="swipe-indicator nope" [class.visible]="swipeDirection === SwipeDirection.LEFT">
                    <i class="bi bi-x-lg"></i>
                    <span>NOPE</span>
                  </div>
                  <div class="swipe-indicator superlike" [class.visible]="swipeDirection === SwipeDirection.UP">
                    <i class="bi bi-star-fill"></i>
                    <span>SUPER</span>
                  </div>
                }

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
              <i class="bi" [ngClass]="locationRequired ? 'bi-geo-alt' : 'bi-emoji-frown'"></i>
            </div>
            @if (locationRequired) {
              <h3>Укажите местоположение</h3>
              <p class="text-muted">Для поиска людей рядом нужно добавить геолокацию</p>
              <a routerLink="/settings/location" class="btn btn-primary mt-3">
                <i class="bi bi-geo-alt"></i> Указать местоположение
              </a>
            } @else {
              <h3>Пользователи закончились</h3>
              <p class="text-muted">{{ searchError || 'Попробуйте расширить параметры поиска' }}</p>
              <button class="btn btn-primary mt-3" (click)="openFilters()">
                <i class="bi bi-funnel"></i> Изменить фильтры
              </button>
            }
          </div>
        } @else {
          <div class="profiles-grid">
            @for (card of cards; track card.user.id) {
              <div class="profile-card">
                <div class="profile-card-photo" [style.backgroundImage]="'url(' + (card.photoDataUrl || card.user.image || '') + ' '">
                  <div class="online-badge"></div>
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
      <div class="swipe-controls">
        <button class="control-btn btn-undo" (click)="undoSwipe()" [disabled]="cards.length === 0 && !canUndo()" title="Отменить">
          <i class="bi bi-arrow-counterclockwise"></i>
        </button>
        <button class="control-btn btn-dislike" (click)="manualSwipe(SwipeDirection.LEFT)" [disabled]="cards.length === 0 || (!isPro && swipeRemaining <= 0)">
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
              <option [value]="Gender.MAN">Мужской</option>
              <option [value]="Gender.WOMAN">Женский</option>
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
  `,
  styleUrls: ['./swipe.component.scss']
})
export class SwipeComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('cardsContainer') cardsContainer!: ElementRef;

  cards: SwipeCard[] = [];
  loading = false;
  showFilters = false;
  searchError: string | null = null;
  locationRequired = false;
  SwipeDirection = SwipeDirection;
  Gender = Gender;
  Math = Math;

  searchCriteria: UserSearch = {
    gender: Gender.WOMAN,
    ageMin: 18,
    ageMax: 65,
    distance: 50
  };

  // Для drag-and-drop
  private isDragging = false;
  private startX = 0;
  private startY = 0;
  private currentX = 0;
  private currentY = 0;
  private boundOnDragMove: ((e: MouseEvent | TouchEvent) => void) | null = null;
  private boundOnDragEnd: ((e: MouseEvent | TouchEvent) => void) | null = null;
  private boundOnKeyDown: ((e: KeyboardEvent) => void) | null = null;

  cardTransform = '';
  swipeDirection: SwipeDirection = SwipeDirection.NONE;
  private destroy$ = new Subject<void>();

  // Swipe limit state
  swipeLimit = -1;
  swipeRemaining = -1;
  isPro = false;
  isUserVerified = true;
  swipeHistory: Array<{ direction: SwipeDirection; card: SwipeCard }> = [];

  constructor(
    private searchService: SearchService,
    private userService: UserService,
    private bookmarksService: BookmarksService,
    private swipeService: SwipeService,
    private matchService: MatchService,
    private subscriptionService: SubscriptionService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isUserVerified = this.authService.getCurrentUser()?.isVerified !== false;
    this.loadUserSettings();
    this.loadSwipeLimit();

    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
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
        this.resetCard();
      });
  }

  ngAfterViewInit(): void {
    this.boundOnDragMove = this.onDragMove.bind(this);
    this.boundOnDragEnd = this.onDragEnd.bind(this);
    this.boundOnKeyDown = this.onKeyDown.bind(this);
    document.addEventListener('mousemove', this.boundOnDragMove);
    document.addEventListener('mouseup', this.boundOnDragEnd);
    document.addEventListener('touchmove', this.boundOnDragMove);
    document.addEventListener('touchend', this.boundOnDragEnd);
    document.addEventListener('keydown', this.boundOnKeyDown);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.boundOnDragMove) {
      document.removeEventListener('mousemove', this.boundOnDragMove);
      document.removeEventListener('touchmove', this.boundOnDragMove);
    }
    if (this.boundOnDragEnd) {
      document.removeEventListener('mouseup', this.boundOnDragEnd);
      document.removeEventListener('touchend', this.boundOnDragEnd);
    }
    if (this.boundOnKeyDown) {
      document.removeEventListener('keydown', this.boundOnKeyDown);
    }
    this.cards.forEach(card => UserService.revokePhotoUrl(card.photoDataUrl));
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
    this.searchService.searchByFilter(this.searchCriteria).subscribe({
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
          this.locationRequired = true;
        } else {
          this.searchError = message || 'Не удалось выполнить поиск';
        }
      }
    });
  }

  private loadVisiblePhotos(): void {
    const visibleCards = this.cards.slice(0, 2);
    visibleCards.forEach(card => {
      if (card.user.id && !card.photoDataUrl) {
        this.userService.getPhoto(card.user.id).pipe(takeUntil(this.destroy$)).subscribe({
          next: (bytes: Uint8Array) => {
            UserService.revokePhotoUrl(card.photoDataUrl);
            card.photoDataUrl = UserService.createPhotoUrl(bytes);
          },
          error: () => {
            card.photoDataUrl = card.user.image || null;
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
        this.userService.getPhoto(card.user.id).pipe(takeUntil(this.destroy$)).subscribe({
          next: (bytes: Uint8Array) => {
            UserService.revokePhotoUrl(card.photoDataUrl);
            card.photoDataUrl = UserService.createPhotoUrl(bytes);
          },
          error: () => {
            card.photoDataUrl = card.user.image || null;
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
    if (!user.compare) return 0;
    const values = Object.values(user.compare);
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / values.length);
  }

  getCompatibilityDetails(user: UserInfo): Array<{ name: string; label: string; value: number }> {
    if (!user.compare) return [];

    const labels: Record<string, string> = {
      'Physical': 'Физическая',
      'Intellectual': 'Интеллект',
      'Heartfelt': 'Сердечная'
    };

    const allowedTypes = ['Heartfelt', 'Physical', 'Intellectual'];

    return Object.entries(user.compare)
      .filter(([name]) => allowedTypes.includes(name))
      .map(([name, value]) => ({
        name,
        label: labels[name] || name,
        value: Math.round(value)
      }));
  }

  getCompatibilityBadges(user: UserInfo): Array<{ name: string; label: string; value: number }> {
    return this.getCompatibilityDetails(user);
  }

  // Методы для десктопной версии
  removeCard(card: SwipeCard): void {
    const index = this.cards.indexOf(card);
    if (index >= 0) {
      this.cards.splice(index, 1);
      this.cards = [...this.cards];
    }
  }

  likeProfile(card: SwipeCard): void {
    this.swipeService.swipe(SwipeDirection.RIGHT);
  }

  superLikeProfile(card: SwipeCard): void {
    this.swipeService.swipe(SwipeDirection.UP);
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

  // Drag and Drop логика
  onDragStart(event: MouseEvent | TouchEvent): void {
    if (this.cards.length === 0 || this.loading) return;

    this.isDragging = true;
    this.startX = this.getClientX(event);
    this.startY = this.getClientY(event);
    this.currentX = 0;
    this.currentY = 0;
    this.swipeDirection = SwipeDirection.NONE;
  }

  onDragMove(event: MouseEvent | TouchEvent): void {
    if (!this.isDragging || this.cards.length === 0) return;

    const clientX = this.getClientX(event);
    const clientY = this.getClientY(event);

    this.currentX = clientX - this.startX;
    this.currentY = clientY - this.startY;

    if (this.currentX > 50) {
      this.swipeDirection = SwipeDirection.RIGHT;
    } else if (this.currentX < -50) {
      this.swipeDirection = SwipeDirection.LEFT;
    } else if (this.currentY < -80) {
      this.swipeDirection = SwipeDirection.UP;
    } else {
      this.swipeDirection = SwipeDirection.NONE;
    }

    if (this.currentY < -80) {
      const scale = Math.max(0.8, 1 + (this.currentY + 80) * 0.002);
      this.cardTransform = `translate(${this.currentX}px, ${this.currentY}px) scale(${scale})`;
    } else {
      const rotate = this.currentX * 0.1;
      this.cardTransform = `translate(${this.currentX}px, ${this.currentY}px) rotate(${rotate}deg)`;
    }
  }

  onDragEnd(event: MouseEvent | TouchEvent): void {
    if (!this.isDragging) return;

    this.isDragging = false;

    const threshold = 100;

    if (this.swipeDirection === SwipeDirection.RIGHT && this.currentX > threshold) {
      this.completeSwipe(SwipeDirection.RIGHT);
    } else if (this.swipeDirection === SwipeDirection.LEFT && this.currentX < -threshold) {
      this.completeSwipe(SwipeDirection.LEFT);
    } else if (this.swipeDirection === SwipeDirection.UP && this.currentY < -threshold) {
      this.completeSwipe(SwipeDirection.UP);
    } else {
      this.resetCard();
    }
  }

  private completeSwipe(direction: SwipeDirection): void {
    const card = this.swipeService.swipe(direction);
    if (card) {
      this.decrementSwipeLimit();
      this.handleSwipeResult({ direction, card });
    }
    this.resetCard();
  }

  private resetCard(): void {
    this.cardTransform = 'translate(0, 0) rotate(0)';
    this.swipeDirection = SwipeDirection.NONE;
    this.currentX = 0;
    this.currentY = 0;
  }

  manualSwipe(direction: SwipeDirection): void {
    if (this.cards.length === 0) return;

    const card = this.swipeService.swipe(direction);
    if (card) {
      this.decrementSwipeLimit();
      this.handleSwipeResult({ direction, card });
    }
  }

  private decrementSwipeLimit(): void {
    if (!this.isPro && this.swipeRemaining > 0) {
      this.swipeRemaining--;
    }
  }

  private handleSwipeResult(result: SwipeResult): void {
    // Здесь можно отправить результат на сервер
    console.log('Swipe result:', result);

    // Сохраняем в избранное при лайке
    if (result.direction === SwipeDirection.RIGHT || result.direction === SwipeDirection.UP) {
      if (result.card.user.id) {
        this.bookmarksService.addBookmark({ userId: result.card.user.id }).subscribe({
          next: () => console.log('Добавлено в избранное'),
          error: () => console.error('Ошибка добавления в избранное')
        });
      }
    }

    // Обновляем список карточек
    setTimeout(() => {
      this.cards = this.swipeService.getCards().slice(this.swipeService.getCurrentIndex());
      this.resetCard();
      // Загружаем фото для следующей карточки
      this.loadNextPhoto();
    }, 300);
  }

  private getClientX(event: MouseEvent | TouchEvent): number {
    if (event instanceof MouseEvent) {
      return event.clientX;
    }
    return (event as TouchEvent).touches[0].clientX;
  }

  private getClientY(event: MouseEvent | TouchEvent): number {
    if (event instanceof MouseEvent) {
      return event.clientY;
    }
    return (event as TouchEvent).touches[0].clientY;
  }

  openFilters(): void {
    this.showFilters = true;
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
