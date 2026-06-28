/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

let messaging = null;

function initFirebase(config) {
  if (!config || !config.enabled || !config.apiKey) {
    return;
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
    const title = payload.notification?.title || 'Bioritmic';
    const options = {
      body: payload.notification?.body || '',
      icon: '/assets/icons/icon-192.png',
      badge: '/assets/icons/icon-192.png',
      data: payload.data || {}
    };
    self.registration.showNotification(title, options);
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
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

fetch('/api/v1/config/client', { cache: 'no-store' })
  .then((res) => res.json())
  .then((payload) => initFirebase(payload.firebase))
  .catch(() => {});
