import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserService } from '../../../core/services/user.service';
import { UserInfo, Gender, PageableRequest } from '../../../core/models/user.model';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-blocked-users',
  standalone: true,
  imports: [RouterLink, NgClass],
  template: `
    <div class="row">
      <div class="col-md-10 mx-auto">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Заблокированные пользователи</h5>
            <a routerLink="/settings" class="btn btn-sm btn-outline-secondary">Назад</a>
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
                <p class="mb-0">У вас нет заблокированных пользователей.</p>
              </div>
            } @else {
              <div class="table-responsive">
                <table class="table table-hover">
                  <thead>
                    <tr>
                      <th>Пользователь</th>
                      <th>Пол</th>
                      <th>Возраст</th>
                      <th class="text-end">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (user of users; track user.id) {
                      <tr>
                        <td>
                          <div class="d-flex align-items-center">
                            <img
                              [src]="user.image || 'assets/default-avatar.png'"
                              class="rounded-circle me-3"
                              [alt]="user.name"
                              style="width: 50px; height: 50px; object-fit: cover;">
                            <div>
                              <h6 class="mb-0">{{ user.name }}</h6>
                              <small class="text-muted">{{ user.email }}</small>
                            </div>
                          </div>
                        </td>
                        <td>{{ getGenderText(user.gender) }}</td>
                        <td>{{ user.age || 'N/A' }}</td>
                        <td class="text-end">
                          <button
                            class="btn btn-sm btn-outline-success"
                            (click)="unblockUser(user.id!)">
                            Разблокировать
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              @if (hasMore) {
                <div class="text-center mt-3">
                  <button class="btn btn-outline-primary" (click)="loadMore()">
                    Загрузить ещё
                  </button>
                </div>
              }
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class BlockedUsersComponent implements OnInit {
  users: UserInfo[] = [];
  loading = false;
  pageable: PageableRequest = { page: 0, size: 20 };
  hasMore = false;

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadBlockedUsers();
  }

  private loadBlockedUsers(): void {
    this.loading = true;
    this.userService.getBlockedUsers(this.pageable).subscribe({
      next: (users) => {
        this.users = users;
        this.hasMore = users.length === this.pageable.size;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        alert('Ошибка загрузки заблокированных пользователей');
      }
    });
  }

  loadMore(): void {
    this.pageable = { ...this.pageable, page: this.pageable.page + 1 };
    this.userService.getBlockedUsers(this.pageable).subscribe({
      next: (users) => {
        this.users = [...this.users, ...users];
        this.hasMore = users.length === this.pageable.size;
      }
    });
  }

  unblockUser(userId: number): void {
    if (confirm('Разблокировать этого пользователя?')) {
      this.userService.unblockUser(userId).subscribe({
        next: () => {
          this.users = this.users.filter(u => u.id !== userId);
          alert('Пользователь разблокирован');
        },
        error: () => {
          alert('Ошибка разблокировки пользователя');
        }
      });
    }
  }

  getGenderText(gender?: Gender): string {
    return gender === Gender.MAN ? 'М' : 'Ж';
  }
}
