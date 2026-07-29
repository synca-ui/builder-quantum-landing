/**
 * Texterkennung über Gemini.
 *
 * Erster Anbieter der Kette. Der erste echte Lauf gegen die 21-MB-Karte des
 * Kleinen Kiepenkerl kam bis hierher durch und scheiterte am Freikontingent
 * (HTTP 429) – ein Kontingent-, kein Technikproblem. Genau dafür gibt es
 * server/services/ocr/index.ts: Ist das Kontingent erschöpft, übernimmt der
 * nächste Anbieter.
 *
 * Der Schlüssel geht als Kopfzeile x-goog-api-key hinaus, nicht als
 * Adressparameter. Die Dokumentation nennt für die Files-API ausdrücklich die
 * Kopfzeile; nebenbei taucht ein Schlüssel in einer Adresse in Protokollen und
 * Fehlermeldungen auf, was er nicht sollte.
 *
 * Benötigte Umgebungsvariable: GEMINI_API_KEY.
 */
import { OcrError, TRANSCRIBE_PROMPT, type OcrProvider } from "./types";

const API_BASE = "https://generativelanguage.googleapis.com";
/**
 * gemini-2.0-flash ist abgekündigt (Abschaltung 1. Juni 2026) – als Vorgabe
 * eine Zeitbombe. gemini-2.5-flash-lite kostet dasselbe ($0,10 rein /
 * $0,40 raus je Million Token) und ist der aktuelle Stand.
 */
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

/**
 * Ab dieser Rohgröße über die Files-API statt eingebettet.
 *
 * Die eingebettete Anfrage war lange auf 20 MB begrenzt (inzwischen in Teilen
 * höher, je nach Dateityp und Stand der API). Base64 bläht um Faktor 4/3 auf;
 * 7 MB roh ergeben rund 9,3 MB und liegen unter jeder dieser Grenzen. Die
 * 21-MB-Karte geht damit zwingend über die Files-API – und das ist auch unter
 * der neueren, höheren Grenze der zuverlässigere Weg.
 */
const INLINE_LIMIT_BYTES = 7 * 1024 * 1024;

/** Grenze der Files-API. */
const MAX_BYTES = 2 * 1024 * 1024 * 1024;

export function geminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * Zieht den Text aus einer Gemini-Antwort.
 *
 * Exportiert, weil hier sich Formatänderungen der API zuerst zeigen – und weil
 * es sich ohne Netz prüfen lässt. Mehrere parts werden zusammengesetzt: Bei
 * langen Karten teilt Gemini die Antwort auf, und nur den ersten zu lesen
 * schnitte die halbe Speisekarte ab.
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
export function chooseUploadStrategy(
  bytes: number,
): "inline" | "files_api" | "too_large" {
  if (bytes > MAX_BYTES) return "too_large";
  return bytes > INLINE_LIMIT_BYTES ? "files_api" : "inline";
}

function authHeaders(key: string): Record<string, string> {
  return { "x-goog-api-key": key };
}

async function callGenerateContent(
  key: string,
  documentPart: Record<string, unknown>,
  timeoutMs: number,
): Promise<string> {
  const res = await fetch(`${API_BASE}/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { ...authHeaders(key), "Content-Type": "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      contents: [{ parts: [{ text: TRANSCRIBE_PROMPT }, documentPart] }],
      generationConfig: { temperature: 0, maxOutputTokens: 8192 },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new OcrError(
      `Gemini antwortete mit HTTP ${res.status}: ${detail.slice(0, 200)}`,
      // 429 = Kontingent erschöpft, 403 oft ebenfalls kontingentbedingt.
      res.status === 429 ? "quota" : res.status === 413 ? "too_large" : "error",
      "gemini",
    );
  }

  return extractTextFromResponse(await res.json());
}

/**
 * Lädt eine große Datei über die Files-API hoch und liefert ihre URI.
 *
 * Dreischritt nach der Dokumentation: Start (die Upload-Adresse kommt im Kopf
 * X-Goog-Upload-URL zurück), Upload mit "upload, finalize", danach warten, bis
 * der Zustand ACTIVE ist – vorher weist generateContent die Referenz ab.
 */
async function uploadViaFilesApi(
  key: string,
  data: Buffer,
  mimeType: string,
  timeoutMs: number,
): Promise<{ uri: string; name: string }> {
  const start = await fetch(`${API_BASE}/upload/v1beta/files`, {
    method: "POST",
    headers: {
      ...authHeaders(key),
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
    throw new OcrError(
      `Files-API: Start fehlgeschlagen (HTTP ${start.status})`,
      start.status === 429 ? "quota" : "error",
      "gemini",
    );
  }

  const uploadUrl = start.headers.get("x-goog-upload-url");
  if (!uploadUrl) {
    throw new OcrError(
      "Files-API: keine Upload-Adresse im Antwortkopf",
      "error",
      "gemini",
    );
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
    throw new OcrError(
      `Files-API: Upload fehlgeschlagen (HTTP ${upload.status})`,
      upload.status === 429 ? "quota" : "error",
      "gemini",
    );
  }

  const payload: any = await upload.json();
  const file = payload?.file ?? payload;
  if (!file?.uri || !file?.name) {
    throw new OcrError(
      "Files-API: Antwort enthielt keine Datei-URI",
      "error",
      "gemini",
    );
  }

  // Große PDFs werden erst verarbeitet. Vor ACTIVE weist generateContent die
  // Referenz mit einer wenig aussagekräftigen Meldung ab.
  let state = file.state;
  const deadline = Date.now() + timeoutMs;
  while (state === "PROCESSING" && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    const check = await fetch(`${API_BASE}/v1beta/${file.name}`, {
      headers: authHeaders(key),
      signal: AbortSignal.timeout(15_000),
    });
    if (!check.ok) break;
    state = (await check.json())?.state;
  }

  if (state && state !== "ACTIVE") {
    throw new OcrError(
      `Files-API: Datei wurde nicht bereit (Zustand ${state})`,
      "error",
      "gemini",
    );
  }

  return { uri: file.uri, name: file.name };
}

/** Räumt hinter sich auf. Fehler hier sind nicht kritisch. */
async function deleteFile(key: string, name: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/v1beta/${name}`, {
      method: "DELETE",
      headers: authHeaders(key),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // Dateien der Files-API verfallen ohnehin von selbst.
  }
}

export const geminiProvider: OcrProvider = {
  name: "gemini",

  isConfigured: geminiConfigured,

  supportsSize(bytes: number) {
    return chooseUploadStrategy(bytes) !== "too_large";
  },

  async transcribe(data: Buffer, mimeType: string, timeoutMs: number): Promise<string> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new OcrError("GEMINI_API_KEY fehlt", "not_configured", "gemini");
    }

    const strategy = chooseUploadStrategy(data.length);
    if (strategy === "too_large") {
      throw new OcrError(
        `Datei zu groß (${Math.round(data.length / 1024 / 1024)} MB)`,
        "too_large",
        "gemini",
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
  },
};
