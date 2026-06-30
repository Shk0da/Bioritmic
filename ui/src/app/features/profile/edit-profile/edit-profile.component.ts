import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { UserInfo, Gender } from '../../../core/models/user.model';
import { Subject, finalize, map, of, switchMap, takeUntil } from 'rxjs';
import { ImageCropModalComponent } from '../../../shared/components/image-crop-modal/image-crop-modal.component';
import { AvatarStatusBadgeComponent } from '../../../shared/components/avatar-status-badge/avatar-status-badge.component';
import {
  normalizeUserStatusPosition,
} from '../../../shared/utils/user-status.util';
import {
  formatDateForInput,
  maxBirthdayForMinAge,
  meetsMinimumAge,
  MIN_AGE_PROFILE_MESSAGE
} from '../../../shared/utils/age-validation.util';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [RouterLink, FormsModule, ImageCropModalComponent, AvatarStatusBadgeComponent],
  template: `
    @if (saving) {
      <div class="saving-overlay">
        <div class="saving-spinner">
          <div class="spinner-ring"></div>
          <p>{{ uploadingPhoto ? 'Загрузка фото...' : 'Сохранение профиля...' }}</p>
        </div>
      </div>
    }

    <div class="row">
      <div class="col-md-8 mx-auto">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">Редактирование профиля</h5>
          </div>
          <div class="card-body">
            <!-- Фото профиля -->
            <div class="text-center mb-4 d-flex flex-column align-items-center">
              <div class="avatar-preview position-relative d-inline-block">
                @if (saving) {
                  <div class="photo-loading-overlay">
                    <div class="spinner-border text-primary" role="status">
                      <span class="visually-hidden">Загрузка...</span>
                    </div>
                  </div>
                }
                @if (photoDataUrl) {
                  <img
                    [src]="photoDataUrl"
                    class="profile-avatar rounded-circle"
                    style="width: 150px; height: 150px; object-fit: cover;">
                } @else {
                  <div
                    class="profile-avatar rounded-circle d-flex align-items-center justify-content-center profile-avatar-placeholder"
                    style="width: 150px; height: 150px;">
                    <i class="bi bi-person-fill fs-1"></i>
                  </div>
                }
                <app-avatar-status-badge
                  [emoji]="user.statusEmoji"
                  [position]="user.statusPosition"
                  size="lg">
                </app-avatar-status-badge>
                <label for="photoUpload" class="btn btn-primary btn-sm position-absolute" style="bottom: 0; right: 0; border-radius: 50%; width: 40px; height: 40px; padding: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 5;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                    <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
                  </svg>
                </label>
                <input
                  type="file"
                  id="photoUpload"
                  accept="image/*"
                  (change)="onPhotoSelected($event)"
                  class="d-none">
              </div>
              @if (photoFile) {
                <p class="text-muted small mt-2">Новое фото выбрано: {{ photoFile.name }}</p>
              }
              @if (hasUploadedPhoto) {
                <button type="button" class="btn btn-outline-danger btn-sm mt-2" (click)="deletePhoto()" [disabled]="saving">
                  Удалить фото
                </button>
              }
            </div>

            <form (ngSubmit)="save()" novalidate>
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label for="name" class="form-label">Имя</label>
                  <input
                    type="text"
                    class="form-control"
                    id="name"
                    [(ngModel)]="user.name"
                    name="name"
                    required>
                </div>

                <div class="col-md-6 mb-3">
                  <label for="email" class="form-label">Email</label>
                  <input
                    type="email"
                    class="form-control"
                    id="email"
                    [ngModel]="user.email"
                    name="email"
                    required
                    disabled>
                </div>
              </div>

              <div class="row mb-3">
                <div class="col-md-8">
                  <label for="newEmail" class="form-label">Сменить email</label>
                  <input
                    type="email"
                    class="form-control"
                    id="newEmail"
                    [(ngModel)]="newEmail"
                    name="newEmail"
                    placeholder="Новый email">
                </div>
                <div class="col-md-4 d-flex align-items-end">
                  <button type="button" class="btn btn-outline-primary w-100" (click)="requestEmailChange()" [disabled]="!newEmail || savingEmail">
                    @if (savingEmail) {
                      <span class="spinner-border spinner-border-sm"></span>
                    } @else {
                      Запросить смену
                    }
                  </button>
                </div>
              </div>
              @if (emailChangeMessage) {
                <div class="alert alert-info py-2 small">{{ emailChangeMessage }}</div>
              }

              <div class="mb-3">
                <label for="bio" class="form-label">Обо мне</label>
                <textarea
                  class="form-control"
                  id="bio"
                  rows="4"
                  maxlength="500"
                  [(ngModel)]="user.bio"
                  name="bio"
                  placeholder="Расскажите о себе — это увидят другие пользователи"></textarea>
                <div class="form-text text-end">{{ (user.bio || '').length }}/500</div>
              </div>

              <div class="row">
                <div class="col-md-6 mb-3">
                  <label for="birthday" class="form-label">Дата рождения</label>
                  <input
                    type="date"
                    class="form-control"
                    id="birthday"
                    [(ngModel)]="user.birthday"
                    [max]="maxBirthday"
                    name="birthday"
                    required>
                </div>

                <div class="col-md-6 mb-3">
                  <label for="gender" class="form-label">Пол</label>
                  <select
                    class="form-control"
                    id="gender"
                    [(ngModel)]="user.gender"
                    name="gender"
                    required>
                    <option [ngValue]="Gender.MAN">Мужской</option>
                    <option [ngValue]="Gender.WOMAN">Женский</option>
                  </select>
                </div>
              </div>

              <div class="d-flex justify-content-between">
                <a routerLink="/profile/me" class="btn btn-outline-secondary">Отмена</a>
                <button type="submit" class="btn btn-primary" [disabled]="!canSave() || saving">
                  @if (saving) {
                    <span class="spinner-border spinner-border-sm me-2"></span>
                  }
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <app-image-crop-modal
      [visible]="cropVisible"
      [sourceFile]="cropSourceFile"
      preset="profile"
      (confirmed)="onPhotoCropped($event)"
      (cancelled)="onPhotoCropCancelled()">
    </app-image-crop-modal>
  `,
  styles: [`
    .saving-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      backdrop-filter: blur(4px);
    }

    .saving-spinner {
      background: var(--card-bg, white);
      border-radius: 16px;
      padding: 2rem;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .spinner-ring {
      width: 48px;
      height: 48px;
      border: 4px solid var(--border-color, #e5e7eb);
      border-top-color: #fd297b;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1rem;
    }

    .saving-spinner p {
      margin: 0;
      font-weight: 600;
      color: var(--text-primary, #1f2937);
    }

    .photo-loading-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 5;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .profile-avatar-placeholder {
      background: var(--bg-secondary);
      color: var(--text-muted);
    }

    .avatar-preview .photo-loading-overlay {
      border-radius: 50%;
    }
  `]
})
export class EditProfileComponent implements OnInit, OnDestroy {
  readonly maxBirthday = maxBirthdayForMinAge();
  user: Partial<UserInfo> = {};
  photoFile: File | null = null;
  cropVisible = false;
  cropSourceFile: File | null = null;
  photoDataUrl: string | null = null;
  newEmail = '';
  emailChangeMessage = '';
  savingEmail = false;
  Gender = Gender;
  saving = false;
  uploadingPhoto = false;
  hasUploadedPhoto = false;
  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    UserService.revokePhotoUrl(this.photoDataUrl);
  }

  private loadProfile(): void {
    this.userService.getCurrentUser().pipe(takeUntil(this.destroy$)).subscribe({
      next: (user: UserInfo) => {
        this.user = {
          ...user,
          birthday: this.formatBirthday(user.birthday),
          gender: this.normalizeGender(user.gender),
          statusEmoji: user.statusEmoji ?? null,
          statusPosition: user.statusEmoji
            ? normalizeUserStatusPosition(user.statusPosition)
            : null,
        };
        if (user.id) {
          this.loadPhoto(user.id);
          this.loadPhotoStatus(user.id);
        }
      }
    });
  }

  private formatBirthday(birthday: unknown): string {
    if (!birthday) {
      return '';
    }
    if (typeof birthday === 'string') {
      return birthday.length >= 10 ? birthday.slice(0, 10) : birthday;
    }
    if (birthday instanceof Date) {
      return formatDateForInput(birthday);
    }
    if (typeof birthday === 'object' && birthday !== null && 'time' in birthday) {
      const time = Number((birthday as { time?: number }).time);
      if (!Number.isNaN(time)) {
        return formatDateForInput(new Date(time));
      }
    }
    return '';
  }

  private normalizeGender(value: unknown): Gender {
    if (value === Gender.WOMAN || value === 'WOMAN') {
      return Gender.WOMAN;
    }
    return Gender.MAN;
  }

  private loadPhotoStatus(userId: string): void {
    this.userService.getUserPhotos(userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (photos) => {
        this.hasUploadedPhoto = photos.length > 0;
      },
      error: () => {
        this.hasUploadedPhoto = false;
      }
    });
  }

  private loadPhoto(userId: string): void {
    this.userService.resolveProfilePhotoUrl(userId, undefined, 'full').pipe(takeUntil(this.destroy$)).subscribe({
      next: (url) => {
        UserService.revokePhotoUrl(this.photoDataUrl);
        this.photoDataUrl = url;
      },
      error: () => {
        UserService.revokePhotoUrl(this.photoDataUrl);
        this.photoDataUrl = null;
      }
    });
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.cropSourceFile = file;
    this.cropVisible = true;
  }

  onPhotoCropped(file: File): void {
    this.cropVisible = false;
    this.cropSourceFile = null;
    this.photoFile = file;
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      UserService.revokePhotoUrl(this.photoDataUrl);
      this.photoDataUrl = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  onPhotoCropCancelled(): void {
    this.cropVisible = false;
    this.cropSourceFile = null;
  }

  requestEmailChange(): void {
    if (!this.newEmail) return;
    this.savingEmail = true;
    this.emailChangeMessage = '';
    this.userService.updateUser({ email: this.newEmail }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.savingEmail = false;
        this.emailChangeMessage = 'Письмо с подтверждением отправлено на текущий email.';
        this.newEmail = '';
      },
      error: () => {
        this.savingEmail = false;
        this.emailChangeMessage = 'Не удалось запросить смену email. Возможно, адрес уже занят.';
      }
    });
  }

  deletePhoto(): void {
    if (!confirm('Удалить фото профиля?')) return;
    this.saving = true;
    this.userService.deletePhoto().pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        UserService.revokePhotoUrl(this.photoDataUrl);
        this.photoDataUrl = null;
        this.photoFile = null;
        this.hasUploadedPhoto = false;
        this.saving = false;
      },
      error: () => {
        this.saving = false;
        alert('Не удалось удалить фото');
      }
    });
  }

  isProfileValid(): boolean {
    return !!(
      this.user.name?.trim() &&
      this.user.birthday &&
      this.user.gender &&
      meetsMinimumAge(this.user.birthday)
    );
  }

  canSave(): boolean {
    return this.isProfileValid() || (!!this.photoFile && !!this.user.id);
  }

  save(): void {
    if (!this.canSave()) {
      return;
    }

    const shouldUpdateProfile = this.isProfileValid();
    if (shouldUpdateProfile && (!this.user.birthday || !meetsMinimumAge(this.user.birthday))) {
      alert(MIN_AGE_PROFILE_MESSAGE);
      return;
    }

    const pendingPhoto = this.photoFile;
    this.saving = true;
    this.uploadingPhoto = !!pendingPhoto;

    const bio = this.user.bio?.trim();
    const update$ = shouldUpdateProfile
      ? this.userService.updateUser({
          name: this.user.name,
          birthday: this.user.birthday,
          gender: this.normalizeGender(this.user.gender),
          bio: bio || '',
        }).pipe(map(() => void 0))
      : of(void 0);

    update$.pipe(
      switchMap(() => pendingPhoto ? this.userService.uploadPhoto(pendingPhoto) : of(void 0)),
      finalize(() => {
        this.saving = false;
        this.uploadingPhoto = false;
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        if (pendingPhoto) {
          this.hasUploadedPhoto = true;
          UserService.revokePhotoUrl(this.photoDataUrl);
          const userId = this.user.id;
          this.photoDataUrl = userId
            ? this.userService.getProfilePhotoUrl(userId, Date.now(), 'full')
            : null;
          this.photoFile = null;
        }
        this.router.navigate(['/profile/me']);
      },
      error: () => {
        alert(pendingPhoto ? 'Не удалось сохранить изменения' : 'Ошибка сохранения профиля');
      }
    });
  }
}
