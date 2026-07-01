import { Component, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output, ViewChild, ElementRef } from '@angular/core';
import { LegalDocumentType, LEGAL_DOCUMENT_TITLES } from './legal-document-type';
import { UserAgreementContentComponent } from './user-agreement-content.component';
import { PrivacyPolicyContentComponent } from './privacy-policy-content.component';

@Component({
  selector: 'app-legal-fullscreen-modal',
  standalone: true,
  imports: [UserAgreementContentComponent, PrivacyPolicyContentComponent],
  template: `
    @if (visible && document) {
      <div
        class="legal-modal-overlay"
        role="presentation"
        (click)="close()">
        <div
          class="legal-modal"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="title"
          (click)="$event.stopPropagation()">
          <header class="legal-modal-header">
            <h1 class="legal-modal-title">{{ title }}</h1>
            <button
              type="button"
              class="legal-modal-close"
              aria-label="Закрыть"
              (click)="close()">
              <i class="bi bi-x-lg"></i>
            </button>
          </header>
          <div class="legal-modal-body" #modalBody>
            <p class="legal-modal-meta text-muted">Сервис Bioritmic · bioritmic.ru · редакция от 01.07.2026</p>
            @if (document === 'user-agreement') {
              <app-user-agreement-content
                linkMode="modal"
                (openPrivacyPolicy)="switchDocument('privacy-policy')" />
            } @else {
              <app-privacy-policy-content
                linkMode="modal"
                (openUserAgreement)="switchDocument('user-agreement')" />
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .legal-modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 12000;
      background: rgba(15, 23, 42, 0.72);
      display: flex;
      flex-direction: column;
      padding: 0;
      animation: legalModalFadeIn 0.2s ease;
    }

    @keyframes legalModalFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .legal-modal {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      max-height: 100dvh;
      background: var(--bg-primary, #ffffff);
      color: var(--text-primary, #1f2937);
    }

    .legal-modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1rem 0.75rem;
      border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
      flex-shrink: 0;
      padding-top: calc(1rem + var(--app-safe-top, 0px));
      padding-left: calc(1rem + var(--app-safe-left, 0px));
      padding-right: calc(1rem + var(--app-safe-right, 0px));
    }

    .legal-modal-title {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      line-height: 1.35;
      padding-right: 0.5rem;
    }

    .legal-modal-close {
      flex-shrink: 0;
      width: 44px;
      height: 44px;
      border: none;
      border-radius: 50%;
      background: var(--bg-secondary, #f1f5f9);
      color: var(--text-primary, #1f2937);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      cursor: pointer;
    }

    .legal-modal-close:hover {
      background: rgba(253, 41, 123, 0.12);
      color: #fd297b;
    }

    .legal-modal-body {
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      padding: 1rem 1.25rem 1.5rem;
      padding-bottom: calc(1.5rem + var(--app-safe-bottom, 0px));
      padding-left: calc(1.25rem + var(--app-safe-left, 0px));
      padding-right: calc(1.25rem + var(--app-safe-right, 0px));
      max-width: 820px;
      width: 100%;
      margin: 0 auto;
      box-sizing: border-box;
    }

    .legal-modal-meta {
      font-size: 0.9rem;
      margin-bottom: 1.25rem;
    }
  `],
})
export class LegalFullscreenModalComponent implements OnChanges, OnDestroy {
  @Input() visible = false;
  @Input() document: LegalDocumentType | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() documentChange = new EventEmitter<LegalDocumentType>();
  @ViewChild('modalBody') private modalBody?: ElementRef<HTMLElement>;

  get title(): string {
    return this.document ? LEGAL_DOCUMENT_TITLES[this.document] : '';
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.visible) {
      this.close();
    }
  }

  ngOnChanges(): void {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = this.visible ? 'hidden' : '';
    }
    if (this.visible) {
      this.scrollModalToTop();
    }
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }

  close(): void {
    this.closed.emit();
  }

  switchDocument(document: LegalDocumentType): void {
    this.documentChange.emit(document);
    this.scrollModalToTop();
  }

  private scrollModalToTop(): void {
    queueMicrotask(() => this.modalBody?.nativeElement.scrollTo({ top: 0 }));
  }
}
