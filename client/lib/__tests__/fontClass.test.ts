// @vitest-environment node
import { describe, test, expect } from "vitest";
import { fontClassFor, normalizeFontFamily } from "../fontClass";

/**
 * Der Anlass: Es gab drei Vokabulare für dieselbe Sache.
 *   DesignStep schrieb            "mono"
 *   die Vorschau verstand         "mono"
 *   AppRenderer verstand          "monospace"
 *   das Zod-Schema erlaubte NUR   "monospace"
 *
 * Die Auswahl "Display" sah dadurch in der Vorschau anders aus als auf der
 * veröffentlichten Seite, und jedes manuelle Speichern scheiterte still an
 * HTTP 400.
 */
describe("fontClassFor", () => {
  test("kennt die Werte, die der Server annimmt", () => {
    expect(fontClassFor("sans-serif")).toBe("font-sans");
    expect(fontClassFor("serif")).toBe("font-serif");
    expect(fontClassFor("monospace")).toBe("font-mono");
  });

  test("liest den Altbestand 'mono' weiterhin als Monospace", () => {
    // Der Wert liegt in gespeicherten Entwürfen und im localStorage. Ein
    // stiller Rückfall auf font-sans wäre genau der Fehler, der behoben wird.
    expect(fontClassFor("mono")).toBe("font-mono");
  });

  test("fällt bei Unbekanntem auf font-sans zurück, statt zu werfen", () => {
    expect(fontClassFor("comic-sans")).toBe("font-sans");
    expect(fontClassFor(undefined)).toBe("font-sans");
    expect(fontClassFor(null)).toBe("font-sans");
    expect(fontClassFor("")).toBe("font-sans");
  });

  test("stört sich nicht an Groß- und Kleinschreibung", () => {
    expect(fontClassFor("Monospace")).toBe("font-mono");
    expect(fontClassFor(" SERIF ")).toBe("font-serif");
  });
});

describe("normalizeFontFamily", () => {
  test("bringt den Altbestand auf die Schreibweise des Servers", () => {
    // Ohne das lehnt das Zod-Enum ab — mit 400 und ohne sichtbare Meldung.
    expect(normalizeFontFamily("mono")).toBe("monospace");
  });

  test("lässt gültige Werte unangetastet", () => {
    expect(normalizeFontFamily("serif")).toBe("serif");
    expect(normalizeFontFamily("monospace")).toBe("monospace");
    expect(normalizeFontFamily("sans-serif")).toBe("sans-serif");
  });

  test("liefert immer einen Wert, den das Schema annimmt", () => {
    for (const eingabe of ["", null, undefined, "comic-sans", "Display"]) {
      expect(["sans-serif", "serif", "monospace"]).toContain(
        normalizeFontFamily(eingabe),
      );
    }
  });
});
