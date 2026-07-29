import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OcrError } from "../services/ocr/types";
import { classifyError, textFromMessage } from "../services/ocr/anthropic";

/**
 * Die Rückfallkette ist die Antwort auf einen echten Ausfall: Der erste Lauf
 * gegen die 21-MB-Karte kam technisch durch und scheiterte am Freikontingent
 * von Gemini (HTTP 429). Die Speisekarte ist der wichtigste Einzelposten des
 * automatischen Modus – sie darf nicht an einem einzelnen Kontingent hängen.
 *
 * Geprüft wird die Kette gegen erfundene Anbieter: So bleiben die Tests ohne
 * Netz, ohne Schlüssel und ohne Kosten, und sie prüfen genau das, was die Kette
 * ausmacht – wann weitergeschaltet wird und wann nicht.
 */

const ENV_KEYS = ["OCR_PROVIDER_ORDER", "GEMINI_API_KEY", "ANTHROPIC_API_KEY"];
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  vi.resetModules();
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k]!;
  }
  vi.restoreAllMocks();
});

/**
 * Lädt die Kette mit ausgetauschten Anbietern.
 * vi.doMock statt vi.mock, weil die Ersetzung je Test unterschiedlich ist.
 */
async function loadChain(providers: {
  gemini: Partial<Record<string, any>>;
  anthropic: Partial<Record<string, any>>;
}) {
  vi.doMock("../services/ocr/gemini", () => ({
    geminiProvider: { name: "gemini", ...providers.gemini },
    geminiConfigured: () => true,
    chooseUploadStrategy: () => "inline",
    extractTextFromResponse: () => "",
  }));
  vi.doMock("../services/ocr/anthropic", () => ({
    anthropicProvider: { name: "anthropic", ...providers.anthropic },
    anthropicConfigured: () => true,
    textFromMessage: () => "",
  }));
  return import("../services/ocr/index");
}

const working = (text: string) => ({
  isConfigured: () => true,
  supportsSize: () => true,
  transcribe: vi.fn(async () => text),
});

const failing = (kind: "quota" | "error" | "too_large", name: string) => ({
  isConfigured: () => true,
  supportsSize: () => true,
  transcribe: vi.fn(async () => {
    throw new OcrError(`${name} kaputt`, kind, name);
  }),
});

describe("Rückfallkette", () => {
  it("nimmt den ersten Anbieter, wenn der liefert", async () => {
    const anthropic = working("sollte nicht laufen");
    const { transcribeDocument } = await loadChain({
      gemini: working("Schnitzel 18,90"),
      anthropic,
    });

    const result = await transcribeDocument(Buffer.from("x"), "application/pdf");
    expect(result.provider).toBe("gemini");
    expect(result.text).toBe("Schnitzel 18,90");
    expect(anthropic.transcribe).not.toHaveBeenCalled();
  });

  it("schaltet bei erschöpftem Kontingent weiter – der eigentliche Anlass", async () => {
    const { transcribeDocument } = await loadChain({
      gemini: failing("quota", "gemini"),
      anthropic: working("Töttchen 14,50"),
    });

    const result = await transcribeDocument(Buffer.from("x"), "application/pdf");
    expect(result.provider).toBe("anthropic");
    expect(result.text).toBe("Töttchen 14,50");
    // Der Grund bleibt sichtbar, statt stillschweigend verschluckt zu werden.
    expect(result.attempts.join(" ")).toMatch(/quota/);
  });

  it("schaltet auch bei allgemeinen Störungen weiter", async () => {
    const { transcribeDocument } = await loadChain({
      gemini: failing("error", "gemini"),
      anthropic: working("Pannfisch 21,00"),
    });
    expect((await transcribeDocument(Buffer.from("x"), "image/jpeg")).provider).toBe(
      "anthropic",
    );
  });

  it("überspringt einen Anbieter, der die Größe nicht verträgt", async () => {
    const gemini = {
      isConfigured: () => true,
      supportsSize: () => false,
      transcribe: vi.fn(),
    };
    const { transcribeDocument } = await loadChain({
      gemini,
      anthropic: working("ok"),
    });

    const result = await transcribeDocument(Buffer.alloc(10), "application/pdf");
    expect(result.provider).toBe("anthropic");
    // Gar nicht erst versucht – kein sinnloser Aufruf, keine Kosten.
    expect(gemini.transcribe).not.toHaveBeenCalled();
    expect(result.attempts.join(" ")).toMatch(/zu groß/);
  });

  it("überspringt einen nicht eingerichteten Anbieter, ohne ihn aufzurufen", async () => {
    const gemini = {
      isConfigured: () => false,
      supportsSize: () => true,
      transcribe: vi.fn(),
    };
    const { transcribeDocument } = await loadChain({
      gemini,
      anthropic: working("ok"),
    });

    const result = await transcribeDocument(Buffer.from("x"), "application/pdf");
    expect(result.provider).toBe("anthropic");
    expect(gemini.transcribe).not.toHaveBeenCalled();
  });

  it("wertet ein leeres Ergebnis als Fehlschlag und probiert weiter", async () => {
    // Eine Karte, aus der ein Anbieter keinen Buchstaben zieht, ist bei einem
    // anderen einen Versuch wert.
    const { transcribeDocument } = await loadChain({
      gemini: working("   "),
      anthropic: working("Gulasch 16,90"),
    });

    const result = await transcribeDocument(Buffer.from("x"), "application/pdf");
    expect(result.provider).toBe("anthropic");
    expect(result.attempts.join(" ")).toMatch(/leeres Ergebnis/);
  });

  it("wirft erst, wenn alle durch sind – und nennt jeden Grund", async () => {
    const { transcribeDocument } = await loadChain({
      gemini: failing("quota", "gemini"),
      anthropic: failing("error", "anthropic"),
    });

    await expect(
      transcribeDocument(Buffer.from("x"), "application/pdf"),
    ).rejects.toThrow(/gemini.*anthropic/s);
  });

  it("befolgt die konfigurierte Reihenfolge", async () => {
    process.env.OCR_PROVIDER_ORDER = "anthropic,gemini";
    const { transcribeDocument } = await loadChain({
      gemini: working("gemini-text"),
      anthropic: working("anthropic-text"),
    });

    expect((await transcribeDocument(Buffer.from("x"), "image/png")).provider).toBe(
      "anthropic",
    );
  });

  it("übergeht unbekannte Namen in der Reihenfolge, statt daran zu scheitern", async () => {
    process.env.OCR_PROVIDER_ORDER = "gibtsnicht,anthropic";
    const { transcribeDocument, providerOrder } = await loadChain({
      gemini: working("a"),
      anthropic: working("b"),
    });

    expect(providerOrder().map((p) => p.name)).toEqual(["anthropic"]);
    expect((await transcribeDocument(Buffer.from("x"), "image/png")).provider).toBe(
      "anthropic",
    );
  });

  it("meldet, welche Anbieter bereitstehen", async () => {
    const { configuredProviders, ocrConfigured } = await loadChain({
      gemini: { isConfigured: () => false, supportsSize: () => true, transcribe: vi.fn() },
      anthropic: working("x"),
    });

    expect(configuredProviders()).toEqual(["anthropic"]);
    expect(ocrConfigured()).toBe(true);
  });

  it("meldet ehrlich, wenn gar nichts eingerichtet ist", async () => {
    const off = { isConfigured: () => false, supportsSize: () => true, transcribe: vi.fn() };
    const { configuredProviders, ocrConfigured } = await loadChain({
      gemini: off,
      anthropic: off,
    });

    expect(configuredProviders()).toEqual([]);
    expect(ocrConfigured()).toBe(false);
  });
});

describe("Anthropic-Anbieter: Auswertung ohne Netz", () => {
  it("ordnet ein erschöpftes Kontingent als quota ein", () => {
    // Nur so schaltet die Kette weiter statt abzubrechen.
    expect(classifyError({ status: 429 })).toBe("quota");
  });

  it("ordnet eine zu große Anfrage als too_large ein", () => {
    expect(classifyError({ status: 413 })).toBe("too_large");
  });

  it("ordnet alles Übrige als allgemeinen Fehler ein", () => {
    expect(classifyError({ status: 500 })).toBe("error");
    expect(classifyError(new Error("Netz weg"))).toBe("error");
  });

  it("setzt eine in Blöcke zerlegte Antwort zusammen", () => {
    expect(
      textFromMessage({
        content: [
          { type: "text", text: "Vorspeisen\n" },
          { type: "thinking", thinking: "" },
          { type: "text", text: "Suppe 5,50" },
        ],
      }),
    ).toBe("Vorspeisen\nSuppe 5,50");
  });

  it("kommt mit einer leeren oder unerwarteten Antwort klar", () => {
    expect(textFromMessage({})).toBe("");
    expect(textFromMessage(null)).toBe("");
    expect(textFromMessage({ content: [] })).toBe("");
  });
});
