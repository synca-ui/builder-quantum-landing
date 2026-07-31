// @vitest-environment node
/**
 * Regressionsschutz für die n8n-Workflows.
 *
 * Die Flows liegen bei n8n selbst, nicht in diesem Repo – Fehler darin fallen
 * deshalb erst auf, wenn ein Scrape schiefgeht. Die hier abgelegten Fassungen
 * sind der Stand, der nachweislich funktioniert. Dieser Test hält die Eigenschaften
 * fest, deren Verlust real Schaden angerichtet hat:
 *
 *  1. Die Zielseite (kleiner-kiepenkerl.de) antwortet mit HTTP 503, sobald der
 *     User-Agent die Zeichenfolge "n8n" enthält – gemessen: n8n -> 503/489 B,
 *     Chrome/curl/axios -> 200/161924 B. Ohne gesetzten Browser-User-Agent
 *     scheitert der komplette Einstieg.
 *  2. Der Code-Knoten las $("Webhook1").item.json.url, der Webhook liefert den
 *     Link aber unter .body.link. Dadurch war isSsl immer false und jede Seite
 *     verlor 10 Punkte.
 *  3. String.match() liefert ein ARRAY. Ohne [0] landete "{https://…}" als
 *     Postgres-Array-Literal in menuUrl – nachweisbar in der Produktionsdaten-
 *     bank – und der OCR-Zweig des Deep-Scrape bekam eine unbrauchbare URL.
 *
 * WICHTIG: Diese Dateien sind eine Kopie. Wer den Flow in n8n ändert, muss die
 * geänderte Fassung hier exportieren, sonst prüft der Test einen toten Stand.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const load = (file: string) =>
  JSON.parse(readFileSync(path.join(__dirname, file), "utf8"));

const entry = load("Entry-Flow.json");
const deep = load("Deep-Scrape-Flow.json");

const nodeByName = (flow: any, name: string) =>
  flow.nodes.find((n: any) => n.name === name);

/** Die beiden Knoten, die Binärdaten holen sollen – und es nie taten. */
const BINARY_FETCH_NODES = ["Fetch: PDF Binary", "Fetch: Bild Binary"];

const responseFormatOf = (node: any): string | undefined =>
  node?.parameters?.options?.response?.response?.responseFormat;

const userAgentOf = (node: any): string | undefined =>
  node?.parameters?.headerParameters?.parameters?.find(
    (h: any) => h.name?.toLowerCase() === "user-agent",
  )?.value;

/** Jeder Knoten, der eine FREMDE Seite lädt – im Gegensatz zu API-Aufrufen. */
const FETCHERS: Array<[string, any, string]> = [
  ["Entry-Flow", entry, "HTTP Request"],
  ["Deep-Scrape", deep, "Fetch: Website HTML"],
  ["Deep-Scrape", deep, "Fetch: Stylesheet"],
  ["Deep-Scrape", deep, "Fetch: Bild Binary"],
  ["Deep-Scrape", deep, "Fetch: Menü-Webseite"],
  ["Deep-Scrape", deep, "Fetch: PDF Binary"],
  ["Deep-Scrape", deep, "Fetch: Instagram"],
];

describe("n8n-Workflows", () => {
  it("beide Flows sind gültiges JSON mit Knoten", () => {
    expect(entry.nodes.length).toBeGreaterThan(0);
    expect(deep.nodes.length).toBeGreaterThan(0);
  });

  describe.each(FETCHERS)("%s / %s", (_flowName, flow, nodeName) => {
    const node = nodeByName(flow, nodeName);

    it("existiert", () => {
      expect(node, `Knoten "${nodeName}" fehlt`).toBeTruthy();
    });

    it("sendet einen Browser-User-Agent (sonst 503 durch die WAF)", () => {
      const ua = userAgentOf(node);
      expect(ua, `Kein User-Agent auf "${nodeName}"`).toBeTruthy();
      expect(ua!.toLowerCase()).not.toContain("n8n");
      expect(ua).toMatch(/mozilla/i);
    });

    it("wiederholt bei Fehlern", () => {
      expect(node.retryOnFail).toBe(true);
    });
  });

  describe("Entry-Flow: Code-Knoten", () => {
    const code: string = nodeByName(entry, "Code in JavaScript").parameters.jsCode;

    it("liest den Link aus dem Webhook-BODY, nicht aus .url", () => {
      expect(code).toContain("body?.link");
      expect(code).not.toMatch(/\$\("Webhook1"\)\.item\.json\.url\b/);
    });

    it("nimmt aus dem match()-Array das erste Element", () => {
      const line = code.split("\n").find((l) => l.includes("const menuUrl ="))!;
      expect(line).toContain("|| [])[0]");
    });

    it("schreibt menuUrl als String, nicht als Array", () => {
      // Die Regel aus dem Flow gegen echten Inhalt nachgerechnet.
      const content =
        "Speisekarte: https://example.com/karte.pdf\n[Zur Karte](https://example.com/k.html)";
      const menuUrl =
        (content.match(/https?:\/\/[^\s)\]]+\.pdf/i) || [])[0] ||
        content.match(/\[.*?(?:Karte|Menu|Speisen|Getränke).*?\]\((.*?)\)/i)?.[1] ||
        null;
      expect(typeof menuUrl).toBe("string");
      expect(Array.isArray(menuUrl)).toBe(false);
      expect(menuUrl).toBe("https://example.com/karte.pdf");
    });
  });

  describe("Deep-Scrape-Flow", () => {
    it("schreibt suggestedConfig und status in die Datenbank", () => {
      const db = nodeByName(deep, "DB: Update ScraperJob");
      const cols = db.parameters.columns.value;
      expect(Object.keys(cols)).toEqual(
        expect.arrayContaining(["suggestedConfig", "status"]),
      );
      expect(cols.status).toBe("completed");
    });

    it("hat weiterhin einen OCR-Zweig für Speisekarten-Bilder", () => {
      const names = deep.nodes.map((n: any) => n.name);
      expect(names).toContain("Vision: OCR Bild");
      expect(names).toContain("Vision: OCR Bild-PDF");
    });
  });

  /**
   * Die geschärfte Erkennung, gemessen an kleiner-kiepenkerl.de.
   *
   * Vorher lieferte der Ablauf address = '', kein Logo, keine sozialen Netze
   * und hasReservation = null – obwohl die Seite eine vollständige
   * PostalAddress, ein Logo und ein OpenTable-Widget ausliefert. Drei Ursachen,
   * alle hier festgehalten, damit sie nicht zurückkehren.
   */
  describe("Deep-Scrape: Erkennung", () => {
    const parse: string = nodeByName(deep, "Code: Parse HTML").parameters.jsCode;
    const build: string = nodeByName(deep, "Code: suggestedConfig bauen").parameters.jsCode;

    it("steigt in @graph ab", () => {
      // Die Seite legt ALLES in einen @graph. Ohne Abstieg war die Adresse
      // unerreichbar.
      expect(parse).toContain("@graph");
    });

    it("behandelt @type als Array", () => {
      // Dort steht ['Restaurant','Organization']; ein .includes(item['@type'])
      // auf ein Array trifft nie zu.
      expect(parse).toMatch(/isType|Array\.isArray\(t\)/);
    });

    it("nimmt die Postleitzahl in die Anschrift auf", () => {
      // Zuvor: "Spiekerhof 47, Münster" statt "…, 48143 Münster".
      expect(parse).toContain("postalCode");
    });

    it("erkennt ein Reservierungssystem", () => {
      // hasReservation wurde zuvor ÜBERHAUPT NICHT gesetzt.
      expect(parse).toContain("hasReservation");
      expect(parse).toContain("opentable");
      expect(parse).toContain("reservationUrl");
    });

    it("sucht ein Logo", () => {
      expect(parse).toContain("logoUrl");
      expect(parse).toMatch(/apple-touch-icon/);
    });

    it("versteht ausgeschriebene, kommagetrennte Öffnungszeiten", () => {
      // "Monday,Tuesday,…,Sunday 11:30-23:00" – daran scheiterte der alte
      // Ausdruck, und der nächste Knoten schob Standardwerte unter.
      expect(parse).toContain("parseHours");
      expect(parse).toContain("expandDays");
    });

    it("erfindet KEINE Öffnungszeiten mehr", () => {
      // Die veröffentlichte Seite zeigte 12:00–22:00, geöffnet ist 11:30–23:00.
      // Ein Gast um 11:45 las "geschlossen". Falsche Zeiten sind schlimmer als
      // keine – der Auffangwert muss weg bleiben.
      //
      // Kommentarzeilen abziehen: Der Knoten ZITIERT die alte Zeile als
      // Begründung, und ohne diesen Schritt schlüge der Test daran an.
      const aktiv = build
        .split("\n")
        .filter((z) => !z.trim().startsWith("//"))
        .join("\n");
      expect(aktiv).not.toMatch(/\{open:'12:00'/);
      expect(aktiv).toContain("if(v&&v.open&&v.close)");
    });

    it("reicht Logo, soziale Netze und Reservierung in suggestedConfig durch", () => {
      for (const feld of ["logoUrl", "socialMedia", "hasReservation", "reservationUrl"]) {
        expect(build, feld).toContain(feld);
      }
    });
  });

  /**
   * Der Menü-Zweig des Deep-Scrape ist defekt und wird NICHT mehr benutzt.
   *
   * Nachgewiesen an Ausführung 632: "Fetch: PDF Binary" trägt
   * responseFormat "arraybuffer" – einen Wert, den n8n nicht kennt (gültig sind
   * autodetect | file | json | text). n8n gab den Rumpf daraufhin als rohen
   * String zurück (21.259.996 Zeichen, beginnend mit "%PDF-1.7"), das Feld
   * binary blieb leer. Der folgende Code-Knoten las $input.item.json.data –
   * an einem String nicht vorhanden –, Buffer.from(undefined) warf, sein
   * eigener catch schluckte den Fehler, und heraus kamen pdfBase64:"" und
   * pdfRawText:"". Der OCR-Knoten lief nie. "Fetch: Bild Binary" trägt
   * dieselbe Konstruktion.
   *
   * Die Erkennung liegt jetzt im Express-Server (server/services/menuExtraction.ts),
   * wo sie versioniert und geprüft ist. Der Client zieht sie nach, sobald der
   * Scrape keine brauchbare Karte liefert.
   *
   * Dieser Test hält den Befund fest. Er schlägt fehl, sobald jemand den Zweig
   * anfasst – und genau dann ist zu entscheiden: entweder ganz entfernen (dann
   * spart jeder Lauf einen 21-MB-Download, der bislang die Ausführungsdaten
   * aufblähte und die Platte füllte), oder korrekt auf responseFormat "file"
   * umstellen UND die Code-Knoten auf das Binärfeld umschreiben. Halb
   * repariert ist die schlechteste Möglichkeit: Dann liefert der ungetestete
   * Regex-Ausdruck wieder Gerichte und verdrängt den geprüften Parser.
   */
  describe("Menü-Zweig (defekt, durch den Server ersetzt)", () => {
    it.each(BINARY_FETCH_NODES)(
      "%s trägt weiterhin den unbrauchbaren responseFormat-Wert",
      (name) => {
        const node = nodeByName(deep, name);
        expect(node, `${name} fehlt im Export`).toBeTruthy();
        expect(responseFormatOf(node)).toBe("arraybuffer");
      },
    );

    it("die Code-Knoten lesen die Nutzdaten an der falschen Stelle", () => {
      // json.data existiert nicht, wenn der Rumpf selbst der String ist.
      for (const name of ["Code: PDF lesen", "Code: Bild → Base64"]) {
        const code = nodeByName(deep, name)?.parameters?.jsCode ?? "";
        expect(code, `${name} fehlt im Export`).toBeTruthy();
        expect(code).toMatch(/json\.data|raw\.data/);
        // Der richtige Weg ginge über das Binärfeld des Items. Genau das kommt
        // nirgends vor – "binary" steht dort nur als Kodierungsname in
        // Buffer.from(…, 'binary') und liest deshalb weiterhin ins Leere.
        expect(code).not.toMatch(/item\.binary|\$binary|getBinaryDataBuffer/);
      }
    });

    it("ein korrigierter Zweig müsste einen gültigen responseFormat-Wert tragen", () => {
      // Dokumentiert die zulässigen Werte, damit beim Reparieren nicht erneut
      // geraten wird.
      expect(["autodetect", "file", "json", "text"]).not.toContain("arraybuffer");
    });
  });

});
