import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserService } from '../../../core/services/user.service';
import { PageBackLinkComponent } from '../../../shared/components/page-back-link/page-back-link.component';
import { registerPullToRefresh } from '../../../core/routing/register-pull-to-refresh.util';
import { normalizeRouteUrl } from '../../../core/routing/route-cache-refresh.util';
import { PullToRefreshService } from '../../../core/routing/pull-to-refresh.service';

@Component({
  selector: 'app-settings-hub',
  standalone: true,
  imports: [RouterLink, PageBackLinkComponent],
  template: `
    <app-page-back-link link="/profile/me" label="Назад к профилю"></app-page-back-link>

    <div class="page-header mb-4">
      <h1 class="page-title">
        <i class="bi bi-gear me-2"></i>Настройки
      </h1>
      <p class="text-muted">Параметры поиска и приложения</p>
    </div>

    <div class="row">
      <div class="col-12 col-lg-8 mx-auto">
        <div class="card">
          <div class="card-body p-0">
            <div class="list-group list-group-flush">
              <a routerLink="/settings/search" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                <span><i class="bi bi-sliders me-2"></i>Параметры поиска</span>
                <i class="bi bi-chevron-right text-muted small"></i>
              </a>
              <a routerLink="/settings/notifications" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                <span><i class="bi bi-bell me-2"></i>Уведомления и приложение</span>
                <i class="bi bi-chevron-right text-muted small"></i>
              </a>
              <a routerLink="/settings/appearance" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                <span><i class="bi bi-palette me-2"></i>Оформление</span>
                <i class="bi bi-chevron-right text-muted small"></i>
              </a>
              <a routerLink="/settings/location" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                <span><i class="bi bi-geo-alt me-2"></i>Моё местоположение</span>
                <i class="bi bi-chevron-right text-muted small"></i>
              </a>
              <a routerLink="/settings/feedback" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                <span><i class="bi bi-chat-left-text me-2"></i>Обратная связь</span>
                <i class="bi bi-chevron-right text-muted small"></i>
              </a>
              <a routerLink="/settings/danger" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center text-danger">
                <span><i class="bi bi-exclamation-triangle me-2"></i>Опасная зона</span>
                <i class="bi bi-chevron-right text-muted small"></i>
              </a>
              <a routerLink="/settings/blocked" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                <span><i class="bi bi-slash-circle me-2"></i>Заблокированные</span>
                <span class="badge bg-secondary">{{ blockedCount }}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SettingsHubComponent implements OnInit {
  blockedCount = 0;
  private readonly destroyRef = inject(DestroyRef);
  private readonly pullToRefreshService = inject(PullToRefreshService);

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadBlockedCount();
    registerPullToRefresh(this.pullToRefreshService, this.destroyRef, (url) => normalizeRouteUrl(url) === '/settings', () => ({
      refresh: () => this.loadBlockedCount(),
    }));
  }

  private loadBlockedCount(): void {
    this.userService.getBlockedCount().subscribe({
      next: (res) => { this.blockedCount = res.count; },
      error: () => { this.blockedCount = 0; }
    });
  }
}
