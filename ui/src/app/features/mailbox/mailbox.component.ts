import { Component, OnInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { MailboxService } from '../../core/services/mailbox.service';
import { UserService } from '../../core/services/user.service';
import { UserMail, PageableRequest, UserInfo } from '../../core/models/user.model';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ModalService } from '../../core/services/modal.service';

interface MessageWithUser extends UserMail {
  userName?: string;
  userPhotoUrl?: string | null;
}

interface UserConversation {
  userId: number;
  userName?: string;
  userPhotoUrl?: string | null;
  lastMessage: string;
  lastMessageTime: any;
  unreadCount?: number;
}

@Component({
  selector: 'app-mailbox',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-header mb-4">
      <h1 class="page-title">
        <i class="bi bi-chat-heart me-2"></i>Сообщения
      </h1>
      <p class="text-muted">Ваши диалоги</p>
    </div>

    @if (loading) {
      <div class="card">
        <div class="card-body text-center py-5">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Загрузка...</span>
          </div>
        </div>
      </div>
    } @else if (conversations.length === 0) {
      <div class="card empty-state">
        <div class="card-body text-center py-5">
          <i class="bi bi-chat-square-text display-1 text-muted mb-3"></i>
          <h4 class="text-muted">Нет сообщений</h4>
          <p class="text-muted">Перейдите в профиль пользователя, чтобы написать сообщение</p>
        </div>
      </div>
    } @else {
      <div class="card">
        <div class="card-body p-0">
          <div class="list-group list-group-flush">
            @for (conv of conversations; track conv.userId) {
              <div class="list-group-item conversation-item" (click)="openConversation(conv.userId)">
                <div class="d-flex align-items-center">
                  <img
                    [src]="conv.userPhotoUrl || ''"
                    class="rounded-circle conversation-avatar"
                    [alt]="conv.userName || 'User'">
                  <div class="flex-grow-1 min-w-0">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                      <h6 class="mb-0 conversation-name">
                        <a [routerLink]="['/user', conv.userId]" class="conversation-name-link" (click)="$event.stopPropagation()">{{ conv.userName || 'Пользователь #' + conv.userId }}</a>
                      </h6>
                      <small class="text-muted conversation-time">
                        {{ getMessageDate(conv.lastMessageTime) }}
                      </small>
                    </div>
                    <p class="conversation-preview text-truncate mb-0">
                      {{ conv.lastMessage }}
                    </p>
                  </div>
                  <button class="btn-delete" (click)="$event.stopPropagation(); deleteConversation(conv.userId)">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page-header {
      padding: 1rem 0;
    }

    .page-title {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, #fd297b 0%, #ff655b 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .empty-state {
      max-width: 500px;
      margin: 2rem auto;
    }

    .conversation-item {
      padding: 1rem 1.25rem;
      border: none;
      border-bottom: 1px solid var(--border-color, #e5e7eb);
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: linear-gradient(135deg, rgba(253, 41, 123, 0.03) 0%, rgba(255, 101, 91, 0.03) 100%);
      }

      &:last-child {
        border-bottom: none;
      }
    }

    .conversation-avatar {
      width: 56px;
      height: 56px;
      object-fit: cover;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      margin-right: 1rem;
    }

    .conversation-name {
      font-weight: 600;
      color: var(--text-primary, #1f2937);
    }

    .conversation-name-link {
      color: inherit;
      text-decoration: none;
      cursor: pointer;

      &:hover {
        color: #fd297b;
        text-decoration: underline;
      }
    }

    .conversation-preview {
      color: var(--text-secondary, #6b7280);
      font-size: 0.9rem;
    }

    .conversation-time {
      font-size: 0.8rem;
      flex-shrink: 0;
      margin-left: 1rem;
      color: var(--text-muted, #9ca3af);
    }

    .btn-delete {
      background: transparent;
      border: none;
      color: var(--text-muted, #9ca3af);
      padding: 0.5rem;
      margin-left: 1rem;
      transition: all 0.2s ease;

      &:hover {
        color: #ef4444;
        transform: scale(1.1);
      }
    }

    .min-w-0 {
      min-width: 0;
    }
  `]
})
export class MailboxComponent implements OnInit {
  conversations: UserConversation[] = [];
  messages: MessageWithUser[] = [];
  loading = false;
  pageable: PageableRequest = { page: 0, size: 100 };
  currentUserId?: number;

  constructor(
    private mailboxService: MailboxService,
    private userService: UserService,
    private sanitizer: DomSanitizer,
    private router: Router,
    private modalService: ModalService
  ) {}

  ngOnInit(): void {
    this.loadCurrentUserId();
    localStorage.setItem('mailbox_last_read', Date.now().toString());
  }

  private loadCurrentUserId(): void {
    this.userService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUserId = user.id;
        this.loadMessages();
      },
      error: () => {
        // Если не удалось получить текущего пользователя, пробуем загрузить сообщения
        this.loadMessages();
      }
    });
  }

  private loadMessages(): void {
    this.loading = true;
    this.mailboxService.getMailbox(this.pageable).subscribe({
      next: (messages) => {
        this.messages = messages;
        if (this.currentUserId) {
          this.groupByUsers();
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private groupByUsers(): void {
    const userMap = new Map<number, MessageWithUser>();

    this.messages.forEach(message => {
      // Определяем собеседника (не текущего пользователя)
      const otherUserId = message.from === this.currentUserId ? message.to : message.from;
      
      if (!otherUserId) return;
      
      const existing = userMap.get(otherUserId);
      if (!existing || this.isNewer(message.timestamp, existing.timestamp)) {
        userMap.set(otherUserId, message);
      }
    });

    this.conversations = Array.from(userMap.entries()).map(([userId, message]) => ({
      userId,
      lastMessage: message.message || '',
      lastMessageTime: message.timestamp
    }));

    this.conversations.sort((a, b) => {
      const timeA = this.getTimestampSeconds(a.lastMessageTime);
      const timeB = this.getTimestampSeconds(b.lastMessageTime);
      return timeB - timeA;
    });

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

  private bytesToDataUrl(bytes: Uint8Array): string {
    const base64 = this.uint8ArrayToBase64(bytes);
    return `data:image/jpeg;base64,${base64}`;
  }

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async deleteConversation(userId: number): Promise<void> {
    const confirmed = await this.modalService.confirm('Удалить переписку?', 'Подтверждение');
    if (confirmed) {
      this.mailboxService.deleteMail(userId).subscribe({
        next: () => {
          this.loadMessages();
        },
        error: () => {
          this.modalService.alert('Ошибка удаления', 'Ошибка');
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
