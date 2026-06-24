import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MailboxService } from '../../../core/services/mailbox.service';
import { UserService } from '../../../core/services/user.service';
import { UserMail, UserInfo } from '../../../core/models/user.model';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Location, NgIf, NgFor, DatePipe } from '@angular/common';
import { ModalService } from '../../../core/services/modal.service';

interface MessageWithUser extends UserMail {
  userName?: string;
  userPhotoUrl?: string | null;
  isCurrentUser?: boolean;
}

@Component({
  selector: 'app-conversation',
  standalone: true,
  imports: [RouterLink, FormsModule, NgIf, NgFor, DatePipe],
  template: `
    <div class="telegram-chat">
      <!-- Header -->
      <div class="chat-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">
            <i class="bi bi-arrow-left"></i>
          </button>
          <div class="user-info">
            <img
              [src]="otherUserPhotoUrl || 'assets/img/default-avatar.svg'"
              class="user-avatar"
              [alt]="otherUserName || 'User'">
            <div class="user-details">
              <a class="user-name" [routerLink]="['/user', otherUserId]">{{ otherUserName || 'Пользователь #' + otherUserId }}</a>
              @if (otherUserOnline) {
                <span class="user-status">в сети</span>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Messages -->
      <div #scrollContainer class="messages-container">
        @if (loading) {
          <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Загрузка...</span>
            </div>
          </div>
        } @else if (messages.length === 0) {
          <div class="empty-chat">
            <i class="bi bi-chat-text"></i>
            <p>Здесь будут ваши сообщения</p>
            <span>Напишите первое сообщение!</span>
          </div>
        } @else {
          @for (message of messages; track message.id) {
            <div class="message-wrapper {{ message.isCurrentUser ? 'outgoing' : 'incoming' }}">
              @if (!message.isCurrentUser) {
                <img
                  [src]="otherUserPhotoUrl || 'assets/img/default-avatar.svg'"
                  class="message-avatar"
                  [alt]="otherUserName || 'User'">
              }
              <div class="message-bubble {{ message.isCurrentUser ? 'outgoing' : 'incoming' }}">
                @if (!message.isCurrentUser && message.userName) {
                  <a class="message-sender" [routerLink]="['/user', otherUserId]">{{ message.userName }}</a>
                }
                <div class="message-text">{{ message.message }}</div>
                <div class="message-meta">
                  <span class="message-time">{{ getMessageTime(message.timestamp) }}</span>
                  @if (message.isCurrentUser) {
                    <span class="message-status">
                      <i class="bi bi-check-all"></i>
                    </span>
                  }
                </div>
              </div>
            </div>
          }
        }
      </div>

      <!-- Input -->
      @if (isBlocked) {
        <div class="block-notice">
          <i class="bi bi-shield-slash"></i>
          <span>К сожалению, пользователь ограничил с вами общение</span>
        </div>
      } @else {
      <div class="message-input-container">
        <div class="input-wrapper">
          <input
            type="text"
            class="message-input"
            placeholder="Написать сообщение..."
            [(ngModel)]="newMessage"
            name="newMessage"
            [disabled]="sending"
            (keydown.enter)="sendMessage()">
          <button class="emoji-btn" title="Смайлы" (click)="toggleEmojiPicker()">
            <i class="bi bi-emoji-smile"></i>
          </button>
        </div>
        <button
          class="send-btn"
          [disabled]="!newMessage.trim() || sending"
          (click)="sendMessage()">
          <i class="bi bi-send-fill"></i>
        </button>
      </div>
      }

      <!-- Emoji Picker -->
      @if (showEmojiPicker) {
        <div class="emoji-picker">
          <div class="emoji-grid">
            @for (emoji of emojis; track emoji) {
              <button class="emoji-btn-picker" (click)="addEmoji(emoji)">
                {{ emoji }}
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .chat-container {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 70px);
      background: var(--bg-secondary, #f5f7fa);
    }

    /* Header */
    .chat-header {
      display: flex;
      align-items: center;
      padding: 12px 15px;
      background: linear-gradient(135deg, #fd297b 0%, #ff655b 100%);
      color: white;
      box-shadow: 0 2px 8px rgba(253, 41, 123, 0.3);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .back-btn {
      background: none;
      border: none;
      color: white;
      font-size: 1.3rem;
      cursor: pointer;
      padding: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;

      &:hover {
        transform: translateX(-3px);
      }
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .user-avatar {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid rgba(255, 255, 255, 0.5);
    }

    .user-details {
      display: flex;
      flex-direction: column;
    }

    .user-name {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: white;
      text-decoration: none;
      cursor: pointer;

      &:hover {
        text-decoration: underline;
        opacity: 0.9;
      }
    }

    .user-status {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.85);
      font-weight: 400;
    }

    /* Messages */
    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 15px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: var(--bg-secondary, #f5f7fa);
    }

    .message-wrapper {
      display: flex;
      gap: 8px;
      max-width: 70%;
    }

    .message-wrapper.incoming {
      align-self: flex-start;
    }

    .message-wrapper.outgoing {
      align-self: flex-end;
      flex-direction: row-reverse;
    }

    .message-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
      align-self: flex-end;
    }

    .message-bubble {
      padding: 10px 14px;
      border-radius: 16px;
      position: relative;
      max-width: 100%;
      word-wrap: break-word;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .message-bubble.incoming {
      background: var(--card-bg, white);
      border-bottom-left-radius: 4px;
      color: var(--text-primary, #1f2937);
    }

    .message-bubble.outgoing {
      background: linear-gradient(135deg, #fd297b 0%, #ff655b 100%);
      border-bottom-right-radius: 4px;
      color: white;
    }

    .message-sender {
      font-size: 0.8rem;
      font-weight: 600;
      margin-bottom: 4px;
      color: var(--accent-pink, #fd297b);
      text-decoration: none;
      display: inline-block;

      &:hover {
        text-decoration: underline;
      }
    }

    .message-text {
      margin: 0;
      font-size: 0.95rem;
      line-height: 1.4;
    }

    .message-meta {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 4px;
      margin-top: 4px;
    }

    .message-time {
      font-size: 0.7rem;
      opacity: 0.7;
    }

    .message-status {
      font-size: 0.8rem;
    }

    .empty-chat {
      text-align: center;
      color: var(--text-secondary, #6b7280);
      margin-top: 100px;
      font-size: 1.1rem;
    }

    .empty-chat i {
      font-size: 4rem;
      opacity: 0.3;
      display: block;
      margin-bottom: 1rem;
    }

    /* Input */
    .message-input-container {
      display: flex;
      gap: 10px;
      padding: 12px 15px;
      background: var(--card-bg, white);
      align-items: center;
      border-top: 1px solid var(--border-color, #e5e7eb);
    }

    .input-wrapper {
      flex: 1;
      display: flex;
      align-items: center;
      background: var(--bg-secondary, #f3f4f6);
      border-radius: 24px;
      padding: 8px 15px;
    }

    .message-input {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 1rem;
      outline: none;
      padding: 0;
      color: var(--text-primary, #1f2937);
    }

    .emoji-btn {
      background: none;
      border: none;
      color: var(--text-secondary, #6b7280);
      font-size: 1.3rem;
      cursor: pointer;
      padding: 5px;
      transition: color 0.2s;

      &:hover {
        color: #fd297b;
      }
    }

    .send-btn {
      background: linear-gradient(135deg, #fd297b 0%, #ff655b 100%);
      border: none;
      color: white;
      width: 45px;
      height: 45px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      cursor: pointer;
      transition: all 0.2s;

      &:hover:not(:disabled) {
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(253, 41, 123, 0.4);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    /* Emoji Picker */
    .emoji-picker {
      background: var(--card-bg, white);
      border-top: 1px solid var(--border-color, #e5e7eb);
      padding: 15px;
      animation: slideUp 0.2s ease;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .emoji-grid {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 8px;
      max-height: 200px;
      overflow-y: auto;
    }

    .emoji-btn-picker {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 5px;
      border-radius: 8px;
      transition: background 0.2s;

      &:hover {
        background: var(--bg-hover, #f3f4f6);
      }
    }

    /* Scrollbar */
    .messages-container::-webkit-scrollbar {
      width: 6px;
    }

    .messages-container::-webkit-scrollbar-track {
      background: transparent;
    }

    .messages-container::-webkit-scrollbar-thumb {
      background: var(--border-color, #d1d5db);
      border-radius: 3px;
    }

    .block-notice {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px;
      background: rgba(239, 68, 68, 0.08);
      border-top: 1px solid rgba(239, 68, 68, 0.2);
      color: #dc2626;
      font-size: 0.9rem;
      font-weight: 500;

      i { font-size: 1.1rem; }
    }
  `]
})
export class ConversationComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  messages: MessageWithUser[] = [];
  loading = false;
  sending = false;
  otherUserId!: number;
  otherUserName?: string;
  otherUserPhotoUrl?: string | null;
  otherUserOnline = false;
  newMessage = '';
  currentUserId?: number;
  private shouldScroll = false;
  showEmojiPicker = false;
  private refreshInterval: any = null;
  isBlocked = false;

  emojis = [
    '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆',
    '😉', '😊', '😋', '😎', '😍', '😘', '🥰', '😗',
    '😇', '🤗', '🤩', '🤔', '🤨', '😐', '😑', '😶',
    '🙄', '😏', '😣', '😥', '😮', '🤐', '😯', '😪',
    '😫', '😴', '😌', '😛', '😜', '😝', '🤤', '😒',
    '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️', '🙁',
    '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧',
    '😨', '😩', '🤯', '😬', '😰', '😱', '🥵', '🥶',
    '❤️', '💕', '💖', '💗', '💓', '💞', '💘', '💝',
    '👍', '👎', '👏', '🙌', '👋', '🤟', '🤙', '✌️'
  ];

  constructor(
    private route: ActivatedRoute,
    private mailboxService: MailboxService,
    private userService: UserService,
    private sanitizer: DomSanitizer,
    private location: Location,
    private modalService: ModalService
  ) {}

  ngOnInit(): void {
    this.otherUserId = +this.route.snapshot.paramMap.get('userId')!;
    this.loadCurrentUserId();
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  private loadCurrentUserId(): void {
    this.userService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUserId = user.id;
        this.checkBlockStatus();
        this.loadAllMessages();
        this.loadOtherUserInfo();
      },
      error: () => {
        this.loadAllMessages();
        this.loadOtherUserInfo();
      }
    });
  }

  private checkBlockStatus(): void {
    this.userService.isBlockedBy(this.otherUserId).subscribe({
      next: (result) => {
        this.isBlocked = result.blocked;
      },
      error: () => {}
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
        if (!this.refreshInterval) {
          this.refreshInterval = setInterval(() => this.refreshMessages(), 3000);
        }
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
        this.otherUserOnline = user.isOnline === true;
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

  sendMessage(): void {
    if (!this.newMessage.trim() || this.isBlocked) return;

    this.sending = true;
    const message: UserMail = {
      to: this.otherUserId,
      message: this.newMessage.trim()
    };

    this.mailboxService.sendMail(message).subscribe({
      next: () => {
        this.loadAllMessages();
        this.newMessage = '';
        this.sending = false;
        this.shouldScroll = true;
      },
      error: (error) => {
        if (error.status === 412) {
          this.isBlocked = true;
          this.modalService.alert('К сожалению, пользователь ограничил с вами общение', 'Ошибка');
        } else {
          this.modalService.alert('Ошибка отправки сообщения', 'Ошибка');
        }
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

  toggleEmojiPicker(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(emoji: string): void {
    this.newMessage += emoji;
  }

  private refreshMessages(): void {
    if (this.sending) return;
    this.mailboxService.getConversation(this.otherUserId).subscribe({
      next: (allMessages) => {
        const prevCount = this.messages.length;
        this.messages = allMessages.map(m => ({
          ...m,
          isCurrentUser: m.from === this.currentUserId
        }));
        if (this.messages.length > prevCount) {
          this.shouldScroll = true;
          setTimeout(() => this.scrollToBottom(), 100);
        }
      },
      error: () => {}
    });
  }
}
