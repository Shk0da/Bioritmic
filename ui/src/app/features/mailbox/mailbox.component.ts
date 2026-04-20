import { Component, OnInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { MailboxService } from '../../core/services/mailbox.service';
import { UserService } from '../../core/services/user.service';
import { UserMail, PageableRequest, UserInfo } from '../../core/models/user.model';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

interface MessageWithUser extends UserMail {
  userName?: string;
  userPhotoUrl?: SafeUrl | null;
}

interface UserConversation {
  userId: number;
  userName?: string;
  userPhotoUrl?: SafeUrl | null;
  lastMessage: string;
  lastMessageTime: any;
  unreadCount?: number;
}

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
        } @else if (conversations.length === 0) {
          <div class="alert alert-info">
            У вас пока нет сообщений
          </div>
        } @else {
          <div class="list-group">
            @for (conv of conversations; track conv.userId) {
              <div class="list-group-item mailbox-item" style="cursor: pointer;" (click)="openConversation(conv.userId)">
                <div class="d-flex w-100 justify-content-between align-items-center">
                  <div class="d-flex align-items-center">
                    <img
                      [src]="conv.userPhotoUrl || ''"
                      class="rounded-circle me-3"
                      style="width: 50px; height: 50px; object-fit: cover;"
                      [alt]="conv.userName || 'User'">
                    <div>
                      <h6 class="mb-1">
                        {{ conv.userName || 'Пользователь #' + conv.userId }}
                      </h6>
                      <p class="mb-1">{{ conv.lastMessage }}</p>
                    </div>
                  </div>
                  <div class="text-end">
                    <small class="text-muted d-block">{{ getMessageDate(conv.lastMessageTime) }}</small>
                    <button class="btn btn-sm btn-outline-danger mt-2" (click)="$event.stopPropagation(); deleteConversation(conv.userId)">
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class MailboxComponent implements OnInit {
  conversations: UserConversation[] = [];
  messages: MessageWithUser[] = [];
  loading = false;
  showNewMessageForm = false;
  pageable: PageableRequest = { page: 0, size: 100 };
  currentUserId?: number;

  newMessage: Partial<UserMail> = {
    message: '',
    to: 0
  };

  constructor(
    private mailboxService: MailboxService,
    private userService: UserService,
    private sanitizer: DomSanitizer,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCurrentUserId();
  }

  private loadCurrentUserId(): void {
    this.userService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUserId = user.id;
        this.loadMessages();
      },
      error: () => {
        this.loadMessages();
      }
    });
  }

  private loadMessages(): void {
    this.loading = true;
    this.mailboxService.getMailbox(this.pageable).subscribe({
      next: (messages) => {
        this.messages = messages;
        this.groupByUsers();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private groupByUsers(): void {
    const userMap = new Map<number, MessageWithUser>();

    // Группируем сообщения по пользователям, оставляя последнее
    this.messages.forEach(message => {
      // Исключаем чат с самим собой
      if (message.from && message.from !== this.currentUserId) {
        const existing = userMap.get(message.from);
        if (!existing || this.isNewer(message.timestamp, existing.timestamp)) {
          userMap.set(message.from, message);
        }
      }
    });

    // Преобразуем в массив диалогов
    this.conversations = Array.from(userMap.entries()).map(([userId, message]) => ({
      userId,
      lastMessage: message.message || '',
      lastMessageTime: message.timestamp
    }));

    // Сортируем по времени последнего сообщения
    this.conversations.sort((a, b) => {
      const timeA = this.getTimestampSeconds(a.lastMessageTime);
      const timeB = this.getTimestampSeconds(b.lastMessageTime);
      return timeB - timeA;
    });

    // Загружаем данные пользователей
    this.conversations.forEach(conv => {
      this.userService.getUserById(conv.userId).subscribe({
        next: (user: UserInfo) => {
          conv.userName = user.name;
          this.loadUserPhoto(conv.userId, conv);
        },
        error: () => {
          conv.userName = 'Пользователь #' + conv.userId;
        }
      });
    });
  }

  private isNewer(timeA: any, timeB: any): boolean {
    const secondsA = this.getTimestampSeconds(timeA);
    const secondsB = this.getTimestampSeconds(timeB);
    return secondsA > secondsB;
  }

  private getTimestampSeconds(timestamp: any): number {
    if (!timestamp) return 0;
    return timestamp.seconds || timestamp.time || 0;
  }

  private loadUserPhoto(userId: number, conv: UserConversation): void {
    this.userService.getPhoto(userId).subscribe({
      next: (bytes: Uint8Array) => {
        conv.userPhotoUrl = this.bytesToDataUrl(bytes);
      },
      error: () => {
        conv.userPhotoUrl = null;
      }
    });
  }

  private bytesToDataUrl(bytes: Uint8Array): SafeUrl {
    const base64 = this.uint8ArrayToBase64(bytes);
    const dataUrl = `data:image/jpeg;base64,${base64}`;
    return this.sanitizer.bypassSecurityTrustUrl(dataUrl);
  }

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
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

  deleteConversation(userId: number): void {
    if (confirm('Удалить переписку с этим пользователем?')) {
      this.mailboxService.deleteMail(userId).subscribe({
        next: () => {
          this.loadMessages();
        },
        error: () => {
          alert('Ошибка удаления переписки');
        }
      });
    }
  }

  getMessageDate(timestamp: any): string {
    if (!timestamp) return '';
    const seconds = timestamp.seconds || timestamp.time;
    if (seconds) {
      return new Date(seconds * 1000).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return '';
  }

  openConversation(userId: number): void {
    this.router.navigate(['/mailbox/conversation', userId]);
  }
}
