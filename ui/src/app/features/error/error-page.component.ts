import { Component, computed, inject, input } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

type ErrorCode = '401' | '403' | '404' | '500';

@Component({
  selector: 'app-error-page',
  standalone: true,
  imports: [RouterLink, NgClass],
  template: `
    <div class="error-page">
      <div class="error-bg-shapes" aria-hidden="true">
        <span class="shape shape-1"></span>
        <span class="shape shape-2"></span>
        <span class="shape shape-3"></span>
      </div>

      <div class="error-floating" aria-hidden="true">
        <i class="bi bi-heart-fill float-icon float-1"></i>
        <i class="bi bi-heart float-icon float-2"></i>
        <i class="bi bi-stars float-icon float-3"></i>
        <i class="bi bi-heart-half float-icon float-4"></i>
      </div>

      <main class="error-card">
        <div class="error-logo">
          <div class="logo-couple">
            <i class="bi bi-person-heart"></i>
            <i class="bi bi-person-hearts"></i>
          </div>
        </div>

        <p class="error-code">{{ displayCode() }}</p>

        <h1 class="error-title">{{ title() }}</h1>
        <p class="error-message">{{ message() }}</p>

        <div class="error-actions">
          <a [routerLink]="primaryLink()" class="btn btn-primary">
            <i class="bi me-2" [ngClass]="primaryIcon()"></i>{{ primaryLabel() }}
          </a>
        </div>

        <p class="error-hint">
          @if (showReload()) {
            @if (isAuthenticated()) {
              Если проблема повторяется, попробуйте позже или напишите в
              <a routerLink="/settings/feedback">обратную связь</a>.
            } @else {
              Если проблема повторяется, попробуйте позже.
            }
          } @else if (code() === '401') {
            Войдите в аккаунт, чтобы продолжить.
          } @else if (code() === '403') {
            У вас нет прав для просмотра этой страницы.
          } @else {
            Проверьте адрес или вернитесь на главную.
          }
        </p>
      </main>
    </div>
  `,
  styles: [`
    .error-page {
      min-height: 100vh;
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      padding-top: calc(1.5rem + env(safe-area-inset-top));
      padding-bottom: calc(1.5rem + env(safe-area-inset-bottom));
      background: var(--tinder-gradient);
      position: relative;
      overflow: hidden;
    }

    .error-bg-shapes::before {
      content: '';
      position: absolute;
      inset: 0;
      background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
      animation: patternRotate 40s linear infinite;
    }

    @keyframes patternRotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .shape {
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.08);
      filter: blur(1px);
    }

    .shape-1 {
      width: 280px;
      height: 280px;
      top: -80px;
      right: -60px;
      animation: drift 8s ease-in-out infinite;
    }

    .shape-2 {
      width: 200px;
      height: 200px;
      bottom: -40px;
      left: -50px;
      animation: drift 10s ease-in-out infinite reverse;
    }

    .shape-3 {
      width: 120px;
      height: 120px;
      top: 40%;
      left: 10%;
      animation: drift 6s ease-in-out infinite;
    }

    @keyframes drift {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-18px); }
    }

    .error-floating {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .float-icon {
      position: absolute;
      color: rgba(255, 255, 255, 0.2);
      font-size: 1.5rem;
    }

    .float-1 { top: 12%; left: 8%; animation: float 5s ease-in-out infinite; }
    .float-2 { top: 20%; right: 12%; font-size: 2rem; animation: float 7s ease-in-out infinite 0.5s; }
    .float-3 { bottom: 18%; right: 18%; animation: float 6s ease-in-out infinite 1s; }
    .float-4 { bottom: 22%; left: 14%; font-size: 1.25rem; animation: float 8s ease-in-out infinite 1.5s; }

    @keyframes float {
      0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.25; }
      50% { transform: translateY(-12px) rotate(8deg); opacity: 0.45; }
    }

    .error-card {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 480px;
      background: var(--card-bg);
      border-radius: 28px;
      padding: 2.5rem 2rem;
      text-align: center;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.25);
      animation: cardIn 0.5s ease;
    }

    @keyframes cardIn {
      from {
        opacity: 0;
        transform: translateY(24px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .error-logo .logo-couple {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }

    .error-logo .logo-couple i {
      background: var(--tinder-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .error-logo .logo-couple i:first-child { transform: rotate(-8deg); }
    .error-logo .logo-couple i:last-child { transform: rotate(8deg); }

    .error-code {
      font-size: 5rem;
      font-weight: 800;
      line-height: 1;
      margin: 0.5rem 0 1rem;
      background: var(--tinder-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -0.04em;
    }

    .error-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 0.75rem;
    }

    .error-message {
      color: var(--text-secondary);
      margin: 0 0 2rem;
      line-height: 1.6;
      font-size: 1rem;
    }

    .error-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      justify-content: center;
      margin-bottom: 1.5rem;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.75rem 1.5rem;
      border-radius: 14px;
      font-weight: 600;
      font-size: 0.95rem;
      text-decoration: none;
      border: none;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .btn:hover {
      transform: translateY(-2px);
    }

    .btn-primary {
      background: var(--tinder-gradient);
      color: white;
      box-shadow: 0 8px 24px rgba(253, 41, 123, 0.35);
    }

    .btn-primary:hover {
      box-shadow: 0 12px 28px rgba(253, 41, 123, 0.45);
      color: white;
    }

    .btn-outline {
      background: var(--bg-secondary);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
    }

    .error-hint {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin: 0;
      line-height: 1.5;
    }

    .error-hint a {
      color: var(--accent-pink);
      text-decoration: none;
      font-weight: 600;
    }

    .error-hint a:hover {
      text-decoration: underline;
    }
  `]
})
export class ErrorPageComponent {
  code = input<string>('404');

  private authService = inject(AuthService);

  private normalizedCode = computed((): ErrorCode => {
    const value = this.code();
    if (value === '401' || value === '403' || value === '404' || value === '500') {
      return value;
    }
    return '404';
  });

  displayCode = computed(() => this.normalizedCode());
  showReload = computed(() => this.normalizedCode() === '500');
  isAuthenticated = computed(() => this.authService.isAuthenticated());

  title = computed(() => {
    switch (this.normalizedCode()) {
      case '401':
        return 'Требуется вход';
      case '403':
        return 'Доступ запрещён';
      case '500':
        return 'Сервер временно недоступен';
      default:
        return 'Страница не найдена';
    }
  });

  message = computed(() => {
    switch (this.normalizedCode()) {
      case '401':
        return 'Для доступа к этой странице нужно войти в аккаунт.';
      case '403':
        return 'У вас нет прав для просмотра этого раздела. Если считаете, что это ошибка — обратитесь в поддержку.';
      case '500':
        return 'На сервере произошла ошибка. Мы уже работаем над этим — попробуйте обновить страницу через минуту.';
      default:
        return 'Похоже, эта страница ушла на свидание и не вернулась. Проверьте ссылку или вернитесь на главную.';
    }
  });

  primaryLink = computed(() => {
    if (this.normalizedCode() === '401') {
      return '/auth/login';
    }
    return this.authService.isAuthenticated() ? '/swipe' : '/auth/login';
  });

  primaryLabel = computed(() => {
    if (this.normalizedCode() === '401') {
      return 'Войти';
    }
    return this.authService.isAuthenticated() ? 'На главную' : 'Войти';
  });

  primaryIcon = computed(() =>
    this.normalizedCode() === '401' ? 'bi-box-arrow-in-right' : 'bi-house-heart'
  );
}
