import { describe, test, expect } from "vitest";
import { zuGerichten, jsonAusAntwort, SCHEMA } from "../menuStructure";

/**
 * Diese Gruppe prüft das Schema selbst — statisch, ohne Netz.
 *
 * Anlass: Eine Durchsicht am 7.8.2026 fand kurz vor dem Deploy, dass das erste
 * Schema gegen die Regeln der Structured Outputs verstieß. Der Fehler wäre
 * NICHT aufgefallen: Alle Tests waren grün, der Produktionsbuild lief durch,
 * und in Produktion hätte jeder einzelne Modellaufruf mit HTTP 400 geendet —
 * die Kette wäre stumm auf die Regeln zurückgefallen, also auf 54 % statt 98 %.
 * Sichtbar geworden wäre das erst an einer schlechten Karte beim Wirt.
 *
 * Besonders tückisch: Als WERKZEUG-Schema ist dieselbe Struktur gültig, und in
 * dieser Form lief sie in der Messung fehlerfrei durch. Die beiden Wege haben
 * verschiedene Regeln.
 */
function alleObjekte(knoten: unknown, pfad = "$"): Array<{ pfad: string; o: any }> {
  if (!knoten || typeof knoten !== "object") return [];
  const o = knoten as any;
  const treffer: Array<{ pfad: string; o: any }> = [];
  if (o.type === "object") treffer.push({ pfad, o });
  for (const [k, v] of Object.entries(o)) {
    if (k === "description") continue;
    treffer.push(...alleObjekte(v, `${pfad}.${k}`));
  }
  return treffer;
}

describe("SCHEMA erfüllt die Regeln der Structured Outputs", () => {
  const objekte = alleObjekte(SCHEMA);

  test("findet überhaupt Objektknoten (sonst prüft der Rest nichts)", () => {
    expect(objekte.length).toBeGreaterThanOrEqual(3);
  });

  test.each(alleObjekte(SCHEMA))(
    "$pfad: additionalProperties ist genau false",
    ({ o }) => {
      // Alles andere als false — auch ein Typ wie { type: "string" } für eine
      // offene Abbildung — wird abgewiesen.
      expect(o.additionalProperties).toBe(false);
    },
  );

  test.each(alleObjekte(SCHEMA))("$pfad: jede Eigenschaft steht in required", ({ o }) => {
    const eigenschaften = Object.keys(o.properties ?? {});
    expect([...(o.required ?? [])].sort()).toEqual(eigenschaften.sort());
  });

  test("die Legende ist eine Liste, keine offene Abbildung", () => {
    expect((SCHEMA as any).properties.allergenLegende.type).toBe("array");
  });
});

/**
 * Geprüft wird die Umformung der Modellantwort — nicht der Aufruf.
 *
 * Das ist die Stelle, an der still etwas verlorengehen kann: Eine Variante, die
 * kein Hauptgericht findet, ein Kürzel in der falschen Schreibweise, eine
 * Legende, die zwar berechnet, aber nicht durchgereicht wird. Genau dieser
 * letzte Fehler ist am 7.8.2026 schon einmal aufgetreten (A1.3) und war
 * unsichtbar: Gerichte, Preise und Kategorien stimmten.
 */

describe("zuGerichten", () => {
  test("macht aus einer Variante ein extra am Hauptgericht, kein eigenes Gericht", () => {
    // Der teuerste Einzelfehler der Regeln: 71 von 122 Varianten wurden zu
    // eigenen Gerichten. Auf der Karte steht dann "groß" als Speise.
    const { items } = zuGerichten(
      {
        gerichte: [
          { name: "Wiener Schnitzel", preis: "18.90", kategorie: "Hauptgerichte", variante_von: "", allergene: ["a1"] },
          { name: "mit extra Pommes", preis: "2.50", kategorie: "Hauptgerichte", variante_von: "Wiener Schnitzel", allergene: [] },
        ],
      },
      "t",
    );
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Wiener Schnitzel");
    expect(items[0].extras).toEqual([{ name: "mit extra Pommes", price: "2.50" }]);
  });

  test("behält eine Variante ohne auffindbares Hauptgericht als Gericht", () => {
    // Lieber ein falsch eingeordnetes Gericht als ein verschwundenes: Der Wirt
    // sieht das eine und kann es korrigieren, das andere bemerkt er nie.
    const { items } = zuGerichten(
      { gerichte: [{ name: "große Portion", preis: "4.00", kategorie: "", variante_von: "Gibt es nicht", allergene: [] }] },
      "t",
    );
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("große Portion");
  });

  test("vereinheitlicht Kürzel und wirft Dubletten weg", () => {
    const { items } = zuGerichten(
      { gerichte: [{ name: "Lachs", preis: "", kategorie: "", variante_von: "", allergene: ["A1", " a1 ", "D)", ""] }] },
      "t",
    );
    expect(items[0].allergens).toEqual(["a1", "d"]);
  });

  test("lässt den Preis weg, statt ihn zu erfinden", () => {
    // Mittagstisch nach Wochentagen hat keine Einzelpreise. Eine 0 dort wäre
    // eine Falschaussage gegenüber dem Gast.
    const { items } = zuGerichten(
      { gerichte: [{ name: "Montag: Rinderroulade", preis: "", kategorie: "Mittagstisch", variante_von: "", allergene: [] }] },
      "t",
    );
    expect(items[0].price).toBeUndefined();
    expect(items[0].category).toBe("Mittagstisch");
  });

  test("reicht die Legende als Paar-Liste durch (die Form des Schemas)", () => {
    const { allergenLegend } = zuGerichten(
      {
        gerichte: [{ name: "X", preis: "", kategorie: "", variante_von: "", allergene: [] }],
        allergenLegende: [
          { kuerzel: "A1", bedeutung: "Weizen" },
          { kuerzel: "f", bedeutung: " Milch " },
          { kuerzel: "", bedeutung: "wird verworfen" },
        ],
      },
      "t",
    );
    expect(allergenLegend).toEqual({ a1: "Weizen", f: "Milch" });
  });

  test("liest auch die alte Objektform, damit gespeicherte Ergebnisse lesbar bleiben", () => {
    const { allergenLegend } = zuGerichten(
      { gerichte: [{ name: "X", preis: "", kategorie: "", variante_von: "", allergene: [] }], allergenLegend: { A1: "Weizen", f: " Milch " } },
      "t",
    );
    expect(allergenLegend).toEqual({ a1: "Weizen", f: "Milch" });
  });

  test("eine leere Legende-Liste bedeutet: die Karte hat keine", () => {
    // Das Schema verlangt das Feld, also kommt eine leere Liste statt gar
    // nichts. Daraus darf keine leere Abbildung werden — sonst sähe es aus,
    // als sei die Legende geprüft und leer.
    const { allergenLegend } = zuGerichten(
      { gerichte: [{ name: "X", preis: "", kategorie: "", variante_von: "", allergene: ["f"] }], allergenLegende: [] },
      "t",
    );
    expect(allergenLegend).toBeUndefined();
  });

  test("erfindet keine Legende, wenn die Karte keine druckt", () => {
    // Was "f" bedeutet, legt jede Karte selbst fest. Eine allgemeine Tabelle
    // wäre nicht unvollständig, sondern falsch.
    const { allergenLegend } = zuGerichten(
      { gerichte: [{ name: "X", preis: "", kategorie: "", variante_von: "", allergene: ["f"] }] },
      "t",
    );
    expect(allergenLegend).toBeUndefined();
  });

  test("überspringt namenlose Einträge und vergibt fortlaufende ids", () => {
    const { items } = zuGerichten(
      {
        gerichte: [
          { name: "  ", preis: "1.00", kategorie: "", variante_von: "", allergene: [] },
          { name: "Suppe", preis: "5.00", kategorie: "", variante_von: "", allergene: [] },
          { name: "Salat", preis: "6.00", kategorie: "", variante_von: "", allergene: [] },
        ],
      },
      "pdf",
    );
    expect(items.map((i) => i.id)).toEqual(["pdf-1", "pdf-2"]);
  });

  test("verträgt eine Antwort ohne gerichte-Feld", () => {
    expect(zuGerichten({}, "t").items).toEqual([]);
    expect(zuGerichten(null, "t").items).toEqual([]);
  });
});

describe("jsonAusAntwort", () => {
  test("nimmt das geparste Feld, wenn das SDK eins liefert", () => {
    const roh = jsonAusAntwort({ parsed_output: { gerichte: [{ name: "A" }] }, content: [] });
    expect((roh as any).gerichte[0].name).toBe("A");
  });

  test("fällt auf den Textblock zurück", () => {
    const roh = jsonAusAntwort({ content: [{ type: "text", text: '{"gerichte":[{"name":"B"}]}' }] });
    expect((roh as any).gerichte[0].name).toBe("B");
  });

  test("wirft mit lesbarem Grund, wenn die Antwort kein JSON ist", () => {
    // Ohne den Textausschnitt im Fehler steht im Protokoll nur "kein JSON",
    // und die Ursache — meist eine Ablehnung oder eine Fehlerseite — bleibt
    // unsichtbar.
    expect(() => jsonAusAntwort({ content: [{ type: "text", text: "Entschuldigung, ..." }] }))
      .toThrow(/kein JSON: Entschuldigung/);
  });

  test("wirft bei leerer Antwort", () => {
    expect(() => jsonAusAntwort({ content: [] })).toThrow(/ohne Inhalt/);
  });
});
