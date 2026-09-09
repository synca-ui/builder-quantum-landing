// @vitest-environment node
/**
 * Der Zwischenspeicher der veröffentlichten Seiten (server/utils/siteCache.ts).
 *
 * ZWEI BEFUNDE:
 *
 * 1. `invalidateSite` hatte KEINEN Aufrufer. Nach dem Veröffentlichen lieferte
 *    `GET /api/sites/:subdomain` bis zu 60 Sekunden die vorherige Fassung —
 *    genau in dem Moment, in dem die Erfolgsansicht den QR-Code zeigt.
 *
 * 2. Zwei Routen legten unter DEMSELBEN Schlüssel verschiedene Formen ab: die
 *    öffentliche Route ihre gefilterte Feldliste, die Middleware in
 *    subdomains.ts die rohe `configData`. Wer zuerst schrieb, gewann — und im
 *    ungünstigen Fall beantwortete die öffentliche Route ihre Anfrage aus dem
 *    rohen Datensatz, also mit Feldern, die die Feldliste zurückhält.
 */
import { describe, expect, it, beforeEach } from "vitest";
import {
  getCachedSite,
  setCachedSite,
  invalidateSite,
} from "../utils/siteCache";

const SUB = "haus-toeller";

beforeEach(() => {
  invalidateSite(SUB);
});

describe("Bereiche halten die zwei Formen auseinander", () => {
  it("die rohe Sicht der Middleware überschreibt die öffentliche nicht", () => {
    setCachedSite(SUB, { nurOeffentlich: true }, "etag-1");
    setCachedSite(SUB, { rohMitAllenFeldern: true }, "etag-2", "roh");

    // Die öffentliche Route bekommt weiter ihre eigene Form.
    expect(getCachedSite(SUB)?.data).toEqual({ nurOeffentlich: true });
    expect(getCachedSite(SUB, "roh")?.data).toEqual({
      rohMitAllenFeldern: true,
    });
  });

  it("und umgekehrt genauso", () => {
    setCachedSite(SUB, { rohMitAllenFeldern: true }, "etag-2", "roh");
    setCachedSite(SUB, { nurOeffentlich: true }, "etag-1");
    expect(getCachedSite(SUB, "roh")?.data).toEqual({
      rohMitAllenFeldern: true,
    });
    expect(getCachedSite(SUB)?.data).toEqual({ nurOeffentlich: true });
  });
});

describe("invalidateSite", () => {
  it("räumt BEIDE Bereiche ab", () => {
    setCachedSite(SUB, { a: 1 }, "e1");
    setCachedSite(SUB, { b: 2 }, "e2", "roh");

    invalidateSite(SUB);

    // Ein halb geleerter Zwischenspeicher wäre schlimmer als gar keiner: die
    // beiden Bereiche zeigten dann verschiedene Stände.
    expect(getCachedSite(SUB)).toBeNull();
    expect(getCachedSite(SUB, "roh")).toBeNull();
  });

  it("lässt andere Subdomains in Ruhe", () => {
    setCachedSite("nachbar", { a: 1 }, "e1");
    invalidateSite(SUB);
    expect(getCachedSite("nachbar")?.data).toEqual({ a: 1 });
    invalidateSite("nachbar");
  });
});
