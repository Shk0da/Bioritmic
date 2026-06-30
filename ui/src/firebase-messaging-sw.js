/* eslint-disable no-undef */
const FIREBASE_VERSION = '12.15.0';
importScripts(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app-compat.js`);
importScripts(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-messaging-compat.js`);

let messaging = null;
let initPromise = null;

function initFirebase(config) {
  if (!config || !config.enabled || !config.apiKey) {
    return false;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp({
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId
    });
  }

  messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || payload.data?.title || 'Bioritmic';
    const body = payload.notification?.body || payload.data?.body || '';
    const data = payload.data || {};
    return self.registration.showNotification(title, {
      body,
      icon: '/assets/icons/icon-192.png',
      badge: '/assets/icons/icon-192.png',
      data
    });
  });
  return true;
}

function ensureFirebaseInit() {
  if (!initPromise) {
    initPromise = fetch('/api/v1/config/client', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`config/client responded with ${res.status}`);
        }
        return res.json();
      })
      .then((payload) => initFirebase(payload.firebase))
      .catch((error) => {
        console.warn('[firebase-messaging-sw] init failed:', error);
        return false;
      });
  }
  return initPromise;
}

self.addEventListener('install', (event) => {
  event.waitUntil(ensureFirebaseInit().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([ensureFirebaseInit(), self.clients.claim()]));
});

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    await ensureFirebaseInit();
    if (messaging || !event.data) {
      return;
    }

    try {
      const payload = event.data.json();
      const title = payload.notification?.title || payload.data?.title || 'Bioritmic';
      const body = payload.notification?.body || payload.data?.body || '';
      await self.registration.showNotification(title, {
        body,
        icon: '/assets/icons/icon-192.png',
        badge: '/assets/icons/icon-192.png',
        data: payload.data || {}
      });
    } catch (error) {
      console.warn('[firebase-messaging-sw] push fallback failed:', error);
    }
  })());
});

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

ensureFirebaseInit();
