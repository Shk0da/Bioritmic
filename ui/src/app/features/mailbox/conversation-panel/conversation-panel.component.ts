import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  DestroyRef,
  inject,
  ChangeDetectorRef
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MailboxService } from '../../../core/services/mailbox.service';
import { UserService } from '../../../core/services/user.service';
import { UserMail, UserInfo, MailMediaType } from '../../../core/models/user.model';
import { ModalService } from '../../../core/services/modal.service';
import { Subject, takeUntil } from 'rxjs';

interface ChatMessage extends UserMail {
  isCurrentUser?: boolean;
}

@Component({
  selector: 'app-conversation-panel',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="conversation-panel">
      <div class="chat-subheader">
        @if (showBackButton) {
          <button type="button" class="back-btn" (click)="back.emit()" aria-label="Назад к списку">
            <i class="bi bi-arrow-left"></i>
          </button>
        }
        <img
          [src]="otherUserPhotoUrl || 'assets/img/default-avatar.svg'"
          class="subheader-avatar"
          [alt]="otherUserName || 'User'">
        <div class="subheader-info">
          <a class="subheader-name" [routerLink]="['/user', userId]">{{ otherUserName || 'Пользователь' }}</a>
          @if (otherUserOnline) {
            <span class="subheader-status">в сети</span>
          }
        </div>
        <a [routerLink]="['/user', userId]" class="profile-link-btn" title="Открыть профиль">
          <i class="bi bi-person"></i>
        </a>
      </div>

      <div #scrollContainer class="messages-container">
        @if (loading) {
          <div class="text-center py-5">
            <div class="spinner-border spinner-border-sm text-secondary" role="status">
              <span class="visually-hidden">Загрузка...</span>
            </div>
          </div>
        } @else if (messages.length === 0) {
          <div class="empty-chat">
            <i class="bi bi-chat-heart"></i>
            <p>Здесь будут ваши сообщения</p>
            <span>Напишите первое сообщение!</span>
          </div>
        } @else {
          @for (message of messages; track message.id) {
            <div class="message-wrapper" [class.outgoing]="message.isCurrentUser" [class.incoming]="!message.isCurrentUser">
              @if (!message.isCurrentUser) {
                <img
                  [src]="otherUserPhotoUrl || 'assets/img/default-avatar.svg'"
                  class="message-avatar"
                  [alt]="otherUserName || 'User'">
              }
              <div class="message-bubble" [class.outgoing]="message.isCurrentUser" [class.incoming]="!message.isCurrentUser" [class.media-bubble]="!!message.mediaType">
                @if (message.mediaType === 'PHOTO' && message.mediaUrl) {
                  <img [src]="message.mediaUrl" class="message-photo" data-testid="message-photo" alt="Фото">
                } @else if (message.mediaType === 'VOICE' && message.mediaUrl) {
                  <div class="voice-message" data-testid="message-voice">
                    <button
                      type="button"
                      class="voice-play-btn"
                      [class.playing]="isVoicePlaying(message)"
                      (click)="toggleVoicePlayback(message)"
                      [attr.aria-label]="isVoicePlaying(message) ? 'Остановить' : 'Воспроизвести'">
                      <i
                        class="bi"
                        [class.bi-stop-fill]="isVoicePlaying(message)"
                        [class.bi-play-fill]="!isVoicePlaying(message)">
                      </i>
                    </button>
                    <div class="voice-waveform" aria-hidden="true">
                      @for (height of voiceWaveBars; track $index) {
                        <span
                          class="voice-bar"
                          [style.height.px]="height"
                          [class.active]="isVoiceBarActive(message.id, $index)">
                        </span>
                      }
                    </div>
                    <span class="voice-duration">{{ formatVoiceDuration(message.id) }}</span>
                  </div>
                } @else if (message.mediaType === 'VIDEO_NOTE' && message.mediaUrl) {
                  <video
                    [src]="message.mediaUrl"
                    class="message-video-note"
                    playsinline
                    controls
                    preload="metadata">
                  </video>
                }
                @if (showMessageText(message)) {
                  <div class="message-text">{{ message.message }}</div>
                }
                <div class="message-meta">
                  <span class="message-time">{{ getMessageTime(message.timestamp) }}</span>
                  @if (message.isCurrentUser) {
                    <span class="message-status"><i class="bi bi-check-all"></i></span>
                  }
                </div>
              </div>
            </div>
          }
        }
      </div>

      @if (isBlocked) {
        <div class="block-notice">
          <i class="bi bi-shield-slash"></i>
          <span>Пользователь ограничил с вами общение</span>
        </div>
      } @else {
        <div class="message-input-container">
          @if (recordingVoice) {
            <div class="recording-bar">
              <span class="recording-dot"></span>
              <span>Запись голосового... {{ recordingSeconds }}с</span>
              <button type="button" class="recording-cancel" (click)="cancelVoiceRecording()">Отмена</button>
              <button type="button" class="send-btn small" [disabled]="sending" (click)="stopVoiceRecording()">
                <i class="bi bi-stop-fill"></i>
              </button>
            </div>
          } @else if (recordingVideo) {
            <div class="video-record-panel">
              <video #videoPreview class="video-preview" autoplay muted playsinline></video>
              <div class="video-record-controls">
                <span class="recording-dot"></span>
                <span>{{ recordingSeconds }}с</span>
                <button type="button" class="recording-cancel" (click)="cancelVideoRecording()">Отмена</button>
                <button type="button" class="send-btn small" (click)="stopVideoRecording()">
                  <i class="bi bi-stop-fill"></i>
                </button>
              </div>
            </div>
          } @else {
            <div class="attach-menu-wrapper">
              <button type="button" class="attach-btn" title="Вложение" data-testid="attach-menu-button" (click)="toggleAttachMenu()" [disabled]="sending">
                <i class="bi bi-paperclip"></i>
              </button>
              @if (showAttachMenu) {
                <div class="attach-menu">
                  <button type="button" data-testid="attach-photo" (click)="pickPhoto()">
                    <i class="bi bi-image"></i> Фото
                  </button>
                  <button type="button" (click)="startVoiceRecording()">
                    <i class="bi bi-mic-fill"></i> Голос
                  </button>
                  <button type="button" (click)="startVideoRecording()">
                    <i class="bi bi-record-circle"></i> Кружок
                  </button>
                </div>
              }
              <input
                #photoInput
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                (change)="onPhotoSelected($event)">
            </div>
            <div class="input-wrapper">
              <input
                type="text"
                class="message-input"
                placeholder="Написать сообщение..."
                [(ngModel)]="newMessage"
                name="newMessage"
                [disabled]="sending"
                (keydown.enter)="sendMessage()">
              <button type="button" class="emoji-btn" title="Смайлы" (click)="toggleEmojiPicker()">
                <i class="bi bi-emoji-smile"></i>
              </button>
            </div>
            <button
              type="button"
              class="send-btn"
              [disabled]="!newMessage.trim() || sending"
              (click)="sendMessage()">
              <i class="bi bi-send-fill"></i>
            </button>
          }
        </div>
      }

      @if (showAttachMenu) {
        <div class="attach-backdrop" (click)="showAttachMenu = false"></div>
      }

      @if (showEmojiPicker) {
        <div class="emoji-picker">
          <div class="emoji-grid">
            @for (emoji of emojis; track emoji) {
              <button type="button" class="emoji-btn-picker" (click)="addEmoji(emoji)">{{ emoji }}</button>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }

    .conversation-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      background: var(--bg-secondary);
    }

    .chat-subheader {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      background: var(--card-bg);
      border-bottom: 1px solid var(--border-color);
      flex-shrink: 0;
    }

    .back-btn {
      background: var(--bg-secondary);
      border: none;
      color: var(--text-primary);
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.2s;

      &:hover {
        background: var(--border-color);
      }
    }

    .subheader-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid var(--border-light);
      flex-shrink: 0;
    }

    .subheader-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    .subheader-name {
      font-weight: 600;
      color: var(--text-primary);
      text-decoration: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      &:hover {
        color: var(--accent-pink);
      }
    }

    .subheader-status {
      font-size: 0.75rem;
      color: var(--accent-green);
    }

    .profile-link-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      background: var(--bg-secondary);
      text-decoration: none;
      flex-shrink: 0;
      transition: all 0.2s;

      &:hover {
        color: var(--accent-pink);
        background: var(--bg-hover);
      }
    }

    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      min-height: 0;
    }

    .message-wrapper {
      display: flex;
      gap: 0.5rem;
      max-width: 75%;
    }

    .message-wrapper.incoming { align-self: flex-start; }
    .message-wrapper.outgoing { align-self: flex-end; flex-direction: row-reverse; }

    .message-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      object-fit: cover;
      align-self: flex-end;
    }

    .message-bubble {
      padding: 0.625rem 0.875rem;
      border-radius: 16px;
      word-wrap: break-word;
      box-shadow: var(--shadow-sm);
    }

    .message-bubble.incoming {
      background: var(--card-bg);
      border-bottom-left-radius: 4px;
      color: var(--text-primary);
    }

    .message-bubble.outgoing {
      background: var(--tinder-gradient);
      border-bottom-right-radius: 4px;
      color: white;
    }

    .message-text {
      margin: 0;
      font-size: 0.95rem;
      line-height: 1.45;
    }

    .message-bubble.media-bubble {
      padding: 0.375rem;
      max-width: min(280px, 100%);
    }

    .message-photo {
      display: block;
      max-width: 240px;
      max-height: 320px;
      border-radius: 12px;
      object-fit: cover;
    }

    .voice-message {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 210px;
      padding: 0.2rem 0.15rem;
    }

    .voice-play-btn {
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.15s ease, background 0.15s ease;

      .message-bubble.outgoing & {
        background: rgba(255, 255, 255, 0.22);
        color: #fff;
      }

      .message-bubble.incoming & {
        background: rgba(253, 41, 123, 0.12);
        color: #fd297b;
      }

      &:hover {
        transform: scale(1.05);
      }
    }

    .message-bubble.outgoing .voice-play-btn.playing {
      background: rgba(255, 255, 255, 0.32);
    }

    .voice-waveform {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 2px;
      height: 28px;
      min-width: 0;
    }

    .voice-bar {
      flex: 1;
      max-width: 4px;
      border-radius: 2px;
      background: currentColor;
      opacity: 0.3;
      align-self: center;
      transition: opacity 0.12s ease;

      &.active {
        opacity: 1;
      }

      .message-bubble.outgoing & {
        color: #fff;
      }

      .message-bubble.incoming & {
        color: #fd297b;
      }
    }

    .voice-duration {
      flex-shrink: 0;
      font-size: 0.72rem;
      opacity: 0.85;
      font-variant-numeric: tabular-nums;
      min-width: 2.4rem;
      text-align: right;
    }

    .message-video-note {
      display: block;
      width: 200px;
      height: 200px;
      border-radius: 50%;
      object-fit: cover;
      background: #000;
    }

    .message-bubble.media-bubble .message-text {
      padding: 0.25rem 0.5rem 0;
    }

    .attach-menu-wrapper {
      position: relative;
      flex-shrink: 0;
    }

    .attach-btn {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: color 0.2s, border-color 0.2s;

      &:hover:not(:disabled) {
        color: var(--accent-pink);
        border-color: var(--accent-pink);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .attach-menu {
      position: absolute;
      bottom: calc(100% + 0.5rem);
      left: 0;
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      box-shadow: var(--shadow-md);
      padding: 0.375rem;
      z-index: 20;
      min-width: 140px;

      button {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        width: 100%;
        border: none;
        background: none;
        padding: 0.5rem 0.75rem;
        border-radius: 8px;
        color: var(--text-primary);
        cursor: pointer;
        font-size: 0.9rem;

        &:hover {
          background: var(--bg-hover);
        }
      }
    }

    .attach-backdrop {
      position: fixed;
      inset: 0;
      z-index: 10;
    }

    .recording-bar {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem;
      background: var(--bg-secondary);
      border-radius: 24px;
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      font-size: 0.9rem;
    }

    .recording-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ef4444;
      animation: pulse 1s infinite;
      flex-shrink: 0;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .recording-cancel {
      margin-left: auto;
      border: none;
      background: none;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.85rem;

      &:hover { color: #ef4444; }
    }

    .video-record-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .video-preview {
      width: 160px;
      height: 160px;
      border-radius: 50%;
      object-fit: cover;
      background: #000;
      transform: scaleX(-1);
    }

    .video-record-controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
      justify-content: center;
    }

    .send-btn.small {
      width: 36px;
      height: 36px;
      font-size: 0.9rem;
    }

    .message-meta {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 0.25rem;
      margin-top: 0.25rem;
    }

    .message-time {
      font-size: 0.7rem;
      opacity: 0.75;
    }

    .empty-chat {
      text-align: center;
      color: var(--text-secondary);
      margin: auto;
      padding: 2rem 1rem;

      i {
        font-size: 3rem;
        opacity: 0.35;
        display: block;
        margin-bottom: 0.75rem;
        color: var(--accent-pink);
      }

      p { margin: 0 0 0.25rem; font-weight: 600; }
      span { font-size: 0.9rem; color: var(--text-muted); }
    }

    .message-input-container {
      display: flex;
      gap: 0.625rem;
      padding: 0.75rem 1rem;
      padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
      background: var(--card-bg);
      border-top: 1px solid var(--border-color);
      flex-shrink: 0;
    }

    .input-wrapper {
      flex: 1;
      display: flex;
      align-items: center;
      background: var(--bg-secondary);
      border-radius: 24px;
      padding: 0.5rem 0.875rem;
      border: 1px solid var(--border-color);
    }

    .message-input {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 1rem;
      outline: none;
      color: var(--text-primary);
    }

    .emoji-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 1.2rem;
      cursor: pointer;
      padding: 0.25rem;

      &:hover { color: var(--accent-pink); }
    }

    .send-btn {
      background: var(--tinder-gradient);
      border: none;
      color: white;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      transition: transform 0.2s, box-shadow 0.2s;

      &:hover:not(:disabled) {
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(253, 41, 123, 0.35);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .emoji-picker {
      background: var(--card-bg);
      border-top: 1px solid var(--border-color);
      padding: 0.75rem 1rem;
      flex-shrink: 0;
    }

    .emoji-grid {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 0.375rem;
      max-height: 160px;
      overflow-y: auto;
    }

    .emoji-btn-picker {
      background: none;
      border: none;
      font-size: 1.35rem;
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 8px;

      &:hover { background: var(--bg-hover); }
    }

    .block-notice {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1rem;
      background: rgba(239, 68, 68, 0.08);
      border-top: 1px solid rgba(239, 68, 68, 0.2);
      color: #dc2626;
      font-size: 0.9rem;
      flex-shrink: 0;
    }

    .messages-container::-webkit-scrollbar { width: 5px; }
    .messages-container::-webkit-scrollbar-thumb {
      background: var(--border-color);
      border-radius: 3px;
    }
  `]
})
export class ConversationPanelComponent implements OnChanges, OnDestroy, AfterViewChecked {
  @Input({ required: true }) userId!: string;
  @Input() showBackButton = false;
  @Output() back = new EventEmitter<void>();
  @Output() messageSent = new EventEmitter<void>();

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  @ViewChild('photoInput') private photoInput?: ElementRef<HTMLInputElement>;
  @ViewChild('videoPreview') private videoPreview?: ElementRef<HTMLVideoElement>;

  messages: ChatMessage[] = [];
  loading = false;
  sending = false;
  otherUserName?: string;
  otherUserPhotoUrl: string | null = null;
  otherUserOnline = false;
  newMessage = '';
  currentUserId?: string;
  isBlocked = false;
  showEmojiPicker = false;
  showAttachMenu = false;
  recordingVoice = false;
  recordingVideo = false;
  recordingSeconds = 0;
  playingVoiceId: string | null = null;

  readonly voiceWaveBars = [3, 6, 10, 5, 12, 8, 14, 7, 11, 6, 13, 9, 8, 12, 4, 10, 14, 6, 5, 11];

  private shouldScroll = false;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private isRefreshing = false;
  private destroy$ = new Subject<void>();
  private destroyRef = inject(DestroyRef);
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private recordedChunks: Blob[] = [];
  private recordingTimer: ReturnType<typeof setInterval> | null = null;
  private voiceAudio: HTMLAudioElement | null = null;
  private voiceProgress = 0;
  private voiceDurations = new Map<string, number>();
  private voicePreloadGeneration = 0;
  private teardownDone = false;
  private readonly cdr = inject(ChangeDetectorRef);

  private static readonly MAX_VOICE_MS = 120_000;
  private static readonly MAX_VIDEO_MS = 30_000;

  emojis = [
    '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆',
    '😉', '😊', '😋', '😎', '😍', '😘', '🥰', '😗',
    '❤️', '💕', '💖', '👍', '👏', '🙌', '👋', '✌️'
  ];

  constructor(
    private mailboxService: MailboxService,
    private userService: UserService,
    private modalService: ModalService
  ) {
    this.destroyRef.onDestroy(() => this.teardown());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userId'] && this.userId) {
      this.resetState();
      this.loadCurrentUserAndChat();
    }
  }

  ngOnDestroy(): void {
    this.teardown();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.scrollContainer) {
      setTimeout(() => {
        this.scrollToBottom();
        this.shouldScroll = false;
      }, 50);
    }
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || this.isBlocked || this.sending) {
      return;
    }

    this.sending = true;
    const message: UserMail = {
      to: this.userId,
      message: this.newMessage.trim()
    };

    this.mailboxService.sendMail(message).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.newMessage = '';
        this.sending = false;
        this.loadMessages();
        this.messageSent.emit();
      },
      error: (error) => {
        if (error.status === 412) {
          this.isBlocked = true;
        }
        this.sending = false;
      }
    });
  }

  getMessageTime(timestamp: unknown): string {
    if (!timestamp || typeof timestamp !== 'object') {
      return '';
    }
    const ts = timestamp as { seconds?: number; time?: number };
    const seconds = ts.seconds || ts.time;
    if (!seconds) {
      return '';
    }
    return new Date(seconds * 1000).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  toggleEmojiPicker(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(emoji: string): void {
    this.newMessage += emoji;
  }

  showMessageText(message: ChatMessage): boolean {
    if (!message.message?.trim()) {
      return false;
    }
    if (!message.mediaType) {
      return true;
    }
    const placeholders = ['Голосовое сообщение', 'Фото', 'Видео-кружок'];
    return !placeholders.includes(message.message.trim());
  }

  isVoicePlaying(message: ChatMessage): boolean {
    return message.id != null && this.playingVoiceId === String(message.id);
  }

  toggleVoicePlayback(message: ChatMessage): void {
    const messageKey = message.id != null ? String(message.id) : null;
    if (!messageKey || !message.mediaUrl) {
      return;
    }
    if (this.playingVoiceId === messageKey) {
      this.stopVoicePlayback();
      return;
    }
    this.stopVoicePlayback();

    const audio = new Audio(message.mediaUrl);
    this.voiceAudio = audio;
    this.playingVoiceId = messageKey;
    this.voiceProgress = 0;

    audio.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(audio.duration)) {
        this.voiceDurations.set(messageKey, audio.duration);
        this.cdr.markForCheck();
      }
    });
    audio.addEventListener('timeupdate', () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        this.voiceProgress = audio.currentTime / audio.duration;
        this.cdr.markForCheck();
      }
    });
    audio.addEventListener('ended', () => this.stopVoicePlayback());
    audio.addEventListener('error', () => this.stopVoicePlayback());

    void audio.play().catch(() => this.stopVoicePlayback());
  }

  stopVoicePlayback(): void {
    if (this.voiceAudio) {
      this.voiceAudio.pause();
      this.voiceAudio.removeAttribute('src');
      this.voiceAudio.load();
      this.voiceAudio = null;
    }
    this.playingVoiceId = null;
    this.voiceProgress = 0;
    this.cdr.markForCheck();
  }

  isVoiceBarActive(messageId: number | undefined, barIndex: number): boolean {
    const messageKey = messageId != null ? String(messageId) : null;
    if (!messageKey || this.playingVoiceId !== messageKey) {
      return false;
    }
    const progressIndex = Math.floor(this.voiceProgress * this.voiceWaveBars.length);
    return barIndex <= progressIndex;
  }

  formatVoiceDuration(messageId: number | undefined): string {
    const messageKey = messageId != null ? String(messageId) : null;
    if (!messageKey) {
      return '0:00';
    }
    const seconds = this.voiceDurations.get(messageKey);
    if (!seconds || !Number.isFinite(seconds)) {
      return '0:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  toggleAttachMenu(): void {
    this.showAttachMenu = !this.showAttachMenu;
    this.showEmojiPicker = false;
  }

  pickPhoto(): void {
    this.showAttachMenu = false;
    this.photoInput?.nativeElement.click();
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.isBlocked || this.sending) {
      return;
    }
    const caption = this.newMessage.trim() || undefined;
    this.newMessage = '';
    this.sendMedia('PHOTO', file, file.name, caption);
  }

  async startVoiceRecording(): Promise<void> {
    this.showAttachMenu = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      this.modalService.alert('Браузер не поддерживает запись аудио.', 'Запись голоса');
      return;
    }
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.beginRecording('VOICE', this.mediaStream, ConversationPanelComponent.MAX_VOICE_MS);
      this.recordingVoice = true;
    } catch {
      this.modalService.alert('Не удалось получить доступ к микрофону.', 'Микрофон');
      this.cleanupRecording();
    }
  }

  stopVoiceRecording(): void {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop();
    }
  }

  cancelVoiceRecording(): void {
    this.recordingVoice = false;
    this.cleanupRecording();
  }

  async startVideoRecording(): Promise<void> {
    this.showAttachMenu = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      this.modalService.alert('Браузер не поддерживает запись видео.', 'Видео-кружок');
      return;
    }
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: { facingMode: 'user', width: 480, height: 480 }
      });
      this.recordingVideo = true;
      setTimeout(() => this.attachVideoPreview(this.mediaStream!));
      this.beginRecording('VIDEO_NOTE', this.mediaStream, ConversationPanelComponent.MAX_VIDEO_MS);
    } catch {
      this.modalService.alert('Не удалось получить доступ к камере.', 'Камера');
      this.cleanupRecording();
    }
  }

  stopVideoRecording(): void {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop();
    }
  }

  cancelVideoRecording(): void {
    this.recordingVideo = false;
    this.cleanupRecording();
  }

  private sendMedia(
    mediaType: MailMediaType,
    file: Blob,
    filename: string,
    caption?: string
  ): void {
    if (this.isBlocked || this.sending) {
      return;
    }
    this.sending = true;
    this.mailboxService.sendMediaMail(this.userId, mediaType, file, filename, caption)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.sending = false;
          this.loadMessages();
          this.messageSent.emit();
        },
        error: (error) => {
          this.sending = false;
          if (error.status === 412) {
            this.isBlocked = true;
          } else {
            this.modalService.alert('Не удалось отправить вложение.', 'Ошибка');
          }
        }
      });
  }

  private beginRecording(mediaType: MailMediaType, stream: MediaStream, maxMs: number): void {
    this.recordedChunks = [];
    const mimeType = this.pickMimeType(mediaType);
    try {
      this.mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
    } catch {
      this.mediaRecorder = new MediaRecorder(stream);
    }

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.recordedChunks, { type: this.mediaRecorder?.mimeType || 'video/webm' });
      const extension = blob.type.includes('mp4') ? 'mp4' : 'webm';
      const prefix = mediaType === 'VOICE' ? 'voice' : 'video';
      const wasVoice = this.recordingVoice;
      const wasVideo = this.recordingVideo;
      this.recordingVoice = false;
      this.recordingVideo = false;
      this.stopRecordingTimer();
      this.cleanupStream();

      if (blob.size > 0 && !this.isBlocked) {
        this.sendMedia(mediaType, blob, `${prefix}.${extension}`);
      } else if (wasVoice || wasVideo) {
        // cancelled or empty
      }
    };

    this.mediaRecorder.start(250);
    this.startRecordingTimer(maxMs);
  }

  private pickMimeType(mediaType: MailMediaType): string | undefined {
    const candidates = mediaType === 'VOICE'
      ? ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
      : ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
    return candidates.find(type => MediaRecorder.isTypeSupported(type));
  }

  private startRecordingTimer(maxMs: number): void {
    this.recordingSeconds = 0;
    this.stopRecordingTimer();
    this.recordingTimer = setInterval(() => {
      this.recordingSeconds += 1;
      if (this.recordingSeconds * 1000 >= maxMs) {
        if (this.recordingVoice) {
          this.stopVoiceRecording();
        } else if (this.recordingVideo) {
          this.stopVideoRecording();
        }
      }
    }, 1000);
  }

  private stopRecordingTimer(): void {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
    this.recordingSeconds = 0;
  }

  private cleanupStream(): void {
    this.mediaStream?.getTracks().forEach(track => track.stop());
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.detachVideoPreview();
  }

  /** Preview uses video track only so mic audio is not played back in headphones. */
  private attachVideoPreview(stream: MediaStream): void {
    const video = this.videoPreview?.nativeElement;
    if (!video) {
      return;
    }
    const videoOnly = new MediaStream(stream.getVideoTracks());
    video.muted = true;
    video.volume = 0;
    video.defaultMuted = true;
    video.setAttribute('muted', '');
    video.srcObject = videoOnly;
    void video.play().catch(() => {});
  }

  private detachVideoPreview(): void {
    const video = this.videoPreview?.nativeElement;
    if (!video) {
      return;
    }
    video.pause();
    video.srcObject = null;
  }

  private cleanupRecording(): void {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.onstop = () => {
        this.stopRecordingTimer();
        this.cleanupStream();
      };
      this.mediaRecorder.stop();
    } else {
      this.stopRecordingTimer();
      this.cleanupStream();
    }
  }

  private resetState(): void {
    this.clearRefreshInterval();
    this.cleanupRecording();
    this.stopVoicePlayback();
    this.voicePreloadGeneration += 1;
    this.voiceDurations.clear();
    UserService.revokePhotoUrl(this.otherUserPhotoUrl);
    this.messages = [];
    this.newMessage = '';
    this.isBlocked = false;
    this.showEmojiPicker = false;
    this.showAttachMenu = false;
    this.recordingVoice = false;
    this.recordingVideo = false;
    this.otherUserPhotoUrl = null;
    this.otherUserName = undefined;
    this.otherUserOnline = false;
  }

  private loadCurrentUserAndChat(): void {
    this.userService.getCurrentUser().pipe(takeUntil(this.destroy$)).subscribe({
      next: (user) => {
        this.currentUserId = user.id;
        this.checkBlockStatus();
        this.loadMessages();
        this.loadOtherUserInfo();
      },
      error: () => {
        this.loadMessages();
        this.loadOtherUserInfo();
      }
    });
  }

  private checkBlockStatus(): void {
    this.userService.isBlockedBy(this.userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => { this.isBlocked = result.blocked; },
      error: () => {}
    });
  }

  private loadMessages(): void {
    this.loading = true;
    this.mailboxService.getConversation(this.userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (allMessages) => {
        this.messages = allMessages.map(m => ({
          ...m,
          isCurrentUser: m.from === this.currentUserId
        }));
        this.preloadVoiceDurations(this.messages);
        this.loading = false;
        this.shouldScroll = true;
        if (!this.refreshInterval) {
          this.refreshInterval = setInterval(() => this.refreshMessages(), 3000);
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private preloadVoiceDurations(messages: ChatMessage[]): void {
    const generation = this.voicePreloadGeneration;
    for (const message of messages) {
      if (message.mediaType !== 'VOICE' || !message.mediaUrl || message.id == null) {
        continue;
      }
      const messageKey = String(message.id);
      if (this.voiceDurations.has(messageKey)) {
        continue;
      }
      const audio = new Audio(message.mediaUrl);
      audio.preload = 'metadata';
      audio.addEventListener('loadedmetadata', () => {
        if (generation !== this.voicePreloadGeneration) {
          return;
        }
        if (Number.isFinite(audio.duration)) {
          this.voiceDurations.set(messageKey, audio.duration);
          this.cdr.markForCheck();
        }
        audio.removeAttribute('src');
        audio.load();
      }, { once: true });
      audio.addEventListener('error', () => {
        audio.removeAttribute('src');
        audio.load();
      }, { once: true });
    }
  }

  private loadOtherUserInfo(): void {
    this.userService.getUserById(this.userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (user: UserInfo) => {
        this.otherUserName = user.name;
        this.otherUserOnline = user.isOnline === true;
        this.loadOtherUserPhoto();
      },
      error: () => {
        this.otherUserName = 'Пользователь #' + this.userId;
      }
    });
  }

  private loadOtherUserPhoto(): void {
    this.userService.getPhoto(this.userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (bytes: Uint8Array) => {
        UserService.revokePhotoUrl(this.otherUserPhotoUrl);
        this.otherUserPhotoUrl = UserService.createPhotoUrl(bytes);
      },
      error: () => {
        this.otherUserPhotoUrl = null;
      }
    });
  }

  private refreshMessages(): void {
    if (this.sending || this.isRefreshing || this.recordingVoice || this.recordingVideo) {
      return;
    }
    this.isRefreshing = true;
    this.mailboxService.getConversation(this.userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (allMessages) => {
        this.isRefreshing = false;
        const prevCount = this.messages.length;
        this.messages = allMessages.map(m => ({
          ...m,
          isCurrentUser: m.from === this.currentUserId
        }));
        this.preloadVoiceDurations(this.messages);
        if (this.messages.length > prevCount) {
          this.shouldScroll = true;
        }
      },
      error: () => { this.isRefreshing = false; }
    });
  }

  private scrollToBottom(): void {
    try {
      const el = this.scrollContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    } catch {
      // ignore
    }
  }

  private clearRefreshInterval(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  private teardown(): void {
    if (this.teardownDone) {
      return;
    }
    this.teardownDone = true;
    this.voicePreloadGeneration += 1;
    this.clearRefreshInterval();
    this.cleanupRecording();
    this.stopVoicePlayback();
    this.destroy$.next();
    this.destroy$.complete();
    UserService.revokePhotoUrl(this.otherUserPhotoUrl);
  }
}
