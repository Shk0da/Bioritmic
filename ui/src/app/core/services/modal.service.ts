import { Injectable, Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ModalConfig {
  title: string;
  message: string;
  icon?: 'question' | 'warning' | 'success' | 'error' | 'info';
  confirmText?: string;
  cancelText?: string;
  confirmClass?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private modalSubject: any = null;

  show(config: ModalConfig): Promise<boolean> {
    return new Promise((resolve) => {
      this.modalSubject = {
        config,
        onConfirm: () => {
          this.close();
          resolve(true);
        },
        onCancel: () => {
          this.close();
          resolve(false);
        }
      };

      // Dispatch custom event for modal component to listen
      window.dispatchEvent(new CustomEvent('modal:show', { detail: this.modalSubject }));
    });
  }

  close(): void {
    this.modalSubject = null;
    window.dispatchEvent(new CustomEvent('modal:close'));
  }

  getModalSubject(): any {
    return this.modalSubject;
  }

  async confirm(message: string, title: string = 'Подтверждение'): Promise<boolean> {
    return this.show({
      title,
      message,
      icon: 'question',
      confirmText: 'Подтвердить',
      cancelText: 'Отмена',
      confirmClass: 'btn-confirm'
    });
  }

  async alert(message: string, title: string = 'Информация'): Promise<void> {
    await this.show({
      title,
      message,
      icon: 'info',
      confirmText: 'OK',
      cancelText: undefined
    });
  }
}

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isVisible) {
      <div class="modal-overlay" (click)="onCancel()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <i class="bi {{ getIconClass() }} modal-icon"></i>
            <h5 class="modal-title">{{ config?.title }}</h5>
          </div>
          <div class="modal-body">
            <p>{{ config?.message }}</p>
          </div>
          <div class="modal-footer">
            @if (config?.cancelText) {
              <button class="btn btn-cancel" (click)="onCancel()">
                <i class="bi bi-x-lg"></i> {{ config?.cancelText }}
              </button>
            }
            <button class="btn {{ config?.confirmClass || 'btn-primary' }}" (click)="onConfirm()">
              <i class="bi bi-check-lg"></i> {{ config?.confirmText || 'OK' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 1rem;
      backdrop-filter: blur(4px);
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-content {
      background: var(--card-bg);
      border-radius: 20px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .modal-header {
      padding: 2rem 1.5rem 1rem;
      text-align: center;
    }

    .modal-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      display: block;
    }

    .modal-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .modal-body {
      padding: 0 1.5rem 1.5rem;
      text-align: center;
      color: var(--text-secondary);
    }

    .modal-body p {
      margin: 0;
    }

    .modal-footer {
      padding: 1rem 1.5rem 1.5rem;
      display: flex;
      gap: 0.75rem;
      justify-content: center;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
      justify-content: center;
      max-width: 150px;
    }

    .btn-cancel {
      background: var(--bg-secondary);
      color: var(--text-secondary);

      &:hover {
        background: var(--border-color);
      }
    }

    .btn-confirm, .btn-primary {
      background: linear-gradient(135deg, #fd297b 0%, #ff655b 100%);
      color: white;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(253, 41, 123, 0.4);
      }
    }

    .modal-icon.bi-question-circle { color: #f59e0b; }
    .modal-icon.bi-exclamation-triangle { color: #ef4444; }
    .modal-icon.bi-check-circle { color: #22c55e; }
    .modal-icon.bi-x-circle { color: #ef4444; }
    .modal-icon.bi-info-circle { color: #3b82f6; }
  `]
})
export class ModalComponent {
  isVisible = false;
  config: ModalConfig | null = null;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  private originalOnConfirm: (() => void) | null = null;
  private originalOnCancel: (() => void) | null = null;

  constructor(private modalService: ModalService) {
    window.addEventListener('modal:show', (event: any) => {
      this.config = event.detail.config;
      this.originalOnConfirm = event.detail.onConfirm;
      this.originalOnCancel = event.detail.onCancel;
      this.isVisible = true;
    });

    window.addEventListener('modal:close', () => {
      this.isVisible = false;
      this.config = null;
    });
  }

  onConfirm(): void {
    this.confirm.emit();
    this.originalOnConfirm?.();
    this.modalService.close();
  }

  onCancel(): void {
    this.cancel.emit();
    this.originalOnCancel?.();
    this.modalService.close();
  }

  getIconClass(): string {
    switch (this.config?.icon) {
      case 'question': return 'bi-question-circle';
      case 'warning': return 'bi-exclamation-triangle';
      case 'success': return 'bi-check-circle';
      case 'error': return 'bi-x-circle';
      case 'info': return 'bi-info-circle';
      default: return 'bi-question-circle';
    }
  }
}
