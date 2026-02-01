const CACHE_NAME = 'maitr-builder-v2';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/index.html'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching essential files');
        // Cache only essential files first, discover others during runtime
        return cache.addAll(['/'])
          .catch((error) => {
            console.warn('Service Worker: Failed to cache some resources:', error);
            // Continue anyway with basic caching
          });
      })
      .then(() => {
        console.log('Service Worker: Installed');
        return self.skipWaiting();
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing Old Cache');
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activated');
      return self.clients.claim();
    })
  );
});

// Fetch Event - Optimized for performance
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  // Skip API calls (let them go to network)
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request for caching
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response for caching
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              // Only cache certain file types
              const url = event.request.url;
              if (url.includes('.js') || url.includes('.css') || url.includes('.html') ||
                  url === self.location.origin + '/') {
                cache.put(event.request, responseToCache);
              }
            });

          return response;
        }).catch(() => {
          // Network failed, try to serve from cache
          return caches.match('/') || new Response('Offline', { status: 503 });
        });
      })
  );
});
