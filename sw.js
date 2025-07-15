// Define a cache name
const CACHE_NAME = 'babli-chat-v1';

// List all the files to cache
const urlsToCache = [
  '/',
  '/index.html',
  '/favicon.png',
  '/icon-512.png'
  // CSS and JS are inline, so no need to cache them separately.
];

// Install event: opens the cache and adds the files to it
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching files');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event: serves assets from cache if available, otherwise fetches from network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response from cache
        if (response) {
          return response;
        }
        // Not in cache - fetch from network
        return fetch(event.request);
      })
  );
});
