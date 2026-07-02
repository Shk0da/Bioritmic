import { Component, OnDestroy, OnInit, DestroyRef, inject, HostListener } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { DiamondsService, DiamondTransaction } from '../../core/services/diamonds.service';
import { BookmarksService } from '../../core/services/bookmarks.service';
import { AuthService } from '../../core/services/auth.service';
import { ModalService } from '../../core/services/modal.service';
import { ToastService } from '../../core/services/toast.service';
import { resolveDiamondTransferErrorMessage, resolveHttpErrorMessage } from '../../core/utils/http-error.util';
import { UserInfo } from '../../core/models/user.model';
import { BoostService, BoostInfo, BOOST_DIAMOND_COST } from '../../core/services/boost.service';
import { registerPullToRefresh } from '../../core/routing/register-pull-to-refresh.util';
import { PullToRefreshService } from '../../core/routing/pull-to-refresh.service';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule],
  template: `
    <div class="row page-layout">
      <div class="col-12 col-md-8 mx-auto page-col">
    <div class="page-header mb-3">
      <h1 class="page-title">
        <img src="assets/img/diamond.png" alt="" class="page-diamond-icon">
        Алмазы
      </h1>
      <p class="text-muted mb-0">Виртуальная валюта Bioritmic</p>
    </div>

    <div class="balance-card mb-4">
      <div class="balance-label">Ваш баланс</div>
      <div class="balance-value">
        <img src="assets/img/diamond.png" alt="" class="balance-diamond-icon">
        {{ balance | number }}
      </div>
      <div class="balance-actions mt-3">
        <button type="button" class="btn btn-primary btn-sm" (click)="showTopUpStub()">
          <i class="bi bi-plus-circle me-1"></i>Пополнить
        </button>
        <button type="button" class="btn btn-outline-primary btn-sm" (click)="showWithdrawStub()">
          <i class="bi bi-box-arrow-up-right me-1"></i>Вывод
        </button>
      </div>
    </div>

    <div class="card mb-4">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">
          <i class="bi bi-lightning boost-lightning-icon me-2"></i>Профиль Boost
        </h5>
      </div>
      <div class="card-body">
        @if (activeBoost) {
          <div class="boost-active">
            <div class="boost-timer">
              <i class="bi bi-lightning-charge-fill boost-lightning-icon"></i>
              <span class="boost-countdown">{{ getBoostCountdown() }}</span>
            </div>
            <p class="text-muted small mb-0">Ваш профиль выделен и показывается выше в поиске</p>
          </div>
        } @else {
          <p class="mb-2">Активируйте Boost за {{ boostCost }} алмазов — профиль будет показываться выше в поиске на 24 часа.</p>
          <button
            type="button"
            class="btn btn-warning"
            (click)="activateBoost()"
            [disabled]="boostActivating || balance < boostCost">
            @if (boostActivating) {
              <span class="spinner-border spinner-border-sm me-2"></span>
            } @else {
              <i class="bi bi-lightning-charge me-2 boost-lightning-icon"></i>
            }
            Boost за {{ boostCost }} алмазов
          </button>
          @if (balance < boostCost) {
            <p class="text-danger small mt-2 mb-0">Недостаточно алмазов для активации Boost.</p>
          }
        }
      </div>
    </div>

    <div class="card mb-4 transfer-card" [class.recipient-dropdown-open]="recipientDropdownOpen">
      <div class="card-header">
        <h5 class="mb-0">Перевод из избранного</h5>
      </div>
      <div class="card-body">
        @if (loadingBookmarks) {
          <div class="text-center py-3">
            <div class="spinner-border spinner-border-sm"></div>
          </div>
        } @else if (bookmarks.length === 0) {
          <p class="text-muted mb-0">Добавьте пользователей в избранное, чтобы отправлять им алмазы.</p>
        } @else {
          <div class="row g-2 align-items-end">
            <div class="col-12 col-md-5">
              <label class="form-label form-label-sm">Получатель</label>
              <div class="recipient-picker">
                <button
                  type="button"
                  class="recipient-picker-trigger form-select form-select-sm"
                  [class.show]="recipientDropdownOpen"
                  (click)="toggleRecipientDropdown($event)"
                  aria-haspopup="listbox"
                  [attr.aria-expanded]="recipientDropdownOpen">
                  @if (selectedRecipient; as user) {
                    <span class="recipient-picker-label">
                      <span class="recipient-picker-name">{{ getRecipientName(user) }}</span>
                      @if (getRecipientNick(user); as nick) {
                        <span class="recipient-picker-nick">{{ nick }}</span>
                      }
                    </span>
                  } @else {
                    <span class="recipient-picker-placeholder">Выберите пользователя</span>
                  }
                </button>
                @if (recipientDropdownOpen) {
                  <ul class="recipient-picker-menu" role="listbox">
                    @for (user of bookmarks; track user.id) {
                      <li role="option" [attr.aria-selected]="user.id === selectedRecipientId">
                        <button
                          type="button"
                          class="recipient-picker-item"
                          [class.active]="user.id === selectedRecipientId"
                          (click)="selectRecipient(user, $event)">
                          <span class="recipient-picker-name">{{ getRecipientName(user) }}</span>
                          @if (getRecipientNick(user); as nick) {
                            <span class="recipient-picker-nick">{{ nick }}</span>
                          }
                        </button>
                      </li>
                    }
                  </ul>
                }
              </div>
            </div>
            <div class="col-12 col-md-7">
              <label class="form-label form-label-sm" for="transferAmount">Количество</label>
              <div class="transfer-amount-row">
                <input
                  id="transferAmount"
                  type="number"
                  class="form-control form-control-sm transfer-control"
                  min="1"
                  [(ngModel)]="transferAmount"
                  placeholder="Сколько алмазов"
                  inputmode="numeric">
                <button
                  type="button"
                  class="btn btn-primary btn-sm transfer-control transfer-submit-btn"
                  [disabled]="!canTransfer || transferring"
                  (click)="transferToBookmark()">
                  @if (transferring) {
                    <span class="spinner-border spinner-border-sm"></span>
                  } @else {
                    Отправить
                  }
                </button>
              </div>
            </div>
          </div>
          @if (transferError) {
            <div class="transfer-error" role="alert">{{ transferError }}</div>
          }
        }
      </div>
    </div>

    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">История операций</h5>
        <span class="text-muted small">Всего: {{ totalTransactions }}</span>
      </div>
      <div class="card-body p-0">
        @if (loadingTransactions) {
          <div class="text-center py-4">
            <div class="spinner-border spinner-border-sm"></div>
          </div>
        } @else if (transactions.length === 0) {
          <div class="text-center text-muted py-4">Пока нет операций</div>
        } @else {
          <div class="transaction-list">
            @for (tx of transactions; track tx.id) {
              <div class="transaction-item">
                <div class="transaction-main">
                  <span class="transaction-title">{{ formatTransactionTitle(tx) }}</span>
                  <span class="transaction-amount" [class.positive]="tx.amount > 0" [class.negative]="tx.amount < 0">
                    {{ tx.amount > 0 ? '+' : '' }}{{ tx.amount | number }}
                  </span>
                </div>
                <div class="transaction-meta text-muted small">
                  {{ tx.createdAt | date:'dd.MM.yyyy HH:mm' }}
                </div>
              </div>
            }
          </div>
        }
      </div>
      @if (totalPages > 1) {
        <div class="card-footer d-flex justify-content-between align-items-center">
          <button class="btn btn-sm btn-outline-secondary" [disabled]="currentPage === 0" (click)="changePage(-1)">
            Назад
          </button>
          <span class="small text-muted">{{ currentPage + 1 }} / {{ totalPages }}</span>
          <button class="btn btn-sm btn-outline-secondary" [disabled]="currentPage + 1 >= totalPages" (click)="changePage(1)">
            Вперёд
          </button>
        </div>
      }
    </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      max-width: 100%;
      min-width: 0;
    }

    .page-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
    }

    .page-diamond-icon,
    .balance-diamond-icon {
      width: 28px;
      height: 28px;
      object-fit: contain;
    }

    .balance-card {
      background: var(--card-bg, #fff);
      border-radius: 14px;
      padding: 1.25rem;
      text-align: center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.06);
    }

    .balance-label {
      color: var(--text-secondary, #6b7280);
      font-size: 0.9rem;
      margin-bottom: 0.35rem;
    }

    .balance-value {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-size: 2rem;
      font-weight: 700;
      color: var(--text-primary, #1f2937);
    }

    .balance-actions {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .transfer-error {
      margin-top: 0.75rem;
      padding: 0.75rem 0.9rem;
      border-radius: 10px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: #b91c1c;
      font-size: 0.92rem;
      line-height: 1.4;
    }

    .transfer-amount-row {
      --transfer-control-height: 3.125rem;
      display: flex;
      align-items: stretch;
      gap: 0.5rem;
      min-width: 0;
    }

    .transfer-amount-row .transfer-control {
      flex: 1 1 0;
      min-width: 0;
      height: var(--transfer-control-height);
      min-height: var(--transfer-control-height);
      max-height: var(--transfer-control-height);
      box-sizing: border-box;
      font-size: 0.875rem;
      line-height: 1.25;
      padding: 0 0.75rem;
    }

    .transfer-submit-btn.transfer-control {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
      padding: 0 0.75rem;
      transform: none;
    }

    .transfer-submit-btn.transfer-control:hover,
    .transfer-submit-btn.transfer-control:active {
      transform: none;
    }

    .transaction-list {
      display: flex;
      flex-direction: column;
    }

    .transaction-item {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid var(--bs-border-color, rgba(0,0,0,0.08));
    }

    .transaction-item:last-child {
      border-bottom: none;
    }

    .transaction-main {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .transaction-title {
      font-size: 0.92rem;
      word-break: break-word;
    }

    .transaction-amount {
      font-weight: 700;
      white-space: nowrap;
    }

    .transaction-amount.positive { color: #22c55e; }
    .transaction-amount.negative { color: #ef4444; }

    .boost-active {
      text-align: center;
      padding: 0.5rem 0;
    }

    .boost-timer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-size: 1.5rem;
      font-weight: 700;
      color: #f59e0b;
      margin-bottom: 0.5rem;
    }

    .boost-timer i {
      font-size: 1.75rem;
    }

    .recipient-picker {
      position: relative;
      z-index: 2;
    }

    .transfer-card.recipient-dropdown-open {
      position: relative;
      z-index: 40;
      overflow: visible;
    }

    .transfer-card.recipient-dropdown-open .card-body {
      overflow: visible;
    }

    .recipient-picker-trigger {
      width: 100%;
      display: flex;
      align-items: center;
      text-align: left;
      cursor: pointer;
    }

    .recipient-picker-placeholder {
      color: var(--text-secondary, #6b7280);
    }

    .recipient-picker-label,
    .recipient-picker-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      width: 100%;
      min-width: 0;
    }

    .recipient-picker-name {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .recipient-picker-nick {
      flex-shrink: 0;
      color: var(--text-secondary, #6b7280);
      font-size: 0.85em;
      font-weight: 400;
    }

    .recipient-picker-menu {
      position: absolute;
      top: calc(100% + 0.25rem);
      left: 0;
      right: 0;
      z-index: 50;
      margin: 0;
      padding: 0.25rem;
      list-style: none;
      background: var(--card-bg, #fff);
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      max-height: 240px;
      overflow-y: auto;
    }

    .recipient-picker-item {
      padding: 0.45rem 0.6rem;
      border: none;
      border-radius: 8px;
      background: transparent;
      text-align: left;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .recipient-picker-item:hover,
    .recipient-picker-item.active {
      background: var(--bg-secondary, #f3f4f6);
    }
  `]
})
export class PaymentsComponent implements OnInit, OnDestroy {
  balance = 0;
  bookmarks: UserInfo[] = [];
  transactions: DiamondTransaction[] = [];
  selectedRecipientId = '';
  transferAmount: number | null = null;
  loadingBookmarks = false;
  loadingTransactions = false;
  transferring = false;
  transferError = '';
  currentPage = 0;
  pageSize = 20;
  totalTransactions = 0;
  activeBoost: BoostInfo | null = null;
  boostActivating = false;
  recipientDropdownOpen = false;
  readonly boostCost = BOOST_DIAMOND_COST;

  private destroy$ = new Subject<void>();
  private destroyRef = inject(DestroyRef);
  private readonly pullToRefreshService = inject(PullToRefreshService);
  private boostCountdownInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private diamondsService: DiamondsService,
    private bookmarksService: BookmarksService,
    private authService: AuthService,
    private modalService: ModalService,
    private toastService: ToastService,
    private boostService: BoostService,
  ) {}

  ngOnInit(): void {
    registerPullToRefresh(this.pullToRefreshService, this.destroyRef, '/payments', () => ({
      refresh: () => this.refreshPage(),
    }));
    this.refreshPage();
  }

  ngOnDestroy(): void {
    this.clearBoostCountdown();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get selectedRecipient(): UserInfo | null {
    return this.bookmarks.find((user) => user.id === this.selectedRecipientId) ?? null;
  }

  @HostListener('document:click')
  closeRecipientDropdown(): void {
    this.recipientDropdownOpen = false;
  }

  toggleRecipientDropdown(event: Event): void {
    event.stopPropagation();
    this.recipientDropdownOpen = !this.recipientDropdownOpen;
  }

  selectRecipient(user: UserInfo, event: Event): void {
    event.stopPropagation();
    this.selectedRecipientId = user.id ?? '';
    this.recipientDropdownOpen = false;
  }

  getRecipientName(user: UserInfo): string {
    return user.name?.trim() || user.nick?.trim() || 'Пользователь';
  }

  getRecipientNick(user: UserInfo): string | null {
    const nick = user.nick?.trim();
    if (!nick || nick === this.getRecipientName(user)) {
      return null;
    }
    return nick;
  }

  get totalPages(): number {
    return Math.ceil(this.totalTransactions / this.pageSize);
  }

  get canTransfer(): boolean {
    return !!this.selectedRecipientId && !!this.transferAmount && this.transferAmount > 0;
  }

  refreshPage(): void {
    this.loadBalance();
    this.loadActiveBoost();
    this.loadBookmarks();
    this.loadTransactions(this.currentPage);
  }

  activateBoost(): void {
    this.boostActivating = true;
    this.boostService.activateBoost().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.boostActivating = false;
        if (response.success) {
          if (response.balance != null) {
            this.balance = response.balance;
            this.authService.updateDiamondBalance(response.balance);
          }
          this.loadActiveBoost();
          this.loadTransactions(0);
          this.currentPage = 0;
          this.toastService.success(`Boost активирован (−${response.cost ?? this.boostCost} алмазов)`);
        }
      },
      error: (err) => {
        this.boostActivating = false;
        this.toastService.error(
          resolveHttpErrorMessage(err) || 'Не удалось активировать Boost',
        );
      },
    });
  }

  getBoostCountdown(): string {
    if (!this.activeBoost) return '';
    const remaining = this.activeBoost.expiresAt - Date.now();
    if (remaining <= 0) return 'Закончился';
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${hours}ч ${minutes}м ${seconds}с`;
  }

  showWithdrawStub(): void {
    void this.modalService.alert(
      'Вывод алмазов скоро будет доступен. Следите за обновлениями!',
      'Вывод алмазов'
    );
  }

  showTopUpStub(): void {
    void this.modalService.alert(
      'Пополнение алмазов скоро будет доступно. Следите за обновлениями!',
      'Пополнение'
    );
  }

  transferToBookmark(): void {
    if (!this.canTransfer || !this.selectedRecipientId || !this.transferAmount) {
      return;
    }
    this.transferring = true;
    this.transferError = '';
    this.diamondsService.transfer(this.selectedRecipientId, this.transferAmount, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          const recipient = this.selectedRecipient;
          const amount = this.transferAmount;
          this.transferring = false;
          this.transferError = '';
          this.balance = result.balance;
          this.transferAmount = null;
          this.selectedRecipientId = '';
          this.authService.updateDiamondBalance(result.balance);
          this.loadTransactions(0);
          this.currentPage = 0;
          const recipientName = recipient ? this.getRecipientName(recipient) : 'пользователю';
          const recipientNick = recipient ? this.getRecipientNick(recipient) : null;
          const recipientText = recipientNick ? `${recipientName} (${recipientNick})` : recipientName;
          void this.modalService.show({
            title: 'Алмазы отправлены',
            message: `Вы отправили ${amount} алмазов пользователю ${recipientText}.`,
            icon: 'success',
            confirmText: 'OK',
          });
        },
        error: (err) => {
          this.transferring = false;
          this.transferError = resolveDiamondTransferErrorMessage(err);
        },
      });
  }

  changePage(delta: number): void {
    const next = this.currentPage + delta;
    if (next < 0 || next >= this.totalPages) {
      return;
    }
    this.currentPage = next;
    this.loadTransactions(next);
  }

  formatTransactionTitle(tx: DiamondTransaction): string {
    if (tx.type === 'ADMIN_ADJUSTMENT') {
      return tx.amount > 0 ? 'Начисление администратором' : 'Списание администратором';
    }
    if (tx.type === 'REGISTRATION_BONUS') {
      return 'Приветственный бонус';
    }
    if (tx.type === 'BOOST_PURCHASE') {
      return 'Покупка Boost';
    }
    if (tx.type === 'PURCHASE') {
      return 'Пополнение';
    }
    if (tx.amount > 0) {
      return `Получено от ${tx.counterpartyName || 'пользователя'}`;
    }
    return `Отправлено ${tx.counterpartyName || 'пользователю'}`;
  }

  private loadBalance(): void {
    this.diamondsService.getBalance().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.balance = response.balance;
      },
    });
  }

  private loadActiveBoost(): void {
    this.boostService.getCurrentBoost().pipe(takeUntil(this.destroy$)).subscribe({
      next: (boost) => {
        this.activeBoost = boost;
        if (boost) {
          this.startBoostCountdown();
        } else {
          this.clearBoostCountdown();
        }
      },
      error: () => {
        this.activeBoost = null;
        this.clearBoostCountdown();
      },
    });
  }

  private clearBoostCountdown(): void {
    if (this.boostCountdownInterval) {
      clearInterval(this.boostCountdownInterval);
      this.boostCountdownInterval = null;
    }
  }

  private startBoostCountdown(): void {
    this.clearBoostCountdown();
    this.boostCountdownInterval = setInterval(() => {
      if (this.activeBoost && Date.now() >= this.activeBoost.expiresAt) {
        this.activeBoost = null;
        this.clearBoostCountdown();
      }
    }, 1000);
  }

  private loadBookmarks(): void {
    this.loadingBookmarks = true;
    this.bookmarksService.getBookmarks({ page: 0, size: 100 }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (users) => {
        this.bookmarks = users;
        this.loadingBookmarks = false;
      },
      error: () => {
        this.loadingBookmarks = false;
      },
    });
  }

  private loadTransactions(page: number): void {
    this.loadingTransactions = true;
    this.diamondsService.getTransactions(page, this.pageSize).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.transactions = response.items;
        this.totalTransactions = response.total;
        this.currentPage = response.page;
        this.loadingTransactions = false;
      },
      error: () => {
        this.loadingTransactions = false;
      },
    });
  }
}
