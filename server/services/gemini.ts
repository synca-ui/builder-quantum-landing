/**
 * Texterkennung über Gemini – für Speisekarten als Foto oder PDF.
 *
 * Warum hier und nicht in n8n: Der dortige Zweig war unbrauchbar. Der
 * HTTP-Knoten stand auf responseFormat "arraybuffer" – einen Wert, den n8n
 * nicht kennt. Statt Binärdaten kam der Rumpf als roher String zurück, der
 * nachgelagerte Code-Knoten las $input.item.json.data (nicht vorhanden), warf,
 * fing den Fehler ab und lieferte einen leeren Text. Nachgewiesen an Ausführung
 * 632: 21.259.996 Zeichen im Eingang, 0 Zeichen im Ausgang, OCR-Knoten nie
 * ausgeführt. Dasselbe Muster steckte im Bild-Zweig.
 *
 * Hier ist die Erkennung versioniert, prüfbar und läuft auch, wenn n8n klemmt.
 *
 * Benötigte Umgebungsvariable: GEMINI_API_KEY (auf Railway setzen; das Repo ist
 * öffentlich, der Schlüssel gehört NICHT hinein).
 */

const API_BASE = "https://generativelanguage.googleapis.com";
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

/**
 * Ab dieser Rohgröße geht die Datei über die Files-API statt eingebettet.
 *
 * Gemini begrenzt die GESAMTE Anfrage; Base64 bläht um Faktor 4/3 auf. Bei
 * 7 MB roh sind das rund 9,3 MB Nutzlast – mit reichlich Abstand zur Grenze.
 * Die Speisekarte, an der das ursprünglich scheiterte, ist 21 MB groß und geht
 * damit zwingend über die Files-API.
 */
const INLINE_LIMIT_BYTES = 7 * 1024 * 1024;

/** Obergrenze insgesamt – darüber lohnt der Versuch nicht mehr. */
export const MAX_DOCUMENT_BYTES = 100 * 1024 * 1024;

const TRANSCRIBE_PROMPT = [
  "Transkribiere diese Speisekarte vollstaendig als reinen Text.",
  "Behalte Zeilenumbrueche, Kategorie-Ueberschriften und Preise exakt bei.",
  "Schreibe jedes Gericht mit seinem Preis in dieselbe Zeile.",
  "Gib NUR den Text aus, keine Erklaerungen, keine Formatierung, kein Markdown.",
].join(" ");

export function geminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function requireKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "Gemini ist nicht konfiguriert (GEMINI_API_KEY fehlt)",
    );
  }
  return key;
}

/**
 * Zieht den Text aus einer Gemini-Antwort.
 *
 * Exportiert, weil das die Stelle ist, an der sich Formatänderungen der API
 * zuerst zeigen – und weil sie sich ohne Netz prüfen lässt. Mehrere parts
 * werden zusammengesetzt: Bei langen Karten teilt Gemini die Antwort auf.
 */
export function extractTextFromResponse(payload: unknown): string {
  const candidates = (payload as any)?.candidates;
  if (!Array.isArray(candidates) || !candidates.length) return "";
  const parts = candidates[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
    .join("")
    .trim();
}

/** Entscheidet, welcher Weg für diese Größe gilt. Ohne Netz prüfbar. */
export function chooseUploadStrategy(bytes: number): "inline" | "files_api" | "too_large" {
  if (bytes > MAX_DOCUMENT_BYTES) return "too_large";
  return bytes > INLINE_LIMIT_BYTES ? "files_api" : "inline";
}

async function callGenerateContent(
  key: string,
  documentPart: Record<string, unknown>,
  timeoutMs: number,
): Promise<string> {
  const res = await fetch(
    `${API_BASE}/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        contents: [{ parts: [{ text: TRANSCRIBE_PROMPT }, documentPart] }],
        generationConfig: { temperature: 0, maxOutputTokens: 8192 },
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini antwortete mit HTTP ${res.status}: ${detail.slice(0, 300)}`);
  }

  return extractTextFromResponse(await res.json());
}

/**
 * Lädt eine große Datei über die Files-API hoch und liefert ihre URI.
 *
 * Dreischritt laut Gemini-Dokumentation: Start (liefert die Upload-Adresse im
 * Kopf X-Goog-Upload-URL), Upload mit "upload, finalize", danach warten, bis
 * der Zustand ACTIVE ist – vorher lehnt generateContent die Referenz ab.
 *
 * NICHT gegen die Primärdokumentation gegengeprüft (die Recherche dazu lief in
 * ein Sitzungslimit). Die Kopfzeilen entsprechen dem dokumentierten
 * resumable-Protokoll; beim ersten Lauf gegen echte Daten ist das zu bestätigen.
 */
async function uploadViaFilesApi(
  key: string,
  data: Buffer,
  mimeType: string,
  timeoutMs: number,
): Promise<{ uri: string; name: string }> {
  const start = await fetch(`${API_BASE}/upload/v1beta/files?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(data.length),
      "X-Goog-Upload-Header-Content-Type": mimeType,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({ file: { display_name: "speisekarte" } }),
  });

  if (!start.ok) {
    throw new Error(`Files-API: Start fehlgeschlagen (HTTP ${start.status})`);
  }

  const uploadUrl = start.headers.get("x-goog-upload-url");
  if (!uploadUrl) {
    throw new Error("Files-API: keine Upload-Adresse im Antwortkopf");
  }

  const upload = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(data.length),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    signal: AbortSignal.timeout(timeoutMs),
    body: new Uint8Array(data),
  });

  if (!upload.ok) {
    throw new Error(`Files-API: Upload fehlgeschlagen (HTTP ${upload.status})`);
  }

  const payload: any = await upload.json();
  const file = payload?.file ?? payload;
  const uri = file?.uri;
  const name = file?.name;
  if (!uri || !name) {
    throw new Error("Files-API: Antwort enthielt keine Datei-URI");
  }

  // Große PDFs werden erst verarbeitet. Vor ACTIVE weist generateContent die
  // Referenz mit einem wenig aussagekräftigen Fehler ab.
  let state = file?.state;
  const deadline = Date.now() + timeoutMs;
  while (state === "PROCESSING" && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    const check = await fetch(
      `${API_BASE}/v1beta/${name}?key=${encodeURIComponent(key)}`,
      { signal: AbortSignal.timeout(15_000) },
    );
    if (!check.ok) break;
    state = (await check.json())?.state;
  }

  if (state && state !== "ACTIVE") {
    throw new Error(`Files-API: Datei wurde nicht bereit (Zustand ${state})`);
  }

  return { uri, name };
}

/** Räumt hinter sich auf. Fehler hier sind nicht kritisch. */
async function deleteFile(key: string, name: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/v1beta/${name}?key=${encodeURIComponent(key)}`, {
      method: "DELETE",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // Dateien der Files-API verfallen ohnehin nach kurzer Zeit von selbst.
  }
}

export interface TranscribeOptions {
  timeoutMs?: number;
}

/**
 * Liest eine Speisekarte als Text aus – aus einem Bild oder einem PDF.
 * Wählt selbst zwischen eingebetteter Übertragung und Files-API.
 */
export async function transcribeDocument(
  data: Buffer,
  mimeType: string,
  options: TranscribeOptions = {},
): Promise<string> {
  const key = requireKey();
  const timeoutMs = options.timeoutMs ?? 90_000;
  const strategy = chooseUploadStrategy(data.length);

  if (strategy === "too_large") {
    throw new Error(
      `Datei zu groß für die Texterkennung (${Math.round(data.length / 1024 / 1024)} MB)`,
    );
  }

  if (strategy === "inline") {
    return callGenerateContent(
      key,
      { inline_data: { mime_type: mimeType, data: data.toString("base64") } },
      timeoutMs,
    );
  }

  const file = await uploadViaFilesApi(key, data, mimeType, timeoutMs);
  try {
    return await callGenerateContent(
      key,
      { file_data: { mime_type: mimeType, file_uri: file.uri } },
      timeoutMs,
    );
  } finally {
    await deleteFile(key, file.name);
  }
}
