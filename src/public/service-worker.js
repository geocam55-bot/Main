// Self-uninstalling Service Worker to resolve stale caching and static API interception issues
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    })
    .then(() => {
      console.log('[ServiceWorker] Caches cleared. Unregistering self...');
      return self.registration.unregister();
    })
    .then(() => {
      return self.clients.matchAll();
    })
    .then((clients) => {
      clients.forEach((client) => {
        if (client.navigate) {
          try {
            client.navigate(client.url);
          } catch (e) {
            console.error('Failed to navigate client:', e);
          }
        }
      });
    })
  );
});
