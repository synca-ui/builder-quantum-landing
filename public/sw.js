const CACHE_NAME = "maitr-builder-v4";
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = ["/", "/offline.html", "/manifest.json"];

// Install Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

// Activate – clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Fetch – network-first with offline fallback
self.addEventListener("fetch", (event) => {
  // Only handle GET requests for same-origin URLs (skip API calls)
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith(self.location.origin)) return;
  if (event.request.url.includes("/api/")) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      const fetchRequest = event.request.clone();

      return fetch(fetchRequest)
        .then((response) => {
          // Only cache valid same-origin responses
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            const url = event.request.url;
            if (
              url.includes(".js") ||
              url.includes(".css") ||
              url.includes(".html") ||
              url === self.location.origin + "/"
            ) {
              cache.put(event.request, responseToCache);
            }
          });

          return response;
        })
        .catch(() =>
          // Network failed → serve dedicated offline page
          caches
            .match(OFFLINE_URL)
            .then(
              (offlinePage) =>
                offlinePage ||
                new Response(
                  "<!doctype html><p>Offline</p>",
                  {
                    status: 503,
                    headers: { "Content-Type": "text/html" },
                  },
                ),
            ),
        );
    }),
  );
});
