/**
 * Service Worker para EcoFinance
 * 
 * Gerencia push notifications, cache offline e sincronização
 */

const CACHE_NAME = 'ecofinance-v1';
const NOTIFICATIONS_CACHE = 'ecofinance-notifications-v1';

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
    title: 'EcoFinance',
    body: 'Você tem uma nova notificação',
    icon: '/icons/notification-icon.png',
    badge: '/icons/badge-icon.png',
    tag: 'ecofinance-notification',
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
  
  // Configurar ações baseadas nos dados
  const actions = [];
  if (data.data?.url) {
    actions.push({ action: 'view', title: 'Ver' });
  }
  actions.push({ action: 'dismiss', title: 'Dispensar' });
  
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: {
      ...data.data,
      notificationId: data.id,
      timestamp: Date.now(),
    },
    actions,
    vibrate: [100, 50, 100],
    renotify: true,
    requireInteraction: data.requireInteraction,
    silent: data.silent || false,
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .then(() => updateBadgeCount())
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data;
  
  // Reportar clique para analytics
  reportNotificationEvent(data?.notificationId, 'click', action);
  
  if (action === 'dismiss') {
    return;
  }
  
  // Abrir ou focar na app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Tentar focar janela existente
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            if (data?.url) {
              client.postMessage({ type: 'NAVIGATE', url: data.url });
            }
            return;
          }
        }
        
        // Abrir nova janela
        if (clients.openWindow) {
          const url = data?.url || '/';
          return clients.openWindow(url);
        }
      })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
  
  const data = event.notification.data;
  reportNotificationEvent(data?.notificationId, 'close');
});

// Background sync for notifications
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

// Sync notifications function
async function syncNotifications() {
  console.log('[SW] Syncing notifications...');
  // Implementar sincronização com Supabase
}

// Message event
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, badge, data, actions } = event.data;
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      data,
      actions,
      tag: 'ecofinance-toast',
      requireInteraction: false,
    });
  }
});

// Atualizar contagem do badge
async function updateBadgeCount() {
  try {
    // Obter contagem do IndexedDB ou API
    const count = await getUnreadCount();
    if (navigator.setAppBadge) {
      navigator.setAppBadge(count);
    } else if (navigator.setBadge) {
      navigator.setBadge(count);
    }
  } catch (error) {
    console.error('[SW] Failed to update badge:', error);
  }
}

async function getUnreadCount() {
  // Implementar: obter do IndexedDB ou API
  return 0;
}

// Reportar evento de notificação para analytics
async function reportNotificationEvent(notificationId, event, action) {
  if (!notificationId) return;
  
  try {
    await fetch('/api/notifications/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notificationId,
        event,
        action,
        timestamp: Date.now(),
        platform: 'web',
      }),
    });
  } catch (error) {
    console.error('[SW] Failed to report notification event:', error);
  }
}

console.log('[SW] Service Worker loaded');
