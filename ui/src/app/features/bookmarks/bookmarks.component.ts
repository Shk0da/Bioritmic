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
    <div class="card">
      <div class="card-header">
        <h5 class="mb-0">Избранное</h5>
      </div>
      <div class="card-body">
        @if (loading) {
          <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Загрузка...</span>
            </div>
          </div>
        } @else if (users.length === 0) {
          <div class="alert alert-info">
            У вас пока нет избранных. Добавьте пользователей в избранное со страницы поиска.
          </div>
        } @else {
          <div class="row">
            @for (user of users; track user.id) {
              <div class="col-md-4 mb-4">
                <div class="card h-100">
                  <img
                    [src]="user.photoDataUrl || ''"
                    class="card-img-top user-card-img"
                    [alt]="user.name">
                  <div class="card-body">
                    <h5 class="card-title">{{ user.name }}</h5>
                    <p class="card-text text-muted">
                      Возраст: {{ user.age || (user.birthday ? getAge(user.birthday) : 'N/A') }}, {{ getGenderText(user.gender) }}
                    </p>
                  </div>
                  <div class="card-footer bg-white">
                    <a [routerLink]="['/user', user.id]" class="btn btn-outline-primary btn-sm w-100 me-2">
                      Посмотреть профиль
                    </a>
                    <button class="btn btn-outline-danger btn-sm mt-2 w-100" (click)="removeBookmark(user.id)">
                      Удалить
                    </button>
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
