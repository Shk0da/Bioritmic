import { Component, DestroyRef, inject } from '@angular/core';
import { PageBackLinkComponent } from '../../../shared/components/page-back-link/page-back-link.component';
import { ThemeService, Theme } from '../../../core/services/theme.service';
import { registerPullToRefresh } from '../../../core/routing/register-pull-to-refresh.util';
import { normalizeRouteUrl } from '../../../core/routing/route-cache-refresh.util';
import { PullToRefreshService } from '../../../core/routing/pull-to-refresh.service';

@Component({
  selector: 'app-appearance-settings',
  standalone: true,
  imports: [PageBackLinkComponent],
  template: `
    <app-page-back-link link="/settings" label="Назад к настройкам"></app-page-back-link>

    <div class="page-header mb-4">
      <h1 class="page-title">
        <i class="bi bi-palette me-2"></i>Оформление
      </h1>
      <p class="text-muted">Цветовая схема приложения</p>
    </div>

    <div class="row">
      <div class="col-12 col-lg-8 mx-auto">
        <div class="card">
          <div class="card-body">
            <div class="fw-semibold mb-2">Цветовая схема</div>
            <p class="small text-muted mb-3">Выберите светлую или тёмную тему интерфейса</p>
            <div class="theme-options" role="group" aria-label="Цветовая схема">
              <button
                type="button"
                class="theme-option"
                [class.active]="themeService.theme() === 'light'"
                (click)="selectTheme('light')">
                <i class="bi bi-sun-fill"></i>
                <span>Светлая</span>
              </button>
              <button
                type="button"
                class="theme-option"
                [class.active]="themeService.theme() === 'dark'"
                (click)="selectTheme('dark')">
                <i class="bi bi-moon-stars-fill"></i>
                <span>Тёмная</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .theme-options {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;
    }

    .theme-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1rem;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      background: var(--bg-secondary);
      color: var(--text-primary);
      font-weight: 600;
      transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;

      i {
        font-size: 1.35rem;
      }

      &.active {
        border-color: var(--accent-pink);
        background: color-mix(in srgb, var(--accent-pink) 12%, var(--card-bg));
        color: var(--accent-pink);
      }
    }
  `]
})
export class AppearanceSettingsComponent {
  readonly themeService = inject(ThemeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pullToRefreshService = inject(PullToRefreshService);

  constructor() {
    registerPullToRefresh(this.pullToRefreshService, this.destroyRef, (url) => normalizeRouteUrl(url) === '/settings/appearance', () => ({
      refresh: () => undefined,
    }));
  }

  selectTheme(theme: Theme): void {
    this.themeService.setTheme(theme);
  }
}
