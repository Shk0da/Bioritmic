import { Component, Input, OnChanges } from '@angular/core';
import { LinkifiedPart, linkifyText } from '../../utils/linkify-text.util';

@Component({
  selector: 'app-linkified-text',
  standalone: true,
  template: `
    @for (part of parts; track $index) {
      @if (part.type === 'link') {
        <a
          class="linkified-text__link"
          [href]="part.href"
          target="_blank"
          rel="noopener noreferrer"
          (click)="$event.stopPropagation()">{{ part.text }}</a>
      } @else {
        <span>{{ part.text }}</span>
      }
    }
  `,
  host: {
    '[class.linkified-text--single-line]': 'singleLine',
  },
  styles: [`
    :host {
      white-space: pre-wrap;
      word-break: break-word;
    }

    :host.linkified-text--single-line {
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    .linkified-text__link {
      color: var(--accent-pink);
      text-decoration: underline;
      word-break: break-all;
    }

    :host.linkified-text--single-line .linkified-text__link {
      word-break: normal;
    }

    :host-context(.message-bubble.outgoing) .linkified-text__link {
      color: rgba(255, 255, 255, 0.95);
    }

    :host-context(.system-message) .linkified-text__link {
      color: var(--accent-pink);
    }
  `],
})
export class LinkifiedTextComponent implements OnChanges {
  @Input({ required: true }) text = '';
  @Input() singleLine = false;

  parts: LinkifiedPart[] = [];

  ngOnChanges(): void {
    this.parts = linkifyText(this.text);
  }
}
