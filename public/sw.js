/**
 * sw.js – Maitr Service Worker v5
 *
 * Strategien:
 *  - /api/sites/* → Stale-While-Revalidate (sofort aus Cache, im Hintergrund aktualisieren)
 *  - /*.js /*.css  → Cache-First (immutable assets)
 *  - /*            → Network-First mit Offline-Fallback
 *
 * Warum Stale-While-Revalidate für API-Sites?
 *  Kellner/Terrasse mit schlechtem Signal sehen die letzte Version sofort,
 *  während die neue Version im Hintergrund geladen wird.
 */

const CACHE_VERSION = "v6";
const STATIC_CACHE = `maitr-static-${CACHE_VERSION}`;
const SITE_CONFIG_CACHE = `maitr-site-config-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = ["/", "/offline.html", "/manifest.json"];

// ── Install ────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

// ── Activate – alte Caches entfernen ──────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((n) => n !== STATIC_CACHE && n !== SITE_CONFIG_CACHE)
            .map((n) => caches.delete(n)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  const url = new URL(event.request.url);

  // Strategie 1: /api/sites/* → Stale-While-Revalidate
  // Sofort aus Cache (offline-fähig), im Hintergrund aktualisieren
  if (url.pathname.startsWith("/api/sites/")) {
    event.respondWith(staleWhileRevalidate(event.request, SITE_CONFIG_CACHE));
    return;
  }

  // Strategie 2: Andere API-Aufrufe → immer Network (kein Cache)
  if (url.pathname.startsWith("/api/")) return;

  // Strategie 3: JS/CSS Chunks → Cache-First (immutable by content hash)
  if (url.pathname.match(/\.(js|css)$/)) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  // Strategie 4: HTML + alles andere → Network-First mit Offline-Fallback
  event.respondWith(networkFirstWithOfflineFallback(event.request));
});

// ── Strategien ─────────────────────────────────────────────────────────────

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Im Hintergrund aktualisieren (fire-and-forget)
  const networkFetch = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  // Sofort aus Cache zurückgeben wenn vorhanden, sonst auf Network warten
  return cached || networkFetch;
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    const offlinePage = await caches.match(OFFLINE_URL);
    return (
      offlinePage ||
      new Response("<!doctype html><p>Offline</p>", {
        status: 503,
        headers: { "Content-Type": "text/html" },
      })
    );
  }
}

// ── Cache-Invalidierung via postMessage ───────────────────────────────────
// Kann vom Client aufgerufen werden wenn eine neue Config gespeichert wird
self.addEventListener("message", (event) => {
  if (event.data?.action === "skipWaiting") {
    self.skipWaiting();
  }
  if (event.data?.action === "invalidateSite" && event.data?.subdomain) {
    caches.open(SITE_CONFIG_CACHE).then((cache) => {
      // Alle Cache-Einträge für diese Subdomain löschen
      cache.keys().then((keys) => {
        keys
          .filter((k) => k.url.includes(`/api/sites/${event.data.subdomain}`))
          .forEach((k) => cache.delete(k));
      });
    });
  }
});
