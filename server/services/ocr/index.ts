/**
 * Texterkennung mit Rückfallkette.
 *
 * Die Speisekarte entscheidet über den Wert des automatischen Modus. Sie an
 * einem einzelnen Anbieter hängen zu lassen, hat sich sofort gerächt: Der erste
 * echte Lauf gegen die 21-MB-Karte kam technisch durch und scheiterte am
 * Freikontingent von Gemini (HTTP 429). Die Kette macht daraus einen
 * Weiterschalt statt eines Ausfalls.
 *
 * Reihenfolge über OCR_PROVIDER_ORDER steuerbar (kommagetrennt), Vorgabe
 * "gemini,anthropic": Gemini zuerst, weil dort ein Freikontingent existiert;
 * Anthropic als verlässlicher Zweiter.
 */
import { anthropicProvider } from "./anthropic";
import { geminiProvider } from "./gemini";
import { OcrError, isOcrError, type OcrProvider } from "./types";

export { OcrError } from "./types";
export type { OcrProvider, OcrFailureKind } from "./types";
export { geminiConfigured, chooseUploadStrategy, extractTextFromResponse } from "./gemini";
export { anthropicConfigured, textFromMessage } from "./anthropic";

const ALL_PROVIDERS: Record<string, OcrProvider> = {
  gemini: geminiProvider,
  anthropic: anthropicProvider,
};

const DEFAULT_ORDER = ["gemini", "anthropic"];

/** Obergrenze über alle Anbieter – darüber lohnt kein Versuch. */
export const MAX_DOCUMENT_BYTES = 500 * 1024 * 1024;

export function providerOrder(): OcrProvider[] {
  const raw = process.env.OCR_PROVIDER_ORDER;
  const names = raw
    ? raw.split(",").map((n) => n.trim().toLowerCase()).filter(Boolean)
    : DEFAULT_ORDER;
  // Unbekannte Namen still zu übergehen wäre schlecht – dann fiele ein Tippfehler
  // in der Konfiguration erst auf, wenn die Erkennung stumm nichts liefert.
  const unknown = names.filter((n) => !ALL_PROVIDERS[n]);
  if (unknown.length) {
    console.warn(
      `[OCR] Unbekannte Anbieter in OCR_PROVIDER_ORDER übergangen: ${unknown.join(", ")}`,
    );
  }
  return names.map((n) => ALL_PROVIDERS[n]).filter(Boolean);
}

/** Ist überhaupt ein Anbieter eingerichtet? */
export function ocrConfigured(): boolean {
  return providerOrder().some((p) => p.isConfigured());
}

/** Welche Anbieter stehen bereit – für den health-Endpunkt. */
export function configuredProviders(): string[] {
  return providerOrder()
    .filter((p) => p.isConfigured())
    .map((p) => p.name);
}

export interface TranscribeResult {
  text: string;
  /** Wer geliefert hat. */
  provider: string;
  /** Was unterwegs schiefging – für die Anzeige und die Fehlersuche. */
  attempts: string[];
}

export interface TranscribeOptions {
  timeoutMs?: number;
}

/**
 * Liest ein Dokument als Text aus und schaltet bei Bedarf weiter.
 *
 * Weitergeschaltet wird bei Kontingent, Größe, fehlender Einrichtung und
 * allgemeinen Störungen – also bei allem, was ein anderer Anbieter womöglich
 * kann. Ein leeres Ergebnis gilt ebenfalls als Fehlschlag: Eine Karte, aus der
 * ein Anbieter keinen einzigen Buchstaben zieht, ist bei einem anderen einen
 * Versuch wert.
 *
 * Wirft erst, wenn alle Anbieter durch sind – mit sämtlichen Gründen im Text,
 * damit der Nutzer nicht "Erkennung fehlgeschlagen" ohne Ursache sieht.
 */
export async function transcribeDocument(
  data: Buffer,
  mimeType: string,
  options: TranscribeOptions = {},
): Promise<TranscribeResult> {
  const timeoutMs = options.timeoutMs ?? 90_000;
  const attempts: string[] = [];
  const providers = providerOrder();

  if (!providers.length) {
    throw new OcrError("Kein Anbieter eingerichtet", "not_configured", "keiner");
  }

  for (const provider of providers) {
    if (!provider.isConfigured()) {
      attempts.push(`${provider.name}: nicht eingerichtet`);
      continue;
    }
    if (!provider.supportsSize(data.length)) {
      attempts.push(`${provider.name}: Datei zu groß`);
      continue;
    }

    try {
      const text = await provider.transcribe(data, mimeType, timeoutMs);
      if (text.trim()) {
        return { text, provider: provider.name, attempts };
      }
      attempts.push(`${provider.name}: leeres Ergebnis`);
    } catch (err) {
      const reason = isOcrError(err) ? `${err.kind} – ${err.message}` : String(err);
      attempts.push(`${provider.name}: ${reason}`);
      console.warn(`[OCR] ${provider.name} fehlgeschlagen: ${reason}`);
    }
  }

  throw new OcrError(
    `Kein Anbieter konnte die Datei lesen (${attempts.join(" | ")})`,
    "error",
    "kette",
  );
}
