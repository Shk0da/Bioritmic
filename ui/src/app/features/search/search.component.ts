import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { SearchService } from '../../core/services/search.service';
import { UserService } from '../../core/services/user.service';
import { UserInfo, Gender, UserSearch, UserSettings } from '../../core/models/user.model';
import { FormsModule } from '@angular/forms';

interface UserWithPhoto extends UserInfo {
  photoDataUrl?: string | null;
}

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="row">
      <div class="col-md-3">
        <div class="search-filters">
          <h5 class="mb-3">Фильтры</h5>

          <div class="mb-3">
            <label class="form-label">Пол</label>
            <select class="form-select" [(ngModel)]="searchCriteria.gender">
              <option [value]="Gender.MAN">Мужской</option>
              <option [value]="Gender.WOMAN">Женский</option>
            </select>
          </div>

          <div class="mb-3">
            <label class="form-label">Возраст от</label>
            <input type="number" class="form-control" [(ngModel)]="searchCriteria.ageMin" min="14" max="100">
          </div>

          <div class="mb-3">
            <label class="form-label">Возраст до</label>
            <input type="number" class="form-control" [(ngModel)]="searchCriteria.ageMax" min="14" max="100">
          </div>

          <div class="mb-3">
            <label class="form-label">Расстояние (км)</label>
            <input type="range" class="form-range" [(ngModel)]="searchCriteria.distance" min="0.05" max="100" step="0.05">
            <span class="text-muted">{{ searchCriteria.distance }} км</span>
          </div>

          <button class="btn btn-primary w-100" (click)="search()">Найти</button>
        </div>
      </div>

      <div class="col-md-9">
        <h4 class="mb-4">Результаты поиска</h4>

        @if (loading) {
          <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Загрузка...</span>
            </div>
          </div>
        } @else if (users.length === 0) {
          <div class="alert alert-info">
            Пользователи не найдены. Попробуйте изменить параметры поиска.
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
                    
                    @if (user.compare || user.isBioCompatible !== undefined || user.isHoroCompatible !== undefined) {
                      <hr class="my-3">
                      <div class="compatibility-section">
                        <h6 class="small text-muted mb-2">Совместимость</h6>
                        @if (user.compare) {
                          <div class="compatibility-details-compact">
                            @for (item of getAllCompatibility(user); track item.name) {
                              <div class="compatibility-item-compact">
                                <span class="small text-muted me-2">{{ item.label }}:</span>
                                <span class="small fw-bold" [class.text-success]="item.value >= 70" [class.text-warning]="item.value >= 40 && item.value < 70" [class.text-danger]="item.value < 40">
                                  {{ item.value }}%
                                </span>
                              </div>
                            }
                          </div>
                        }
                      </div>
                    }
                  </div>
                  <div class="card-footer bg-white">
                    <a [routerLink]="['/user', user.id]" class="btn btn-outline-primary btn-sm w-100">
                      Посмотреть профиль
                    </a>
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
export class SearchComponent implements OnInit {
  users: UserWithPhoto[] = [];
  loading = false;
  Gender = Gender;

  searchCriteria: UserSearch = {
    gender: Gender.WOMAN,
    ageMin: 18,
    ageMax: 65,
    distance: 30
  };

  constructor(
    private searchService: SearchService,
    private userService: UserService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadUserSettings();
  }

  private loadUserSettings(): void {
    this.userService.getUserSettings().subscribe({
      next: (settings: UserSettings) => {
        // Применяем настройки пользователя к критериям поиска
        if (settings.gender !== undefined) {
          this.searchCriteria.gender = settings.gender;
        }
        if (settings.ageMin !== undefined) {
          this.searchCriteria.ageMin = settings.ageMin;
        }
        if (settings.ageMax !== undefined) {
          this.searchCriteria.ageMax = settings.ageMax;
        }
        if (settings.distance !== undefined) {
          this.searchCriteria.distance = settings.distance;
        }
        // Выполняем поиск с загруженными настройками
        this.search();
      },
      error: () => {
        // Если настройки не загружены, выполняем поиск с настройками по умолчанию
        this.search();
      }
    });
  }

  search(): void {
    this.loading = true;
    this.searchService.searchByFilter(this.searchCriteria).subscribe({
      next: (users) => {
        this.users = users;
        this.loadPhotos();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.users = [];
      }
    });
  }

  loadPhotos(): void {
    this.users.forEach(user => {
      if (user.id) {
        this.userService.getPhoto(user.id, 'card').subscribe({
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

  getGenderText(gender?: Gender): string {
    return gender === Gender.MAN ? 'М' : 'Ж';
  }

  getComparePercent(user: UserWithPhoto): number {
    if (!user.compare) return 0;
    const values = Object.values(user.compare);
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / values.length * 100);
  }

  getAllCompatibility(user: UserWithPhoto): Array<{ name: string; label: string; value: number }> {
    if (!user.compare) return [];

    const labels: Record<string, string> = {
      'Physical': 'Физическая',
      'Intellectual': 'Интеллект',
      'Heartfelt': 'Сердечная'
    };

    // Фильтруем только нужные типы совместимости
    const neededTypes = ['Physical', 'Intellectual', 'Heartfelt'];

    return Object.entries(user.compare)
      .filter(([name]) => neededTypes.includes(name))
      .map(([name, value]) => ({
        name,
        label: labels[name] || name,
        value: Math.round(value)
      }));
  }
}
