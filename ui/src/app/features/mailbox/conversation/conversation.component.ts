import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MailboxService } from '../../../core/services/mailbox.service';
import { UserService } from '../../../core/services/user.service';
import { UserMail, UserInfo } from '../../../core/models/user.model';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Location, NgIf } from '@angular/common';

interface MessageWithUser extends UserMail {
  userName?: string;
  userPhotoUrl?: SafeUrl | null;
  isCurrentUser?: boolean;
}

@Component({
  selector: 'app-conversation',
  standalone: true,
  imports: [RouterLink, FormsModule, NgIf],
  template: `
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center">
          <button class="btn btn-link btn-sm me-2 p-0" (click)="goBack()">
            <i class="bi bi-arrow-left"></i> Назад
          </button>
          <div class="d-flex align-items-center">
            <img
              [src]="otherUserPhotoUrl || ''"
              class="rounded-circle me-2"
              style="width: 40px; height: 40px; object-fit: cover;"
              [alt]="otherUserName || 'User'">
            <h5 class="mb-0">{{ otherUserName || 'Пользователь #' + otherUserId }}</h5>
          </div>
        </div>
      </div>
      <div class="card-body">
        @if (loading) {
          <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Загрузка...</span>
            </div>
          </div>
        } @else if (messages.length === 0) {
          <div class="alert alert-info">
            Нет сообщений для отображения
          </div>
        } @else {
          <div #scrollContainer class="conversation-container" style="max-height: 500px; overflow-y: auto; padding: 10px;">
            @for (message of messages; track message.id) {
              <div class="message-bubble {{ message.isCurrentUser ? 'outgoing' : 'incoming' }}"
                   style="margin-bottom: 10px; padding: 10px; border-radius: 10px; max-width: 70%;">
                <p class="mb-1">{{ message.message }}</p>
                <small class="text-muted" style="font-size: 0.75rem;">
                  {{ getMessageTime(message.timestamp) }}
                </small>
              </div>
            }
          </div>
        }

        <div class="mt-3">
          <form (ngSubmit)="sendMessage()" class="d-flex gap-2">
            <input
              type="text"
              class="form-control"
              placeholder="Введите сообщение..."
              [(ngModel)]="newMessage"
              name="newMessage"
              [disabled]="sending">
            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="!newMessage.trim() || sending">
              {{ sending ? 'Отправка...' : 'Отправить' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .message-bubble.incoming {
      background-color: #f1f1f1;
      margin-right: auto;
    }
    .message-bubble.outgoing {
      background-color: #007bff;
      color: white;
      margin-left: auto;
    }
    .message-bubble.outgoing .text-muted {
      color: rgba(255, 255, 255, 0.8) !important;
    }
  `]
})
export class ConversationComponent implements OnInit, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  messages: MessageWithUser[] = [];
  loading = false;
  sending = false;
  otherUserId!: number;
  otherUserName?: string;
  otherUserPhotoUrl?: SafeUrl | null;
  newMessage = '';
  currentUserId?: number;
  private shouldScroll = false;

  constructor(
    private route: ActivatedRoute,
    private mailboxService: MailboxService,
    private userService: UserService,
    private sanitizer: DomSanitizer,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.otherUserId = +this.route.snapshot.paramMap.get('userId')!;
    this.loadCurrentUserId();
  }

  private loadCurrentUserId(): void {
    this.userService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUserId = user.id;
        this.loadAllMessages();
        this.loadOtherUserInfo();
      },
      error: () => {
        this.loadAllMessages();
        this.loadOtherUserInfo();
      }
    });
  }

  private loadAllMessages(): void {
    this.loading = true;
    this.mailboxService.getConversation(this.otherUserId).subscribe({
      next: (allMessages) => {
        // Фильтруем и обрабатываем сообщения
        this.messages = allMessages
          .map(m => ({
            ...m,
            isCurrentUser: m.from === this.currentUserId
          }));
        
        this.loading = false;
        this.shouldScroll = true;
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private loadOtherUserInfo(): void {
    this.userService.getUserById(this.otherUserId).subscribe({
      next: (user: UserInfo) => {
        this.otherUserName = user.name;
        this.loadOtherUserPhoto();
      },
      error: () => {
        this.otherUserName = 'Пользователь #' + this.otherUserId;
      }
    });
  }

  private loadOtherUserPhoto(): void {
    this.userService.getPhoto(this.otherUserId).subscribe({
      next: (bytes: Uint8Array) => {
        this.otherUserPhotoUrl = this.bytesToDataUrl(bytes);
      },
      error: () => {
        this.otherUserPhotoUrl = null;
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

  sendMessage(): void {
    if (!this.newMessage.trim()) return;

    this.sending = true;
    const message: UserMail = {
      to: this.otherUserId,
      message: this.newMessage.trim()
    };

    this.mailboxService.sendMail(message).subscribe({
      next: () => {
        // Перезагружаем все сообщения после отправки
        this.loadAllMessages();
        this.newMessage = '';
        this.sending = false;
        this.shouldScroll = true;
      },
      error: () => {
        alert('Ошибка отправки сообщения');
        this.sending = false;
      }
    });
  }

  getMessageTime(timestamp: any): string {
    if (!timestamp) return '';
    const seconds = timestamp.seconds || timestamp.time;
    if (!seconds) return '';
    return new Date(seconds * 1000).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  goBack(): void {
    this.location.back();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.scrollContainer) {
      setTimeout(() => {
        this.scrollToBottom();
        this.shouldScroll = false;
      }, 100);
    }
  }

  private scrollToBottom(): void {
    try {
      const el = this.scrollContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    } catch (err) {
      // ignore
    }
  }
}
