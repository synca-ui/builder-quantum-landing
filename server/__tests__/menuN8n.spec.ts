import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { extractMenuViaN8n, menuN8nConfigured } from "../services/menuN8n";

/**
 * Alles hier läuft ohne Netz: `fetch` wird ersetzt.
 *
 * Geprüft wird nicht, ob n8n eine Karte lesen kann — das hängt an Gemini und
 * ist nur gegen die echte Instanz zu messen. Geprüft wird das, was diesen Weg
 * gefährlich machen würde: dass ein Ausfall von n8n die Erkennung NICHT
 * abbricht, sondern `null` bzw. eine leere Liste mit Begründung liefert, damit
 * die eigene Kette übernehmen kann.
 *
 * Der Fall ist real: Beim ersten Lauf gegen die Instanz kam
 * "Credentials could not be decrypted" zurück — der Flow antwortete mit
 * HTTP 200 und `ok:false`. Ohne diese Behandlung wäre das eine leere
 * Speisekarte gewesen, die wie ein erfolgreicher Lauf aussieht.
 */
const URL_ALT = process.env.N8N_MENU_WEBHOOK_URL;
const WEBHOOK = "https://n8n.example.test/webhook/speisekarte-ocr";
const BILD = Buffer.from("nicht wirklich ein bild");

function antwortMit(status: number, koerper: string) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => koerper,
  } as unknown as Response);
}

beforeEach(() => {
  process.env.N8N_MENU_WEBHOOK_URL = WEBHOOK;
  delete process.env.N8N_MENU_MODEL;
});

afterEach(() => {
  vi.restoreAllMocks();
  if (URL_ALT === undefined) delete process.env.N8N_MENU_WEBHOOK_URL;
  else process.env.N8N_MENU_WEBHOOK_URL = URL_ALT;
});

describe("menuN8nConfigured", () => {
  it("ist ohne N8N_MENU_WEBHOOK_URL aus", () => {
    delete process.env.N8N_MENU_WEBHOOK_URL;
    expect(menuN8nConfigured()).toBe(false);
  });

  it("ist mit gesetzter Adresse an", () => {
    expect(menuN8nConfigured()).toBe(true);
  });
});

describe("extractMenuViaN8n", () => {
  it("fragt gar nicht erst, wenn keine Adresse gesetzt ist", async () => {
    delete process.env.N8N_MENU_WEBHOOK_URL;
    const holen = antwortMit(200, "{}");
    vi.stubGlobal("fetch", holen);

    expect(await extractMenuViaN8n(BILD, "image/jpeg")).toBeNull();
    expect(holen).not.toHaveBeenCalled();
  });

  it("formt Gerichte und Legende in unsere Form um", async () => {
    vi.stubGlobal(
      "fetch",
      antwortMit(
        200,
        JSON.stringify({
          ok: true,
          gerichte: [
            {
              name: "Wiener Schnitzel",
              preis: "18,90",
              kategorie: "Hauptgerichte",
              variante_von: "",
              beschreibung: "dazu Pommes",
              allergene: ["A1", "F"],
            },
          ],
          allergenLegende: [{ kuerzel: "a1", bedeutung: "Weizen" }],
          diagnostics: ["n8n: 1 Gerichte"],
        }),
      ),
    );

    const ergebnis = await extractMenuViaN8n(BILD, "image/jpeg", "karte.jpg");

    expect(ergebnis).not.toBeNull();
    expect(ergebnis!.items).toHaveLength(1);
    expect(ergebnis!.items[0].name).toBe("Wiener Schnitzel");
    // Punkt als Dezimaltrenner und kleingeschriebene Kürzel sind die Zusage von
    // zuGerichten() — dieselbe Umformung wie beim eigenen Modellaufruf.
    expect(ergebnis!.items[0].price).toBe("18.90");
    expect(ergebnis!.items[0].allergens).toEqual(["a1", "f"]);
    expect(ergebnis!.allergenLegend).toEqual({ a1: "Weizen" });
    expect(ergebnis!.diagnostics).toContain("n8n: 1 Gerichte");
  });

  it("schickt Dateiname, Typ und Base64 an den Flow", async () => {
    const holen = antwortMit(200, JSON.stringify({ ok: true, gerichte: [] }));
    vi.stubGlobal("fetch", holen);

    await extractMenuViaN8n(BILD, "application/pdf", "speisekarte.pdf");

    const [adresse, optionen] = holen.mock.calls[0] as [string, RequestInit];
    expect(adresse).toBe(WEBHOOK);
    const gesendet = JSON.parse(String(optionen.body));
    expect(gesendet.dateiname).toBe("speisekarte.pdf");
    expect(gesendet.mimeType).toBe("application/pdf");
    expect(Buffer.from(gesendet.base64, "base64").toString()).toBe(BILD.toString());
    // Ohne N8N_MENU_MODEL bestimmt der Flow das Modell — kein leeres Feld, das
    // dort eine Vorgabe überschreiben würde.
    expect(gesendet).not.toHaveProperty("modell");
    // Dasselbe beim Ausweis: ohne gesetztes Geheimnis kein leeres token-Feld,
    // sonst prüfte der Flow gegen einen Leerstring.
    expect(gesendet).not.toHaveProperty("token");
  });

  it("weist sich mit N8N_MENU_TOKEN aus, wenn das Geheimnis gesetzt ist", async () => {
    const holen = antwortMit(200, JSON.stringify({ ok: true, gerichte: [] }));
    vi.stubGlobal("fetch", holen);
    process.env.N8N_MENU_TOKEN = "streng-geheim";

    try {
      await extractMenuViaN8n(BILD, "image/jpeg");

      const [, optionen] = holen.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(String(optionen.body)).token).toBe("streng-geheim");
    } finally {
      delete process.env.N8N_MENU_TOKEN;
    }
  });

  it("gibt ok:false mit Begründung weiter, statt eine leere Karte zu melden", async () => {
    vi.stubGlobal(
      "fetch",
      antwortMit(
        200,
        JSON.stringify({
          ok: false,
          gerichte: [],
          diagnostics: ["n8n: Gemini meldet 429 RESOURCE_EXHAUSTED"],
          fehler: "Dateityp text/plain wird nicht gelesen",
        }),
      ),
    );

    const ergebnis = await extractMenuViaN8n(BILD, "text/plain");

    expect(ergebnis!.items).toEqual([]);
    expect(ergebnis!.diagnostics.join(" ")).toMatch(/429/);
    expect(ergebnis!.diagnostics.join(" ")).toMatch(/text\/plain/);
  });

  it("erkennt die Abweisung am Tor als solche, nicht als leere Karte", async () => {
    // Genau das antwortet n8n, wenn onlyRunIf nicht zutrifft: HTTP 200, kein
    // ok, keine diagnostics. Verifiziert gegen die Instanz am 31.08.2026.
    vi.stubGlobal("fetch", antwortMit(200, '{"message":"Webhook call received"}'));

    const ergebnis = await extractMenuViaN8n(BILD, "image/png");

    expect(ergebnis!.items).toEqual([]);
    expect(ergebnis!.diagnostics.join(" ")).toMatch(/N8N_MENU_TOKEN/);
  });

  it("überlebt einen Proxy-Fehler, der HTML statt JSON liefert", async () => {
    vi.stubGlobal("fetch", antwortMit(200, "<html>502 Bad Gateway</html>"));

    const ergebnis = await extractMenuViaN8n(BILD, "image/png");

    expect(ergebnis!.items).toEqual([]);
    expect(ergebnis!.diagnostics.join(" ")).toMatch(/kein JSON/);
  });

  it("überlebt einen nicht aktiven Flow (HTTP 404)", async () => {
    vi.stubGlobal("fetch", antwortMit(404, '{"message":"webhook not registered"}'));

    const ergebnis = await extractMenuViaN8n(BILD, "image/png");

    expect(ergebnis!.items).toEqual([]);
    expect(ergebnis!.diagnostics.join(" ")).toMatch(/HTTP 404/);
  });

  it("überlebt einen Netzfehler, statt die Erkennung abzubrechen", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

    const ergebnis = await extractMenuViaN8n(BILD, "image/png");

    expect(ergebnis!.items).toEqual([]);
    expect(ergebnis!.diagnostics.join(" ")).toMatch(/nicht erreichbar/);
  });

  it("schickt zu große Dateien gar nicht erst los", async () => {
    const holen = antwortMit(200, "{}");
    vi.stubGlobal("fetch", holen);
    process.env.N8N_MENU_MAX_BYTES = "1024";

    try {
      const gross = Buffer.alloc(2048, 7);
      const ergebnis = await extractMenuViaN8n(gross, "application/pdf");

      expect(holen).not.toHaveBeenCalled();
      expect(ergebnis!.diagnostics.join(" ")).toMatch(/Grenze/);
    } finally {
      delete process.env.N8N_MENU_MAX_BYTES;
    }
  });
});
