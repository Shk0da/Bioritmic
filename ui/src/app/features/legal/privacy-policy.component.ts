import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PrivacyPolicyContentComponent } from './privacy-policy-content.component';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [RouterLink, PrivacyPolicyContentComponent],
  template: `
    <div class="legal-page">
      <div class="legal-card card">
        <div class="card-body p-4">
          <a routerLink="/auth/registration" class="legal-back">
            <i class="bi bi-arrow-left me-1"></i>К регистрации
          </a>
          <h1 class="legal-title">Политика конфиденциальности и согласие на обработку персональных данных</h1>
          <p class="legal-meta text-muted">Сервис Bioritmic · bioritmic.ru · редакция от 01.07.2026</p>
          <app-privacy-policy-content linkMode="route" />
        </div>
      </div>
    </div>
  `,
  styles: [`
    .legal-page {
      min-height: 100vh;
      padding: 1rem;
      background: var(--bg-primary, #f8fafc);
    }

    .legal-card {
      max-width: 820px;
      margin: 0 auto;
      border: none;
      border-radius: 16px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
    }

    .legal-back {
      display: inline-flex;
      align-items: center;
      text-decoration: none;
      color: #fd297b;
      font-weight: 600;
      margin-bottom: 1rem;
    }

    .legal-title {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 0.35rem;
    }

    .legal-meta {
      font-size: 0.9rem;
      margin-bottom: 1.5rem;
    }
  `],
})
export class PrivacyPolicyComponent {}
