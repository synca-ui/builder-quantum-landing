/**
 * Supabase Storage über die nackte REST-API — bewusst OHNE @supabase/supabase-js:
 * Der Server braucht wenige Operationen (Bucket sicherstellen, Objekt hochladen,
 * die Objekte eines Nutzers wieder löschen), dafür reicht fetch und der Build
 * schleppt kein SDK mit.
 *
 * Benötigte Env (auf Railway setzen!):
 *   SUPABASE_URL              – oder Fallback VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY – Service-Key, NIEMALS ins Repo oder Frontend
 *                               (das Repo ist öffentlich!)
 * Optional: SUPABASE_MEDIA_BUCKET (Default "media").
 */

const BUCKET = process.env.SUPABASE_MEDIA_BUCKET || "media";

export function storageConfigured(): boolean {
  return Boolean(
    (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function requireEnv(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase Storage ist nicht konfiguriert (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen)",
    );
  }
  return { url: url.replace(/\/+$/, ""), key };
}

/** Legt den public Bucket an; "existiert schon" ist kein Fehler. */
async function ensureBucket(url: string, key: string): Promise<void> {
  const resp = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    if (!/already exists|duplicate/i.test(text)) {
      throw new Error(`Bucket-Anlage fehlgeschlagen: ${resp.status} ${text}`);
    }
  }
}

/**
 * Lädt ein Bild hoch und liefert die öffentliche CDN-URL zurück.
 * Legt den Bucket beim ersten Upload automatisch an.
 */
export async function uploadImageToStorage(
  objectPath: string,
  data: Buffer,
  contentType: string,
): Promise<string> {
  const { url, key } = requireEnv();

  const doUpload = () =>
    fetch(`${url}/storage/v1/object/${BUCKET}/${objectPath}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": contentType,
        // Pfade enthalten einen Zeitstempel → Objekte sind faktisch immutable
        "Cache-Control": "public, max-age=31536000, immutable",
      },
      body: new Uint8Array(data),
    });

  let resp = await doUpload();
  if (!resp.ok) {
    const text = await resp.text();
    if (/bucket.*not.*found/i.test(text)) {
      await ensureBucket(url, key);
      resp = await doUpload();
    } else {
      throw new Error(`Upload fehlgeschlagen: ${resp.status} ${text}`);
    }
  }
  if (!resp.ok) {
    throw new Error(`Upload fehlgeschlagen: ${resp.status} ${await resp.text()}`);
  }

  return `${url}/storage/v1/object/public/${BUCKET}/${objectPath}`;
}

/* ── Löschen ────────────────────────────────────────────────────────────────
 *
 * Alles, was dieser Server ablegt, liegt unter dem Präfix "<userId>/":
 *   - server/routes/media.ts   → <userId>/<zeitstempel>-<zufall>.<ext>
 *   - server/services/imageIngest.ts → <userId>/gallery/<hash>.<ext>
 * Das Präfix ist damit der einzige Schlüssel, den die Kontolöschung braucht.
 *
 * Warum das nicht optional ist: Der Bucket wird oben mit public: true angelegt
 * und die Objekte werden mit "max-age=31536000, immutable" ausgeliefert. Wer
 * eine dieser Adressen einmal hat, kommt ohne Anmeldung an das Bild — und
 * Zwischenspeicher geben es noch lange danach heraus. Ein gelöschtes Konto,
 * dessen Fotos weiter öffentlich abrufbar sind, ist keine Löschung.
 */

/** Ein Eintrag aus der Auflistung. Ordner kommen ohne id zurück. */
interface StorageEntry {
  name?: string;
  id?: string | null;
}

/** Supabase liefert höchstens so viele Einträge pro Aufruf zurück. */
const LIST_PAGE_SIZE = 100;

/** So viele Objektnamen gehen in EINEN Löschaufruf. */
const DELETE_BATCH_SIZE = 100;

/**
 * Sicherung gegen eine Auflistung, die nicht endet (z.B. weil der Dienst den
 * offset ignoriert). Lieber ein lauter Fehler als eine Schleife, die den
 * Löschaufruf für immer offen hält.
 */
const MAX_OBJECTS = 20_000;

/**
 * Eine Ebene auflisten. Liefert [] statt zu werfen, wenn es den Bucket nie gab —
 * dann kann dort auch nichts liegen.
 */
async function listPage(
  url: string,
  key: string,
  prefix: string,
  offset: number,
): Promise<StorageEntry[]> {
  const resp = await fetch(`${url}/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prefix,
      limit: LIST_PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" },
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    if (/bucket.*not.*found/i.test(text) || resp.status === 404) return [];
    throw new Error(`Auflisten fehlgeschlagen: ${resp.status} ${text}`);
  }

  const body = await resp.json();
  // Ein Fehlerobjekt statt einer Liste wäre ein stiller Fehlschlag — und der
  // Aufrufer würde daraus "es lag nichts da" lesen. Also melden.
  if (!Array.isArray(body)) {
    throw new Error(
      `Auflisten lieferte kein Verzeichnis: ${JSON.stringify(body).slice(0, 200)}`,
    );
  }
  return body as StorageEntry[];
}

/**
 * Alle Objektnamen unter einem Präfix — seitenweise UND über Unterordner hinweg.
 *
 * Beides ist nötig: Ein Aufruf liefert nur LIST_PAGE_SIZE Einträge (ein Betrieb
 * mit Galerie kommt darüber), und Supabase listet je Ebene — "<userId>/gallery"
 * taucht als Ordner auf, nicht als Objekt. Ohne den Abstieg blieben genau die
 * übernommenen Galeriebilder liegen.
 */
async function listAllObjects(
  url: string,
  key: string,
  rootPrefix: string,
): Promise<string[]> {
  const objects: string[] = [];
  const folders: string[] = [rootPrefix];

  while (folders.length > 0) {
    const folder = folders.shift()!;
    let offset = 0;

    for (;;) {
      const page = await listPage(url, key, folder, offset);

      for (const entry of page) {
        if (!entry?.name) continue;
        const path = `${folder}/${entry.name}`;
        // Ordner haben keine id (Supabase gruppiert sie pro Ebene zusammen).
        if (entry.id === null || entry.id === undefined) folders.push(path);
        else objects.push(path);
      }

      // Objekte UND Ordner zählen mit: Ein Dienst, der immer wieder dieselbe
      // Ordnerseite zurückgibt, dreht sonst ewig, ohne je ein Objekt zu finden.
      if (objects.length + folders.length > MAX_OBJECTS) {
        throw new Error(
          `Mehr als ${MAX_OBJECTS} Einträge unter "${rootPrefix}/" — abgebrochen`,
        );
      }

      // Eine nicht volle Seite ist die letzte.
      if (page.length < LIST_PAGE_SIZE) break;
      offset += page.length;
    }
  }

  return objects;
}

export interface MediaDeletionResult {
  /** Wie viele Objekte tatsächlich entfernt wurden. */
  deleted: number;
  /** true = Storage ist gar nicht konfiguriert, es wurde nichts versucht. */
  skipped: boolean;
}

/**
 * Löscht ALLE Objekte, die unter "<userId>/" liegen.
 *
 * Wirft, wenn das Löschen scheitert. Ein "war halt nicht möglich" darf hier
 * nicht stillschweigend durchgehen: Der Aufrufer (die Kontolöschung) muss
 * entscheiden können, ob er den restlichen Vorgang überhaupt startet.
 *
 * Nicht konfigurierter Storage ist ausdrücklich KEIN Fehler: Ohne
 * SUPABASE_SERVICE_ROLE_KEY wirft schon uploadImageToStorage, es kann also gar
 * nichts hochgeladen worden sein. Ergebnis: skipped, und der Aufrufer läuft
 * weiter.
 */
export async function deleteUserMedia(
  userId: string,
): Promise<MediaDeletionResult> {
  // Der Präfix ist der einzige Schutz davor, fremde Objekte zu treffen. Eine
  // leere oder auffällige ID würde zu einer Auflistung des GANZEN Buckets
  // führen und damit die Bilder aller Nutzer löschen. Die IDs sind UUIDs aus
  // der Datenbank; alles andere wird hier abgewiesen statt ausgeführt.
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(userId)) {
    throw new Error("Ungültige Nutzer-ID für die Medienlöschung");
  }

  if (!storageConfigured()) return { deleted: 0, skipped: true };

  const { url, key } = requireEnv();
  const objects = await listAllObjects(url, key, userId);
  if (objects.length === 0) return { deleted: 0, skipped: false };

  // In Schüben: "prefixes" ist trotz des Namens eine Liste exakter Objektnamen,
  // und eine Anfrage mit tausenden Einträgen läuft dem Dienst in den Timeout.
  //
  // WICHTIG — hier lag der Fehler der ersten Fassung: Ein HTTP 200 bedeutet NICHT,
  // dass die genannten Objekte weg sind. Der Dienst antwortet mit der Liste der
  // tatsächlich entfernten Objekte; Namen, die er nicht findet, fehlen darin
  // einfach. Wer nur `resp.ok` prüft, meldet eine Löschung, die nie stattfand –
  // und die Kontolöschung räumt danach Datenbank und Clerk ab, womit das Präfix
  // <userId>/ nie wieder adressierbar ist. Deshalb wird gezählt, was zurückkommt.
  let entfernt = 0;
  for (let i = 0; i < objects.length; i += DELETE_BATCH_SIZE) {
    const batch = objects.slice(i, i + DELETE_BATCH_SIZE);
    const resp = await fetch(`${url}/storage/v1/object/${BUCKET}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefixes: batch }),
    });

    if (!resp.ok) {
      throw new Error(
        `Löschen fehlgeschlagen: ${resp.status} ${await resp.text()}`,
      );
    }

    // Antwortet der Dienst wider Erwarten nicht mit einer Liste, wird NICHT
    // optimistisch gezählt – die Schlusskontrolle unten entscheidet dann.
    const body: unknown = await resp.json().catch(() => null);
    if (Array.isArray(body)) entfernt += body.length;
  }

  // Schlusskontrolle: erneut auflisten. Das ist der einzige Beleg, der zählt –
  // er misst den Zustand, nicht die Absicht. Ein Rest bedeutet, dass Objekte
  // stehen geblieben sind, und der Aufrufer muss das erfahren, bevor er die
  // Datenbank leert.
  const rest = await listAllObjects(url, key, userId);
  if (rest.length > 0) {
    throw new Error(
      `Medienlöschung unvollständig: ${rest.length} von ${objects.length} Objekt(en) ` +
        `liegen weiterhin unter "${userId}/". Erstes verbliebenes: ${rest[0]}`,
    );
  }

  // Erst hier ist belegt, dass nichts mehr da ist. Gemeldet wird, was der Dienst
  // bestätigt hat; weicht das von der Ausgangszahl ab, war ein Teil schon vorher
  // weg – das ist kein Fehler, aber es soll sichtbar sein.
  if (entfernt !== objects.length) {
    console.warn(
      `[storage] Präfix "${userId}/" ist leer, der Dienst bestätigte aber ` +
        `${entfernt} statt ${objects.length} Objekte.`,
    );
  }

  return { deleted: objects.length, skipped: false };
}
