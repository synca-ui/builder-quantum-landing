import { API_PATHS } from "@/lib/apiPaths";

/**
 * Lädt ein Bild zum Server (→ Supabase Storage) hoch und liefert die
 * dauerhafte öffentliche URL.
 *
 * Verwendung im Konfigurator: Die Steps zeigen sofort eine lokale blob:-URL
 * als Vorschau und ersetzen sie nach erfolgreichem Upload durch die echte
 * URL — nur die überlebt Reload und Veröffentlichung.
 */
export async function uploadImageFile(
  file: File,
  token?: string | null,
): Promise<string> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(API_PATHS.uploadMedia, {
    method: "POST",
    body: form,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  // Die Antwort roh lesen: Bei einem Proxy- oder Infrastrukturfehler kommt HTML
  // statt JSON zurück, und ein blindes res.json() verschluckt genau die
  // Information, die man zur Diagnose braucht.
  const raw = await res.text();
  let data: any = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {};
  }

  if (!res.ok || !data?.url) {
    const detail =
      data?.error ||
      (raw ? `${raw.slice(0, 160)}` : "leere Antwort") ||
      "unbekannt";
    throw new Error(`HTTP ${res.status}: ${detail}`);
  }
  return data.url as string;
}
