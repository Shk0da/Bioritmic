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

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const type = event.notification.data?.type;
  let url = '/';
  if (type === 'mailbox') {
    url = '/mailbox';
  } else if (type === 'meeting') {
    url = '/meetings';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          if ('navigate' in client) {
            return client.navigate(url).then(() => client.focus());
          }
          client.focus();
          return undefined;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
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
