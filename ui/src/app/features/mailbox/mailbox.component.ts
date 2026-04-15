import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MailboxService } from '../../core/services/mailbox.service';
import { UserService } from '../../core/services/user.service';
import { UserMail, PageableRequest } from '../../core/models/user.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-mailbox',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">Сообщения</h5>
        <button class="btn btn-primary btn-sm" (click)="showNewMessageForm = !showNewMessageForm">
          Написать сообщение
        </button>
      </div>
      <div class="card-body">
        @if (showNewMessageForm) {
          <div class="card mb-3">
            <div class="card-body">
              <form (ngSubmit)="sendNewMessage()">
                <div class="mb-3">
                  <label for="toUserId" class="form-label">Получатель (ID)</label>
                  <input
                    type="number"
                    class="form-control"
                    id="toUserId"
                    [(ngModel)]="newMessage.to"
                    name="to"
                    required>
                </div>
                <div class="mb-3">
                  <label for="message" class="form-label">Сообщение</label>
                  <textarea
                    class="form-control"
                    id="message"
                    [(ngModel)]="newMessage.message"
                    name="message"
                    rows="4"
                    required></textarea>
                </div>
                <div class="d-flex justify-content-between">
                  <button type="button" class="btn btn-outline-secondary" (click)="showNewMessageForm = false">
                    Отмена
                  </button>
                  <button type="submit" class="btn btn-primary" [disabled]="!newMessage.to || !newMessage.message">
                    Отправить
                  </button>
                </div>
              </form>
            </div>
          </div>
        }

        @if (loading) {
          <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Загрузка...</span>
            </div>
          </div>
        } @else if (messages.length === 0) {
          <div class="alert alert-info">
            У вас пока нет сообщений
          </div>
        } @else {
          <div class="list-group">
            @for (message of messages; track message.id) {
              <div class="list-group-item mailbox-item">
                <div class="d-flex w-100 justify-content-between">
                  <h6 class="mb-1">
                    Сообщение от пользователя #{{ message.from }}
                  </h6>
                  <small>{{ getMessageDate(message.timestamp) }}</small>
                </div>
                <p class="mb-1">{{ message.message }}</p>
                <button class="btn btn-sm btn-outline-danger" (click)="deleteMessage(message.from!)">
                  Удалить
                </button>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class MailboxComponent implements OnInit {
  messages: UserMail[] = [];
  loading = false;
  showNewMessageForm = false;
  pageable: PageableRequest = { page: 0, size: 20 };

  newMessage: Partial<UserMail> = {
    message: '',
    to: 0
  };

  constructor(
    private mailboxService: MailboxService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadMessages();
  }

  private loadMessages(): void {
    this.loading = true;
    this.mailboxService.getMailbox(this.pageable).subscribe({
      next: (messages) => {
        this.messages = messages;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  sendNewMessage(): void {
    if (!this.newMessage.to || !this.newMessage.message) return;

    this.mailboxService.sendMail(this.newMessage as UserMail).subscribe({
      next: () => {
        alert('Сообщение отправлено!');
        this.showNewMessageForm = false;
        this.newMessage = { message: '', to: 0 };
        this.loadMessages();
      },
      error: () => {
        alert('Ошибка отправки сообщения');
      }
    });
  }

  deleteMessage(userId: number): void {
    if (confirm('Удалить это сообщение?')) {
      this.mailboxService.deleteMail(userId).subscribe({
        next: () => {
          this.loadMessages();
        },
        error: () => {
          alert('Ошибка удаления сообщения');
        }
      });
    }
  }

  getMessageDate(timestamp: any): string {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
