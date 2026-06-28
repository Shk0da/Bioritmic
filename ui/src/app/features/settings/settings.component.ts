import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SettingsService } from '../../core/services/settings.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { PushNotificationService } from '../../core/services/push-notification.service';
import { FeedbackService, FEEDBACK_TOPICS, FeedbackTopic } from '../../core/services/feedback.service';
import { ModalService } from '../../core/services/modal.service';
import { UserSettings, Gender } from '../../core/models/user.model';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page-header mb-4">
      <h1 class="page-title">
        <i class="bi bi-gear me-2"></i>Настройки
      </h1>
      <p class="text-muted">Параметры поиска и приложения</p>
    </div>

    <div class="row">
      <div class="col-12 col-lg-8 mx-auto">
        <div class="card mb-4">
          <div class="card-header">
            <h6 class="mb-0"><i class="bi bi-funnel me-2"></i>Параметры поиска</h6>
          </div>
          <div class="card-body">
            @if (loading) {
              <div class="text-center py-4">
                <div class="spinner-border" role="status">
                  <span class="visually-hidden">Загрузка...</span>
                </div>
              </div>
            } @else {
              <form (ngSubmit)="save()">
                <div class="mb-4">
                  <label for="gender" class="form-label">Кого ищем</label>
                  <select
                    class="form-select"
                    id="gender"
                    [(ngModel)]="settings.gender"
                    name="gender">
                    <option [value]="Gender.MAN">Мужчин</option>
                    <option [value]="Gender.WOMAN">Женщин</option>
                  </select>
                </div>

                <div class="row mb-4">
                  <div class="col-6">
                    <label for="ageMin" class="form-label">Возраст от</label>
                    <input
                      type="number"
                      class="form-control"
                      id="ageMin"
                      [(ngModel)]="settings.ageMin"
                      name="ageMin"
                      min="14"
                      max="100">
                  </div>
                  <div class="col-6">
                    <label for="ageMax" class="form-label">Возраст до</label>
                    <input
                      type="number"
                      class="form-control"
                      id="ageMax"
                      [(ngModel)]="settings.ageMax"
                      name="ageMax"
                      min="14"
                      max="100">
                  </div>
                </div>

                <div class="mb-4">
                  <label for="distance" class="form-label">
                    Расстояние: <strong class="text-primary">{{ settings.distance }} км</strong>
                  </label>
                  <input
                    type="range"
                    class="form-range"
                    id="distance"
                    [(ngModel)]="settings.distance"
                    name="distance"
                    min="0.05"
                    max="100"
                    step="0.05">
                  <div class="d-flex justify-content-between small text-muted mt-1">
                    <span>0.05 км</span>
                    <span>100 км</span>
                  </div>
                </div>

                <div class="d-grid">
                  <button type="submit" class="btn btn-primary btn-lg" [disabled]="saving">
                    @if (saving) {
                      <span class="spinner-border spinner-border-sm me-2"></span>
                    }
                    <i class="bi bi-check-lg me-2"></i>Сохранить настройки
                  </button>
                </div>
              </form>
            }
          </div>
        </div>

        <div class="card mb-4">
          <div class="card-header">
            <h6 class="mb-0"><i class="bi bi-bell me-2"></i>Уведомления и приложение</h6>
          </div>
          <div class="card-body">
            @if (pushSupported) {
              <div class="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 mb-3">
                <div>
                  <div class="fw-semibold">Push-уведомления</div>
                  <p class="small text-muted mb-0">О новых сообщениях и предложениях встреч</p>
                  @if (pushEnabled && pushMode === 'local') {
                    <p class="small text-muted mb-0 mt-1">
                      Работают, пока открыта вкладка приложения (Firebase не настроен на сервере).
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

        <div class="card">
          <div class="card-header">
            <h6 class="mb-0"><i class="bi bi-list-ul me-2"></i>Дополнительно</h6>
          </div>
          <div class="card-body p-0">
            <div class="list-group list-group-flush">
              <a routerLink="/settings/location" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                <div>
                  <i class="bi bi-geo-alt me-2"></i>Моё местоположение
                  <p class="small text-muted mb-0 mt-1">Укажите местоположение для поиска рядом</p>
                </div>
                <i class="bi bi-chevron-right text-muted small"></i>
              </a>
              <a routerLink="/settings/blocked" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                <div>
                  <i class="bi bi-slash-circle me-2"></i>Заблокированные пользователи
                  <p class="small text-muted mb-0 mt-1">Управление чёрным списком</p>
                </div>
                <span class="badge bg-secondary">{{ blockedCount }}</span>
              </a>
              <button type="button" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                      (click)="openFeedbackModal()">
                <div>
                  <i class="bi bi-chat-left-text me-2"></i>Обратная связь
                  <p class="small text-muted mb-0 mt-1">Сообщение администрации</p>
                </div>
                <i class="bi bi-chevron-right text-muted small"></i>
              </button>
            </div>
          </div>
        </div>

        @if (showFeedbackModal) {
          <div class="feedback-modal-overlay" (click)="closeFeedbackModal()">
            <div class="feedback-modal" (click)="$event.stopPropagation()">
              <div class="feedback-modal-header">
                <h5><i class="bi bi-chat-left-text me-2"></i>Обратная связь</h5>
                <button type="button" class="feedback-modal-close" (click)="closeFeedbackModal()">
                  <i class="bi bi-x-lg"></i>
                </button>
              </div>
              <div class="feedback-modal-body">
                <div class="mb-3">
                  <label class="form-label" for="feedbackTopic">Тема</label>
                  <select id="feedbackTopic" class="form-select" [(ngModel)]="feedbackTopic" name="feedbackTopic">
                    @for (topic of feedbackTopics; track topic.value) {
                      <option [value]="topic.value">{{ topic.label }}</option>
                    }
                  </select>
                </div>
                <div class="mb-3">
                  <label class="form-label" for="feedbackMessage">Сообщение</label>
                  <textarea
                    id="feedbackMessage"
                    class="form-control"
                    rows="5"
                    [(ngModel)]="feedbackMessage"
                    name="feedbackMessage"
                    maxlength="4000"
                    placeholder="Опишите проблему или предложение..."></textarea>
                  <div class="form-text text-end">{{ feedbackMessage.length }} / 4000</div>
                </div>
                <div class="mb-2">
                  <label class="form-label" for="feedbackFile">Вложение (необязательно)</label>
                  <input
                    id="feedbackFile"
                    type="file"
                    class="form-control"
                    accept="image/png,image/jpeg,image/gif,image/webp,.png,.jpg,.jpeg,.gif,.webp"
                    (change)="onFeedbackFileSelected($event)">
                  <div class="form-text">Только изображения (PNG, JPG, GIF, WEBP), до 5 МБ</div>
                  @if (feedbackFileName) {
                    <div class="small mt-1"><i class="bi bi-paperclip me-1"></i>{{ feedbackFileName }}</div>
                  }
                </div>
              </div>
              <div class="feedback-modal-footer">
                <button type="button" class="btn btn-cancel" (click)="closeFeedbackModal()">Отмена</button>
                <button
                  type="button"
                  class="btn btn-primary"
                  [disabled]="!feedbackMessage.trim() || feedbackSending"
                  (click)="submitFeedback()">
                  @if (feedbackSending) {
                    <span class="spinner-border spinner-border-sm me-1"></span>
                  }
                  <i class="bi bi-send me-1"></i>Отправить
                </button>
              </div>
            </div>
          </div>
        }

        <div class="card mt-4">
          <div class="card-header">
            <h6 class="mb-0 text-danger"><i class="bi bi-exclamation-triangle me-2"></i>Опасная зона</h6>
          </div>
          <div class="card-body">
            <p class="text-muted small mb-3">Удаление аккаунта необратимо. Все ваши данные будут удалены.</p>
            <button type="button" class="btn btn-outline-danger" (click)="deleteAccount()" [disabled]="deletingAccount">
              @if (deletingAccount) {
                <span class="spinner-border spinner-border-sm me-2"></span>
              }
              Удалить аккаунт
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-header {
      padding: 1rem 0;
    }

    .page-title {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      background: var(--tinder-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .install-hint {
      background: rgba(253, 41, 123, 0.08);
      border: 1px solid rgba(253, 41, 123, 0.2);
    }

    .feedback-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      height: 100dvh;
      min-height: 100dvh;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 1rem;
      padding-top: calc(1rem + env(safe-area-inset-top));
      padding-bottom: calc(1rem + env(safe-area-inset-bottom));
    }

    .feedback-modal {
      background: var(--card-bg, white);
      border-radius: 20px;
      max-width: 520px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }

    .feedback-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-color, #eee);

      h5 {
        margin: 0;
        font-weight: 700;
      }
    }

    .feedback-modal-close {
      background: none;
      border: none;
      font-size: 1.1rem;
      color: var(--text-secondary);
      cursor: pointer;
    }

    .feedback-modal-body {
      padding: 1.25rem 1.5rem;
    }

    .feedback-modal-footer {
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
      padding: 1rem 1.5rem 1.5rem;
      border-top: 1px solid var(--border-color, #eee);

      .btn-cancel {
        background: var(--bg-secondary);
        color: var(--text-secondary);
        border: none;
        border-radius: 12px;
        padding: 0.65rem 1.25rem;
        font-weight: 600;
      }

      .btn-primary {
        border-radius: 12px;
        padding: 0.65rem 1.25rem;
        font-weight: 600;
      }
    }
  `]
})
export class SettingsComponent implements OnInit {
  settings: UserSettings = {
    gender: Gender.WOMAN,
    ageMin: 18,
    ageMax: 45,
    distance: 50
  };
  loading = false;
  saving = false;
  deletingAccount = false;
  blockedCount = 0;
  pushSupported = false;
  pushEnabled = false;
  pushLoading = false;
  pushMode: 'fcm' | 'local' | null = null;
  pushMessage = '';
  showInstallHint = false;
  isStandalone = false;
  showFeedbackModal = false;
  feedbackTopic: FeedbackTopic = 'BUG';
  feedbackMessage = '';
  feedbackFile: File | null = null;
  feedbackFileName = '';
  feedbackSending = false;
  feedbackTopics = FEEDBACK_TOPICS;

  Gender = Gender;

  constructor(
    private settingsService: SettingsService,
    private userService: UserService,
    private authService: AuthService,
    private pushService: PushNotificationService,
    private feedbackService: FeedbackService,
    private modalService: ModalService,
    private router: Router
  ) {
    const user = this.authService.getCurrentUser();
    if (user?.gender === Gender.MAN) {
      this.settings.gender = Gender.WOMAN;
    } else {
      this.settings.gender = Gender.MAN;
    }
  }

  ngOnInit(): void {
    this.pushSupported = this.pushService.isSupported();
    this.pushService.syncEnabledWithPermission();
    this.pushEnabled = this.pushService.isActive();
    this.pushMode = this.pushService.getMode();
    this.isStandalone = this.pushService.isStandalone();
    this.showInstallHint = this.pushService.isIos() && !this.isStandalone;
    this.loadSettings();
    this.loadBlockedCount();
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
        }
      }
    } finally {
      this.pushLoading = false;
    }
  }

  private loadBlockedCount(): void {
    this.userService.getBlockedCount().subscribe({
      next: (res) => { this.blockedCount = res.count; },
      error: () => { this.blockedCount = 0; }
    });
  }

  private loadSettings(): void {
    this.loading = true;
    this.settingsService.getSettings().subscribe({
      next: (settings) => {
        if (settings.gender !== undefined && settings.gender !== null) {
          this.settings.gender = settings.gender;
        }
        if (settings.ageMin !== undefined && settings.ageMin !== null) {
          this.settings.ageMin = settings.ageMin;
        }
        if (settings.ageMax !== undefined && settings.ageMax !== null) {
          this.settings.ageMax = settings.ageMax;
        }
        if (settings.distance !== undefined && settings.distance !== null) {
          this.settings.distance = settings.distance;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  save(): void {
    this.saving = true;
    this.settingsService.updateSettings(this.settings).subscribe({
      next: () => {
        this.saving = false;
        alert('Настройки сохранены!');
      },
      error: () => {
        this.saving = false;
        alert('Ошибка сохранения настроек');
      }
    });
  }

  openFeedbackModal(): void {
    this.feedbackTopic = 'BUG';
    this.feedbackMessage = '';
    this.feedbackFile = null;
    this.feedbackFileName = '';
    this.showFeedbackModal = true;
    document.body.classList.add('modal-open');
  }

  closeFeedbackModal(): void {
    this.showFeedbackModal = false;
    document.body.classList.remove('modal-open');
  }

  onFeedbackFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      this.feedbackFile = null;
      this.feedbackFileName = '';
      return;
    }
    const allowedExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    const isImage = file.type.startsWith('image/') || allowedExtensions.includes(extension);
    if (!isImage) {
      void this.modalService.alert('Можно прикрепить только изображение (PNG, JPG, GIF, WEBP).');
      input.value = '';
      this.feedbackFile = null;
      this.feedbackFileName = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      void this.modalService.alert('Файл слишком большой. Максимум 5 МБ.');
      input.value = '';
      this.feedbackFile = null;
      this.feedbackFileName = '';
      return;
    }
    this.feedbackFile = file;
    this.feedbackFileName = file.name;
  }

  submitFeedback(): void {
    const message = this.feedbackMessage.trim();
    if (!message || this.feedbackSending) {
      return;
    }
    this.feedbackSending = true;
    this.feedbackService.submit(this.feedbackTopic, message, this.feedbackFile ?? undefined).subscribe({
      next: async () => {
        this.feedbackSending = false;
        this.closeFeedbackModal();
        await this.modalService.alert('Сообщение отправлено администрации. Спасибо!');
      },
      error: async () => {
        this.feedbackSending = false;
        await this.modalService.alert('Не удалось отправить сообщение. Попробуйте позже.');
      }
    });
  }

  deleteAccount(): void {
    if (!confirm('Вы уверены, что хотите удалить аккаунт? Это действие необратимо.')) {
      return;
    }
    this.deletingAccount = true;
    this.userService.deleteUser().subscribe({
      next: () => {
        this.authService.clearAuth();
        this.router.navigate(['/auth/login']);
      },
      error: () => {
        this.deletingAccount = false;
        alert('Не удалось удалить аккаунт');
      }
    });
  }
}
