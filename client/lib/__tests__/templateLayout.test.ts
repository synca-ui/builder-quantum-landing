// @vitest-environment node
/**
 * Layout-Quelle der Templates (templateLayout.ts).
 *
 * Zwei Zusicherungen:
 *  1. Die Rechenhelfer, die Vorschau UND Live-Seite teilen (Preis, Nummer,
 *     Highlight-Auswahl, Gruppierung, Kicker), liefern deterministisch das,
 *     was die Entwürfe zeigen — „8,50“ statt „8.50€“, „01“ statt „1“.
 *  2. Jedes Template mit eigenem Layout ist in JEDER Registry eingetragen.
 *     Fehlt ein Eintrag, fällt das Template still auf Minimalist zurück —
 *     und niemand merkt es, weil auch der Rückfall „funktioniert“.
 */
import { describe, expect, it } from "vitest";
import {
  EIGENE_TEMPLATES,
  formatPreis,
  getTemplateLayout,
  gruppiereNachKategorie,
  heroKicker,
  heuteHinweis,
  kategorieVon,
  kategorienReihenfolge,
  laufendeNummer,
  OHNE_KATEGORIE,
  teileLetztesWort,
  templateSchriftFuer,
  textAufFarbe,
  waehleHighlights,
} from "../templateLayout";
import {
  getTemplateDesignDefaults,
  getTemplateIntent,
  getTemplateButtonShape,
  getTemplateTokens,
} from "../templateTokens";
import { getTemplateDesignTokens } from "../styleInjector";
import { fontClassFor } from "../fontClass";
import de from "../../i18n/locales/de.json";
import en from "../../i18n/locales/en.json";

describe("getTemplateLayout", () => {
  it("kennt genau die vier Papier-Templates als eigene Layouts", () => {
    expect(EIGENE_TEMPLATES.sort()).toEqual(
      ["izakaya", "kiosk", "morgen", "presse"].sort(),
    );
    for (const id of EIGENE_TEMPLATES) {
      expect(getTemplateLayout(id).eigen).toBe(true);
    }
  });

  it.each(["minimalist", "modern", "riviera", "verde", "stylish", "cozy", "nocturne", "", undefined, null])(
    "Bestand und Unbekanntes (%s) bleiben beim Standard-Layout",
    (id) => {
      const l = getTemplateLayout(id as string);
      expect(l.eigen).toBe(false);
      expect(l.dish).toBe("tile");
      expect(l.preis).toBe("euro");
    },
  );
});

describe("formatPreis", () => {
  it("Bestand (euro): exakt die bisherige Schreibweise", () => {
    expect(formatPreis(8.5, "euro")).toBe("8.50€");
    expect(formatPreis("9,99", "euro")).toBe("9,99€");
    expect(formatPreis(0, "euro")).toBe("0.00€");
    expect(formatPreis(undefined, "euro")).toBe("");
    expect(formatPreis("", "euro")).toBe("");
  });

  it("komma: Dezimalkomma, zwei Stellen, kein Währungszeichen", () => {
    expect(formatPreis(8.5, "komma")).toBe("8,50");
    expect(formatPreis(7, "komma")).toBe("7,00");
    expect(formatPreis("9,99", "komma")).toBe("9,99");
    expect(formatPreis("12 €", "komma")).toBe("12,00");
    expect(formatPreis("8.50€", "komma")).toBe("8,50");
  });

  it("kommaKurz: ganze Beträge ohne Nachkommastellen", () => {
    expect(formatPreis(9, "kommaKurz")).toBe("9");
    expect(formatPreis("24", "kommaKurz")).toBe("24");
    expect(formatPreis(8.5, "kommaKurz")).toBe("8,50");
    expect(formatPreis(11.999, "kommaKurz")).toBe("12");
  });

  it("Freitext bleibt Freitext — nur das Euro-Zeichen fällt", () => {
    expect(formatPreis("ab 12 €", "komma")).toBe("ab 12");
    expect(formatPreis("Tagespreis", "kommaKurz")).toBe("Tagespreis");
  });
});

describe("laufendeNummer", () => {
  it("zweistellig mit führender Null", () => {
    expect(laufendeNummer(0)).toBe("01");
    expect(laufendeNummer(8)).toBe("09");
    expect(laufendeNummer(11)).toBe("12");
    expect(laufendeNummer(99)).toBe("100");
  });
});

describe("waehleHighlights", () => {
  const items = [
    { id: "a" },
    { id: "b", isHighlight: true },
    { id: "c" },
    { id: "d", isHighlight: true },
    { id: "e" },
  ];

  it("markierte zuerst, dann Karten-Reihenfolge — kein Zufall", () => {
    const erst = waehleHighlights(items, 3).map((i) => i.id);
    expect(erst).toEqual(["b", "d", "a"]);
    for (let n = 0; n < 20; n++) {
      expect(waehleHighlights(items, 3).map((i) => i.id)).toEqual(erst);
    }
  });

  it("nimmt so viele, wie das Template will", () => {
    expect(waehleHighlights(items, 4).map((i) => i.id)).toEqual(["b", "d", "a", "c"]);
    expect(waehleHighlights(items.slice(0, 2), 4)).toHaveLength(2);
  });
});

describe("gruppiereNachKategorie", () => {
  const items = [
    { id: "1", name: "Highball", category: "Getränke" },
    { id: "2", name: "Karaage", category: "Kleine Teller" },
    { id: "3", name: "Brot", category: "" },
    { id: "4", name: "Gyoza", category: "Kleine Teller" },
    { id: "5", name: "Mochi", category: "Süßes" },
  ] as any[];

  it("gepflegte Reihenfolge zuerst, dann Auftrittsfolge, ohne Kategorie zuletzt", () => {
    const g = gruppiereNachKategorie(items, ["Kleine Teller", "Getränke"]);
    expect(g.map((x) => x.kategorie)).toEqual([
      "Kleine Teller",
      "Getränke",
      "Süßes",
      OHNE_KATEGORIE,
    ]);
    expect(g[0].items.map((i) => i.id)).toEqual(["2", "4"]);
    expect(g[3].items.map((i) => i.id)).toEqual(["3"]);
  });

  it("lässt leere gepflegte Kategorien weg", () => {
    const g = gruppiereNachKategorie(items, ["Suppen", "Getränke"]);
    expect(g.map((x) => x.kategorie)).not.toContain("Suppen");
    expect(g[0].kategorie).toBe("Getränke");
  });
});

describe("teileLetztesWort", () => {
  it("trennt das letzte Wort ab", () => {
    expect(teileLetztesWort("Der Tag beginnt langsam hier.")).toEqual([
      "Der Tag beginnt langsam",
      "hier.",
    ]);
  });
  it("lässt ein einzelnes Wort aufrecht", () => {
    expect(teileLetztesWort("Willkommen")).toEqual(["Willkommen", null]);
    expect(teileLetztesWort("  Yuki  ")).toEqual(["Yuki", null]);
  });
});

describe("heuteHinweis / heroKicker", () => {
  const montag = new Date(2026, 8, 7, 12, 0, 0); // Mo 07.09.2026
  const hours = {
    monday: { open: "18:00", close: "23:00", closed: false },
    tuesday: { open: "18:00", close: "22:30", closed: false },
    wednesday: { open: "", close: "", closed: true },
  } as any;

  it("nennt die Schließzeit des heutigen Tags", () => {
    expect(heuteHinweis(hours, montag)).toBe("bis 23 Uhr");
    expect(heuteHinweis(hours, new Date(2026, 8, 8))).toBe("bis 22:30 Uhr");
    expect(heuteHinweis(hours, new Date(2026, 8, 9))).toBe("heute geschlossen");
  });

  it("erfindet nichts, wenn Daten fehlen", () => {
    expect(heuteHinweis(undefined, montag)).toBeNull();
    expect(heuteHinweis({} as any, montag)).toBeNull();
    expect(heuteHinweis(hours, new Date(2026, 8, 10))).toBeNull(); // Do fehlt
  });

  it("Kicker je Template", () => {
    expect(heroKicker("kiosk", "restaurant", hours, montag)).toBe("bis 23 Uhr");
    // presse: Betriebsart nur mit eigener Beschreibung — ohne sie nennt die
    // Unterzeile („Restaurant in Leipzig“) sie bereits.
    expect(heroKicker("presse", "restaurant", hours, montag)).toBe("bis 23 Uhr");
    expect(
      heroKicker("presse", "restaurant", hours, montag, "Küche nach Marktlage."),
    ).toBe("Restaurant · bis 23 Uhr");
    expect(heroKicker("presse", "unbekannt", undefined, montag, "x")).toBeNull();
    // izakaya: Betriebsart steht im vertikalen Label — Kicker nur Tageshinweis
    expect(heroKicker("izakaya", "cafe", hours, montag, "x")).toBe("bis 23 Uhr");
    expect(heroKicker("izakaya", "cafe", undefined, montag)).toBeNull();
    expect(heroKicker("morgen", "cafe", hours, montag)).toBeNull();
    expect(heroKicker("minimalist", "cafe", hours, montag)).toBeNull();
  });
});

describe("Schriften", () => {
  it("Fließtext folgt der Gattung, das Template wählt den Stapel", () => {
    expect(templateSchriftFuer("presse", "serif")).toContain("Newsreader");
    expect(templateSchriftFuer("presse", "sans-serif")).toContain("Manrope");
    expect(templateSchriftFuer("kiosk", "sans-serif")).toContain("Space Grotesk");
    expect(templateSchriftFuer("izakaya", "sans-serif")).toContain("Bricolage");
    expect(templateSchriftFuer("morgen", "monospace")).toContain("monospace");
    expect(templateSchriftFuer("minimalist", "sans-serif")).toContain("Poppins");
  });

  it("nennt die selbst gehosteten Familien (fontsource) — kein Google-Aufruf", () => {
    // Die Namen müssen exakt denen aus den @font-face-Regeln der Pakete
    // entsprechen (client/lib/templateFonts.ts), sonst greift der Rückfall.
    expect(templateSchriftFuer("presse", "serif")).toMatch(/^"Newsreader Variable"/);
    expect(templateSchriftFuer("morgen", "sans-serif")).toMatch(/^"Manrope Variable"/);
    expect(templateSchriftFuer("izakaya", "sans-serif")).toMatch(
      /^"Bricolage Grotesque Variable"/,
    );
    for (const id of EIGENE_TEMPLATES) {
      const s = getTemplateLayout(id).schrift;
      for (const stapel of [s.sans, s.serif, s.monospace, s.display, s.mono]) {
        expect(stapel).not.toMatch(/googleapis|gstatic/);
      }
    }
  });

  it("fontClassFor liefert für eigene Layouts die Template-Klasse", () => {
    expect(fontClassFor("serif", "presse")).toBe("font-template");
    expect(fontClassFor("serif", "riviera")).toBe("font-serif");
    expect(fontClassFor("serif")).toBe("font-serif");
    expect(fontClassFor("mono", "kiosk")).toBe("font-template");
  });
});

describe("Registrierung — jedes eigene Layout steht in jeder Registry", () => {
  const rueckfallTokens = getTemplateTokens("__gibt_es_nicht__");
  const rueckfallDesign = getTemplateDesignTokens("__gibt_es_nicht__");

  it.each(EIGENE_TEMPLATES)("'%s' hat eigene Palette, Design-Tokens, Intent, Schrift, Knopfform", (id) => {
    expect(getTemplateTokens(id)).not.toBe(rueckfallTokens);
    expect(getTemplateDesignTokens(id)).not.toBe(rueckfallDesign);
    expect(getTemplateDesignTokens(id).borderRadius.card).toBe("0px");
    expect(getTemplateIntent(id)).toBe("NARRATIVE");
    expect(["sans-serif", "serif", "monospace"]).toContain(
      getTemplateDesignDefaults(id).fontFamily,
    );
    expect(getTemplateButtonShape(id)).toBe("square");
  });

  it.each(EIGENE_TEMPLATES)("'%s' ist in beiden Sprachen benannt", (id) => {
    const tDe = (de as any).templates;
    const tEn = (en as any).templates;
    expect(tDe[id]).toBeTruthy();
    expect(tDe[`${id}Desc`]).toBeTruthy();
    expect(tEn[id]).toBeTruthy();
    expect(tEn[`${id}Desc`]).toBeTruthy();
  });

  it("Bestand bleibt abgerundet", () => {
    expect(getTemplateButtonShape("modern")).toBe("rounded");
    expect(getTemplateButtonShape("riviera")).toBe("rounded");
  });
});

describe("kategorienReihenfolge — eine Regel für Filter und Liste", () => {
  const items = [
    { id: "1", name: "Karaage", category: "Kleine Teller" },
    { id: "2", name: "Highball", category: "Getränke" },
    { id: "3", name: "Brot", category: " Beilagen " },
    { id: "4", name: "Wasser" },
  ] as any[];

  it("gepflegte Liste zuerst, dann Extras in Auftrittsfolge, „Sonstiges“ zuletzt — leere Kategorien fallen weg", () => {
    expect(
      kategorienReihenfolge(["Getränke", "Kleine Teller", "Desserts"], items),
    ).toEqual(["Getränke", "Kleine Teller", "Beilagen", OHNE_KATEGORIE]);
  });

  it("ohne gepflegte Liste: Auftrittsfolge der Gerichte", () => {
    expect(kategorienReihenfolge(undefined, items)).toEqual([
      "Kleine Teller",
      "Getränke",
      "Beilagen",
      OHNE_KATEGORIE,
    ]);
    expect(kategorienReihenfolge(["", null, undefined], items)).toHaveLength(4);
  });

  it("kategorieVon: Gerichte ohne Kategorie stehen unter „Sonstiges“ — in beiden Renderern", () => {
    expect(kategorieVon({ category: " Beilagen " })).toBe("Beilagen");
    expect(kategorieVon({ category: "" })).toBe(OHNE_KATEGORIE);
    expect(kategorieVon({})).toBe(OHNE_KATEGORIE);
    expect(OHNE_KATEGORIE).toBe("Sonstiges"); // wie normalizeConfig es live erfindet
  });
});

describe("textAufFarbe", () => {
  it("wählt die Textfarbe mit dem höheren Kontrast", () => {
    expect(textAufFarbe("#E8541F")).toBe("#000000"); // Kiosk-Orange
    expect(textAufFarbe("#9C2B22")).toBe("#FFFFFF"); // Tomatenrot
    expect(textAufFarbe("#0F4C81")).toBe("#FFFFFF"); // Kobalt
    expect(textAufFarbe("#A81E14")).toBe("#FFFFFF"); // Bistro-Rot
    expect(textAufFarbe("#FFFFFF")).toBe("#000000");
    expect(textAufFarbe("nix")).toBe("#FFFFFF");
  });
});

describe("heuteHinweis — Mitternacht", () => {
  it("00:00 heißt „bis 24 Uhr“, nicht „bis 0 Uhr“", () => {
    const freitag = new Date(2026, 8, 11);
    expect(
      heuteHinweis(
        { friday: { open: "18:00", close: "00:00", closed: false } } as any,
        freitag,
      ),
    ).toBe("bis 24 Uhr");
    expect(
      heuteHinweis(
        { friday: { open: "18:00", close: "00:30", closed: false } } as any,
        freitag,
      ),
    ).toBe("bis 0:30 Uhr");
  });
});
