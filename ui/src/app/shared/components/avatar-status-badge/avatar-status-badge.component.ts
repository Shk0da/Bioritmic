import { Component, computed, input } from '@angular/core';
import { NgStyle } from '@angular/common';
import { normalizeUserStatusPosition, statusPositionStyles, UserStatusPosition } from '../../utils/user-status.util';

@Component({
  selector: 'app-avatar-status-badge',
  standalone: true,
  imports: [NgStyle],
  template: `
    @if (emoji()) {
      <span
        class="avatar-status-badge"
        [class.avatar-status-badge--sm]="size() === 'sm'"
        [class.avatar-status-badge--md]="size() === 'md'"
        [class.avatar-status-badge--lg]="size() === 'lg'"
        [ngStyle]="positionStyle()"
        aria-hidden="true">
        {{ emoji() }}
      </span>
    }
  `,
  styles: [`
    .avatar-status-badge {
      position: absolute;
      z-index: 4;
      line-height: 1;
      pointer-events: none;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.35));
    }

    .avatar-status-badge--sm {
      font-size: 1.2rem;
    }

    .avatar-status-badge--md {
      font-size: 1.75rem;
    }

    .avatar-status-badge--lg {
      font-size: 2.35rem;
    }
  `]
})
export class AvatarStatusBadgeComponent {
  emoji = input<string | null | undefined>(null);
  position = input<UserStatusPosition | string | null | undefined>(null);
  size = input<'sm' | 'md' | 'lg'>('md');

  positionStyle = computed(() =>
    statusPositionStyles(normalizeUserStatusPosition(this.position()))
  );
}
