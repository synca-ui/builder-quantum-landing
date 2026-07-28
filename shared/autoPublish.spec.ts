import { describe, it, expect } from "vitest";
import {
  buildPublishConfig,
  countExternalImages,
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
