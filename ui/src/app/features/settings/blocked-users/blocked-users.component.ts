import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserService } from '../../../core/services/user.service';
import { UserInfo, Gender, PageableRequest } from '../../../core/models/user.model';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

interface BlockedUser extends UserInfo {
  photoDataUrl?: string | null;
}

@Component({
  selector: 'app-blocked-users',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-container">
      <div class="page-header mb-4">
        <h1 class="page-title">
          <i class="bi bi-slash-circle me-2"></i>Заблокированные пользователи
        </h1>
        <p class="text-muted">Управление чёрным списком</p>
      </div>

      @if (loading) {
        <div class="card">
          <div class="card-body text-center py-5">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Загрузка...</span>
            </div>
          </div>
        </div>
      } @else if (users.length === 0) {
        <div class="card empty-state">
          <div class="card-body text-center py-5">
            <i class="bi bi-check-circle display-1 text-success mb-3"></i>
            <h4 class="text-muted">Чистый список</h4>
            <p class="text-muted">У вас нет заблокированных пользователей</p>
          </div>
        </div>
      } @else {
        <div class="users-grid">
          @for (user of users; track user.id) {
            <div class="user-card">
              <div class="user-photo-wrapper">
                <img
                  [src]="user.photoDataUrl || 'assets/img/default-avatar.svg'"
                  class="user-photo"
                  [alt]="user.name">
                <div class="user-overlay">
                  <button
                    class="btn-unblock"
                    (click)="unblockUser(user.id!)"
                    title="Разблокировать">
                    <i class="bi bi-check-circle"></i>
                  </button>
                </div>
              </div>
              <div class="user-info">
                <h6 class="user-name">{{ user.name }}</h6>
                <p class="user-age">{{ getAge(user.birthday, user.age) }} лет</p>
                <p class="user-gender">
                  <i class="bi bi-person"></i> {{ getGenderText(user.gender) }}
                </p>
              </div>
            </div>
          }
        </div>

        @if (hasMore) {
          <div class="text-center mt-4">
            <button class="btn btn-load-more" (click)="loadMore()">
              <i class="bi bi-arrow-down"></i> Загрузить ещё
            </button>
          </div>
        }
      }
    </div>

    <!-- Модальное окно подтверждения -->
    @if (showConfirmModal) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <i class="bi bi-question-circle modal-icon"></i>
            <h5 class="modal-title">Разблокировать пользователя?</h5>
          </div>
          <div class="modal-body">
            <p>Вы уверены, что хотите разблокировать этого пользователя?</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-cancel" (click)="closeModal()">
              <i class="bi bi-x-lg"></i> Отмена
            </button>
            <button class="btn btn-confirm" (click)="confirmUnblock()">
              <i class="bi bi-check-lg"></i> Разблокировать
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page-container {
      padding: 1rem 0;
    }

    .page-header {
      text-align: center;
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

    .users-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-top: 1.5rem;
    }

    .user-card {
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
      position: relative;

      &:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
      }
    }

    .user-photo-wrapper {
      position: relative;
      height: 220px;
      overflow: hidden;
    }

    .user-photo {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    .user-card:hover .user-photo {
      transform: scale(1.05);
    }

    .user-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .user-card:hover .user-overlay {
      opacity: 1;
    }

    .btn-unblock {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
      border: none;
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(74, 222, 128, 0.4);
      }
    }

    .user-info {
      padding: 1rem;
      text-align: center;
    }

    .user-name {
      margin: 0 0 0.5rem 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-primary, #1f2937);
    }

    .user-age,
    .user-gender {
      margin: 0.25rem 0;
      font-size: 0.9rem;
      color: var(--text-secondary, #6b7280);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
    }

    .btn-load-more {
      padding: 0.75rem 2rem;
      background: linear-gradient(135deg, #fd297b 0%, #ff655b 100%);
      border: none;
      color: white;
      border-radius: 25px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(253, 41, 123, 0.4);
      }
    }

    /* Modal styles */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 1rem;
      backdrop-filter: blur(4px);
    }

    .modal-content {
      background: white;
      border-radius: 20px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: modalSlideIn 0.3s ease;
    }

    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .modal-header {
      padding: 2rem 1.5rem 1rem;
      text-align: center;
    }

    .modal-icon {
      font-size: 3rem;
      color: #f59e0b;
      margin-bottom: 1rem;
    }

    .modal-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary, #1f2937);
    }

    .modal-body {
      padding: 0 1.5rem 1.5rem;
      text-align: center;
      color: var(--text-secondary, #6b7280);
    }

    .modal-footer {
      padding: 1rem 1.5rem 1.5rem;
      display: flex;
      gap: 0.75rem;
      justify-content: center;
    }

    .btn-cancel,
    .btn-confirm {
      padding: 0.75rem 1.5rem;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
      justify-content: center;
      max-width: 150px;
    }

    .btn-cancel {
      background: var(--bg-secondary, #f3f4f6);
      color: var(--text-secondary, #6b7280);

      &:hover {
        background: var(--border-color, #e5e7eb);
      }
    }

    .btn-confirm {
      background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
      color: white;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(74, 222, 128, 0.4);
      }
    }
  `]
})
export class BlockedUsersComponent implements OnInit {
  users: BlockedUser[] = [];
  loading = false;
  pageable: PageableRequest = { page: 0, size: 20 };
  hasMore = false;
  showConfirmModal = false;
  userToUnblock?: string;

  constructor(
    private userService: UserService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadBlockedUsers();
  }

  private loadBlockedUsers(): void {
    this.loading = true;
    this.userService.getBlockedUsers(this.pageable).subscribe({
      next: (users) => {
        this.users = users;
        this.hasMore = users.length === this.pageable.size;
        this.loadPhotos();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.showError('Ошибка загрузки заблокированных пользователей');
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

  loadMore(): void {
    this.pageable = { ...this.pageable, page: this.pageable.page + 1 };
    this.userService.getBlockedUsers(this.pageable).subscribe({
      next: (users) => {
        this.users = [...this.users, ...users];
        this.hasMore = users.length === this.pageable.size;
        this.loadPhotos();
      }
    });
  }

  unblockUser(userId: string): void {
    this.userToUnblock = userId;
    this.showConfirmModal = true;
  }

  closeModal(): void {
    this.showConfirmModal = false;
    this.userToUnblock = undefined;
  }

  confirmUnblock(): void {
    if (this.userToUnblock) {
      this.userService.unblockUser(this.userToUnblock).subscribe({
        next: () => {
          this.users = this.users.filter(u => u.id !== this.userToUnblock);
          this.closeModal();
          this.showSuccess('Пользователь разблокирован');
        },
        error: () => {
          this.closeModal();
          this.showError('Ошибка разблокировки пользователя');
        }
      });
    }
  }

  private showSuccess(message: string): void {
    // Можно добавить красивый toast notification
    console.log('✓', message);
  }

  private showError(message: string): void {
    console.error('✗', message);
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

  getGenderText(gender?: Gender): string {
    if (gender === Gender.MAN) return 'Мужской';
    if (gender === Gender.WOMAN) return 'Женский';
    return 'Не указан';
  }
}
