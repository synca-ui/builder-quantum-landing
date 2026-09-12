/**
 * Eine Schreibweise je Website. `ScraperJob.websiteUrl` ist der Unique-Schlüssel
 * der Tabelle, und sowohl der n8n-Upsert als auch jede Abfrage vergleichen den
 * String exakt. Wer die Adresse an n8n schickt oder danach sucht, muss deshalb
 * durch dieselbe Funktion.
 *
 * Host klein, Schrägstrich am Ende weg, Fragment weg; Pfad und Query bleiben
 * (eine Unterseite ist eine andere Adresse).
 */
export function normalizeWebsiteUrl(raw: string): string {
  const u = new URL(raw.trim());
  u.hostname = u.hostname.toLowerCase();
  u.hash = "";
  if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
    u.pathname = u.pathname.replace(/\/+$/, "");
  }
  let out = u.toString();
  // Bei leerem Pfad hängt URL.toString() einen "/" an den Host – der soll weg,
  // damit "https://example.de" und "https://example.de/" dieselbe Zeile sind.
  if (u.pathname === "/" && !u.search) out = out.replace(/\/$/, "");
  return out;
}

/**
 * Alle Schreibweisen, unter denen eine Website in ScraperJob stehen kann.
 *
 * Vom 20.08. bis 11.09.2026 schickte /api/forward-to-n8n den Link als
 * `URL.toString()` an n8n – bei einer reinen Domain also MIT "/" am Ende. Der
 * Entry-Flow hat genau diese Schreibweise upgesertet, die Landingpage pollte
 * aber mit dem eingetippten Link ohne "/" und fand die Zeile nie. Diese
 * Altzeilen sollen weiter gefunden werden.
 */
export function websiteUrlSpellings(raw: string): string[] {
  const trimmed = raw.trim();
  let normalized: string;
  try {
    normalized = normalizeWebsiteUrl(trimmed);
  } catch {
    return [trimmed];
  }
  const spellings = new Set([normalized, trimmed]);
  if (!normalized.includes("?")) spellings.add(`${normalized}/`);
  return [...spellings];
}
