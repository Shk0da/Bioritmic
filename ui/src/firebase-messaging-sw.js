/* eslint-disable no-undef */
const FIREBASE_VERSION = '12.15.0';

try {
  importScripts('/api/v1/config/firebase-sw.js');
} catch (error) {
  console.warn('[firebase-messaging-sw] config import failed:', error);
  self.FIREBASE_SW_CONFIG = { enabled: false };
}

importScripts(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app-compat.js`);
importScripts(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-messaging-compat.js`);

const config = self.FIREBASE_SW_CONFIG || { enabled: false };

if (config.enabled && config.apiKey) {
  firebase.initializeApp({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    storageBucket: config.storageBucket,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId,
  });

  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || payload.data?.title || 'Bioritmic';
    const body = payload.notification?.body || payload.data?.body || '';
    const data = payload.data || {};
    return self.registration.showNotification(title, {
      body,
      icon: '/assets/icons/icon-192.png',
      badge: '/assets/icons/icon-192.png',
      data,
    });
  });
}

function sanitizePushNavigationUrl(url) {
  if (!url || typeof url !== 'string') {
    return '/';
  }
  const trimmed = url.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return '/';
  }
  if (trimmed.includes('://') || trimmed.includes('\\')) {
    return '/';
  }
  const path = trimmed.split('?')[0].split('#')[0];
  const allowedPrefixes = ['/mailbox', '/meetings', '/swipe', '/profile', '/settings', '/bookmarks', '/user/'];
  if (path === '/') {
    return '/';
  }
  const allowed = allowedPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  return allowed ? trimmed.split('#')[0] : '/';
}

function resolveNotificationUrl(data) {
  if (data?.url) {
    return sanitizePushNavigationUrl(data.url);
  }
  const type = data?.type;
  const userId = data?.userId;
  if (type === 'mailbox') {
    return userId ? sanitizePushNavigationUrl(`/mailbox/${userId}`) : '/mailbox';
  }
  if (type === 'meeting') {
    return '/meetings';
  }
  return '/';
}

function pickClient(windowClients) {
  const sameOrigin = windowClients.filter((client) => client.url.startsWith(self.location.origin));
  const appClient = sameOrigin.find((client) => {
    const path = new URL(client.url).pathname;
    return !path.startsWith('/auth');
  });
  const visibleClient = sameOrigin.find((client) => client.visibilityState === 'visible');
  return appClient || visibleClient || sameOrigin[0] || null;
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = resolveNotificationUrl(event.notification.data || {});
  const absoluteUrl = new URL(url, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const client = pickClient(windowClients);
      if (client) {
        const path = new URL(client.url).pathname;
        if (path.startsWith('/auth')) {
          if (clients.openWindow) {
            return clients.openWindow(absoluteUrl);
          }
          return undefined;
        }
        client.postMessage({ type: 'push-navigate', url });
        return client.focus();
      }
      if (clients.openWindow) {
        return clients.openWindow(absoluteUrl);
      }
      return undefined;
    })
  );
});

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
