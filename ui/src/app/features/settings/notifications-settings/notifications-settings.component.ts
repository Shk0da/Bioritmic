import { Component, OnInit } from '@angular/core';
import { PushNotificationService } from '../../../core/services/push-notification.service';
import { ModalService } from '../../../core/services/modal.service';
import { PageBackLinkComponent } from '../../../shared/components/page-back-link/page-back-link.component';

@Component({
  selector: 'app-notifications-settings',
  standalone: true,
  imports: [PageBackLinkComponent],
  template: `
    <app-page-back-link link="/settings" label="Назад к настройкам"></app-page-back-link>

    <div class="page-header mb-4">
      <h1 class="page-title">
        <i class="bi bi-bell me-2"></i>Уведомления и приложение
      </h1>
      <p class="text-muted">Push-уведомления и установка на устройство</p>
    </div>

    <div class="row">
      <div class="col-12 col-lg-8 mx-auto">
        <div class="card mb-4">
          <div class="card-body">
            @if (pushSupported) {
              <div class="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 mb-3">
                <div>
                  <div class="fw-semibold">Push-уведомления</div>
                  <p class="small text-muted mb-0">О новых сообщениях и предложениях встреч</p>
                  @if (pushEnabled && pushMode === 'local') {
                    <p class="small text-muted mb-0 mt-1">
                      Работают, пока открыта вкладка приложения.
                    </p>
                  }
                  @if (pushMessage) {
                    <p class="small mb-0 mt-1" [class.text-success]="pushEnabled" [class.text-danger]="!pushEnabled">
                      {{ pushMessage }}
                    </p>
                  }
                </div>
                <button type="button" class="btn btn-sm"
                        [class.btn-primary]="pushEnabled"
                        [class.btn-outline-primary]="!pushEnabled"
                        (click)="togglePush()"
                        [disabled]="pushLoading">
                  @if (pushLoading) {
                    <span class="spinner-border spinner-border-sm me-1"></span>
                  }
                  {{ pushEnabled ? 'Включены' : 'Включить' }}
                </button>
              </div>
            } @else {
              <p class="small text-muted mb-3">Браузер не поддерживает push-уведомления.</p>
            }

            @if (showInstallHint) {
              <div class="install-hint p-3 rounded">
                <div class="fw-semibold mb-1"><i class="bi bi-phone me-1"></i>Установить на iPhone</div>
                <p class="small mb-0">
                  Откройте сайт в <strong>Safari</strong> → нажмите <strong>Поделиться</strong>
                  <i class="bi bi-box-arrow-up ms-1"></i> → <strong>На экран «Домой»</strong>.
                  После установки включите уведомления выше.
                </p>
              </div>
            } @else if (isStandalone) {
              <p class="small text-success mb-0"><i class="bi bi-check-circle me-1"></i>Приложение установлено на устройство</p>
            }
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .install-hint {
      background: rgba(253, 41, 123, 0.08);
      border: 1px solid rgba(253, 41, 123, 0.2);
    }
  `]
})
export class NotificationsSettingsComponent implements OnInit {
  pushSupported = false;
  pushEnabled = false;
  pushLoading = false;
  pushMode: 'fcm' | 'local' | null = null;
  pushMessage = '';
  showInstallHint = false;
  isStandalone = false;

  constructor(
    private pushService: PushNotificationService,
    private modalService: ModalService
  ) {}

  ngOnInit(): void {
    this.pushSupported = this.pushService.isSupported();
    this.pushService.syncEnabledWithPermission();
    this.pushEnabled = this.pushService.isActive();
    this.pushMode = this.pushService.getMode();
    this.isStandalone = this.pushService.isStandalone();
    this.showInstallHint = this.pushService.isIos() && !this.isStandalone;
    void this.refreshPushState();
  }

  private async refreshPushState(): Promise<void> {
    if (!this.pushEnabled) {
      return;
    }
    const result = await this.pushService.ensureRegistered();
    this.pushMode = result.enabled && result.mode !== 'none' ? result.mode : null;
  }

  async togglePush(): Promise<void> {
    if (!this.pushSupported || this.pushLoading) {
      return;
    }
    this.pushLoading = true;
    this.pushMessage = '';
    try {
      if (this.pushEnabled) {
        await this.pushService.disable();
        this.pushEnabled = false;
        this.pushMode = null;
        this.pushMessage = 'Уведомления отключены.';
      } else {
        const result = await this.pushService.enable();
        this.pushEnabled = result.enabled;
        this.pushMode = result.enabled && result.mode !== 'none' ? result.mode : null;
        if (result.enabled && result.mode === 'fcm') {
          this.pushMessage = 'Push-уведомления включены.';
        } else if (result.enabled && result.mode === 'local') {
          this.pushMessage = 'Уведомления включены. Оповещения приходят, пока открыта вкладка приложения.';
        } else if (result.reason === 'denied') {
          await this.modalService.alert(
            'Разрешите уведомления в настройках браузера для этого сайта.',
            'Уведомления заблокированы'
          );
        } else if (result.reason === 'dismissed') {
          this.pushMessage = 'Разрешение на уведомления не получено.';
        } else if (result.reason === 'fcm-unavailable') {
          await this.modalService.alert(
            'Не удалось подключить Firebase push. Проверьте, что приложение открыто как PWA, и перезапустите его после обновления.',
            'Push недоступен'
          );
          this.pushMessage = 'Firebase push не подключён.';
        }
      }
    } finally {
      this.pushLoading = false;
    }
  }
}
