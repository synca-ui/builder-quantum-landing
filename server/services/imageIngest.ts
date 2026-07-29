/**
 * Übernimmt gescrapte Bilder in den eigenen Speicher.
 *
 * Der Scrape sammelt Galeriebilder als Adressen der analysierten Website ein
 * und reicht sie unverändert weiter. Wird so veröffentlicht, hängt die
 * ausgelieferte Web-App an fremdem Hosting:
 *   - die Bilder verschwinden, sobald die Quelle sie umbenennt oder aufräumt
 *   - jeder Besucher der Maitr-Seite meldet sich beim fremden Server, der damit
 *     Aufrufe mitlesen kann, die ihn nichts angehen
 *   - fremde Bandbreite wird auf Dauer beansprucht, ohne dass jemand zustimmte
 *
 * Deshalb werden sie vor dem Veröffentlichen einmal kopiert.
 *
 * Der Objektpfad leitet sich aus der Quelladresse ab und nicht aus einem
 * Zeitstempel: Wer dieselbe Seite erneut veröffentlicht, überschreibt dasselbe
 * Objekt, statt den Speicher bei jedem Lauf ein weiteres Mal zu füllen.
 */
import { createHash } from "node:crypto";
import { safeFetch, SafeFetchError } from "./safeFetch";
import { storageConfigured, uploadImageToStorage } from "./supabaseStorage";

/** Wie in server/routes/media.ts – ein Maß für hochgeladene Bilder. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Mehr Bilder braucht keine Galerie, und jedes kostet einen Abruf. */
const MAX_IMAGES = 24;

/** Gleichzeitige Downloads. Höher bringt wenig und belastet die Quelle unnötig. */
const CONCURRENCY = 4;

/** Identisch zur Allowlist in server/routes/media.ts. */
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export interface GalleryImage {
  id: string;
  url: string;
  title?: string;
  alt?: string;
}

export interface IngestReport {
  /** Die Galerie mit ersetzten Adressen, in unveränderter Reihenfolge. */
  gallery: GalleryImage[];
  copied: number;
  /** Blieben auf der fremden Adresse, weil die Übernahme scheiterte. */
  failed: number;
  /** Waren bereits bei uns – erneutes Veröffentlichen kostet also nichts. */
  skipped: number;
  notes: string[];
}

/** Hosts, die schon uns gehören. Erkennt bereits übernommene Bilder wieder. */
const OWN_HOST_PATTERNS = ["supabase.co", "supabase.in", "maitr.de"];

export function isOwnImage(url: string): boolean {
  return OWN_HOST_PATTERNS.some((host) => url.includes(host));
}

/**
 * Stabiler Objektpfad aus der Quelladresse.
 * Der Nutzer steht im Pfad, damit Bilder verschiedener Konten nicht
 * ineinandergreifen; der Hash sorgt dafür, dass derselbe Ursprung immer
 * dasselbe Ziel bekommt.
 */
export function galleryObjectPath(
  userId: string,
  sourceUrl: string,
  extension: string,
): string {
  const hash = createHash("sha256").update(sourceUrl).digest("hex").slice(0, 24);
  return `${userId}/gallery/${hash}.${extension}`;
}

/**
 * Holt EIN Bild und legt es bei uns ab. Liefert die eigene Adresse.
 * Wirft, wenn es nicht klappt – der Aufrufer entscheidet, was das bedeutet.
 */
export async function ingestRemoteImage(
  sourceUrl: string,
  userId: string,
): Promise<string> {
  const { buffer, contentType } = await safeFetch(sourceUrl, {
    maxBytes: MAX_IMAGE_BYTES,
    timeoutMs: 15_000,
    // Nur Bilder. Ein HTML-Dokument unter einer .jpg-Adresse ist ein Hinweis
    // darauf, dass hier etwas anderes versucht wird.
    allowedContentTypes: ["image/"],
  });

  const extension = EXTENSION_BY_MIME[contentType];
  if (!extension) {
    throw new Error(`Nicht unterstütztes Bildformat: ${contentType}`);
  }

  return uploadImageToStorage(
    galleryObjectPath(userId, sourceUrl, extension),
    buffer,
    contentType,
  );
}

/**
 * Übernimmt eine ganze Galerie.
 *
 * Ein Fehlschlag verwirft NICHT die Veröffentlichung: Das betroffene Bild
 * behält seine ursprüngliche Adresse. Die Seite zeigt dann heute noch Bilder,
 * und die Oberfläche weist die verbliebenen fremden Bilder ohnehin aus. Die
 * Veröffentlichung daran scheitern zu lassen wäre die schlechtere Wahl – der
 * Nutzer verlöre alles wegen eines einzelnen unerreichbaren Bildes.
 */
export async function ingestGallery(
  gallery: GalleryImage[] | undefined | null,
  userId: string,
): Promise<IngestReport> {
  const items = Array.isArray(gallery) ? gallery : [];
  const report: IngestReport = {
    gallery: items,
    copied: 0,
    failed: 0,
    skipped: 0,
    notes: [],
  };

  if (!items.length) return report;

  if (!storageConfigured()) {
    report.notes.push(
      "Bildübernahme übersprungen: Supabase Storage ist nicht konfiguriert",
    );
    return report;
  }

  const toProcess = items.slice(0, MAX_IMAGES);
  if (items.length > MAX_IMAGES) {
    // Nicht stillschweigend abschneiden – wer 40 Bilder erwartet und 24
    // bekommt, soll den Grund erfahren.
    report.notes.push(
      `Nur die ersten ${MAX_IMAGES} von ${items.length} Bildern übernommen`,
    );
  }

  const result: GalleryImage[] = [...items];

  // In Schüben abarbeiten statt alle auf einmal: Ein Betrieb mit zwei Dutzend
  // Bildern soll die Quelle nicht mit gleichzeitigen Anfragen überfahren.
  for (let offset = 0; offset < toProcess.length; offset += CONCURRENCY) {
    const batch = toProcess.slice(offset, offset + CONCURRENCY);
    await Promise.all(
      batch.map(async (image, indexInBatch) => {
        const index = offset + indexInBatch;
        const source = image?.url ?? "";

        if (!/^https?:\/\//i.test(source)) return;
        if (isOwnImage(source)) {
          report.skipped++;
          return;
        }

        try {
          const ownUrl = await ingestRemoteImage(source, userId);
          result[index] = { ...image, url: ownUrl };
          report.copied++;
        } catch (err) {
          report.failed++;
          const why =
            err instanceof SafeFetchError
              ? err.reason
              : err instanceof Error
                ? err.message
                : "unbekannt";
          report.notes.push(`Bild nicht übernommen (${why}): ${source}`);
          // Adresse bleibt, wie sie war – das Bild ist heute noch erreichbar.
        }
      }),
    );
  }

  report.gallery = result;
  return report;
}
