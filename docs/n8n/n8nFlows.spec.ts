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
});
