import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getMessaging, Messaging, getToken, onMessage, MessagePayload } from 'firebase/messaging';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private firebaseApp: FirebaseApp | null = null;
  private messaging: Messaging | null = null;
  private messageSubject = new Subject<MessagePayload>();
  public messages$ = this.messageSubject.asObservable();
  private currentToken: string | null = null;

  private readonly apiUrl = '/api/v1/user';

  constructor(private http: HttpClient) {}

  async initialize(): Promise<void> {
    try {
      const firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_PROJECT.firebaseapp.com",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_PROJECT.appspot.com",
        messagingSenderId: "YOUR_SENDER_ID",
        appId: "YOUR_APP_ID"
      };

      this.firebaseApp = initializeApp(firebaseConfig);
      this.messaging = getMessaging(this.firebaseApp);

      onMessage(this.messaging, (payload) => {
        this.messageSubject.next(payload);
      });

      console.log('Firebase messaging initialized');
    } catch (error) {
      console.error('Failed to initialize Firebase messaging:', error);
    }
  }

  async requestPermission(): Promise<string | null> {
    if (!this.messaging) {
      await this.initialize();
    }

    if (!this.messaging) {
      return null;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(this.messaging, {
          vapidKey: 'YOUR_VAPID_KEY'
        });
        this.currentToken = token;
        await this.registerToken(token);
        return token;
      }
    } catch (error) {
      console.error('Failed to get permission:', error);
    }

    return null;
  }

  private async registerToken(token: string): Promise<void> {
    const platform = this.detectPlatform();
    this.http.post(`${this.apiUrl}/me/push-token`, { token, platform })
      .subscribe({
        next: () => console.log('Push token registered'),
        error: (err) => console.error('Failed to register push token:', err)
      });
  }

  async removeToken(): Promise<void> {
    if (this.currentToken) {
      this.http.delete(`${this.apiUrl}/me/push-token`, { body: { token: this.currentToken } })
        .subscribe({
          next: () => {
            this.currentToken = null;
            console.log('Push token removed');
          },
          error: (err) => console.error('Failed to remove push token:', err)
        });
    }
  }

  private detectPlatform(): string {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      return 'web';
    }
    return 'unknown';
  }

  getCurrentToken(): string | null {
    return this.currentToken;
  }
}
