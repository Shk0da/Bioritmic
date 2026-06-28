import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FirebaseApp } from 'firebase/app';
import { Messaging } from 'firebase/messaging';
import { firstValueFrom, Subject } from 'rxjs';

export interface FirebaseClientConfig {
  enabled: boolean;
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
}

export type PushNotificationMode = 'fcm' | 'local';

export interface PushEnableResult {
  enabled: boolean;
  mode: PushNotificationMode | 'none';
  reason?: 'unsupported' | 'denied' | 'dismissed';
}

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private firebaseApp: FirebaseApp | null = null;
  private messaging: Messaging | null = null;
  private messageSubject = new Subject<{ notification?: { title?: string; body?: string }; data?: Record<string, string> }>();
  public messages$ = this.messageSubject.asObservable();
  private currentToken: string | null = null;
  private config: FirebaseClientConfig | null = null;
  private initPromise: Promise<void> | null = null;

  private readonly apiUrl = '/api/v1/user';
  private readonly PUSH_ENABLED_KEY = 'bioritmic_push_enabled';

  constructor(private http: HttpClient) {}

  isSupported(): boolean {
    return typeof window !== 'undefined' &&
      'Notification' in window;
  }

  isEnabled(): boolean {
    return localStorage.getItem(this.PUSH_ENABLED_KEY) === 'true';
  }

  setEnabled(enabled: boolean): void {
    localStorage.setItem(this.PUSH_ENABLED_KEY, enabled ? 'true' : 'false');
  }

  syncEnabledWithPermission(): void {
    if (this.isEnabled() && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      this.setEnabled(false);
    }
  }

  isActive(): boolean {
    return this.isSupported() &&
      this.isEnabled() &&
      Notification.permission === 'granted';
  }

  getMode(): PushNotificationMode | null {
    if (!this.isActive()) {
      return null;
    }
    return this.currentToken ? 'fcm' : 'local';
  }

  isStandalone(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
  }

  isIos(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }
    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    if (!this.isSupported()) {
      return;
    }

    try {
      const response = await firstValueFrom(
        this.http.get<{ firebase: FirebaseClientConfig }>('/api/v1/config/client')
      );
      this.config = response.firebase;
      if (!this.config?.enabled || !this.config.vapidKey) {
        return;
      }

      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      }

      const [{ initializeApp }, { getMessaging, onMessage }] = await Promise.all([
        import('firebase/app'),
        import('firebase/messaging')
      ]);

      this.firebaseApp = initializeApp({
        apiKey: this.config.apiKey,
        authDomain: this.config.authDomain,
        projectId: this.config.projectId,
        storageBucket: this.config.storageBucket,
        messagingSenderId: this.config.messagingSenderId,
        appId: this.config.appId
      });
      this.messaging = getMessaging(this.firebaseApp);

      onMessage(this.messaging, (payload) => {
        this.messageSubject.next(payload);
        this.showLocalNotification(
          payload.notification?.title || 'Bioritmic',
          payload.notification?.body || '',
          payload.data?.['type']
        );
      });
    } catch (error) {
      console.warn('Push notifications unavailable:', error);
    }
  }

  async enable(): Promise<PushEnableResult> {
    if (!this.isSupported()) {
      return { enabled: false, mode: 'none', reason: 'unsupported' };
    }

    await this.initialize();

    const permission = await Notification.requestPermission();
    if (permission === 'denied') {
      this.setEnabled(false);
      return { enabled: false, mode: 'none', reason: 'denied' };
    }
    if (permission !== 'granted') {
      this.setEnabled(false);
      return { enabled: false, mode: 'none', reason: 'dismissed' };
    }

    if (this.messaging && this.config?.enabled && this.config.vapidKey && 'serviceWorker' in navigator) {
      try {
        const { getToken } = await import('firebase/messaging');
        const registration = await navigator.serviceWorker.ready;
        const token = await getToken(this.messaging, {
          vapidKey: this.config.vapidKey,
          serviceWorkerRegistration: registration
        });
        if (token) {
          this.currentToken = token;
          await this.registerToken(token);
          this.setEnabled(true);
          return { enabled: true, mode: 'fcm' };
        }
      } catch (error) {
        console.warn('FCM token unavailable, using local notifications:', error);
      }
    }

    this.setEnabled(true);
    return { enabled: true, mode: 'local' };
  }

  async requestPermission(): Promise<string | null> {
    const result = await this.enable();
    if (!result.enabled) {
      return null;
    }
    return result.mode === 'fcm' ? this.currentToken : 'local';
  }

  async disable(): Promise<void> {
    await this.removeToken();
    this.setEnabled(false);
  }

  private async registerToken(token: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.apiUrl}/me/push-token`, { token, platform: 'web' })
    );
  }

  async removeToken(): Promise<void> {
    if (!this.currentToken) {
      return;
    }
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/me/push-token`, {
          body: { token: this.currentToken }
        })
      );
    } finally {
      this.currentToken = null;
    }
  }

  getCurrentToken(): string | null {
    return this.currentToken;
  }

  hasFirebaseConfig(): boolean {
    return !!this.config?.enabled;
  }

  showLocalNotification(title: string, body: string, type?: string): void {
    if (!this.isActive()) {
      return;
    }
    if (document.visibilityState === 'visible' && !type) {
      return;
    }

    const url = type === 'mailbox' ? '/mailbox' : type === 'meeting' ? '/meetings' : '/';
    const notification = new Notification(title, {
      body,
      icon: '/assets/icons/icon-192.png',
      badge: '/assets/icons/icon-192.png'
    });
    notification.onclick = () => {
      window.focus();
      window.location.href = url;
      notification.close();
    };
  }
}
