import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-page-back-link',
  standalone: true,
  imports: [RouterLink],
  template: `
    <a [routerLink]="link" class="page-back-link">
      <span class="page-back-link__icon" aria-hidden="true">
        <i class="bi bi-arrow-left"></i>
      </span>
      <span>{{ label }}</span>
    </a>
  `
})
export class PageBackLinkComponent {
  @Input() link = '/profile/me';
  @Input() label = 'Назад к профилю';
}
