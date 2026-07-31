import { describe, it, expect } from "vitest";
import {
  buildPublishConfig,
  countExternalImages,
  deriveCohesiveColors,
  markHighlights,
  contrastRatio,
  FALLBACK_BUSINESS_TYPE,
} from "./autoPublish";
import {
  FALLBACK_TEMPLATE,
  suggestedConfigToDraft,
  type ConfiguratorDraft,
} from "./suggestedConfig";

/** Minimaler Entwurf, der die Pflichtfelder erfüllt. */
function draftWith(
  overrides: Partial<ConfiguratorDraft> = {},
): ConfiguratorDraft {
  return {
    business: { name: "Kleiner Kiepenkerl", type: "restaurant" },
    design: { template: "modern" },
    content: {},
    contact: {},
    unmapped: {},
    ...overrides,
  };
}

/**
 * Der Publish-Endpunkt lehnt ab, solange business.name, business.type und
 * design.template nicht gesetzt sind (validatePublishData in
 * server/routes/webapps.ts). Genau diese drei prüft dieser Block – läuft er
 * auseinander, bricht der automatische Modus erst nach der Analyse ab.
 */
describe("buildPublishConfig", () => {
  it("reicht einen vollständigen Entwurf unverändert durch", () => {
    const { config, defaulted, blocking } = buildPublishConfig(draftWith());
    expect(blocking).toEqual([]);
    expect(defaulted).toEqual([]);
    expect(config?.business.name).toBe("Kleiner Kiepenkerl");
    expect(config?.business.type).toBe("restaurant");
    expect(config?.design.template).toBe("modern");
  });

  it("setzt den Geschäftstyp ein, wenn der Scrape keinen gefunden hat", () => {
    const { config, defaulted } = buildPublishConfig(
      draftWith({ business: { name: "Kleiner Kiepenkerl" } }),
    );
    expect(config?.business.type).toBe(FALLBACK_BUSINESS_TYPE);
    expect(defaulted.join(" ")).toMatch(/Geschäftstyp/);
  });

  it("setzt die Vorlage ein, wenn der Scrape keine geraten hat", () => {
    const { config, defaulted } = buildPublishConfig(
      draftWith({ design: {} }),
    );
    expect(config?.design.template).toBe(FALLBACK_TEMPLATE);
    expect(defaulted.join(" ")).toMatch(/Vorlage/);
  });

  it("verschweigt die Annahmen nicht", () => {
    // Der Betreiber veröffentlicht sonst einen geratenen Typ, ohne es zu
    // merken. Beide Annahmen müssen einzeln benannt werden.
    const { defaulted } = buildPublishConfig(
      draftWith({ business: { name: "Testbetrieb" }, design: {} }),
    );
    expect(defaulted).toHaveLength(2);
  });

  it("veröffentlicht NICHT ohne Betriebsnamen", () => {
    // Ein erfundener Name stünde anschließend öffentlich im Netz.
    const { config, blocking } = buildPublishConfig(
      draftWith({ business: {} }),
    );
    expect(config).toBeNull();
    expect(blocking.join(" ")).toMatch(/Name/);
  });

  it("behandelt einen einbuchstabigen Namen wie keinen — so prüft es der Server", () => {
    const { config } = buildPublishConfig(draftWith({ business: { name: "A" } }));
    expect(config).toBeNull();
  });

  it("wertet Leerzeichen nicht als Namen", () => {
    const { config } = buildPublishConfig(
      draftWith({ business: { name: "   " } }),
    );
    expect(config).toBeNull();
  });

  it("kommt ohne Entwurf klar", () => {
    expect(buildPublishConfig(null).config).toBeNull();
    expect(buildPublishConfig(undefined).blocking).not.toEqual([]);
  });

  it("verliert Inhalte des Entwurfs nicht", () => {
    const { config } = buildPublishConfig(
      draftWith({
        content: {
          menuItems: [{ id: "a", name: "Töttchen" }],
          gallery: [{ id: "g", url: "https://example.test/1.jpg" }],
          openingHours: { monday: { open: "11:00", close: "22:00", closed: false } },
        },
        contact: { phone: "0251 42020", email: "info@example.test" },
      }),
    );
    expect(config?.content.menuItems).toHaveLength(1);
    expect(config?.content.gallery).toHaveLength(1);
    expect(config?.content.openingHours?.monday.open).toBe("11:00");
    expect(config?.contact.phone).toBe("0251 42020");
  });

  it("arbeitet auf dem, was suggestedConfigToDraft wirklich liefert", () => {
    // Kein erfundener Entwurf: erst die echte Abbildung, dann veröffentlichen.
    // Nur so fällt auf, wenn eine der beiden Seiten sich ändert.
    const draft = suggestedConfigToDraft({
      businessName: "Kleiner Kiepenkerl",
      primaryColor: "#660c21",
      gallery: ["https://kleiner-kiepenkerl.de/bild.jpg"],
    });
    const { config, defaulted, blocking } = buildPublishConfig(draft);
    expect(blocking).toEqual([]);
    // Weder Typ noch Vorlage standen im Scrape – beide müssen ersetzt werden,
    // sonst lehnt der Server ab.
    expect(config?.business.type).toBe(FALLBACK_BUSINESS_TYPE);
    expect(config?.design.template).toBe(FALLBACK_TEMPLATE);
    expect(defaulted).toHaveLength(2);
    expect(config?.design.primaryColor).toBe("#660c21");
  });
});

describe("deriveCohesiveColors: Farben aus der gescrapten Palette", () => {
  // Die echte Palette des ersten Testbetriebs: Bordeaux, Gold, Creme.
  const palette = {
    primaryColor: "#660c21",
    secondaryColor: "#b8860a",
    backgroundColor: "#f1e5d0",
  };

  it("leitet Kopfzeile und Preise aus der Marke ab, statt Standardwerte greifen zu lassen", () => {
    // Ausgeliefert wurde zuvor eine LILA Kopfzeile (#5e30eb) mit grünen
    // Preisen (#059669) – Server-Standardwerte, die von der Marke nichts wissen.
    const d = deriveCohesiveColors(palette);
    expect(d.headerBackgroundColor).toBe("#f1e5d0");
    expect(d.headerFontColor).toBe("#660c21"); // Bordeaux auf Creme: lesbar
    // Gold (#b8860a) auf Creme hat nur Kontrast 2,6:1 und fällt durch die
    // AA-Schwelle – die Kette greift korrekt zur Primärfarbe. Markentreu UND
    // lesbar schlägt markentreu allein.
    expect(d.priceColor).toBe("#660c21");
    expect(d.fontColor).toBe("#1f2937"); // dunkel auf hellem Grund
  });

  it("fällt auf lesbare Schrift zurück, wenn die Markenfarbe unleserlich wäre", () => {
    // Helles Gelb auf Weiß – die Marke würde niemand entziffern.
    const d = deriveCohesiveColors({
      primaryColor: "#ffee88",
      backgroundColor: "#ffffff",
    });
    expect(d.headerFontColor).toBe("#1f2937");
    expect(contrastRatio(d.headerFontColor!, d.headerBackgroundColor!)).toBeGreaterThanOrEqual(4.5);
  });

  it("wählt helle Schrift auf dunklem Grund", () => {
    const d = deriveCohesiveColors({ backgroundColor: "#1a1a1a" });
    expect(d.fontColor).toBe("#f8f7f4");
  });

  it("lässt bereits gesetzte Werte unberührt", () => {
    const d = deriveCohesiveColors({ ...palette, priceColor: "#123456" });
    expect(d.priceColor).toBe("#123456");
  });

  it("nimmt die Sekundärfarbe für Preise, wo sie lesbar ist", () => {
    // Dunkles Gold auf Weiß: 4,6:1 – die Marke darf bleiben.
    const d = deriveCohesiveColors({
      primaryColor: "#660c21",
      secondaryColor: "#8a6508",
      backgroundColor: "#ffffff",
    });
    expect(d.priceColor).toBe("#8a6508");
  });
});

describe("markHighlights: die Aushängeschilder der Startseite", () => {
  const dish = (id, category, price, description) => ({
    id, name: id, category, price, ...(description ? { description } : {}),
  });

  it("wählt Hauptgerichte mit Beschreibung statt Getränke", () => {
    // Ohne Markierung würfelt der Renderer – bei 141 Positionen mit 71
    // Getränken bestand die Startseite meist aus Getränken.
    const items = markHighlights([
      dish("cola", "Getränke", "4.10"),
      dish("toettchen", "Hauptgerichte", "14.50", "Münsterländer Klassiker"),
      dish("pils", "Biere", "3.90"),
      dish("lachs", "Fisch", "22.00", "mit Blattspinat"),
      dish("kaffee", "Heißgetränke", "3.30"),
      dish("tournedo", "Vom Grill", "45.00", "vom Rind"),
    ]);
    const chosen = items.filter((i) => i.isHighlight).map((i) => i.id);
    expect(chosen).toHaveLength(3);
    expect(chosen).toEqual(expect.arrayContaining(["toettchen", "lachs", "tournedo"]));
  });

  it("verändert die Reihenfolge der Karte nicht", () => {
    const items = markHighlights([
      dish("a", "Hauptgerichte", "10.00", "x"),
      dish("b", "Getränke", "3.00"),
      dish("c", "Fisch", "20.00", "y"),
    ]);
    expect(items.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("markiert nichts, wenn nichts als Aushängeschild taugt", () => {
    // Lieber der Zufall des Renderers als eine Cola als "Highlight".
    const items = markHighlights([dish("cola", "Getränke", "4.10")]);
    expect(items.some((i) => i.isHighlight)).toBe(false);
  });

  it("übersteht eine leere Karte", () => {
    expect(markHighlights([])).toEqual([]);
  });
});

describe("buildPublishConfig: Reservierung folgt dem Scrape-Befund", () => {
  it("schaltet Reservierungen ein, wenn die Website welche hat", () => {
    const { config } = buildPublishConfig(draftWith(), { enableReservations: true });
    expect(config?.features?.reservationsEnabled).toBe(true);
  });

  it("lässt sie aus, wenn der Scrape keine fand", () => {
    const { config } = buildPublishConfig(draftWith());
    expect(config?.features).toBeUndefined();
  });
});

describe("countExternalImages", () => {
  it("zählt Bilder, die noch auf fremdem Hosting liegen", () => {
    const draft = draftWith({
      content: {
        gallery: [
          { id: "1", url: "https://kleiner-kiepenkerl.de/a.jpg" },
          { id: "2", url: "https://kleiner-kiepenkerl.de/b.jpg" },
        ],
      },
    });
    expect(countExternalImages(draft)).toBe(2);
  });

  it("zählt eigene Bilder nicht mit", () => {
    const draft = draftWith({
      content: {
        gallery: [
          { id: "1", url: "https://xyz.supabase.co/storage/a.jpg" },
          { id: "2", url: "https://maitr.de/b.jpg" },
          { id: "3", url: "https://fremde-seite.test/c.jpg" },
        ],
      },
    });
    expect(countExternalImages(draft)).toBe(1);
  });

  it("ist bei leerer oder fehlender Galerie still", () => {
    expect(countExternalImages(draftWith())).toBe(0);
    expect(countExternalImages(null)).toBe(0);
  });
});
