import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  OnChanges,
  OnDestroy,
  AfterViewInit,
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
import { CONVERSATION_PAGE_SIZE, ConversationPage, MAIL_REACTIONS, MailboxService } from '../../../core/services/mailbox.service';
import { UserService } from '../../../core/services/user.service';
import { UserMail, UserInfo, MailMediaType, MailReactionType } from '../../../core/models/user.model';
import { ModalService } from '../../../core/services/modal.service';
import { Subject, takeUntil } from 'rxjs';
import { ImageCropModalComponent } from '../../../shared/components/image-crop-modal/image-crop-modal.component';
import { formatMessageDateTime, formatMessageTime } from '../../../shared/utils/timestamp.util';
import { isSystemMailMessage } from '../../../shared/utils/mail-system-message.util';
import { registerPullToRefresh } from '../../../core/routing/register-pull-to-refresh.util';
import { normalizeRouteUrl } from '../../../core/routing/route-cache-refresh.util';
import { PullToRefreshService } from '../../../core/routing/pull-to-refresh.service';

interface ChatMessage extends UserMail {
  isCurrentUser?: boolean;
}

@Component({
  selector: 'app-conversation-panel',
  standalone: true,
  imports: [RouterLink, FormsModule, ImageCropModalComponent],
  template: `
    <div class="conversation-panel">
      <div class="chat-subheader" data-pull-refresh-zone>
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
        @if (!selectionMode && !isBlocked) {
          <button
            type="button"
            class="select-messages-btn"
            title="Выбрать сообщения"
            data-testid="enter-selection-mode"
            (click)="enterSelectionMode()">
            <i class="bi bi-check2-square"></i>
          </button>
        } @else {
          <button type="button" class="select-messages-btn active" title="Отменить выбор" (click)="exitSelectionMode()">
            <i class="bi bi-x-lg"></i>
          </button>
        }
      </div>

      <div
        #scrollContainer
        class="messages-container"
        data-testid="messages-container"
        (scroll)="onMessagesScroll($event)">
        @if (loadingOlder) {
          <div class="load-older-indicator">
            <div class="spinner-border spinner-border-sm text-secondary" role="status">
              <span class="visually-hidden">Загрузка...</span>
            </div>
          </div>
        }
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
            @if (isSystemMessage(message)) {
              <div
                class="message-wrapper system"
                [attr.data-message-id]="message.id ?? null">
                <div class="system-message">
                  <span class="system-message-text">{{ message.message }}</span>
                  @if (message.timestamp) {
                    <span
                      class="system-message-time"
                      [attr.title]="getMessageDateTime(message.timestamp)">
                      {{ getMessageTime(message.timestamp) }}
                    </span>
                  }
                </div>
              </div>
            } @else {
            <div
              class="message-wrapper"
              [class.outgoing]="message.isCurrentUser"
              [class.incoming]="!message.isCurrentUser"
              [class.selectable]="selectionMode && message.isCurrentUser && message.id != null"
              [class.selected]="isMessageSelected(message)"
              [class.reply-target-highlight]="highlightedMessageId === message.id"
              [attr.data-message-id]="message.id ?? null"
              (click)="onMessageClick(message, $event)">
              @if (selectionMode && message.isCurrentUser && message.id != null) {
                <div class="message-select-indicator" aria-hidden="true">
                  <i class="bi" [class.bi-check-circle-fill]="isMessageSelected(message)" [class.bi-circle]="!isMessageSelected(message)"></i>
                </div>
              }
              @if (!message.isCurrentUser) {
                <img
                  [src]="otherUserPhotoUrl || 'assets/img/default-avatar.svg'"
                  class="message-avatar"
                  [alt]="otherUserName || 'User'">
              }
              <div
                class="message-bubble"
                [class.outgoing]="message.isCurrentUser"
                [class.incoming]="!message.isCurrentUser"
                [class.media-bubble]="!!message.mediaType">
                @if (hasReplyReference(message)) {
                  <div
                    class="reply-reference"
                    [class.clickable]="canNavigateToReply(message)"
                    [attr.role]="canNavigateToReply(message) ? 'button' : null"
                    [attr.tabindex]="canNavigateToReply(message) ? 0 : null"
                    (click)="scrollToReplyMessage(message, $event)"
                    (keydown.enter)="scrollToReplyMessage(message, $event)"
                    (keydown.space)="scrollToReplyMessage(message, $event)">
                    <span class="reply-reference-label">Ответ на сообщение</span>
                    <span class="reply-reference-text">{{ getReplyReferenceText(message) }}</span>
                  </div>
                }
                @if (message.mediaType === 'PHOTO' && message.mediaUrl) {
                  <img
                    [src]="message.mediaUrl"
                    class="message-photo"
                    data-testid="message-photo"
                    alt="Фото"
                    role="button"
                    tabindex="0"
                    (click)="onMessagePhotoClick(message, $event)"
                    (keydown.enter)="onMessagePhotoClick(message, $event)"
                    (keydown.space)="onMessagePhotoClick(message, $event)">
                } @else if (message.mediaType === 'VOICE' && message.mediaUrl) {
                  <div class="voice-message" data-testid="message-voice">
                    <button
                      type="button"
                      class="voice-play-btn"
                      [class.playing]="isVoicePlaying(message)"
                      (click)="onVoicePlayClick(message, $event)"
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
                  <span
                    class="message-time"
                    [attr.title]="getMessageDateTime(message.timestamp)">
                    {{ getMessageTime(message.timestamp) }}
                  </span>
                  @if (message.id && !selectionMode && !isSystemMessage(message)) {
                    <button
                      type="button"
                      class="message-reaction-toggle"
                      [class.active]="showReactionPickerFor === message.id"
                      title="Реакция"
                      (click)="toggleMessageReactionPicker(message.id, $event)">
                      <i class="bi bi-emoji-smile"></i>
                    </button>
                  }
                  @if (message.id && !selectionMode && !isSystemMessage(message)) {
                    <button
                      type="button"
                      class="reply-btn"
                      title="Ответить"
                      (click)="onReplyClick(message, $event)">
                      <i class="bi bi-reply"></i>
                    </button>
                  }
                  @if (message.isCurrentUser) {
                    <span class="message-status">
                      @if (message.isRead) {
                        <i class="bi bi-check-all" title="Прочитано"></i>
                      } @else {
                        <i class="bi bi-check" title="Доставлено"></i>
                      }
                    </span>
                  }
                </div>
                @if (message.id && showReactionPickerFor === message.id) {
                  <div class="message-reactions-picker" (click)="$event.stopPropagation()">
                    @for (reaction of mailReactions; track reaction.type) {
                      <button
                        type="button"
                        class="message-reaction-btn"
                        [class.selected]="message.currentUserReaction === reaction.type"
                        (click)="reactToMessage(message, reaction.type)">
                        {{ reaction.emoji }}
                      </button>
                    }
                  </div>
                }
                @if (message.reactionCounts && hasReactionCounts(message)) {
                  <div class="message-reactions-summary">
                    @for (reaction of mailReactions; track reaction.type) {
                      @if (getReactionCount(message, reaction.type) > 0) {
                        <span class="message-reaction-pill" [class.mine]="message.currentUserReaction === reaction.type">
                          {{ reaction.emoji }} {{ getReactionCount(message, reaction.type) }}
                        </span>
                      }
                    }
                  </div>
                }
              </div>
            </div>
            }
          }
        }
      </div>

      @if (isBlocked) {
        <div class="block-notice">
          <i class="bi bi-shield-slash"></i>
          <span>Пользователь ограничил с вами общение</span>
        </div>
      } @else if (selectionMode) {
        <div class="selection-toolbar">
          <span class="selection-count">Выбрано: {{ selectedMessageIds.size }}</span>
          <button type="button" class="btn btn-outline-secondary btn-sm" (click)="exitSelectionMode()">Отмена</button>
          <button
            type="button"
            class="btn btn-danger btn-sm"
            data-testid="delete-selected-messages"
            [disabled]="selectedMessageIds.size === 0 || deletingMessages"
            (click)="deleteSelectedMessages()">
            @if (deletingMessages) {
              <span class="spinner-border spinner-border-sm me-1"></span>
            }
            <i class="bi bi-trash"></i> Удалить
          </button>
        </div>
      } @else {
        <div #messageInputContainer class="message-input-container">
          @if (replyingToMessage) {
            <div class="reply-preview">
              <div class="reply-preview-content">
                <span class="reply-preview-label">Ответ на: {{ replyingToMessage.isCurrentUser ? 'ваше сообщение' : (otherUserName || 'сообщение') }}</span>
                <span class="reply-preview-text">{{ getReplyPreviewText(replyingToMessage) }}</span>
              </div>
              <button type="button" class="reply-preview-close" (click)="cancelReply()" title="Отменить ответ">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
          }
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
                #messageInput
                type="text"
                class="message-input"
                data-testid="message-input"
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

    @if (photoPreviewUrl) {
      <div class="photo-preview-backdrop" (click)="closePhotoPreview()">
        <button
          type="button"
          class="photo-preview-close"
          aria-label="Закрыть просмотр фото"
          (click)="$event.stopPropagation(); closePhotoPreview()">
          <i class="bi bi-x-lg"></i>
        </button>
        <img
          [src]="photoPreviewUrl"
          class="photo-preview-image"
          alt="Полный размер фото"
          (click)="$event.stopPropagation()">
      </div>
    }

    <app-image-crop-modal
      [visible]="photoCropVisible"
      [sourceFile]="photoCropSourceFile"
      preset="message"
      (confirmed)="onPhotoCropped($event)"
      (cancelled)="onPhotoCropCancelled()">
    </app-image-crop-modal>
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
      padding-left: var(--app-safe-left);
      padding-right: var(--app-safe-right);
      box-sizing: border-box;
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

    .select-messages-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      background: var(--bg-secondary);
      flex-shrink: 0;
      cursor: pointer;
      transition: all 0.2s;

      &:hover,
      &.active {
        color: var(--accent-pink);
        background: var(--bg-hover);
      }
    }

    .message-wrapper.selectable {
      cursor: pointer;
    }

    .message-wrapper.selected .message-bubble.outgoing {
      box-shadow: 0 0 0 2px rgba(253, 41, 123, 0.55);
    }

    .message-select-indicator {
      align-self: center;
      color: var(--accent-pink);
      font-size: 1.2rem;
      flex-shrink: 0;
      margin-right: 0.15rem;
    }

    .selection-toolbar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      padding-bottom: calc(0.75rem + var(--app-safe-bottom));
      background: var(--card-bg);
      border-top: 1px solid var(--border-color);
      flex-shrink: 0;
    }

    .selection-count {
      flex: 1;
      font-size: 0.9rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .selection-toolbar .btn-danger {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }

    .messages-container {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      min-height: 0;
      overscroll-behavior-y: contain;
      touch-action: pan-y;
      -webkit-overflow-scrolling: touch;
    }

    .load-older-indicator {
      display: flex;
      justify-content: center;
      padding: 0.25rem 0 0.5rem;
      flex-shrink: 0;
    }

    .message-wrapper {
      display: flex;
      gap: 0.5rem;
      max-width: 75%;
      min-width: 0;
    }

    .message-wrapper.incoming { align-self: flex-start; }
    .message-wrapper.outgoing { align-self: flex-end; flex-direction: row-reverse; }

    .message-wrapper.system {
      align-self: center;
      max-width: 90%;
      justify-content: center;
    }

    .system-message {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.125rem;
      padding: 0.25rem 0.5rem;
      text-align: center;
    }

    .system-message-text {
      font-style: italic;
      color: var(--text-muted, #6c757d);
      font-size: 0.875rem;
      line-height: 1.35;
    }

    .system-message-time {
      font-size: 0.6875rem;
      color: var(--text-muted, #adb5bd);
    }

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
      max-width: 100%;
      overflow: hidden;
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
      width: 100%;
      max-width: 240px;
      max-height: 320px;
      margin: 0 auto;
      border-radius: 12px;
      object-fit: contain;
      object-position: center;
      cursor: zoom-in;
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

    .message-reaction-toggle {
      border: none;
      background: transparent;
      color: var(--accent-pink);
      font-size: 0.9rem;
      cursor: pointer;
      padding: 0.15rem 0.3rem;
      border-radius: 999px;
      opacity: 0.9;

      &.active,
      &:hover {
        color: var(--accent-pink);
        opacity: 1;
        background: rgba(253, 41, 123, 0.12);
      }
    }

    .message-bubble.outgoing .message-reaction-toggle {
      color: rgba(255, 255, 255, 0.95);
      opacity: 1;

      &.active,
      &:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.22);
      }
    }

    .message-reactions-picker {
      margin-top: 0.35rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.2rem;
      padding: 0.25rem;
      border-radius: 10px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      width: fit-content;
      max-width: 100%;
    }

    .message-reaction-btn {
      border: none;
      background: transparent;
      font-size: 1rem;
      border-radius: 8px;
      padding: 0.15rem 0.3rem;
      cursor: pointer;

      &.selected,
      &:hover {
        background: var(--bg-hover);
      }
    }

    .message-reactions-summary {
      margin-top: 0.3rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }

    .message-reaction-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      font-size: 0.72rem;
      padding: 0.15rem 0.35rem;
      border-radius: 999px;
      background: var(--bg-secondary);
      color: var(--text-secondary);
      border: 1px solid var(--border-color);

      &.mine {
        border-color: var(--accent-pink);
        color: var(--accent-pink);
      }
    }

    .reply-btn {
      border: none;
      background: transparent;
      color: var(--accent-pink);
      font-size: 0.9rem;
      cursor: pointer;
      padding: 0.15rem 0.3rem;
      border-radius: 999px;
      opacity: 0.9;

      &:hover {
        color: var(--accent-pink);
        opacity: 1;
        background: rgba(253, 41, 123, 0.12);
      }
    }

    .message-bubble.outgoing .reply-btn {
      color: rgba(255, 255, 255, 0.95);
      opacity: 1;

      &:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.22);
      }
    }

    .message-bubble.outgoing .message-time,
    .message-bubble.outgoing .message-status {
      color: rgba(255, 255, 255, 0.88);
      opacity: 1;
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
      flex-wrap: wrap;
      gap: 0.625rem;
      padding: 0.75rem 1rem;
      padding-bottom: calc(0.75rem + var(--app-safe-bottom));
      background: var(--card-bg);
      border-top: 1px solid var(--border-color);
      flex-shrink: 0;
      min-width: 0;
    }

    .reply-preview {
      width: 100%;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.4rem 0.5rem;
      border-radius: 10px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
    }

    .reply-preview-content {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .reply-preview-label {
      font-size: 0.72rem;
      color: var(--accent-pink);
      font-weight: 600;
      line-height: 1.2;
    }

    .reply-preview-text {
      font-size: 0.82rem;
      color: var(--text-primary);
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    .reply-preview-close {
      border: none;
      background: transparent;
      color: var(--text-muted);
      font-size: 0.8rem;
      padding: 0.2rem;
      cursor: pointer;
      flex-shrink: 0;
    }

    .reply-reference {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      margin-bottom: 0.4rem;
      padding: 0.35rem 0.5rem;
      border-radius: 8px;
      background: rgba(253, 41, 123, 0.1);
      border-left: 3px solid var(--accent-pink);
    }

    .reply-reference.clickable {
      cursor: pointer;
      transition: background 0.2s ease;

      &:hover {
        background: rgba(253, 41, 123, 0.16);
      }
    }

    .message-bubble.outgoing .reply-reference {
      background: rgba(255, 255, 255, 0.2);
      border-left-color: rgba(255, 255, 255, 0.9);
    }

    .message-bubble.outgoing .reply-reference.clickable:hover {
      background: rgba(255, 255, 255, 0.28);
    }

    .reply-reference-label {
      font-size: 0.72rem;
      color: var(--accent-pink);
      font-weight: 600;
      line-height: 1.2;
    }

    .message-bubble.outgoing .reply-reference-label {
      color: rgba(255, 255, 255, 0.95);
    }

    .reply-reference-text {
      font-size: 0.84rem;
      color: var(--text-primary);
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 220px;
    }

    .message-bubble.outgoing .reply-reference-text {
      color: rgba(255, 255, 255, 0.92);
    }

    .input-wrapper {
      flex: 1;
      display: flex;
      align-items: center;
      background: var(--bg-secondary);
      border-radius: 24px;
      padding: 0.5rem 0.875rem;
      border: 1px solid var(--border-color);
      min-width: 0;
    }

    .message-input {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 1rem;
      outline: none;
      color: var(--text-primary);
      min-width: 0;
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

    @media (max-width: 991.98px) {
      :host {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        height: 100%;
      }

      .conversation-panel {
        flex: 1;
        min-height: 0;
      }
    }

    @media (max-width: 576px) {
      .message-wrapper {
        max-width: 88%;
      }

      .message-bubble.media-bubble {
        max-width: min(260px, 100%);
      }

      .message-input-container {
        gap: 0.45rem;
        padding: 0.625rem 0.75rem;
        padding-bottom: calc(0.625rem + var(--app-safe-bottom));
      }

      .input-wrapper {
        padding: 0.45rem 0.65rem;
      }

      .attach-btn,
      .send-btn {
        width: 40px;
        height: 40px;
      }

      .emoji-btn {
        font-size: 1.05rem;
        padding: 0.2rem;
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

    .photo-preview-backdrop {
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100dvh;
      z-index: 12000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding:
        max(1rem, var(--app-safe-top))
        max(1rem, var(--app-safe-right))
        max(1rem, var(--app-safe-bottom))
        max(1rem, var(--app-safe-left));
      box-sizing: border-box;
      background: rgba(0, 0, 0, 0.9);
    }

    .photo-preview-image {
      display: block;
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      border-radius: 12px;
      object-fit: contain;
      object-position: center;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
    }

    .photo-preview-close {
      position: absolute;
      top: max(12px, calc(12px + var(--app-safe-top)));
      right: max(12px, calc(12px + var(--app-safe-right)));
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 50%;
      background: rgba(17, 24, 39, 0.78);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .messages-container::-webkit-scrollbar { width: 5px; }
    .messages-container::-webkit-scrollbar-thumb {
      background: var(--border-color);
      border-radius: 3px;
    }

    .message-wrapper.reply-target-highlight .message-bubble {
      box-shadow: 0 0 0 2px rgba(253, 41, 123, 0.55), var(--shadow-sm);
      transition: box-shadow 0.3s ease;
    }
  `]
})
export class ConversationPanelComponent implements OnChanges, OnDestroy, AfterViewInit, AfterViewChecked {
  @Input({ required: true }) userId!: string;
  @Input() showBackButton = false;
  @Input() reloadToken = 0;
  @Output() back = new EventEmitter<void>();
  @Output() messageSent = new EventEmitter<void>();
  @Output() conversationLoaded = new EventEmitter<void>();

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput?: ElementRef<HTMLInputElement>;
  @ViewChild('messageInputContainer') private messageInputContainer?: ElementRef<HTMLElement>;
  @ViewChild('photoInput') private photoInput?: ElementRef<HTMLInputElement>;
  @ViewChild('videoPreview') private videoPreview?: ElementRef<HTMLVideoElement>;

  messages: ChatMessage[] = [];
  loading = false;
  loadingOlder = false;
  hasMoreOlder = false;
  sending = false;
  otherUserName?: string;
  otherUserPhotoUrl: string | null = null;
  otherUserOnline = false;
  newMessage = '';
  currentUserId?: string;
  isBlocked = false;
  showEmojiPicker = false;
  showAttachMenu = false;
  photoPreviewUrl: string | null = null;
  photoCropVisible = false;
  photoCropSourceFile: File | null = null;
  recordingVoice = false;
  recordingVideo = false;
  recordingSeconds = 0;
  playingVoiceId: string | null = null;
  replyingToMessage: ChatMessage | null = null;
  showReactionPickerFor: number | null = null;
  selectionMode = false;
  selectedMessageIds = new Set<number>();
  deletingMessages = false;
  highlightedMessageId: number | null = null;
  readonly mailReactions = MAIL_REACTIONS;

  readonly voiceWaveBars = [3, 6, 10, 5, 12, 8, 14, 7, 11, 6, 13, 9, 8, 12, 4, 10, 14, 6, 5, 11];

  private shouldScroll = false;
  private viewInitialized = false;
  private scrollBehavior: ScrollBehavior = 'auto';
  private focusInputTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private scrollPinObserver: ResizeObserver | null = null;
  private scrollPinStopTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private scrollPinActive = false;
  private programmaticScroll = false;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private isRefreshing = false;
  private readonly conversationPageSize = CONVERSATION_PAGE_SIZE;
  private destroy$ = new Subject<void>();
  private destroyRef = inject(DestroyRef);
  private readonly pullToRefreshService = inject(PullToRefreshService);
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private recordedChunks: Blob[] = [];
  private recordingTimer: ReturnType<typeof setInterval> | null = null;
  private voiceAudio: HTMLAudioElement | null = null;
  private voiceProgress = 0;
  private voiceDurations = new Map<string, number>();
  private voiceDurationLoads = new Map<string, Promise<void>>();
  private pendingPhotoCaption?: string;
  private voicePreloadGeneration = 0;
  private teardownDone = false;
  private highlightTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private lastOnlineRefreshAt = 0;
  private readonly cdr = inject(ChangeDetectorRef);

  private static readonly MAX_VOICE_MS = 120_000;
  private static readonly MAX_VIDEO_MS = 30_000;
  private static readonly ONLINE_STATUS_REFRESH_MS = 30_000;

  emojis = [
    '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆',
    '😉', '😊', '😋', '😭', '😎', '😍', '😘', '🥰',
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
    const userIdChanged = !!changes['userId']?.currentValue
      && changes['userId'].currentValue !== changes['userId'].previousValue;
    const reloadTokenChanged = !!changes['reloadToken']
      && !changes['reloadToken'].firstChange;

    if (userIdChanged) {
      this.resetState();
      this.loadCurrentUserAndChat();
    }
    if (reloadTokenChanged && this.userId && !userIdChanged) {
      this.reloadConversation(true, true);
    }
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    registerPullToRefresh(this.pullToRefreshService, this.destroyRef, (url) => {
      const normalized = normalizeRouteUrl(url);
      return normalized.startsWith('/mailbox/') && normalized !== '/mailbox';
    }, () => ({
      refresh: () => this.reloadConversation(true, true),
      getScrollElement: () => this.scrollContainer?.nativeElement,
      isEnabled: () => !this.loading && !this.loadingOlder && !this.isRefreshing,
    }));
    if (!this.loading && this.messages.length > 0) {
      this.scrollToLatestMessages();
    }
  }

  ngOnDestroy(): void {
    this.teardown();
  }

  @HostListener('document:keydown.escape')
  onEscapePressed(): void {
    this.closePhotoPreview();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.scrollContainer) {
      const behavior = this.scrollBehavior;
      this.shouldScroll = false;
      this.scrollBehavior = 'auto';
      requestAnimationFrame(() => {
        this.scrollBehavior = behavior;
        this.scrollToBottom();
        this.scrollBehavior = 'auto';
      });
    }
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || this.isBlocked || this.sending) {
      return;
    }

    this.sending = true;
    const message: UserMail = {
      to: this.userId,
      message: this.newMessage.trim(),
      replyToMessageId: this.replyingToMessage?.id ?? null
    };

    this.mailboxService.sendMail(message).pipe(takeUntil(this.destroy$)).subscribe({
      next: (page) => {
        this.newMessage = '';
        this.replyingToMessage = null;
        this.sending = false;
        this.mergeConversationPage(page, { scrollToBottom: true, smoothScroll: true });
        this.messageSent.emit();
        this.scheduleMessageInputFocus();
      },
      error: (error) => {
        if (error.status === 412) {
          this.isBlocked = true;
        }
        this.sending = false;
        this.scheduleMessageInputFocus();
      }
    });
  }

  getMessageTime(timestamp: unknown): string {
    return formatMessageTime(timestamp);
  }

  getMessageDateTime(timestamp: unknown): string {
    return formatMessageDateTime(timestamp);
  }

  toggleEmojiPicker(): void {
    this.showReactionPickerFor = null;
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(emoji: string): void {
    this.newMessage += emoji;
  }

  toggleMessageReactionPicker(messageId: number, event?: Event): void {
    event?.stopPropagation();
    this.showReactionPickerFor = this.showReactionPickerFor === messageId ? null : messageId;
  }

  reactToMessage(message: ChatMessage, reaction: MailReactionType): void {
    if (!message.id || this.sending || this.isBlocked) {
      return;
    }
    this.mailboxService.reactToMessage(message.id, reaction).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        message.currentUserReaction = response.reaction;
        message.reactionCounts = { ...(response.reactionCounts ?? {}) };
        this.showReactionPickerFor = null;
        this.cdr.markForCheck();
      },
      error: () => {
        this.showReactionPickerFor = null;
        this.cdr.markForCheck();
      }
    });
  }

  getReactionCount(message: ChatMessage, reaction: MailReactionType): number {
    return message.reactionCounts?.[reaction] ?? 0;
  }

  hasReactionCounts(message: ChatMessage): boolean {
    if (!message.reactionCounts) return false;
    return this.mailReactions.some(r => (message.reactionCounts?.[r.type] ?? 0) > 0);
  }

  isSystemMessage(message: ChatMessage): boolean {
    return isSystemMailMessage(message);
  }

  startReply(message: ChatMessage): void {
    if (!message.id || this.isBlocked || this.sending || this.isSystemMessage(message)) {
      return;
    }
    this.replyingToMessage = message;
    this.showAttachMenu = false;
    this.showEmojiPicker = false;
    if (this.isMobileLayout()) {
      this.scrollBehavior = 'smooth';
      this.shouldScroll = true;
      this.scheduleMessageInputFocus();
    }
  }

  private isMobileLayout(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 991.98px)').matches;
  }

  private scheduleMessageInputFocus(): void {
    this.clearFocusInputTimeout();
    this.cdr.markForCheck();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.focusMessageInput();
        this.focusInputTimeoutId = setTimeout(() => {
          this.focusInputTimeoutId = null;
          this.focusMessageInput();
        }, 350);
      });
    });
  }

  private clearFocusInputTimeout(): void {
    if (this.focusInputTimeoutId != null) {
      clearTimeout(this.focusInputTimeoutId);
      this.focusInputTimeoutId = null;
    }
  }

  private focusMessageInput(): void {
    if (this.isBlocked || this.selectionMode || this.sending) {
      return;
    }
    const input = this.messageInput?.nativeElement;
    if (!input) {
      return;
    }
    if (this.isMobileLayout()) {
      this.scrollToBottom();
    }
    input.focus({ preventScroll: true });
  }

  cancelReply(): void {
    this.clearFocusInputTimeout();
    this.replyingToMessage = null;
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
      void this.ensureVoiceDuration(messageKey, message.mediaUrl!, audio.duration);
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

  getReplyPreviewText(message: ChatMessage): string {
    if (message.mediaType === 'VOICE') return 'Голосовое сообщение';
    if (message.mediaType === 'PHOTO') return 'Фото';
    if (message.mediaType === 'VIDEO_NOTE') return 'Видео-кружок';
    return message.message?.trim() || 'Сообщение';
  }

  hasReplyReference(message: ChatMessage): boolean {
    return !!message.replyToMessageId || message.replyTargetUnavailable === true;
  }

  getReplyReferenceText(message: ChatMessage): string {
    if (message.replyTargetUnavailable) {
      return 'Исходное сообщение удалено';
    }
    const targetId = message.replyToMessageId;
    if (!targetId) {
      return 'Исходное сообщение удалено';
    }
    const target = this.messages.find(m => m.id === targetId);
    if (target) {
      return this.getReplyPreviewText(target);
    }
    if (this.canLoadOlderReplyTarget(targetId)) {
      return 'Сообщение выше в переписке';
    }
    return 'Исходное сообщение удалено';
  }

  private canLoadOlderReplyTarget(targetId: number): boolean {
    const oldestId = this.messages[0]?.id;
    if (oldestId == null) {
      return this.hasMoreOlder;
    }
    return targetId < oldestId && this.hasMoreOlder;
  }

  canNavigateToReply(message: ChatMessage): boolean {
    if (message.replyTargetUnavailable || !message.replyToMessageId) {
      return false;
    }
    const targetId = message.replyToMessageId;
    if (this.messages.some(m => m.id === targetId)) {
      return true;
    }
    return this.canLoadOlderReplyTarget(targetId);
  }

  async scrollToReplyMessage(message: ChatMessage, event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if (!message.replyToMessageId) {
      return;
    }
    const targetId = message.replyToMessageId;
    if (this.scrollToMessageElement(targetId, true)) {
      return;
    }
    const foundAfterLoad = await this.loadOlderMessagesUntilFound(targetId);
    if (foundAfterLoad) {
      this.scrollToMessageElement(targetId, true);
    }
  }

  toggleAttachMenu(): void {
    this.showAttachMenu = !this.showAttachMenu;
    this.showEmojiPicker = false;
    this.showReactionPickerFor = null;
  }

  pickPhoto(): void {
    this.showAttachMenu = false;
    this.showReactionPickerFor = null;
    this.photoInput?.nativeElement.click();
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.isBlocked || this.sending) {
      return;
    }
    this.pendingPhotoCaption = this.newMessage.trim() || undefined;
    this.newMessage = '';
    this.photoCropSourceFile = file;
    this.photoCropVisible = true;
  }

  onPhotoCropped(file: File): void {
    this.photoCropVisible = false;
    this.photoCropSourceFile = null;
    this.sendMedia('PHOTO', file, file.name, this.pendingPhotoCaption);
    this.pendingPhotoCaption = undefined;
  }

  onPhotoCropCancelled(): void {
    this.photoCropVisible = false;
    this.photoCropSourceFile = null;
    if (this.pendingPhotoCaption) {
      this.newMessage = this.pendingPhotoCaption;
      this.pendingPhotoCaption = undefined;
    }
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
    const replyToMessageId = this.replyingToMessage?.id;
    this.mailboxService.sendMediaMail(this.userId, mediaType, file, filename, caption, replyToMessageId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          this.replyingToMessage = null;
          this.sending = false;
          this.mergeConversationPage(page, { scrollToBottom: true, smoothScroll: true });
          this.messageSent.emit();
          this.scheduleMessageInputFocus();
        },
        error: (error) => {
          this.sending = false;
          if (error.status === 412) {
            this.isBlocked = true;
          } else {
            this.modalService.alert('Не удалось отправить вложение.', 'Ошибка');
          }
          this.scheduleMessageInputFocus();
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
    this.clearScrollPin();
    this.clearFocusInputTimeout();
    this.clearRefreshInterval();
    this.cleanupRecording();
    this.stopVoicePlayback();
    this.voicePreloadGeneration += 1;
    if (this.highlightTimeoutId) {
      clearTimeout(this.highlightTimeoutId);
      this.highlightTimeoutId = null;
    }
    this.highlightedMessageId = null;
    this.lastOnlineRefreshAt = 0;
    this.voiceDurations.clear();
    this.voiceDurationLoads.clear();
    this.messages = [];
    this.newMessage = '';
    this.replyingToMessage = null;
    this.isBlocked = false;
    this.showEmojiPicker = false;
    this.showAttachMenu = false;
    this.photoPreviewUrl = null;
    this.showReactionPickerFor = null;
    this.recordingVoice = false;
    this.recordingVideo = false;
    this.otherUserPhotoUrl = null;
    this.otherUserName = undefined;
    this.otherUserOnline = false;
    this.hasMoreOlder = false;
    this.loadingOlder = false;
    this.exitSelectionMode();
  }

  enterSelectionMode(): void {
    if (this.isBlocked) {
      return;
    }
    this.clearFocusInputTimeout();
    this.selectionMode = true;
    this.selectedMessageIds = new Set<number>();
    this.showAttachMenu = false;
    this.showEmojiPicker = false;
    this.showReactionPickerFor = null;
    this.replyingToMessage = null;
    this.stopVoicePlayback();
  }

  exitSelectionMode(): void {
    this.selectionMode = false;
    this.selectedMessageIds = new Set<number>();
    this.deletingMessages = false;
  }

  isMessageSelected(message: ChatMessage): boolean {
    return message.id != null && this.selectedMessageIds.has(message.id);
  }

  onMessageClick(message: ChatMessage, event: Event): void {
    if (!this.selectionMode || !message.isCurrentUser || message.id == null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.toggleMessageSelection(message.id);
  }

  onVoicePlayClick(message: ChatMessage, event: Event): void {
    event.stopPropagation();
    if (this.selectionMode && message.isCurrentUser && message.id != null) {
      this.toggleMessageSelection(message.id);
      return;
    }
    this.toggleVoicePlayback(message);
  }

  onReplyClick(message: ChatMessage, event: Event): void {
    event.stopPropagation();
    if (this.selectionMode || this.isSystemMessage(message)) {
      return;
    }
    this.startReply(message);
  }

  onMessagePhotoClick(message: ChatMessage, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.selectionMode || !message.mediaUrl) {
      return;
    }
    this.photoPreviewUrl = message.mediaUrl;
  }

  closePhotoPreview(): void {
    this.photoPreviewUrl = null;
  }

  private toggleMessageSelection(messageId: number): void {
    const next = new Set(this.selectedMessageIds);
    if (next.has(messageId)) {
      next.delete(messageId);
    } else {
      next.add(messageId);
    }
    this.selectedMessageIds = next;
    this.cdr.markForCheck();
  }

  async deleteSelectedMessages(): Promise<void> {
    if (this.selectedMessageIds.size === 0 || this.deletingMessages) {
      return;
    }
    const count = this.selectedMessageIds.size;
    const confirmed = await this.modalService.confirm(
      `Удалить выбранные сообщения (${count})? Это действие нельзя отменить.`,
      'Удаление сообщений'
    );
    if (!confirmed) {
      return;
    }

    const ids = Array.from(this.selectedMessageIds);
    this.deletingMessages = true;
    this.mailboxService.deleteMessages(ids).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        const deleted = new Set(ids);
        this.messages = this.messages
          .filter(message => message.id == null || !deleted.has(message.id))
          .map(message => {
            if (message.replyToMessageId != null && deleted.has(message.replyToMessageId)) {
              return {
                ...message,
                replyToMessageId: null,
                replyTargetUnavailable: true,
              };
            }
            return message;
          });
        if (this.replyingToMessage?.id != null && deleted.has(this.replyingToMessage.id)) {
          this.replyingToMessage = null;
        }
        if (this.playingVoiceId && deleted.has(Number(this.playingVoiceId))) {
          this.stopVoicePlayback();
        }
        if (this.messages.length === 0) {
          this.hasMoreOlder = false;
        }
        this.deletingMessages = false;
        this.exitSelectionMode();
        this.messageSent.emit();
        this.cdr.markForCheck();
      },
      error: () => {
        this.deletingMessages = false;
        this.modalService.alert('Не удалось удалить сообщения', 'Ошибка');
      }
    });
  }

  onMessagesScroll(event: Event): void {
    if (this.scrollPinActive && !this.programmaticScroll) {
      this.clearScrollPin();
    }
    const el = event.target as HTMLElement;
    if (el.scrollTop <= 120 && this.hasMoreOlder && !this.loadingOlder && !this.loading) {
      this.loadOlderMessages();
    }
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
    this.hasMoreOlder = false;
    this.mailboxService.getConversation(this.userId, { size: this.conversationPageSize })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          this.messages = this.mapToChatMessages(page.messages);
          this.hasMoreOlder = page.hasMore;
          this.preloadVoiceDurations(this.messages);
          this.loading = false;
          this.onConversationReady();
          if (!this.refreshInterval) {
            this.refreshInterval = setInterval(() => this.refreshMessages(), 3000);
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  private onConversationReady(scrollToBottom = true): void {
    if (scrollToBottom) {
      this.scrollToLatestMessages();
    }
    this.conversationLoaded.emit();
  }

  private scrollToLatestMessages(smooth = false): void {
    this.scheduleScrollToBottom(smooth);
    this.pinScrollToBottomWhileLayoutSettles();
    this.ensureScrollToBottomWhenReady();
  }

  private ensureScrollToBottomWhenReady(attemptsLeft = 48): void {
    if (attemptsLeft <= 0) {
      return;
    }
    const scrolled = this.scrollToBottom();
    const el = this.scrollContainer?.nativeElement as HTMLElement | undefined;
    const layoutReady = !!el && el.clientHeight > 0;
    const contentReady = !!el && el.scrollHeight > el.clientHeight + 2;
    if (!this.viewInitialized || !layoutReady || (!contentReady && this.messages.length > 0 && !this.loading)) {
      requestAnimationFrame(() => this.ensureScrollToBottomWhenReady(attemptsLeft - 1));
      return;
    }
    if (!scrolled && layoutReady) {
      requestAnimationFrame(() => this.ensureScrollToBottomWhenReady(attemptsLeft - 1));
    }
  }

  private clearScrollPin(): void {
    this.scrollPinActive = false;
    if (this.scrollPinStopTimeoutId != null) {
      clearTimeout(this.scrollPinStopTimeoutId);
      this.scrollPinStopTimeoutId = null;
    }
    this.scrollPinObserver?.disconnect();
    this.scrollPinObserver = null;
  }

  private pinScrollToBottomWhileLayoutSettles(): void {
    const el = this.scrollContainer?.nativeElement as HTMLElement | undefined;
    if (!el) {
      window.setTimeout(() => this.pinScrollToBottomWhileLayoutSettles(), 50);
      return;
    }
    this.clearScrollPin();
    this.scrollPinActive = true;
    const pin = () => {
      if (this.scrollPinActive) {
        this.scrollToBottom();
      }
    };
    if (typeof ResizeObserver !== 'undefined') {
      this.scrollPinObserver = new ResizeObserver(() => pin());
      this.scrollPinObserver.observe(el);
    }
    pin();
    const pinDurationMs = this.isMobileLayout() ? 3500 : 2000;
    this.scrollPinStopTimeoutId = setTimeout(() => {
      this.clearScrollPin();
      pin();
    }, pinDurationMs);
  }

  private loadOlderMessages(): void {
    const oldestId = this.messages[0]?.id;
    if (oldestId == null || this.loadingOlder) {
      return;
    }
    const container = this.scrollContainer?.nativeElement as HTMLElement | undefined;
    const prevScrollHeight = container?.scrollHeight ?? 0;
    this.loadingOlder = true;
    this.mailboxService.getConversation(this.userId, { before: oldestId, size: this.conversationPageSize })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          const older = this.mapToChatMessages(page.messages);
          const existingIds = new Set(this.messages.map(m => m.id));
          const uniqueOlder = older.filter(m => m.id != null && !existingIds.has(m.id));
          this.messages = [...uniqueOlder, ...this.messages];
          this.hasMoreOlder = page.hasMore;
          this.loadingOlder = false;
          this.preloadVoiceDurations(uniqueOlder);
          if (container) {
            requestAnimationFrame(() => {
              container.scrollTop = container.scrollHeight - prevScrollHeight;
            });
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingOlder = false;
        }
      });
  }

  private loadOlderMessagesBatch(): Promise<boolean> {
    const oldestId = this.messages[0]?.id;
    if (oldestId == null || this.loadingOlder) {
      return Promise.resolve(false);
    }
    const container = this.scrollContainer?.nativeElement as HTMLElement | undefined;
    const prevScrollHeight = container?.scrollHeight ?? 0;
    this.loadingOlder = true;
    return new Promise((resolve) => {
      this.mailboxService.getConversation(this.userId, { before: oldestId, size: this.conversationPageSize })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (page) => {
            const older = this.mapToChatMessages(page.messages);
            const existingIds = new Set(this.messages.map(m => m.id));
            const uniqueOlder = older.filter(m => m.id != null && !existingIds.has(m.id));
            this.messages = [...uniqueOlder, ...this.messages];
            this.hasMoreOlder = page.hasMore;
            this.loadingOlder = false;
            this.preloadVoiceDurations(uniqueOlder);
            if (container) {
              requestAnimationFrame(() => {
                container.scrollTop = container.scrollHeight - prevScrollHeight;
              });
            }
            this.cdr.markForCheck();
            resolve(uniqueOlder.length > 0);
          },
          error: () => {
            this.loadingOlder = false;
            resolve(false);
          }
        });
    });
  }

  private async loadOlderMessagesUntilFound(targetMessageId: number): Promise<boolean> {
    const maxAttempts = 20;
    for (let i = 0; i < maxAttempts && this.hasMoreOlder; i++) {
      const loaded = await this.loadOlderMessagesBatch();
      if (!loaded) {
        break;
      }
      if (this.messages.some(message => message.id === targetMessageId)) {
        return true;
      }
    }
    return this.messages.some(message => message.id === targetMessageId);
  }

  private scrollToMessageElement(messageId: number, smooth: boolean): boolean {
    const container = this.scrollContainer?.nativeElement as HTMLElement | undefined;
    if (!container) {
      return false;
    }
    const target = container.querySelector(`[data-message-id="${messageId}"]`) as HTMLElement | null;
    if (!target) {
      return false;
    }
    target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center', inline: 'nearest' });
    this.highlightReplyTarget(messageId);
    return true;
  }

  private highlightReplyTarget(messageId: number): void {
    this.highlightedMessageId = messageId;
    if (this.highlightTimeoutId) {
      clearTimeout(this.highlightTimeoutId);
    }
    this.highlightTimeoutId = setTimeout(() => {
      this.highlightedMessageId = null;
      this.highlightTimeoutId = null;
      this.cdr.markForCheck();
    }, 1800);
    this.cdr.markForCheck();
  }

  private mergeConversationPage(
    page: ConversationPage,
    options?: { scrollToBottom?: boolean; smoothScroll?: boolean }
  ): void {
    const byId = new Map<number, ChatMessage>();
    for (const message of this.messages) {
      if (message.id != null) {
        byId.set(message.id, message);
      }
    }
    for (const message of this.mapToChatMessages(page.messages)) {
      if (message.id != null) {
        byId.set(message.id, message);
      }
    }
    this.messages = Array.from(byId.values()).sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
    this.preloadVoiceDurations(page.messages);
    if (options?.scrollToBottom) {
      if (options.smoothScroll) {
        this.scheduleScrollToBottom(true);
      } else {
        this.scrollToLatestMessages();
      }
    }
    this.cdr.markForCheck();
  }

  private mapToChatMessages(messages: UserMail[]): ChatMessage[] {
    return messages.map(m => ({
      ...m,
      isCurrentUser: m.from === this.currentUserId
    }));
  }

  private isNearBottom(threshold = 96): boolean {
    try {
      const el = this.scrollContainer?.nativeElement as HTMLElement | undefined;
      if (!el) {
        return true;
      }
      return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    } catch {
      return true;
    }
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
      if (this.voiceDurationLoads.has(messageKey)) {
        continue;
      }
      const audio = new Audio(message.mediaUrl);
      audio.preload = 'metadata';
      audio.addEventListener('loadedmetadata', () => {
        if (generation !== this.voicePreloadGeneration) {
          return;
        }
        void this.ensureVoiceDuration(messageKey, message.mediaUrl!, audio.duration);
        audio.removeAttribute('src');
        audio.load();
      }, { once: true });
      audio.addEventListener('error', () => {
        audio.removeAttribute('src');
        audio.load();
      }, { once: true });
      audio.src = message.mediaUrl;
    }
  }

  private async ensureVoiceDuration(messageKey: string, mediaUrl: string, metadataDuration?: number): Promise<void> {
    if (this.voiceDurations.has(messageKey)) {
      return;
    }
    if (Number.isFinite(metadataDuration) && (metadataDuration ?? 0) > 0) {
      this.voiceDurations.set(messageKey, metadataDuration!);
      this.cdr.markForCheck();
      return;
    }
    if (this.voiceDurationLoads.has(messageKey)) {
      await this.voiceDurationLoads.get(messageKey);
      return;
    }

    const loadPromise = (async () => {
      const decodedDuration = await this.readDurationWithAudioContext(mediaUrl);
      if (decodedDuration > 0) {
        this.voiceDurations.set(messageKey, decodedDuration);
        this.cdr.markForCheck();
      }
    })().finally(() => {
      this.voiceDurationLoads.delete(messageKey);
    });

    this.voiceDurationLoads.set(messageKey, loadPromise);
    await loadPromise;
  }

  private async readDurationWithAudioContext(mediaUrl: string): Promise<number> {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    try {
      const response = await fetch(mediaUrl, { credentials: 'include' });
      if (!response.ok) {
        return 0;
      }
      const arrayBuffer = await response.arrayBuffer();
      const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
      return Number.isFinite(decoded.duration) ? decoded.duration : 0;
    } catch {
      return 0;
    } finally {
      await audioContext.close().catch(() => undefined);
    }
  }

  private loadOtherUserInfo(): void {
    this.userService.getUserById(this.userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (user: UserInfo) => {
        this.otherUserName = user.name;
        this.otherUserOnline = user.isOnline === true;
        this.lastOnlineRefreshAt = Date.now();
        this.loadOtherUserPhoto();
      },
      error: () => {
        this.otherUserName = 'Пользователь #' + this.userId;
      }
    });
  }

  private refreshOtherUserOnlineStatus(force = false): void {
    const now = Date.now();
    if (!force && now - this.lastOnlineRefreshAt < ConversationPanelComponent.ONLINE_STATUS_REFRESH_MS) {
      return;
    }
    this.userService.getUserById(this.userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (user: UserInfo) => {
        this.otherUserOnline = user.isOnline === true;
        this.lastOnlineRefreshAt = Date.now();
        this.cdr.markForCheck();
      },
      error: () => {
        this.lastOnlineRefreshAt = Date.now();
      }
    });
  }

  private loadOtherUserPhoto(): void {
    this.otherUserPhotoUrl = this.userService.peekCachedPhotoUrl(this.userId, 'thumb');
    this.userService.getCachedPhotoUrl(this.userId, 'thumb').pipe(takeUntil(this.destroy$)).subscribe({
      next: (url) => {
        this.otherUserPhotoUrl = url;
      },
      error: () => {
        this.otherUserPhotoUrl = null;
      }
    });
  }

  private refreshMessages(): void {
    if (
      this.sending ||
      this.isRefreshing ||
      this.loadingOlder ||
      this.recordingVoice ||
      this.recordingVideo ||
      this.selectionMode ||
      this.deletingMessages
    ) {
      return;
    }
    this.isRefreshing = true;
    const wasNearBottom = this.isNearBottom();
    const maxId = this.messages.reduce((max, message) => Math.max(max, message.id ?? 0), 0);
    this.refreshOtherUserOnlineStatus();
    this.mailboxService.getConversation(this.userId, { size: this.conversationPageSize })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          this.isRefreshing = false;
          let hasNew = false;
          const byId = new Map<number, ChatMessage>();
          for (const message of this.messages) {
            if (message.id != null) {
              byId.set(message.id, message);
            }
          }
          for (const incoming of this.mapToChatMessages(page.messages)) {
            if (incoming.id == null) {
              continue;
            }
            const existed = byId.has(incoming.id);
            byId.set(incoming.id, incoming);
            if (!existed && incoming.id > maxId) {
              hasNew = true;
            }
          }
          this.messages = Array.from(byId.values()).sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
          this.preloadVoiceDurations(page.messages);
          if (hasNew && wasNearBottom) {
            this.scheduleScrollToBottom(true);
          }
          this.cdr.markForCheck();
        },
        error: () => { this.isRefreshing = false; }
      });
  }

  private reloadConversation(scrollToBottom = true, silent = false): void {
    if (!this.userId) {
      return;
    }
    if (silent) {
      if (this.loading || this.isRefreshing) {
        return;
      }
    } else if (this.loading) {
      return;
    }

    if (!silent) {
      this.loading = true;
      this.hasMoreOlder = false;
    } else {
      this.isRefreshing = true;
    }

    this.mailboxService.getConversation(this.userId, { size: this.conversationPageSize })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          this.messages = this.mapToChatMessages(page.messages);
          this.hasMoreOlder = page.hasMore;
          this.preloadVoiceDurations(this.messages);
          if (silent) {
            this.isRefreshing = false;
          } else {
            this.loading = false;
          }
          if (scrollToBottom) {
            if (silent) {
              this.scrollToLatestMessages();
            } else {
              this.onConversationReady();
            }
          } else {
            this.conversationLoaded.emit();
          }
          if (!this.refreshInterval) {
            this.refreshInterval = setInterval(() => this.refreshMessages(), 3000);
          }
          this.cdr.markForCheck();
        },
        error: () => {
          if (silent) {
            this.isRefreshing = false;
          } else {
            this.loading = false;
          }
          this.cdr.markForCheck();
        }
      });
  }

  private scheduleScrollToBottom(smooth = false): void {
    this.scrollBehavior = smooth ? 'smooth' : 'auto';
    this.shouldScroll = true;
    const scroll = () => this.scrollToBottom();
    requestAnimationFrame(() => {
      scroll();
      requestAnimationFrame(scroll);
    });
    const delays = this.isMobileLayout() ? [80, 200, 450, 900, 1500, 2500, 3500] : [80, 200, 450, 900, 1500];
    for (const delay of delays) {
      window.setTimeout(scroll, delay);
    }
  }

  private scrollToBottom(): boolean {
    if (!this.scrollContainer?.nativeElement) {
      return false;
    }
    this.programmaticScroll = true;
    try {
      const el = this.scrollContainer.nativeElement;
      const top = el.scrollHeight;
      el.scrollTop = top;
      el.scrollTo({
        top,
        behavior: this.scrollBehavior
      });
      return true;
    } catch {
      return false;
    } finally {
      requestAnimationFrame(() => {
        this.programmaticScroll = false;
      });
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
    this.clearScrollPin();
    this.clearFocusInputTimeout();
    this.voicePreloadGeneration += 1;
    this.voiceDurationLoads.clear();
    this.clearRefreshInterval();
    this.cleanupRecording();
    this.stopVoicePlayback();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
