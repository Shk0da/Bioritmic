import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FeedbackService, FEEDBACK_TOPICS, FeedbackTopic } from '../../../core/services/feedback.service';
import { ModalService } from '../../../core/services/modal.service';
import { PageBackLinkComponent } from '../../../shared/components/page-back-link/page-back-link.component';

@Component({
  selector: 'app-feedback-settings',
  standalone: true,
  imports: [FormsModule, PageBackLinkComponent],
  template: `
    <app-page-back-link link="/settings" label="Назад к настройкам"></app-page-back-link>

    <div class="page-header mb-4">
      <h1 class="page-title">
        <i class="bi bi-chat-left-text me-2"></i>Обратная связь
      </h1>
      <p class="text-muted">Сообщение администрации</p>
    </div>

    <div class="row">
      <div class="col-12 col-lg-8 mx-auto">
        <div class="card mb-4">
          <div class="card-body">
            <form (ngSubmit)="submitFeedback()">
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
              <div class="mb-4">
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
              <div class="d-grid">
                <button
                  type="submit"
                  class="btn btn-primary btn-lg"
                  [disabled]="!feedbackMessage.trim() || feedbackSending">
                  @if (feedbackSending) {
                    <span class="spinner-border spinner-border-sm me-1"></span>
                  }
                  <i class="bi bi-send me-1"></i>Отправить
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  `
})
export class FeedbackSettingsComponent {
  feedbackTopic: FeedbackTopic = 'BUG';
  feedbackMessage = '';
  feedbackFile: File | null = null;
  feedbackFileName = '';
  feedbackSending = false;
  feedbackTopics = FEEDBACK_TOPICS;

  constructor(
    private feedbackService: FeedbackService,
    private modalService: ModalService
  ) {}

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
        this.feedbackMessage = '';
        this.feedbackFile = null;
        this.feedbackFileName = '';
        await this.modalService.alert('Сообщение отправлено администрации. Спасибо!');
      },
      error: async () => {
        this.feedbackSending = false;
        await this.modalService.alert('Не удалось отправить сообщение. Попробуйте позже.');
      }
    });
  }
}
