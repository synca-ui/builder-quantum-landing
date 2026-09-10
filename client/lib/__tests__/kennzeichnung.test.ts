// @vitest-environment node
/**
 * Kennzeichnung: Kürzel, Labels, Legende (client/lib/kennzeichnung.ts).
 *
 * Die Legende auf der Karte ist eine Pflichtangabe (LMIDV § 2), keine
 * Gestaltung. Deshalb hier festgenagelt: Es wird nichts geraten, nur
 * Verwendetes UND Erklärtes landet in der Legende, und die DEHOGA-Vorlage
 * überschreibt nie, was der Betrieb selbst festgelegt hat.
 */
import { describe, expect, it } from "vitest";
import {
  DEHOGA_ALLERGENE,
  DEHOGA_ZUSATZSTOFFE,
  ergaenzeDehogaLegende,
  fehlendeKuerzel,
  kuerzelAnzeige,
  legendeZeilen,
  parseKuerzel,
  sortiereKuerzel,
  STANDARD_LABELS,
  verwendeteKuerzel,
} from "../kennzeichnung";

describe("Kürzel", () => {
  it("parseKuerzel: Komma, Semikolon, Leerzeichen — klein, eindeutig, ohne Leeres", () => {
    expect(parseKuerzel("A, c ;G  2,, a")).toEqual(["a", "c", "g", "2"]);
    expect(parseKuerzel("")).toEqual([]);
    expect(parseKuerzel("  ,  ")).toEqual([]);
  });

  it("kuerzelAnzeige: Buchstaben groß, Ziffern unverändert", () => {
    expect(kuerzelAnzeige("a1")).toBe("A1");
    expect(kuerzelAnzeige(" g ")).toBe("G");
    expect(kuerzelAnzeige("12")).toBe("12");
  });

  it("sortiereKuerzel: Buchstaben vor Ziffern, a1 vor a2 vor b, 2 vor 10", () => {
    expect(sortiereKuerzel(["10", "b", "a2", "2", "a1", "a"])).toEqual([
      "a",
      "a1",
      "a2",
      "b",
      "2",
      "10",
    ]);
  });

  it("verwendeteKuerzel sammelt über alle Gerichte, eindeutig und sortiert", () => {
    expect(
      verwendeteKuerzel([
        { allergens: ["G", "a"] },
        { allergens: ["2", "g"] },
        {},
      ]),
    ).toEqual(["a", "g", "2"]);
  });
});

describe("Legende", () => {
  const items = [{ allergens: ["a", "c"] }, { allergens: ["2"] }];

  it("zeigt nur Kürzel, die verwendet UND erklärt sind", () => {
    const zeilen = legendeZeilen(
      { A: "Glutenhaltiges Getreide", c: "Eier", g: "Milch", "2": "mit Farbstoff" },
      items,
    );
    expect(zeilen).toEqual([
      ["a", "Glutenhaltiges Getreide"],
      ["c", "Eier"],
      ["2", "mit Farbstoff"],
    ]);
  });

  it("ohne Legende keine Zeilen — und nichts wird erfunden", () => {
    expect(legendeZeilen(undefined, items)).toEqual([]);
    expect(legendeZeilen({ a: "  " }, items)).toEqual([]);
  });

  it("fehlendeKuerzel nennt, was an Gerichten steht, aber nicht erklärt ist", () => {
    expect(fehlendeKuerzel({ a: "Gluten" }, items)).toEqual(["c", "2"]);
    expect(fehlendeKuerzel(undefined, items)).toEqual(["a", "c", "2"]);
    expect(fehlendeKuerzel({ a: "x", c: "y", "2": "z" }, items)).toEqual([]);
  });

  it("DEHOGA-Vorlage: 14 Allergene, 14 Zusatzstoffe, Bestehendes bleibt", () => {
    expect(Object.keys(DEHOGA_ALLERGENE)).toHaveLength(14);
    expect(Object.keys(DEHOGA_ZUSATZSTOFFE)).toHaveLength(14);
    const ergebnis = ergaenzeDehogaLegende({ a: "Weizen (unsere Schreibweise)", x: "Hausgemacht" });
    expect(ergebnis.a).toBe("Weizen (unsere Schreibweise)");
    expect(ergebnis.x).toBe("Hausgemacht");
    expect(ergebnis.c).toBe("Eier");
    expect(ergebnis["1"]).toBe("mit Konservierungsstoff");
    // 28 aus der Vorlage, „a“ davon schon belegt, plus das eigene „x“
    expect(Object.keys(ergebnis)).toHaveLength(29);
  });

  it("Labels: die Schalter des Editors sind die üblichen fünf", () => {
    expect([...STANDARD_LABELS]).toEqual(["vegan", "vegetarisch", "glutenfrei", "laktosefrei", "scharf"]);
  });
});
