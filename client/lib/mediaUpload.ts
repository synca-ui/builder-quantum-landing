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
import { useSyncExternalStore } from "react";
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

// ---------------------------------------------------------------------------
// Laufende Uploads verfolgen.
//
// Anlass (Prüfung Runde 8, H2): Wer direkt nach einer Bildauswahl auf
// „Veröffentlichen" klickt, liest die Konfiguration, während der Upload noch
// läuft — und die blob:-Vorschau geht live (leeres Bild für jeden Gast).
// Der Zähler hier ist die eine Stelle, die alle fünf Upload-Orte (Logo,
// Galerie, Gericht, Angebot, SEO) automatisch abdeckt, weil sie alle durch
// uploadImageFile gehen.
// ---------------------------------------------------------------------------
let laufend = 0;
const zuhoerer = new Set<() => void>();
const wartende: Array<() => void> = [];

function melde(): void {
  for (const fn of zuhoerer) fn();
  if (laufend === 0) {
    for (const weiter of wartende.splice(0)) weiter();
  }
}

/** Wie viele Uploads gerade laufen (0 = alles ist dauerhaft gespeichert). */
export function anzahlLaufenderUploads(): number {
  return laufend;
}

export function abonniereUploads(fn: () => void): () => void {
  zuhoerer.add(fn);
  return () => {
    zuhoerer.delete(fn);
  };
}

/** Löst auf, sobald kein Upload mehr läuft — sofort, wenn keiner läuft. */
export function warteAufUploads(): Promise<void> {
  if (laufend === 0) return Promise.resolve();
  return new Promise((weiter) => {
    wartende.push(weiter);
  });
}

/** Für Komponenten: rendert neu, wenn sich die Zahl laufender Uploads ändert. */
export function useLaufendeUploads(): number {
  return useSyncExternalStore(
    abonniereUploads,
    anzahlLaufenderUploads,
    () => 0,
  );
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
  laufend++;
  melde();
  try {
    return await uploadImageFileIntern(file, token);
  } finally {
    laufend--;
    melde();
  }
}

async function uploadImageFileIntern(
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
