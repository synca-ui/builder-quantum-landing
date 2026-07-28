/**
 * Supabase Storage über die nackte REST-API — bewusst OHNE @supabase/supabase-js:
 * Der Server braucht genau zwei Operationen (Bucket sicherstellen, Objekt
 * hochladen), dafür reicht fetch und der Build schleppt kein SDK mit.
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
