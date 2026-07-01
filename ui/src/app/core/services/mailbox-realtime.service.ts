import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { UserMail } from '../models/user.model';

export type MailboxWsEventType =
  | 'message'
  | 'deleted'
  | 'reaction'
  | 'read'
  | 'subscribed'
  | 'unsubscribed'
  | 'pong'
  | 'error'
  | 'diamond_balance';

export interface MailboxWsEvent {
  type: MailboxWsEventType;
  otherUserId?: string;
  message?: UserMail;
  messageIds?: number[];
  messageId?: number;
  reaction?: string | null;
  reactionCounts?: Record<string, number>;
  balance?: number;
}

interface MailboxWsInbound {
  action: 'subscribe' | 'unsubscribe' | 'ping';
  otherUserId?: string;
}

const RECONNECT_BASE_MS = 1500;
const RECONNECT_MAX_MS = 30000;
const PING_INTERVAL_MS = 25000;

@Injectable({
  providedIn: 'root'
})
export class MailboxRealtimeService implements OnDestroy {
  private socket: WebSocket | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private subscribedOtherUserId: string | null = null;
  private shouldStayConnected = false;
  private readonly eventsSubject = new Subject<MailboxWsEvent>();

  constructor(private authService: AuthService) {}

  ngOnDestroy(): void {
    this.disconnect();
  }

  events$(): Observable<MailboxWsEvent> {
    return this.eventsSubject.asObservable();
  }

  connect(): void {
    if (typeof window === 'undefined' || !this.authService.isAuthenticated()) {
      return;
    }
    this.shouldStayConnected = true;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.openSocket();
  }

  disconnect(): void {
    this.shouldStayConnected = false;
    this.subscribedOtherUserId = null;
    this.clearReconnectTimer();
    this.clearPingTimer();
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }
  }

  subscribeConversation(otherUserId: string): void {
    this.subscribedOtherUserId = otherUserId;
    this.connect();
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.send({ action: 'subscribe', otherUserId });
    }
  }

  unsubscribeConversation(): void {
    this.subscribedOtherUserId = null;
    this.send({ action: 'unsubscribe' });
  }

  private openSocket(): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = this.authService.getToken();
    const tokenQuery = token ? `?access_token=${encodeURIComponent(token)}` : '';
    const url = `${protocol}//${window.location.host}/api/v1/ws/mailbox${tokenQuery}`;
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.reconnectAttempt = 0;
      this.startPingTimer();
      if (this.subscribedOtherUserId) {
        this.send({ action: 'subscribe', otherUserId: this.subscribedOtherUserId });
      }
    };

    this.socket.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.socket.onerror = () => {
      // onclose handles reconnect
    };

    this.socket.onclose = () => {
      this.clearPingTimer();
      this.socket = null;
      if (this.shouldStayConnected && this.authService.isAuthenticated()) {
        this.scheduleReconnect();
      }
    };
  }

  private handleMessage(raw: unknown): void {
    if (typeof raw !== 'string' || !raw.trim()) {
      return;
    }
    try {
      const payload = JSON.parse(raw) as MailboxWsEvent;
      if (!payload?.type) {
        return;
      }
      if (payload.type === 'diamond_balance' && payload.balance != null) {
        this.authService.updateDiamondBalance(payload.balance);
      }
      this.eventsSubject.next(payload);
    } catch {
      // ignore malformed payloads
    }
  }

  private send(payload: MailboxWsInbound): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    this.socket.send(JSON.stringify(payload));
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    const delay = Math.min(RECONNECT_BASE_MS * (2 ** this.reconnectAttempt), RECONNECT_MAX_MS);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.shouldStayConnected) {
        this.openSocket();
      }
    }, delay);
  }

  private startPingTimer(): void {
    this.clearPingTimer();
    this.pingTimer = setInterval(() => {
      this.send({ action: 'ping' });
    }, PING_INTERVAL_MS);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer != null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearPingTimer(): void {
    if (this.pingTimer != null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
}
