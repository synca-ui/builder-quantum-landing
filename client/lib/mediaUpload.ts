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

  const data = await res.json().catch(() => ({}) as any);
  if (!res.ok || !data?.url) {
    throw new Error(data?.error || `Upload fehlgeschlagen (HTTP ${res.status})`);
  }
  return data.url as string;
}
