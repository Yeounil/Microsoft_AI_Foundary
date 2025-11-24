// Service Worker for Green Wire PWA
const CACHE_NAME = 'green-wire-v1';
const OFFLINE_URL = '/offline.html';

// Assets to cache
const PRECACHE_ASSETS = [
  '/',
  '/main',
  '/watchlist',
  '/discover',
  '/login',
  '/register',
  '/offline.html',
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Network first, cache fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API requests
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and cache successful responses
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(async () => {
        // Try cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // Return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          const offlineResponse = await caches.match(OFFLINE_URL);
          if (offlineResponse) {
            return offlineResponse;
          }
        }

        // Return a basic offline response
        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable',
        });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-watchlist') {
    event.waitUntil(syncWatchlist());
  }
});

async function syncWatchlist() {
  // Sync pending watchlist changes when back online
  const pendingChanges = await getPendingChanges();
  for (const change of pendingChanges) {
    try {
      await fetch('/api/watchlist', {
        method: change.method,
        body: JSON.stringify(change.data),
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Failed to sync:', error);
    }
  }
}

async function getPendingChanges() {
  // Get pending changes from IndexedDB
  return [];
}
