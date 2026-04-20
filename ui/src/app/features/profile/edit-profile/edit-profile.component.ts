import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { UserService } from '../../../core/services/user.service';
import { UserInfo, Gender } from '../../../core/models/user.model';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="row">
      <div class="col-md-8 mx-auto">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">Редактирование профиля</h5>
          </div>
          <div class="card-body">
            <!-- Фото профиля -->
            <div class="text-center mb-4">
              <div class="position-relative d-inline-block">
                <img
                  [src]="photoDataUrl || ''"
                  class="profile-avatar rounded-circle"
                  style="width: 150px; height: 150px; object-fit: cover;">
                <label for="photoUpload" class="btn btn-primary btn-sm position-absolute" style="bottom: 0; right: 0; border-radius: 50%; width: 40px; height: 40px; padding: 0; display: flex; align-items: center; justify-content: center; cursor: pointer;">
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
            </div>

            <form (ngSubmit)="save()">
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
                    [(ngModel)]="user.email"
                    name="email"
                    required
                    disabled>
                  <small class="text-muted">Email нельзя изменить</small>
                </div>
              </div>

              <div class="row">
                <div class="col-md-6 mb-3">
                  <label for="birthday" class="form-label">Дата рождения</label>
                  <input
                    type="text"
                    class="form-control"
                    id="birthday"
                    [(ngModel)]="user.birthday"
                    name="birthday"
                    placeholder="yyyy-MM-dd"
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
                <button type="submit" class="btn btn-primary" [disabled]="!isFormValid()">
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `
})
export class EditProfileComponent implements OnInit {
  user: Partial<UserInfo> = {};
  photoFile: File | null = null;
  photoDataUrl: SafeUrl | null = null;
  Gender = Gender;

  constructor(
    private userService: UserService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadProfile();
    this.loadPhoto();
  }

  private loadProfile(): void {
    this.userService.getCurrentUser().subscribe({
      next: (user: UserInfo) => {
        this.user = { ...user };
      }
    });
  }

  private loadPhoto(): void {
    this.userService.getPhoto().subscribe({
      next: (bytes: Uint8Array) => {
        this.photoDataUrl = this.bytesToDataUrl(bytes);
      },
      error: () => {
        this.photoDataUrl = null;
      }
    });
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.photoFile = input.files[0];
      // Показываем превью
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.photoDataUrl = this.sanitizer.bypassSecurityTrustUrl(e.target.result);
      };
      reader.readAsDataURL(this.photoFile);
    }
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

  isFormValid(): boolean {
    return !!(this.user.name && this.user.email && this.user.birthday && this.user.gender);
  }

  save(): void {
    // Сначала обновляем профиль
    this.userService.updateUser(this.user).subscribe({
      next: () => {
        // Если есть новое фото, загружаем его
        if (this.photoFile) {
          this.userService.uploadPhoto(this.photoFile).subscribe({
            next: () => {
              this.router.navigate(['/profile/me']);
            },
            error: (error: any) => {
              console.error('Failed to upload photo', error);
              alert('Профиль сохранён, но фото не загружено');
              this.router.navigate(['/profile/me']);
            }
          });
        } else {
          this.router.navigate(['/profile/me']);
        }
      },
      error: (error: any) => {
        console.error('Failed to update profile', error);
        alert('Ошибка сохранения профиля');
      }
    });
  }
}
