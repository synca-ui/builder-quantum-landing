// @vitest-environment node
//
// Reine Funktionen, kein DOM nötig.
import { describe, expect, it } from "vitest";
import { heroTitel, heroUntertitel, ortAusAdresse } from "../heroFallback";

/**
 * Echter Fall krawummel.de (21.08.2026): Ohne Slogan/Beschreibung stand auf
 * der veröffentlichten Seite „Willkommen“ über „Willkommen in unserem
 * Geschäft!“ — zweimal dieselbe Floskel.
 */
describe("heroTitel", () => {
  it("nimmt den Slogan, wenn einer da ist", () => {
    expect(heroTitel("Vegetarisches Café-Restaurant", "Krawummel")).toBe(
      "Vegetarisches Café-Restaurant",
    );
  });

  it("trägt ohne Slogan den Betriebsnamen groß in den Hero", () => {
    expect(heroTitel(undefined, "Krawummel")).toBe("Krawummel");
    expect(heroTitel("   ", "Krawummel")).toBe("Krawummel");
  });

  it("fällt erst ganz zuletzt auf die Floskel zurück", () => {
    expect(heroTitel(undefined, undefined)).toBe("Willkommen");
  });
});

describe("heroUntertitel", () => {
  it("nimmt die echte Beschreibung", () => {
    expect(heroUntertitel("Bunte vegane Küche.", "cafe", "x")).toBe(
      "Bunte vegane Küche.",
    );
  });

  it("baut aus Betriebsart und Ort eine informative Zeile", () => {
    expect(
      heroUntertitel(undefined, "cafe", "Ludgeristraße 62, 48143 Münster"),
    ).toBe("Café in Münster");
    expect(
      heroUntertitel(undefined, "restaurant", "Spiekerhof 45, 48143 Münster"),
    ).toBe("Restaurant in Münster");
  });

  it("zeigt lieber NICHTS als eine Floskel", () => {
    expect(heroUntertitel(undefined, "cafe", undefined)).toBeNull();
    expect(heroUntertitel(undefined, undefined, "48143 Münster")).toBeNull();
    expect(heroUntertitel(undefined, "foodtruck", "48143 Münster")).toBeNull();
  });
});

describe("ortAusAdresse", () => {
  it("liest den Ort hinter der Postleitzahl", () => {
    expect(ortAusAdresse("Ludgeristraße 62, 48143 Münster")).toBe("Münster");
    expect(ortAusAdresse("Hauptstr. 1, 60311 Frankfurt am Main")).toBe(
      "Frankfurt am Main",
    );
  });

  it("nimmt ohne PLZ das letzte Segment, wenn es wie ein Ort aussieht", () => {
    expect(ortAusAdresse("Ludgeristraße 62, Münster")).toBe("Münster");
    // Eine Hausnummer im Segment heißt: das ist kein Ortsname.
    expect(ortAusAdresse("Ludgeristraße 62")).toBeUndefined();
  });

  it("liefert für Leeres nichts", () => {
    expect(ortAusAdresse(undefined)).toBeUndefined();
    expect(ortAusAdresse("  ")).toBeUndefined();
  });
});
