/**
 * siteCache.ts
 *
 * In-Memory LRU-Cache für publizierte Nutzer-Websites.
 * Eliminiert wiederholte NeonDB-Queries für dieselbe Subdomain.
 *
 * TTL: 60 Sekunden (danach wird DB erneut gefragt)
 * Max Einträge: 500 (danach wird der älteste entfernt)
 * Speicherbedarf: ~500 * ~5KB Config ≈ 2.5MB RAM auf Railway – unkritisch
 *
 * ZWEI DINGE, DIE HIER SCHIEFGINGEN
 *
 * 1. NIEMAND HAT JE GELEERT. `invalidateSite` existierte, hatte aber keinen
 *    Aufrufer. Nach dem Veröffentlichen lieferte `GET /api/sites/:subdomain`
 *    bis zu 60 Sekunden die VORHERIGE Fassung - genau in dem Moment, in dem
 *    die Erfolgsansicht den QR-Code zeigt und der Wirt seine Seite aufruft.
 *    Mit dem Anpassen-Interface (ändern → erneut veröffentlichen → nachsehen)
 *    trifft das nicht mehr die Ausnahme, sondern den Regelfall.
 *
 * 2. ZWEI FORMEN UNTER EINEM SCHLÜSSEL. `server/routes/configurations.ts`
 *    legte hier seine öffentliche, gefilterte Feldliste ab; die Middleware in
 *    `server/routes/subdomains.ts` legte unter DEMSELBEN Schlüssel die rohe
 *    `WebApp.configData` ab. Wer zuerst schrieb, gewann - und im ungünstigen
 *    Fall beantwortete die öffentliche Route ihre Anfrage aus dem rohen
 *    Datensatz, also mit genau den Feldern, die die Feldliste bewusst
 *    zurückhält. Deshalb trägt jeder Eintrag jetzt einen Bereich (`bereich`),
 *    und `invalidateSite` räumt alle Bereiche einer Subdomain zusammen ab.
 */

interface CacheEntry {
  data: any;
  etag: string;
  expiresAt: number;
}

const TTL_MS = 60_000;     // 60 Sekunden
const MAX_ENTRIES = 500;

/**
 * Welche Sicht auf die Seite im Eintrag steht. Zwei Bereiche, zwei Formen:
 * "oeffentlich" ist die gefilterte Feldliste der öffentlichen API, "roh" die
 * gespeicherte configData der Middleware.
 */
export type CacheBereich = "oeffentlich" | "roh";

function schluessel(bereich: CacheBereich, subdomain: string): string {
  return `${bereich}:${subdomain}`;
}

// Einfaches LRU via Map (insertion-order)
const cache = new Map<string, CacheEntry>();

export function getCachedSite(
  subdomain: string,
  bereich: CacheBereich = "oeffentlich",
): CacheEntry | null {
  const key = schluessel(bereich, subdomain);
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  // LRU: beim Zugriff ans Ende verschieben
  cache.delete(key);
  cache.set(key, entry);
  return entry;
}

export function setCachedSite(
  subdomain: string,
  data: any,
  etag: string,
  bereich: CacheBereich = "oeffentlich",
): void {
  // LRU eviction: ältesten Eintrag entfernen wenn voll
  if (cache.size >= MAX_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(schluessel(bereich, subdomain), {
    data,
    etag,
    expiresAt: Date.now() + TTL_MS,
  });
}

/**
 * Alle Bereiche einer Subdomain verwerfen. Nach dem Veröffentlichen aufrufen -
 * ein halb geleerter Cache wäre schlimmer als gar keiner, weil die beiden
 * Bereiche dann verschiedene Stände zeigten.
 */
export function invalidateSite(subdomain: string): void {
  const bereiche: CacheBereich[] = ["oeffentlich", "roh"];
  for (const bereich of bereiche) {
    cache.delete(schluessel(bereich, subdomain));
  }
}

export function getCacheStats() {
  return { size: cache.size, maxEntries: MAX_ENTRIES, ttlMs: TTL_MS };
}
