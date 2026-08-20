// @vitest-environment node
/**
 * Der Riegel gegen die schwerste Lücke, die das Mandanten-Audit gefunden hat.
 *
 * ANLASS: `const businessId = req.query.businessId as string` stand an zwanzig
 * Stellen in `server/routes/**`. Das `as string` prüft nichts. Express parst mit
 * `qs`, und `?businessId[not]=zzz` wird dort zu `{ businessId: { not: "zzz" } }`.
 * Als Prisma-Bedingung ist das gültige Filtersyntax: Die Besitzprüfung
 * `{ id: { not: "zzz" }, members: { some: { userId } } }` findet den EIGENEN
 * Betrieb und geht durch - danach liefert `where: { businessId }` die Zeilen
 * ALLER Betriebe. Gemessen: sieben lesende Endpunkte, dazu ein schreibender, mit
 * `guestEmail`, `guestPhone` und `specialRequests` fremder Gäste in der Antwort.
 *
 * Diese Datei prüft ZWEI Dinge getrennt:
 *  1. dass `betriebskennung()` genau die Formen abweist, die den Angriff
 *     möglich machten - und
 *  2. dass eine echte Express-App aus dieser Query überhaupt die Form erzeugt,
 *     die hier behauptet wird.
 * Ohne (2) prüfte (1) nur eine Vermutung darüber, was Express tut - und der
 * Angriff hing genau an dieser Vermutung.
 */
import { describe, expect, it } from "vitest";
import express, { type Request } from "express";
import request from "supertest";

import { betriebskennung } from "../middleware/betriebskennung";

/**
 * Was macht EXPRESS aus einer Query-Zeichenkette?
 *
 * Bewusst über eine echte Express-App gemessen und nicht über `qs` direkt: `qs`
 * ist in diesem Baum keine unmittelbare Abhängigkeit, und entscheidend ist
 * ohnehin nicht, was `qs` isoliert könnte, sondern was Express in der hier
 * installierten Fassung tatsächlich in `req.query` legt. Genau das ist der Wert,
 * den die Handler lesen.
 */
async function expressQuery(rohe: string): Promise<unknown> {
  const app = express();
  let gesehen: unknown;
  app.get("/", (req, res) => {
    gesehen = req.query.businessId;
    res.json({ ok: true });
  });
  await request(app).get(`/?${rohe}`);
  return gesehen;
}

/** Minimale Anfrage - nur die drei Quellen, die `betriebskennung` liest. */
function anfrage(teile: { query?: unknown; body?: unknown; params?: unknown }): Request {
  return {
    query: teile.query ?? {},
    body: teile.body ?? {},
    params: teile.params ?? {},
  } as unknown as Request;
}

describe("Express macht aus einer Klammer wirklich ein Objekt", () => {
  it.each([
    ["businessId[not]=zzz", "not"],
    ["businessId[contains]=", "contains"],
    ["businessId[0]=biz-a", "0"],
  ])("%s landet als Objekt in req.query", async (roh, schluessel) => {
    // Gegen die INSTALLIERTE Fassung gemessen, nicht gegen eine Annahme darüber.
    // Fällt dieser Test eines Tages, hat sich Express' Query-Parser geändert -
    // dann stimmt auch die Begründung im Modul nicht mehr und gehört nachgezogen.
    const wert = await expressQuery(roh);
    expect(typeof wert).toBe("object");
    expect(wert).toHaveProperty(schluessel);
  });

  it("eine gewöhnliche Kennung bleibt eine Zeichenkette", async () => {
    expect(await expressQuery("businessId=biz-alpha")).toBe("biz-alpha");
  });
});

describe("betriebskennung weist alles ab, was keine Kennung ist", () => {
  it("DER ANGRIFF: ein Filterobjekt in der Query wird nicht als Kennung durchgereicht", async () => {
    // Der Wert kommt aus Express selbst, nicht aus einem nachgebauten Objekt -
    // sonst prüfte der Test nur die eigene Vorstellung vom Angriff.
    const businessId = await expressQuery("businessId[not]=zzz");
    expect(betriebskennung(anfrage({ query: { businessId } }))).toBeNull();
  });

  it("DER ANGRIFF, schreibend: dasselbe Objekt im Rumpf", () => {
    expect(betriebskennung(anfrage({ body: { businessId: { not: "zzz" } } }))).toBeNull();
  });

  it.each([
    ["Array", ["biz-a", "biz-b"]],
    ["Zahl", 42],
    ["null", null],
    ["leere Zeichenkette", ""],
    ["verschachteltes Objekt", { equals: { not: "x" } }],
  ])("%s ist keine Kennung", (_name, wert) => {
    expect(betriebskennung(anfrage({ query: { businessId: wert } }))).toBeNull();
  });

  it("eine unbrauchbare Kennung wird NICHT von der nächsten Quelle überdeckt", () => {
    // Sonst könnte ein Angreifer die Query vergiften und den Rumpf sauber
    // lassen: Die Prüfung liefe gegen den Rumpf, der Handler läse später die
    // Query. Genau dieses Auseinanderfallen von Prüf- und Nutzobjekt ist das
    // Muster, an dem der frühere Reservierungs-Leak hing.
    const req = anfrage({ query: { businessId: { not: "zzz" } }, body: { businessId: "biz-alpha" } });
    expect(betriebskennung(req)).toBeNull();
  });

  it("der gute Fall bleibt gut - Query, Rumpf und Pfad", () => {
    expect(betriebskennung(anfrage({ query: { businessId: "biz-alpha" } }))).toBe("biz-alpha");
    expect(betriebskennung(anfrage({ body: { businessId: "biz-alpha" } }))).toBe("biz-alpha");
    expect(betriebskennung(anfrage({ params: { businessId: "biz-alpha" } }))).toBe("biz-alpha");
  });

  it("gar keine Kennung genannt: null, kein Absturz", () => {
    expect(betriebskennung(anfrage({}))).toBeNull();
  });
});
