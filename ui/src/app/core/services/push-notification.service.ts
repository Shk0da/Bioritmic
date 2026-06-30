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
  reason?: 'unsupported' | 'denied' | 'dismissed' | 'fcm-unavailable';
}

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private firebaseApp: FirebaseApp | null = null;
  private messaging: Messaging | null = null;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private messageSubject = new Subject<{ notification?: { title?: string; body?: string }; data?: Record<string, string> }>();
  public messages$ = this.messageSubject.asObservable();
  private currentToken: string | null = null;
  private config: FirebaseClientConfig | null = null;
  private initPromise: Promise<boolean> | null = null;

  private readonly apiUrl = '/api/v1/user';
  private readonly PUSH_ENABLED_KEY = 'bioritmic_push_enabled';
  private readonly FCM_MODE_KEY = 'bioritmic_push_fcm';

  constructor(private http: HttpClient) {}

  isSupported(): boolean {
    return typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator;
  }

  isEnabled(): boolean {
    return localStorage.getItem(this.PUSH_ENABLED_KEY) === 'true';
  }

  setEnabled(enabled: boolean): void {
    localStorage.setItem(this.PUSH_ENABLED_KEY, enabled ? 'true' : 'false');
    if (!enabled) {
      localStorage.removeItem(this.FCM_MODE_KEY);
    }
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
    if (this.currentToken || localStorage.getItem(this.FCM_MODE_KEY) === 'true') {
      return 'fcm';
    }
    return this.config?.enabled ? null : 'local';
  }

  isStandalone(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
  }

  isIos(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  async initialize(): Promise<boolean> {
    if (this.initPromise) {
      return this.initPromise;
    }
    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private resetInitState(): void {
    this.initPromise = null;
    this.messaging = null;
    this.firebaseApp = null;
    this.serviceWorkerRegistration = null;
  }

  private async doInitialize(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    try {
      const response = await firstValueFrom(
        this.http.get<{ firebase: FirebaseClientConfig }>('/api/v1/config/client')
      );
      this.config = response.firebase;
      if (!this.config?.enabled || !this.config.vapidKey) {
        this.initPromise = null;
        return false;
      }

      const { isSupported: isMessagingSupported } = await import('firebase/messaging');
      if (!await isMessagingSupported()) {
        console.warn('Firebase messaging is not supported in this browser');
        return false;
      }

      this.serviceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });
      await navigator.serviceWorker.ready;
      await this.waitForActiveServiceWorker(this.serviceWorkerRegistration);

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

      return true;
    } catch (error) {
      console.warn('Push notifications unavailable:', error);
      this.resetInitState();
      return false;
    }
  }

  private async waitForActiveServiceWorker(registration: ServiceWorkerRegistration): Promise<void> {
    if (registration.active) {
      return;
    }

    const worker = registration.installing || registration.waiting;
    if (!worker) {
      return;
    }

    await new Promise<void>((resolve) => {
      if (worker.state === 'activated') {
        resolve();
        return;
      }
      const onStateChange = (): void => {
        if (worker.state === 'activated') {
          worker.removeEventListener('statechange', onStateChange);
          resolve();
        }
      };
      worker.addEventListener('statechange', onStateChange);
    });
  }

  async enable(): Promise<PushEnableResult> {
    if (!this.isSupported()) {
      return { enabled: false, mode: 'none', reason: 'unsupported' };
    }

    const firebaseReady = await this.initialize();
    const permission = await Notification.requestPermission();
    if (permission === 'denied') {
      this.setEnabled(false);
      return { enabled: false, mode: 'none', reason: 'denied' };
    }
    if (permission !== 'granted') {
      this.setEnabled(false);
      return { enabled: false, mode: 'none', reason: 'dismissed' };
    }

    if (this.config?.enabled && this.config.vapidKey) {
      if (!firebaseReady || !this.messaging || !this.serviceWorkerRegistration) {
        this.setEnabled(false);
        return { enabled: false, mode: 'none', reason: 'fcm-unavailable' };
      }

      try {
        const token = await this.obtainFcmToken();
        if (token) {
          this.currentToken = token;
          await this.registerToken(token);
          this.setEnabled(true);
          localStorage.setItem(this.FCM_MODE_KEY, 'true');
          return { enabled: true, mode: 'fcm' };
        }
      } catch (error) {
        console.warn('FCM token unavailable:', error);
      }

      this.setEnabled(false);
      return { enabled: false, mode: 'none', reason: 'fcm-unavailable' };
    }

    this.setEnabled(true);
    localStorage.removeItem(this.FCM_MODE_KEY);
    return { enabled: true, mode: 'local' };
  }

  async ensureRegistered(): Promise<PushEnableResult> {
    if (!this.isActive()) {
      return { enabled: false, mode: 'none' };
    }

    const firebaseReady = await this.initialize();
    if (!this.config?.enabled || !this.config.vapidKey) {
      localStorage.removeItem(this.FCM_MODE_KEY);
      return { enabled: true, mode: 'local' };
    }

    if (!firebaseReady || !this.messaging || !this.serviceWorkerRegistration) {
      localStorage.removeItem(this.FCM_MODE_KEY);
      return { enabled: true, mode: 'local' };
    }

    try {
      const token = await this.obtainFcmToken();
      if (!token) {
        localStorage.removeItem(this.FCM_MODE_KEY);
        return { enabled: true, mode: 'local' };
      }
      if (token !== this.currentToken) {
        this.currentToken = token;
        await this.registerToken(token);
      }
      localStorage.setItem(this.FCM_MODE_KEY, 'true');
      return { enabled: true, mode: 'fcm' };
    } catch (error) {
      console.warn('FCM token refresh failed:', error);
      localStorage.removeItem(this.FCM_MODE_KEY);
      return { enabled: true, mode: 'local' };
    }
  }

  private async obtainFcmToken(): Promise<string | null> {
    if (!this.messaging || !this.config?.vapidKey || !this.serviceWorkerRegistration) {
      return null;
    }

    const { getToken } = await import('firebase/messaging');
    return getToken(this.messaging, {
      vapidKey: this.config.vapidKey,
      serviceWorkerRegistration: this.serviceWorkerRegistration,
    });
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
    try {
      await firstValueFrom(this.http.delete(`${this.apiUrl}/me/push-token`));
    } finally {
      this.currentToken = null;
      localStorage.removeItem(this.FCM_MODE_KEY);
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
    if (this.getMode() === 'fcm' && document.visibilityState !== 'visible') {
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
