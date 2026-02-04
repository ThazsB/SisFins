/**
 * Service Worker para Fins
 * 
 * Gerencia push notifications, cache offline e sincronização
 */

const CACHE_NAME = 'fins-v1';
const NOTIFICATIONS_CACHE = 'fins-notifications-v1';

// URLs para cache de notificações
const NOTIFICATION_ASSETS = [
  '/icons/notification-icon.png',
  '/icons/badge-icon.png',
  '/manifest.json',
];

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(self.skipWaiting());
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(clients.claim());
});

// Fetch event - apenas para assets de notificação
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  // Apenas cachear URLs relevantes
  const url = new URL(event.request.url);
  if (NOTIFICATION_ASSETS.some(asset => url.pathname.includes(asset))) {
    event.respondWith(
      caches.open(NOTIFICATIONS_CACHE).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response) return response;
          return fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
  }
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  let data = {
    title: 'Fins',
    body: 'Você tem uma nova notificação',
    icon: '/icons/notification-icon.png',
    badge: '/icons/badge-icon.png',
    tag: 'fins-notification',
    requireInteraction: false,
    data: {},
    actions: [],
  };
  
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    requireInteraction: data.requireInteraction,
    data: data.data,
    actions: data.actions,
    vibrate: [200, 100, 200],
    renotify: true,
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data;
  
  // Abrir a aplicação
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Tentar focar uma janela existente
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Abrir nova janela se nenhuma existir
      if (clients.openWindow) {
        const url = data?.url || '/';
        return clients.openWindow(url);
      }
    })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed', event.notification.tag);
});
