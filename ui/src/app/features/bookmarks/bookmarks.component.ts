import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { BookmarksService } from '../../core/services/bookmarks.service';
import { UserService } from '../../core/services/user.service';
import { UserInfo, PageableRequest } from '../../core/models/user.model';

interface UserWithPhoto extends UserInfo {
  photoDataUrl?: SafeUrl | null;
}

@Component({
  selector: 'app-bookmarks',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-header mb-4">
      <h1 class="page-title">
        <i class="bi bi-bookmark-heart me-2"></i>Избранное
      </h1>
      <p class="text-muted">Сохранённые профили</p>
    </div>

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
      <div class="row">
        @for (user of users; track user.id) {
          <div class="col-12 col-md-6 col-lg-4 mb-4">
            <div class="card user-card h-100">
              <div class="user-card-image-wrapper">
                <img
                  [src]="user.photoDataUrl || ''"
                  class="card-img-top user-card-img"
                  [alt]="user.name">
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
                  {{ getGenderText(user.gender) }}
                </p>
                @if (user.distance) {
                  <p class="user-card-distance small text-muted">
                    <i class="bi bi-geo-alt me-1"></i>{{ user.distance.toFixed(1) }} км
                  </p>
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

    .empty-state {
      max-width: 500px;
      margin: 2rem auto;
    }

    .user-card {
      transition: all 0.3s ease;
      overflow: hidden;

      &:hover {
        transform: translateY(-5px);
        box-shadow: 0 15px 35px rgba(253, 41, 123, 0.2);
      }
    }

    .user-card-image-wrapper {
      position: relative;
      overflow: hidden;
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
      color: #1f2937;
    }

    .user-card-info {
      font-size: 0.9rem;
      margin-bottom: 0.25rem;
    }

    .user-card-distance {
      margin-bottom: 0;
    }
  `]
})
export class BookmarksComponent implements OnInit {
  users: UserWithPhoto[] = [];
  loading = false;
  pageable: PageableRequest = { page: 0, size: 20 };

  constructor(
    private bookmarksService: BookmarksService,
    private userService: UserService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadBookmarks();
  }

  private loadBookmarks(): void {
    this.loading = true;
    this.bookmarksService.getBookmarks(this.pageable).subscribe({
      next: (users) => {
        this.users = users;
        this.loadPhotos();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private loadPhotos(): void {
    this.users.forEach(user => {
      if (user.id) {
        this.userService.getPhoto(user.id).subscribe({
          next: (bytes: Uint8Array) => {
            user.photoDataUrl = this.bytesToDataUrl(bytes);
          },
          error: () => {
            user.photoDataUrl = null;
          }
        });
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

  removeBookmark(userId: number | undefined): void {
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

  getGenderText(gender?: string): string {
    return gender === 'MAN' ? 'М' : 'Ж';
  }
}
