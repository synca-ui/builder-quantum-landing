/**
 * siteCache.ts
 *
 * In-Memory LRU-Cache für publizierte Nutzer-Websites.
 * Eliminiert wiederholte NeonDB-Queries für dieselbe Subdomain.
 *
 * TTL: 60 Sekunden (danach wird DB erneut gefragt)
 * Max Einträge: 500 (danach wird der älteste entfernt)
 * Speicherbedarf: ~500 * ~5KB Config ≈ 2.5MB RAM auf Railway – unkritisch
 */

interface CacheEntry {
  data: any;
  etag: string;
  expiresAt: number;
}

const TTL_MS = 60_000;     // 60 Sekunden
const MAX_ENTRIES = 500;

// Einfaches LRU via Map (insertion-order)
const cache = new Map<string, CacheEntry>();

export function getCachedSite(subdomain: string): CacheEntry | null {
  const entry = cache.get(subdomain);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(subdomain);
    return null;
  }
  // LRU: beim Zugriff ans Ende verschieben
  cache.delete(subdomain);
  cache.set(subdomain, entry);
  return entry;
}

export function setCachedSite(subdomain: string, data: any, etag: string): void {
  // LRU eviction: ältesten Eintrag entfernen wenn voll
  if (cache.size >= MAX_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(subdomain, { data, etag, expiresAt: Date.now() + TTL_MS });
}

export function invalidateSite(subdomain: string): void {
  cache.delete(subdomain);
}

export function getCacheStats() {
  return { size: cache.size, maxEntries: MAX_ENTRIES, ttlMs: TTL_MS };
}
