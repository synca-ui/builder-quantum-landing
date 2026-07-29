/**
 * Texterkennung über die Anthropic-API.
 *
 * Zweiter Anbieter neben Gemini, damit die Speisekarten-Erkennung nicht an
 * einem einzelnen Kontingent hängt (der erste echte Lauf scheiterte an einem
 * Gemini-429). Claude liest PDFs und Bilder unmittelbar – für ein
 * abfotografiertes Speisekarten-PDF ohne Textebene ist das genau der Fall.
 *
 * Große Dateien gehen über die Files-API statt eingebettet: Eine eingebettete
 * Anfrage ist auf 32 MB begrenzt, und Base64 bläht um Faktor 4/3 auf – die
 * 21-MB-Karte, an der die Erkennung ursprünglich scheiterte, käme damit auf
 * rund 28 MB plus Rahmen und läge gefährlich nah an der Grenze. Über die
 * Files-API sind bis zu 500 MB möglich, und die Datei wird nur einmal
 * übertragen.
 *
 * Benötigte Umgebungsvariable: ANTHROPIC_API_KEY (auf Railway setzen; das Repo
 * ist öffentlich, der Schlüssel gehört NICHT hinein).
 */
import Anthropic, { toFile } from "@anthropic-ai/sdk";
import { OcrError, isOcrError, TRANSCRIBE_PROMPT, type OcrProvider } from "./types";

/** Der Endpunkt für hochgeladene Dateien ist noch als Beta gekennzeichnet. */
const FILES_BETA = "files-api-2025-04-14";

/**
 * Ab dieser Rohgröße wird hochgeladen statt eingebettet. Deutlich unter der
 * 32-MB-Grenze der eingebetteten Anfrage, damit der Base64-Aufschlag von 4/3
 * plus Rahmen bequem hineinpasst.
 */
const INLINE_LIMIT_BYTES = 8 * 1024 * 1024;

/** Grenze der Files-API. Darüber ist auch dieser Weg zu Ende. */
const MAX_BYTES = 500 * 1024 * 1024;

/**
 * Voreinstellung bewusst auf das stärkste Modell: Eine schlecht gelesene Karte
 * kostet den Nutzer mehr als die Differenz im Modellpreis. Über GEMINI-artige
 * Umgebungsvariablen umstellbar, falls Kosten wichtiger werden.
 */
const MODEL = process.env.ANTHROPIC_OCR_MODEL || "claude-opus-5";

/** Eine Karte transkribiert sich in wenigen tausend Token. */
const MAX_TOKENS = 16000;

export function anthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Setzt den Text aus der Antwort zusammen. Ohne Netz prüfbar. */
export function textFromMessage(message: unknown): string {
  const content = (message as { content?: unknown })?.content;
  if (!Array.isArray(content)) return "";
  return content
    .map((block: any) => (block?.type === "text" && typeof block.text === "string" ? block.text : ""))
    .join("")
    .trim();
}

/** Ordnet einen SDK-Fehler unserer Weiterschalt-Logik zu. */
export function classifyError(err: unknown): "quota" | "too_large" | "error" {
  const status = (err as { status?: number })?.status;
  if (status === 429) return "quota";
  // 413 heißt: zu groß für diesen Weg.
  if (status === 413) return "too_large";
  return "error";
}

export const anthropicProvider: OcrProvider = {
  name: "anthropic",

  isConfigured: anthropicConfigured,

  supportsSize(bytes: number) {
    return bytes <= MAX_BYTES;
  },

  async transcribe(data: Buffer, mimeType: string, timeoutMs: number): Promise<string> {
    if (!anthropicConfigured()) {
      throw new OcrError("ANTHROPIC_API_KEY fehlt", "not_configured", "anthropic");
    }
    if (data.length > MAX_BYTES) {
      throw new OcrError(
        `Datei zu groß (${Math.round(data.length / 1024 / 1024)} MB)`,
        "too_large",
        "anthropic",
      );
    }

    // Das SDK erwartet Millisekunden.
    const client = new Anthropic({ timeout: timeoutMs });
    const isPdf = mimeType === "application/pdf";

    try {
      const source = await buildSource(client, data, mimeType, isPdf);

      const message = await client.beta.messages.create(
        {
          model: MODEL,
          max_tokens: MAX_TOKENS,
          // Reine Abschrift – tiefes Nachdenken bringt hier nichts und kostet.
          // Thinking bleibt an (auf Opus 5 der empfohlene Weg), aber auf der
          // niedrigsten Stufe.
          output_config: { effort: "low" },
          betas: [FILES_BETA],
          messages: [
            {
              role: "user",
              content: [
                // Das Dokument vor den Text setzen – so verlangt es die
                // Dokumentation für Dateianhänge.
                source as any,
                { type: "text", text: TRANSCRIBE_PROMPT },
              ],
            },
          ],
        },
      );

      // Sicherheitsklassifizierer können ablehnen; dann ist content leer.
      if ((message as any).stop_reason === "refusal") {
        throw new OcrError(
          "Die Anfrage wurde abgelehnt",
          "error",
          "anthropic",
        );
      }

      return textFromMessage(message);
    } catch (err) {
      if (isOcrError(err)) throw err;
      const kind = classifyError(err);
      const detail = err instanceof Error ? err.message : "unbekannt";
      throw new OcrError(`Anthropic: ${detail}`, kind, "anthropic");
    }
  },
};

/**
 * Baut den Dokument- bzw. Bildblock – eingebettet oder über die Files-API.
 *
 * Der Blocktyp MUSS zum Dateityp passen: PDFs sind "document", Bilder sind
 * "image". Vertauscht lehnt die API ab.
 */
async function buildSource(
  client: Anthropic,
  data: Buffer,
  mimeType: string,
  isPdf: boolean,
): Promise<Record<string, unknown>> {
  if (data.length <= INLINE_LIMIT_BYTES) {
    const base64 = data.toString("base64");
    return isPdf
      ? {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64 },
        }
      : {
          type: "image",
          source: { type: "base64", media_type: mimeType, data: base64 },
        };
  }

  const uploaded = await client.beta.files.upload({
    file: await toFile(data, "speisekarte", { type: mimeType }),
    betas: [FILES_BETA],
  });

  return isPdf
    ? { type: "document", source: { type: "file", file_id: uploaded.id } }
    : { type: "image", source: { type: "file", file_id: uploaded.id } };
}
