import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SearchService } from '../../core/services/search.service';
import { UserService } from '../../core/services/user.service';
import { UserInfo, Gender, UserSearch } from '../../core/models/user.model';
import { FormsModule } from '@angular/forms';

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
            <input type="range" class="form-range" [(ngModel)]="searchCriteria.distance" min="0.05" max="30" step="0.05">
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
                    [src]="user.image || 'assets/default-avatar.png'"
                    class="card-img-top user-card-img"
                    [alt]="user.name">
                  <div class="card-body">
                    <h5 class="card-title">{{ user.name }}</h5>
                    <p class="card-text text-muted">
                      {{ user.age || (user.birthday ? getAge(user.birthday) : 'N/A') }} лет, {{ getGenderText(user.gender) }}
                    </p>
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
  users: UserInfo[] = [];
  loading = false;
  Gender = Gender;

  searchCriteria: UserSearch = {
    gender: Gender.WOMAN,
    ageMin: 18,
    ageMax: 45,
    distance: 10
  };

  constructor(
    private searchService: SearchService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.search();
  }

  search(): void {
    this.loading = true;
    this.searchService.searchByFilter(this.searchCriteria).subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.users = [];
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

  getGenderText(gender?: Gender): string {
    return gender === Gender.MAN ? 'М' : 'Ж';
  }
}
