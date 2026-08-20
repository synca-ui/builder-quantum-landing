/**
 * Bild-Upload für den Konfigurator.
 *
 * Anlass: Logo, Galerie-, Gericht- und Angebotsbilder wurden als
 * browserlokale blob:-URLs in die Konfiguration geschrieben. Eine blob:-URL
 * existiert nur in der Sitzung, die sie erzeugt hat — auf der
 * veröffentlichten Website sah jeder Gast kaputte Bilder (nachgewiesen auf
 * trattoriabellavista.maitr.de: naturalWidth 0).
 *
 * Der Server hat mit POST /api/media/upload (Supabase Storage) den passenden
 * Endpunkt; diese Datei ist die eine Client-Anbindung dafür:
 *
 *   uploadImageFile(file, token) → dauerhafte https-URL
 *
 * Rückfallebene: Ist der Storage nicht erreichbar (lokale Entwicklung ohne
 * Backend, Netzfehler, fehlendes Token), liefert die Funktion ein
 * clientseitig verkleinertes data:-URL-Bild. Das ist größer als eine
 * Storage-URL, aber es ÜBERLEBT das Veröffentlichen — im Gegensatz zu blob:.
 */
import { API_PATHS } from "@/lib/apiPaths";

/** Längste Kante nach dem Verkleinern; reicht für Vollbild auf Mobilgeräten. */
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

/**
 * Datei als verkleinertes JPEG-data:-URL lesen (Rückfallebene).
 * PNGs mit Transparenz verlieren dabei ihre Transparenz — für Fotos
 * (Galerie, Gerichte) irrelevant, und besser als ein kaputtes Bild.
 */
export async function fileToCompressedDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    // Nicht dekodierbar (z.B. exotisches Format): unverändert einbetten.
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas nicht verfügbar");
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

/**
 * Lädt ein Bild hoch und gibt eine dauerhafte URL zurück.
 *
 * @param file  das gewählte Bild
 * @param token Clerk-Session-Token (`await getToken()`); der Endpunkt
 *              verlangt Auth. Ohne Token greift direkt die Rückfallebene.
 */
export async function uploadImageFile(
  file: File,
  token: string | null | undefined,
): Promise<string> {
  try {
    if (token) {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(API_PATHS.uploadMedia, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.success && typeof data.url === "string") {
          return data.url;
        }
      }
      console.warn("[mediaUpload] Upload fehlgeschlagen, nutze Rückfallebene");
    }
  } catch (e) {
    console.warn("[mediaUpload] Upload-Fehler, nutze Rückfallebene:", e);
  }
  return fileToCompressedDataUrl(file);
}
