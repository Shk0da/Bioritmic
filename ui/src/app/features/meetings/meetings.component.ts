import { Component, OnInit, OnDestroy, HostListener, DestroyRef, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MeetingsService } from '../../core/services/meetings.service';
import { BookmarksService } from '../../core/services/bookmarks.service';
import { UserService } from '../../core/services/user.service';
import { UserMeeting, PageableRequest, UserInfo, Timestamp } from '../../core/models/user.model';
import { ModalService } from '../../core/services/modal.service';
import { ToastService } from '../../core/services/toast.service';
import {
  resolveMeetingLimitMessage,
} from '../../core/constants/meetings.constants';
import { resolveHttpErrorMessage } from '../../core/utils/http-error.util';
import { HttpErrorResponse } from '@angular/common/http';
import { isFutureDatetimeLocalValue, parseDatetimeLocalValue, toDatetimeLocalValue } from '../../shared/utils/datetime-local.util';
import { subscribeCachedRouteRefresh } from '../../core/routing/route-cache-refresh.util';
import { registerPullToRefresh } from '../../core/routing/register-pull-to-refresh.util';
import { PullToRefreshService } from '../../core/routing/pull-to-refresh.service';
import { Subject, forkJoin, of, takeUntil } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

interface MeetingWithUser extends UserMeeting {
  userName?: string;
  userPhotoUrl?: string | null;
  isDeclining?: boolean;
  isAccepting?: boolean;
  isRevoking?: boolean;
}

interface BookmarkWithPhoto extends UserInfo {
  photoDataUrl?: string | null;
}

@Component({
  selector: 'app-meetings',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="row page-layout">
      <div class="col-12 col-md-8 mx-auto page-col">
    <div class="meetings-page-top mb-4">
      <div class="page-header meetings-page-title">
        <h1 class="page-title">
          <i class="bi bi-calendar-event me-2"></i>Встречи
        </h1>
        <p class="text-muted page-subtitle d-none d-md-block">
          Предложения встреч и управление согласованными встречами
          @if (meetingTotalLimit > 0) {
            <span class="ms-1">({{ meetingTotalCount }} из {{ meetingTotalLimit }}, сегодня {{ meetingDailyCount }}/{{ meetingDailyLimit }})</span>
          }
        </p>
      </div>
      <div class="meetings-create-action bookmark-meeting-dropdown">
          <button
            type="button"
            class="btn btn-primary btn-create-meeting"
            data-testid="meetings-suggest-button"
            [disabled]="isMeetingLimitReached"
            [title]="meetingLimitMessage ?? ''"
            (click)="toggleBookmarkDropdown($event)"
          [attr.aria-expanded]="bookmarkDropdownOpen">
          <i class="bi bi-calendar-plus me-2"></i>
          Предложить встречу
          <i class="bi bi-chevron-down ms-1 dropdown-chevron" [class.open]="bookmarkDropdownOpen"></i>
        </button>
        @if (bookmarkDropdownOpen) {
            <div class="bookmark-dropdown-menu" data-testid="meetings-bookmark-dropdown" (click)="$event.stopPropagation()">
            <div class="bookmark-dropdown-header">
              <span><i class="bi bi-bookmark-heart me-2"></i>Из избранного</span>
              <a routerLink="/bookmarks" class="bookmark-dropdown-link" (click)="closeBookmarkDropdown()">
                Все
              </a>
            </div>
            @if (bookmarksLoading) {
              <div class="bookmark-dropdown-loading">
                <span class="spinner-border spinner-border-sm" role="status"></span>
                <span>Загрузка...</span>
              </div>
            } @else if (bookmarks.length === 0) {
              <div class="bookmark-dropdown-empty">
                <p class="mb-2">В избранном пока никого нет</p>
                <a routerLink="/swipe" class="btn btn-sm btn-outline-primary" (click)="closeBookmarkDropdown()">
                  К поиску
                </a>
              </div>
            } @else if (availableBookmarks.length === 0) {
              <div class="bookmark-dropdown-empty">
                <p class="mb-0">Нет доступных пользователей для новой встречи</p>
              </div>
            } @else {
              <ul class="bookmark-dropdown-list">
                @for (user of availableBookmarks; track user.id) {
                  <li>
                    <button
                      type="button"
                      class="bookmark-dropdown-item"
                      (click)="selectBookmarkForMeeting(user)">
                      <img
                        [src]="user.photoDataUrl || 'assets/img/default-avatar.svg'"
                        class="bookmark-dropdown-avatar"
                        [alt]="user.name || 'User'">
                      <span class="bookmark-dropdown-name">{{ user.name || 'Пользователь' }}</span>
                      <i class="bi bi-chevron-right bookmark-dropdown-arrow"></i>
                    </button>
                  </li>
                }
              </ul>
            }
          </div>
        }
      </div>
    </div>

    @if (loading) {
      <div class="card">
        <div class="card-body text-center py-5">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Загрузка...</span>
          </div>
        </div>
      </div>
    } @else if (meetings.length === 0) {
      <div class="card empty-state">
        <div class="card-body text-center py-5">
          <i class="bi bi-calendar-x display-1 text-muted mb-3"></i>
          <h4 class="text-muted">Пока нет встреч</h4>
          <p class="text-muted">
            Предложите встречу кому-то из избранного с помощью кнопки выше
            или дождитесь предложения от других пользователей
          </p>
          <a routerLink="/swipe" class="btn btn-primary mt-3">
            <i class="bi bi-people me-2"></i>К поиску
          </a>
        </div>
      </div>
    } @else {
      @if (acceptedOutgoingMeetings.length > 0) {
        <div class="accepted-meetings mb-4">
          @for (meeting of acceptedOutgoingMeetings; track meeting.userId) {
            <div class="accepted-meeting-banner">
              <div class="accepted-meeting-icon">
                <i class="bi bi-check-circle-fill"></i>
              </div>
              <img
                [src]="meeting.userPhotoUrl || 'assets/img/default-avatar.svg'"
                class="rounded-circle accepted-meeting-photo"
                [alt]="meeting.userName || 'User'">
              <div class="accepted-meeting-content flex-grow-1">
                <div class="accepted-meeting-title">Встреча принята!</div>
                <p class="accepted-meeting-text mb-1">
                  <strong>{{ meeting.userName || 'Пользователь' }}</strong> принял(а) ваше предложение встречи.
                </p>
                <p class="accepted-meeting-meta mb-0">
                  @if (meeting.description) {
                    <span class="d-block mb-1">
                      <i class="bi bi-geo-alt me-1"></i>{{ meeting.description }}
                    </span>
                  }
                  <span class="d-block">
                    <i class="bi bi-calendar-event me-1"></i>{{ formatMeetingDateTime(meeting.scheduledAt) }}
                  </span>
                </p>
              </div>
              <div class="accepted-meeting-actions d-flex flex-wrap gap-2">
                <a [routerLink]="['/user', meeting.userId]" class="btn btn-outline-success btn-sm">
                  <i class="bi bi-person me-1"></i>Профиль
                </a>
                <a [routerLink]="['/mailbox', meeting.userId]" class="btn btn-success btn-sm">
                  <i class="bi bi-chat-heart me-1"></i>Написать
                </a>
                <button
                  type="button"
                  class="btn btn-outline-danger btn-sm"
                  data-testid="meetings-revoke-button"
                  (click)="revokeSentMeeting(meeting)"
                  [disabled]="meeting.isRevoking">
                  @if (meeting.isRevoking) {
                    <span class="spinner-border spinner-border-sm me-1"></span>
                  } @else {
                    <i class="bi bi-x-circle me-1"></i>
                  }
                  Отозвать встречу
                </button>
              </div>
            </div>
          }
        </div>
      }

      @if (acceptedIncomingMeetings.length > 0) {
        <div class="accepted-meetings mb-4">
          @for (meeting of acceptedIncomingMeetings; track meeting.userId) {
            <div class="accepted-meeting-banner accepted-meeting-banner-incoming">
              <div class="accepted-meeting-icon">
                <i class="bi bi-check-circle-fill"></i>
              </div>
              <img
                [src]="meeting.userPhotoUrl || 'assets/img/default-avatar.svg'"
                class="rounded-circle accepted-meeting-photo"
                [alt]="meeting.userName || 'User'">
              <div class="accepted-meeting-content flex-grow-1">
                <div class="accepted-meeting-title">Встреча подтверждена</div>
                <p class="accepted-meeting-text mb-1">
                  Вы приняли предложение встречи от <strong>{{ meeting.userName || 'пользователя' }}</strong>.
                </p>
                <p class="accepted-meeting-meta mb-0">
                  @if (meeting.description) {
                    <span class="d-block mb-1">
                      <i class="bi bi-geo-alt me-1"></i>{{ meeting.description }}
                    </span>
                  }
                  <span class="d-block">
                    <i class="bi bi-calendar-event me-1"></i>{{ formatMeetingDateTime(meeting.scheduledAt) }}
                  </span>
                </p>
              </div>
              <div class="accepted-meeting-actions d-flex flex-wrap gap-2">
                <a [routerLink]="['/user', meeting.userId]" class="btn btn-outline-success btn-sm">
                  <i class="bi bi-person me-1"></i>Профиль
                </a>
                <a [routerLink]="['/mailbox', meeting.userId]" class="btn btn-success btn-sm">
                  <i class="bi bi-chat-heart me-1"></i>Написать
                </a>
                <button
                  type="button"
                  class="btn btn-outline-danger btn-sm"
                  (click)="cancelAcceptedMeeting(meeting)"
                  [disabled]="meeting.isDeclining">
                  @if (meeting.isDeclining) {
                    <span class="spinner-border spinner-border-sm me-1"></span>
                  } @else {
                    <i class="bi bi-x-circle me-1"></i>
                  }
                  Отказаться от встречи
                </button>
              </div>
            </div>
          }
        </div>
      }

      @if (pendingOutgoingMeetings.length > 0) {
        <div class="meetings-list mb-4">
          @for (meeting of pendingOutgoingMeetings; track meeting.userId) {
            <div class="meeting-card-wrap">
              <div class="card meeting-card meeting-card-outgoing">
                <div class="card-body meeting-card-body">
                  <div class="meeting-header">
                    <img
                      [src]="meeting.userPhotoUrl || 'assets/img/default-avatar.svg'"
                      class="rounded-circle meeting-user-photo"
                      [alt]="meeting.userName || 'User'">
                    <div class="meeting-header-main">
                      <div class="meeting-title-row">
                        <h6 class="card-title mb-0">
                          {{ meeting.userName || 'Пользователь #' + meeting.userId }}
                        </h6>
                        <span class="badge bg-info">Ожидаем ответа</span>
                      </div>
                      <div class="meeting-details">
                        @if (meeting.description) {
                          <p class="small text-muted mb-1">
                            <i class="bi bi-geo-alt me-1"></i>
                            <strong>{{ meeting.description }}</strong>
                          </p>
                        }
                        <p class="small text-muted mb-0">
                          <i class="bi bi-calendar-event me-1"></i>
                          {{ formatMeetingDateTime(meeting.scheduledAt) }}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div class="meeting-actions">
                    <a [routerLink]="['/user', meeting.userId]" class="btn btn-outline-primary btn-sm">
                      <i class="bi bi-person me-1"></i>Профиль
                    </a>
                    <button
                      type="button"
                      class="btn btn-outline-danger btn-sm"
                      data-testid="meetings-revoke-button"
                      (click)="revokeSentMeeting(meeting)"
                      [disabled]="meeting.isRevoking">
                      @if (meeting.isRevoking) {
                        <span class="spinner-border spinner-border-sm me-1"></span>
                      } @else {
                        <i class="bi bi-x-circle me-1"></i>
                      }
                      Отозвать встречу
                    </button>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      }

      @if (pendingIncomingMeetings.length === 0 && acceptedOutgoingMeetings.length > 0 && acceptedIncomingMeetings.length === 0 && pendingOutgoingMeetings.length === 0) {
        <p class="text-muted mb-4">Новых предложений встреч пока нет</p>
      }

      <div class="meetings-list">
        @for (meeting of pendingIncomingMeetings; track meeting.userId) {
          <div class="meeting-card-wrap">
            <div class="card meeting-card">
              <div class="card-body meeting-card-body">
                <div class="meeting-header">
                  <img
                    [src]="meeting.userPhotoUrl || 'assets/img/default-avatar.svg'"
                    class="rounded-circle meeting-user-photo"
                    [alt]="meeting.userName || 'User'">
                  <div class="meeting-header-main">
                    <div class="meeting-title-row">
                      <h6 class="card-title mb-0">
                        {{ meeting.userName || 'Пользователь #' + meeting.userId }}
                      </h6>
                      <span class="badge bg-warning">Ожидает ответа</span>
                    </div>
                    <div class="meeting-details">
                      @if (meeting.description) {
                        <p class="small text-muted mb-1">
                          <i class="bi bi-geo-alt me-1"></i>
                          <strong>{{ meeting.description }}</strong>
                        </p>
                      }
                      <p class="small text-muted mb-0">
                        <i class="bi bi-calendar-event me-1"></i>
                        {{ formatMeetingDateTime(meeting.scheduledAt) }}
                      </p>
                    </div>
                  </div>
                </div>
                <div class="meeting-actions">
                  <a [routerLink]="['/user', meeting.userId]" class="btn btn-outline-primary btn-sm">
                    <i class="bi bi-person me-1"></i>Профиль
                  </a>
                  <button
                    class="btn btn-outline-success btn-sm"
                    data-testid="meetings-accept-button"
                    (click)="acceptMeeting(meeting)"
                    [disabled]="meeting.isAccepting || meeting.isDeclining"
                    title="Принять">
                    @if (meeting.isAccepting) {
                      <span class="spinner-border spinner-border-sm me-1"></span>
                    } @else {
                      <i class="bi bi-check-lg me-1"></i>
                    }
                    Принять
                  </button>
                  <button
                    class="btn btn-outline-danger btn-sm"
                    data-testid="meetings-decline-button"
                    (click)="declineMeeting(meeting)"
                    [disabled]="meeting.isDeclining || meeting.isAccepting"
                    title="Отказаться">
                    @if (meeting.isDeclining) {
                      <span class="spinner-border spinner-border-sm me-1"></span>
                    } @else {
                      <i class="bi bi-x-lg me-1"></i>
                    }
                    Отказаться
                  </button>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    }
      </div>
    </div>

    @if (showMeetingModal && selectedBookmarkUser) {
      <div class="meeting-modal-overlay" (click)="closeMeetingModal()">
        <div class="meeting-modal" (click)="$event.stopPropagation()">
          <div class="meeting-modal-header">
            <h5><i class="bi bi-calendar-heart me-2"></i>Предложить встречу</h5>
            <button type="button" class="meeting-modal-close" (click)="closeMeetingModal()">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="meeting-modal-body">
            <p class="meeting-modal-user">
              Встреча с <strong>{{ selectedBookmarkUser.name }}</strong>
            </p>
            <div class="mb-3">
              <label class="form-label" for="meetingDescription">Место и описание *</label>
              <textarea
                id="meetingDescription"
                class="form-control"
                rows="3"
                [(ngModel)]="meetingDescription"
                maxlength="500"
                placeholder="Например: кафе на Тверской, у входа с цветами"></textarea>
            </div>
            <div>
              <label class="form-label" for="meetingScheduledAt">Дата и время *</label>
              <input
                id="meetingScheduledAt"
                type="datetime-local"
                class="form-control"
                [(ngModel)]="meetingScheduledAt"
                [min]="minMeetingDateTime">
            </div>
          </div>
          <div class="meeting-modal-footer">
            <button type="button" class="btn btn-outline-secondary" (click)="closeMeetingModal()">Отмена</button>
            <button
              type="button"
              class="btn btn-primary"
              [disabled]="!canSubmitMeeting || meetingSending"
              (click)="submitMeetingRequest()">
              @if (meetingSending) {
                <span class="spinner-border spinner-border-sm me-1"></span>
              }
              <i class="bi bi-send me-1"></i>Отправить
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      max-width: 100%;
      min-width: 0;
    }

    .meetings-page-top {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .meetings-page-title {
      padding: 1rem 0;
      flex: 1;
      min-width: 0;
    }

    .meetings-create-action {
      position: relative;
      flex-shrink: 0;
    }

    .page-header {
      padding: 1rem 0;
    }

    .bookmark-meeting-dropdown {
      position: relative;
      flex-shrink: 0;
    }

    .btn-create-meeting {
      white-space: nowrap;
      border-radius: 12px;
      font-weight: 600;
      box-shadow: 0 4px 14px rgba(253, 41, 123, 0.25);
    }

    .dropdown-chevron {
      transition: transform 0.2s ease;
      font-size: 0.85rem;
    }

    .dropdown-chevron.open {
      transform: rotate(180deg);
    }

    .bookmark-dropdown-menu {
      position: absolute;
      top: calc(100% + 0.5rem);
      right: 0;
      z-index: 1050;
      min-width: min(320px, calc(100vw - 2rem));
      max-width: 360px;
      background: var(--card-bg, #fff);
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: 14px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      animation: dropdownFadeIn 0.15s ease;
    }

    @keyframes dropdownFadeIn {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .bookmark-dropdown-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border-color, #e5e7eb);
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-secondary, #6b7280);
    }

    .bookmark-dropdown-link {
      font-size: 0.8rem;
      font-weight: 500;
      text-decoration: none;
    }

    .bookmark-dropdown-loading,
    .bookmark-dropdown-empty {
      padding: 1.25rem 1rem;
      text-align: center;
      color: var(--text-secondary, #6b7280);
      font-size: 0.9rem;
    }

    .bookmark-dropdown-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .bookmark-dropdown-list {
      list-style: none;
      margin: 0;
      padding: 0.35rem;
      max-height: 320px;
      overflow-y: auto;
    }

    .bookmark-dropdown-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
      padding: 0.6rem 0.75rem;
      border: none;
      border-radius: 10px;
      background: transparent;
      text-align: left;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .bookmark-dropdown-item:hover {
      background: var(--bg-secondary, #f3f4f6);
    }

    .bookmark-dropdown-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }

    .bookmark-dropdown-name {
      flex: 1;
      min-width: 0;
      font-weight: 600;
      color: var(--text-primary, #1f2937);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .bookmark-dropdown-arrow {
      color: var(--text-secondary, #9ca3af);
      flex-shrink: 0;
    }

    .meeting-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 1rem;
      backdrop-filter: blur(4px);
    }

    .meeting-modal {
      background: var(--card-bg, white);
      border-radius: 20px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }

    .meeting-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-color, #e5e7eb);
    }

    .meeting-modal-header h5 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
    }

    .meeting-modal-close {
      background: none;
      border: none;
      color: var(--text-secondary, #6b7280);
      font-size: 1.1rem;
      cursor: pointer;
      padding: 4px;
      border-radius: 8px;
    }

    .meeting-modal-body {
      padding: 1.25rem 1.5rem;
    }

    .meeting-modal-user {
      color: var(--text-secondary, #6b7280);
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }

    .meeting-modal-footer {
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
      padding: 1rem 1.5rem 1.25rem;
      border-top: 1px solid var(--border-color, #e5e7eb);
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

    .meetings-list {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
      min-width: 0;
    }

    @media (min-width: 768px) {
      .meetings-list {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    .meeting-card-wrap {
      min-width: 0;
    }

    .meeting-card {
      transition: box-shadow 0.3s ease;
      overflow: hidden;

      @media (hover: hover) {
        &:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
      }
    }

    .meeting-card-outgoing {
      border: 1px solid rgba(13, 110, 253, 0.2);
    }

    .meeting-card-body {
      min-width: 0;
    }

    .meeting-header {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      min-width: 0;
    }

    .meeting-header-main {
      flex: 1;
      min-width: 0;
    }

    .meeting-title-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.35rem 0.5rem;
      margin-bottom: 0.5rem;
    }

    .meeting-title-row .card-title {
      min-width: 0;
      word-break: break-word;
    }

    .meeting-user-photo {
      width: 56px;
      height: 56px;
      object-fit: cover;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      flex-shrink: 0;
    }

    .meeting-details {
      background: rgba(253, 41, 123, 0.03);
      padding: 0.75rem;
      border-radius: 8px;
    }

    .meeting-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.875rem;
    }

    .meeting-actions .btn {
      flex: 1 1 auto;
      min-width: 0;
      white-space: nowrap;
    }

    .accepted-meeting-banner {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.25rem;
      margin-bottom: 1rem;
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%);
      border: 1px solid rgba(34, 197, 94, 0.25);
      box-shadow: 0 4px 16px rgba(34, 197, 94, 0.08);
    }

    .accepted-meeting-icon {
      color: #22c55e;
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .accepted-meeting-photo {
      width: 52px;
      height: 52px;
      object-fit: cover;
      border: 2px solid #22c55e;
      flex-shrink: 0;
    }

    .accepted-meeting-title {
      font-weight: 700;
      color: #15803d;
      margin-bottom: 0.25rem;
    }

    .accepted-meeting-text,
    .accepted-meeting-meta {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    @media (min-width: 769px) {
      .meetings-page-top {
        flex-direction: row;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
      }
    }

    @media (max-width: 768px) {
      .meetings-page-top {
        margin-bottom: 1rem;
      }

      .meetings-page-title {
        padding: 0;
      }

      .meetings-create-action {
        width: 100%;
      }

      .meetings-create-action .btn-create-meeting {
        width: 100%;
        justify-content: center;
      }

      .meetings-create-action .bookmark-dropdown-menu {
        left: 0;
        right: 0;
        max-width: none;
      }

      .page-header {
        padding: 0.25rem 0;
      }

      .page-title {
        font-size: 1.45rem;
      }

      .accepted-meeting-banner {
        flex-wrap: wrap;
        padding: 0.875rem 1rem;
        gap: 0.75rem;
      }

      .accepted-meeting-actions {
        width: 100%;
        flex-direction: column;
      }

      .accepted-meeting-actions .btn {
        width: 100%;
        justify-content: center;
      }

      .meeting-user-photo {
        width: 48px;
        height: 48px;
      }

      .meeting-actions {
        flex-direction: column;
      }

      .meeting-actions .btn {
        width: 100%;
        justify-content: center;
      }
    }

  `]
})
export class MeetingsComponent implements OnInit, OnDestroy {
  meetings: MeetingWithUser[] = [];
  loading = false;
  pageable: PageableRequest = { page: 0, size: 20 };
  bookmarks: BookmarkWithPhoto[] = [];
  bookmarksLoading = false;
  bookmarkDropdownOpen = false;
  showMeetingModal = false;
  selectedBookmarkUser: BookmarkWithPhoto | null = null;
  meetingDescription = '';
  meetingScheduledAt = '';
  meetingSending = false;
  meetingTotalCount = 0;
  meetingDailyCount = 0;
  meetingTotalLimit = 0;
  meetingDailyLimit = 0;
  get meetingLimitMessage(): string | null {
    return resolveMeetingLimitMessage(
      this.meetingTotalCount,
      this.meetingDailyCount,
      this.meetingTotalLimit,
      this.meetingDailyLimit,
    );
  }
  get isMeetingLimitReached(): boolean {
    return this.meetingLimitMessage !== null;
  }
  private readonly bookmarksPageable: PageableRequest = { page: 0, size: 50 };
  private blockedByUserIds = new Set<string>();
  private destroy$ = new Subject<void>();
  private readonly destroyRef = inject(DestroyRef);
  private readonly pullToRefreshService = inject(PullToRefreshService);

  get incomingMeetings(): MeetingWithUser[] {
    return this.meetings.filter((meeting) => !meeting.outgoing);
  }

  get pendingIncomingMeetings(): MeetingWithUser[] {
    return this.incomingMeetings.filter((meeting) => {
      const status = meeting.status ?? 'PENDING';
      return status !== 'DECLINED' && status !== 'ACCEPTED';
    });
  }

  get acceptedIncomingMeetings(): MeetingWithUser[] {
    return this.incomingMeetings.filter((meeting) => (meeting.status ?? 'PENDING') === 'ACCEPTED');
  }

  get acceptedOutgoingMeetings(): MeetingWithUser[] {
    return this.meetings.filter((meeting) => meeting.outgoing && meeting.status === 'ACCEPTED');
  }

  get pendingOutgoingMeetings(): MeetingWithUser[] {
    return this.meetings.filter((meeting) => {
      if (!meeting.outgoing) {
        return false;
      }
      const status = meeting.status ?? 'PENDING';
      return status !== 'DECLINED' && status !== 'ACCEPTED';
    });
  }

  get availableBookmarks(): BookmarkWithPhoto[] {
    const activeOutgoingUserIds = new Set(
      this.meetings
        .filter((meeting) => {
          if (!meeting.outgoing || !meeting.userId) {
            return false;
          }
          const status = meeting.status ?? 'PENDING';
          return status !== 'DECLINED';
        })
        .map((meeting) => meeting.userId as string)
    );
    return this.bookmarks.filter((user) => {
      if (!user.id || activeOutgoingUserIds.has(user.id) || this.blockedByUserIds.has(user.id)) {
        return false;
      }
      return true;
    });
  }

  get minMeetingDateTime(): string {
    return toDatetimeLocalValue(new Date());
  }

  get canSubmitMeeting(): boolean {
    return !!this.meetingDescription.trim() && !!this.meetingScheduledAt;
  }

  constructor(
    private meetingsService: MeetingsService,
    private bookmarksService: BookmarksService,
    private userService: UserService,
    private modalService: ModalService,
    private toastService: ToastService,
    private router: Router
  ) {}

  @HostListener('document:click')
  onDocumentClick(): void {
    this.bookmarkDropdownOpen = false;
  }

  ngOnInit(): void {
    this.loadMeetingLimits();
    this.loadMeetings();
    this.loadBookmarks();
    subscribeCachedRouteRefresh(this.router, this.destroyRef, '/meetings', () => {
      this.loadMeetingLimits();
      this.loadMeetings(true);
      this.loadBookmarks(true);
    });
    registerPullToRefresh(this.pullToRefreshService, this.destroyRef, '/meetings', () => ({
      refresh: () => {
        this.loadMeetingLimits();
        this.loadMeetings(true);
        this.loadBookmarks(true);
      },
      isEnabled: () => !this.loading && !this.bookmarksLoading,
    }));
    localStorage.setItem('meetings_last_read', Date.now().toString());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.meetings.forEach(m => this.userService.releasePhotoUrl(m.userPhotoUrl));
    this.bookmarks.forEach(b => this.userService.releasePhotoUrl(b.photoDataUrl));
  }

  toggleBookmarkDropdown(event: Event): void {
    event.stopPropagation();
    const limitMessage = this.meetingLimitMessage;
    if (limitMessage) {
      this.toastService.error(limitMessage);
      return;
    }
    this.bookmarkDropdownOpen = !this.bookmarkDropdownOpen;
    if (this.bookmarkDropdownOpen && this.bookmarks.length === 0 && !this.bookmarksLoading) {
      this.loadBookmarks();
    }
  }

  closeBookmarkDropdown(): void {
    this.bookmarkDropdownOpen = false;
  }

  selectBookmarkForMeeting(user: BookmarkWithPhoto): void {
    if (!user.id || this.blockedByUserIds.has(user.id)) {
      this.toastService.error('Пользователь ограничил взаимодействие с вами');
      return;
    }
    this.selectedBookmarkUser = user;
    this.meetingDescription = '';
    this.meetingScheduledAt = this.defaultMeetingDateTime();
    this.showMeetingModal = true;
    this.closeBookmarkDropdown();
  }

  closeMeetingModal(): void {
    if (this.meetingSending) {
      return;
    }
    this.showMeetingModal = false;
    this.selectedBookmarkUser = null;
  }

  submitMeetingRequest(): void {
    if (!this.canSubmitMeeting) {
      this.toastService.error('Укажите место и время встречи');
      return;
    }
    if (!isFutureDatetimeLocalValue(this.meetingScheduledAt)) {
      this.toastService.error('Время встречи должно быть в будущем');
      return;
    }
    this.sendMeetingRequest();
  }

  private sendMeetingRequest(): void {
    const user = this.selectedBookmarkUser;
    if (!user?.id) {
      return;
    }
    if (this.blockedByUserIds.has(user.id)) {
      this.toastService.error('Пользователь ограничил взаимодействие с вами');
      return;
    }
    const limitMessage = this.meetingLimitMessage;
    if (limitMessage) {
      this.toastService.error(limitMessage);
      return;
    }

    const meeting: UserMeeting = {
      userId: user.id,
      lat: user.lat || 0,
      lon: user.lon || 0,
      distance: user.distance || 1,
      description: this.meetingDescription.trim(),
      scheduledAt: new Date(parseDatetimeLocalValue(this.meetingScheduledAt)).toISOString(),
    };

    this.meetingSending = true;
    this.meetingsService.createMeeting(meeting).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.meetingSending = false;
        this.showMeetingModal = false;
        this.selectedBookmarkUser = null;
        this.meetingTotalCount += 1;
        this.meetingDailyCount += 1;
        this.toastService.success('Предложение встречи отправлено!');
        this.loadMeetings(true);
      },
      error: (error) => {
        this.meetingSending = false;
        this.toastService.error(resolveHttpErrorMessage(error as HttpErrorResponse));
      }
    });
  }

  private loadMeetingLimits(): void {
    this.meetingsService.getMeetingLimit().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.meetingTotalCount = response.totalCount;
        this.meetingDailyCount = response.dailyCount;
        this.meetingTotalLimit = response.totalLimit;
        this.meetingDailyLimit = response.dailyLimit;
      },
      error: () => {
        this.meetingTotalCount = 0;
        this.meetingDailyCount = 0;
        this.meetingTotalLimit = this.meetingsService.meetingTotalLimit;
        this.meetingDailyLimit = this.meetingsService.meetingDailyLimit;
      }
    });
  }

  private defaultMeetingDateTime(): string {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(18, 0, 0, 0);
    return toDatetimeLocalValue(date);
  }

  private loadBookmarks(silent = false): void {
    if (!silent) {
      this.bookmarksLoading = true;
    }
    this.bookmarksService.getBookmarks(this.bookmarksPageable).pipe(takeUntil(this.destroy$)).subscribe({
      next: (users) => {
        this.bookmarks = users.map((user) => this.withCachedPhoto(user));
        this.loadBookmarkPhotos();
        this.loadBookmarkBlockStatus();
        this.bookmarksLoading = false;
      },
      error: () => {
        this.bookmarksLoading = false;
      }
    });
  }

  private withCachedPhoto(user: UserInfo): BookmarkWithPhoto {
    if (!user.id) {
      return { ...user, photoDataUrl: null };
    }
    return {
      ...user,
      photoDataUrl: this.userService.peekCachedPhotoUrl(user.id, 'card'),
    };
  }

  private loadBookmarkPhotos(): void {
    this.bookmarks.forEach((user) => {
      if (!user.id) {
        return;
      }
      this.userService.getCachedPhotoUrl(user.id, 'card').pipe(takeUntil(this.destroy$)).subscribe({
        next: (url) => {
          user.photoDataUrl = url;
        },
        error: () => {
          user.photoDataUrl = null;
        }
      });
    });
  }

  private loadBookmarkBlockStatus(): void {
    const usersWithId = this.bookmarks.filter((user) => !!user.id);
    if (usersWithId.length === 0) {
      this.blockedByUserIds = new Set();
      return;
    }

    forkJoin(
      usersWithId.map((user) =>
        this.userService.isBlockedBy(user.id!).pipe(
          map((result) => ({ id: user.id!, blocked: result.blocked })),
          catchError(() => of({ id: user.id!, blocked: false }))
        )
      )
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (results) => {
        this.blockedByUserIds = new Set(results.filter((result) => result.blocked).map((result) => result.id));
      }
    });
  }

  private loadMeetings(silent = false): void {
    if (!silent) {
      this.loading = true;
    }
    this.meetingsService.getMeetings(this.pageable).pipe(takeUntil(this.destroy$)).subscribe({
      next: (meetings) => {
        this.meetings.forEach(m => this.userService.releasePhotoUrl(m.userPhotoUrl));
        this.meetings = meetings;
        this.loadUserData();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private loadUserData(): void {
    this.meetings.forEach(meeting => {
      if (meeting.userId) {
        this.userService.getUserById(meeting.userId).pipe(takeUntil(this.destroy$)).subscribe({
          next: (user: UserInfo) => {
            meeting.userName = user.name;
            this.loadUserPhoto(meeting.userId!, meeting);
          },
          error: () => {
            meeting.userName = 'Пользователь #' + meeting.userId;
          }
        });
      }
    });
  }

  private loadUserPhoto(userId: string, meeting: MeetingWithUser): void {
    this.userService.getCachedPhotoUrl(userId, 'card').pipe(takeUntil(this.destroy$)).subscribe({
      next: (url) => {
        meeting.userPhotoUrl = url;
      },
      error: () => {
        meeting.userPhotoUrl = null;
      }
    });
  }

  deleteMeeting(userId: string): void {
    this.meetingsService.deleteMeeting(userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.loadMeetingLimits();
        this.loadMeetings();
      },
      error: () => {
        this.toastService.error('Ошибка удаления встречи');
      }
    });
  }

  acceptMeeting(meeting: MeetingWithUser): void {
    if (meeting.isAccepting || meeting.isDeclining) {
      return;
    }
    meeting.isAccepting = true;
    this.meetingsService.acceptMeeting(meeting.userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        meeting.isAccepting = false;
        meeting.status = 'ACCEPTED';
        this.toastService.success('Встреча принята!');
        this.loadMeetings(true);
      },
      error: () => {
        meeting.isAccepting = false;
        this.toastService.error('Ошибка принятия встречи');
      }
    });
  }

  async declineMeeting(meeting: MeetingWithUser): Promise<void> {
    const confirmed = await this.modalService.confirm(
      `Отказать ${meeting.userName || 'пользователю'} во встрече?`,
      'Отказ от встречи'
    );
    if (!confirmed) return;

    meeting.isDeclining = true;
    this.meetingsService.declineMeeting(meeting.userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        meeting.isDeclining = false;
        meeting.status = 'DECLINED';
        this.toastService.success('Вы отказались от встречи. Пользователь уведомлён.');
        this.loadMeetings(true);
      },
      error: () => {
        meeting.isDeclining = false;
        this.toastService.error('Ошибка отказа от встречи');
      }
    });
  }

  async cancelAcceptedMeeting(meeting: MeetingWithUser): Promise<void> {
    const confirmed = await this.modalService.confirm(
      `Отказаться от встречи с ${meeting.userName || 'пользователем'}? Собеседник получит уведомление.`,
      'Отмена встречи'
    );
    if (!confirmed) {
      return;
    }

    meeting.isDeclining = true;
    this.meetingsService.declineMeeting(meeting.userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        meeting.isDeclining = false;
        meeting.status = 'DECLINED';
        this.toastService.success('Встреча отменена. Собеседник уведомлён.');
        this.loadMeetings(true);
      },
      error: () => {
        meeting.isDeclining = false;
        this.toastService.error('Не удалось отменить встречу');
      }
    });
  }

  async revokeSentMeeting(meeting: MeetingWithUser): Promise<void> {
    const isAccepted = meeting.status === 'ACCEPTED';
    const confirmed = await this.modalService.confirm(
      isAccepted
        ? `Отозвать согласованную встречу с ${meeting.userName || 'пользователем'}?`
        : `Отозвать отправленное предложение встречи для ${meeting.userName || 'пользователя'}?`,
      'Отзыв встречи'
    );
    if (!confirmed) {
      return;
    }

    meeting.isRevoking = true;
    this.meetingsService.deleteMeeting(meeting.userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        meeting.isRevoking = false;
        this.toastService.success(
          isAccepted ? 'Встреча отозвана. Собеседник уведомлён.' : 'Предложение встречи отозвано.'
        );
        this.loadMeetingLimits();
        this.loadMeetings(true);
      },
      error: () => {
        meeting.isRevoking = false;
        this.toastService.error('Не удалось отозвать встречу');
      }
    });
  }

  formatMeetingDateTime(timestamp?: Timestamp | string): string {
    const ms = this.toTimestampMs(timestamp);
    if (!ms) {
      return 'Время не указано';
    }
    return new Date(ms).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private toTimestampMs(timestamp?: Timestamp | string): number {
    if (!timestamp) {
      return 0;
    }
    if (typeof timestamp === 'string') {
      const ms = Date.parse(timestamp);
      return Number.isFinite(ms) ? ms : 0;
    }
    if (typeof timestamp !== 'object') {
      return 0;
    }
    const ts = timestamp as { seconds?: number; time?: number };
    return ts.time || (ts.seconds ? ts.seconds * 1000 : 0);
  }
}
