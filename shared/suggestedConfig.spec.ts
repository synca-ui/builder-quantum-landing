// @vitest-environment node
//
// Bewusst ohne jsdom: Die Abbildung ist eine reine Funktion und braucht kein DOM.
// Die in vitest.config.ts eingestellte jsdom-Umgebung lässt sich in diesem Projekt
// derzeit ohnehin nicht laden (html-encoding-sniffer verlangt ERR_REQUIRE_ESM),
// wodurch die gesamte Suite abbricht – auch der bestehende utils.spec.ts.
// Diese Datei umgeht das, behebt aber nicht die Ursache.
import { describe, expect, it } from "vitest";
import {
  suggestedConfigToDraft,
  describeDraft,
  mergeSection,
  type SuggestedConfig,
} from "./suggestedConfig";

/**
 * Beispiel im Format, das der Knoten "Code: suggestedConfig bauen" im
 * n8n-Deep-Scrape-Flow tatsächlich erzeugt.
 */
const scraped: SuggestedConfig = {
  businessName: "Café Goldstück",
  businessType: "cafe",
  slogan: "Kaffee wie in Wien",
  description: "Kleines Café in Ehrenfeld mit eigener Rösterei.",
  location: "Venloer Str. 1, 50823 Köln",
  phone: "+49 221 123456",
  email: "hallo@goldstueck.de",
  primaryColor: "#1a1a2e",
  secondaryColor: "#e94560",
  backgroundColor: "#f8f8f8",
  fontFamily: "serif",
  template: "bold",
  menuItems: [
    { name: "Flat White", price: 3.8, category: "Kaffee" },
    { name: "Zimtschnecke", description: "Täglich frisch", price: "4,20", category: "Gebäck" },
  ],
  gallery: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
  openingHours: {
    monday: { open: "08:00", close: "18:00", closed: false },
    sunday: { open: "10:00", close: "16:00", closed: true },
  },
  rating: 4.8,
  reviewCount: 128,
  menuSource: "ocr",
};

describe("suggestedConfigToDraft", () => {
  it("gibt null zurück, wenn nichts Brauchbares vorliegt", () => {
    expect(suggestedConfigToDraft(null)).toBeNull();
    expect(suggestedConfigToDraft(undefined)).toBeNull();
    expect(suggestedConfigToDraft({})).toBeNull();
  });

  it("übernimmt die Stammdaten und benennt description in uniqueDescription um", () => {
    const d = suggestedConfigToDraft(scraped)!;
    expect(d.business.name).toBe("Café Goldstück");
    expect(d.business.type).toBe("cafe");
    expect(d.business.location).toBe("Venloer Str. 1, 50823 Köln");
    expect(d.business.slogan).toBe("Kaffee wie in Wien");
    expect(d.business.uniqueDescription).toBe(
      "Kleines Café in Ehrenfeld mit eigener Rösterei.",
    );
    // "description" darf NICHT durchgereicht werden – das Feld gibt es nicht.
    expect((d.business as Record<string, unknown>).description).toBeUndefined();
  });

  it("übersetzt Vorlagennamen auf die IDs der TemplateRegistry", () => {
    // Der Flow kennt nur minimalist | bold | classic, die Registry aber
    // minimalist | modern | stylish | cozy.
    expect(suggestedConfigToDraft({ ...scraped, template: "bold" })!.design.template)
      .toBe("modern");
    expect(suggestedConfigToDraft({ ...scraped, template: "classic" })!.design.template)
      .toBe("cozy");
    expect(suggestedConfigToDraft({ ...scraped, template: "minimalist" })!.design.template)
      .toBe("minimalist");
    // Unbekanntes fällt auf den Standard zurück, statt die Vorschau zu brechen.
    expect(suggestedConfigToDraft({ ...scraped, template: "gibtsnicht" })!.design.template)
      .toBe("modern");
  });

  it("übernimmt nur gültige Hex-Farben", () => {
    const d = suggestedConfigToDraft(scraped)!;
    expect(d.design.primaryColor).toBe("#1a1a2e");
    expect(d.design.backgroundColor).toBe("#f8f8f8");

    const bad = suggestedConfigToDraft({
      ...scraped,
      primaryColor: "rgb(1,2,3)",
      secondaryColor: "",
    })!;
    expect(bad.design.primaryColor).toBeUndefined();
    expect(bad.design.secondaryColor).toBeUndefined();
  });

  it("bildet Gerichte ab und leitet die Kategorien daraus ab", () => {
    const d = suggestedConfigToDraft(scraped)!;
    expect(d.content.menuItems).toHaveLength(2);
    expect(d.content.menuItems![0]).toMatchObject({
      name: "Flat White",
      price: 3.8,
      category: "Kaffee",
      available: true,
    });
    expect(d.content.categories).toEqual(["Kaffee", "Gebäck"]);
  });

  it("verwirft Gerichte ohne Namen", () => {
    const d = suggestedConfigToDraft({
      ...scraped,
      menuItems: [{ name: "  " }, { description: "ohne Namen" }, { name: "Espresso" }],
    })!;
    expect(d.content.menuItems!.map((m) => m.name)).toEqual(["Espresso"]);
  });

  it("vergibt stabile IDs – gleicher Scrape, gleiche IDs", () => {
    const a = suggestedConfigToDraft(scraped)!;
    const b = suggestedConfigToDraft(scraped)!;
    expect(a.content.menuItems!.map((m) => m.id)).toEqual(
      b.content.menuItems!.map((m) => m.id),
    );
    expect(a.content.menuItems![0].id).toBe("scraped-dish-0-flat-white");
  });

  it("filtert Galerie-Einträge auf http(s) und entfernt Dubletten", () => {
    const d = suggestedConfigToDraft({
      ...scraped,
      gallery: [
        "https://example.com/a.jpg",
        "https://example.com/a.jpg",
        "/relativ.jpg",
        "data:image/png;base64,AAA",
        "https://example.com/c.jpg",
      ],
    })!;
    expect(d.content.gallery!.map((g) => g.url)).toEqual([
      "https://example.com/a.jpg",
      "https://example.com/c.jpg",
    ]);
  });

  it("übernimmt Öffnungszeiten inklusive Ruhetag, überspringt unvollständige Tage", () => {
    const d = suggestedConfigToDraft({
      ...scraped,
      openingHours: {
        monday: { open: "08:00", close: "18:00", closed: false },
        tuesday: { open: "09:00" }, // ohne close -> überspringen
        sunday: { open: "10:00", close: "16:00", closed: true },
      },
    })!;
    expect(Object.keys(d.content.openingHours!)).toEqual(["monday", "sunday"]);
    expect(d.content.openingHours!.sunday.closed).toBe(true);
  });

  it("baut Kontaktwege aus Telefon und E-Mail", () => {
    const d = suggestedConfigToDraft(scraped)!;
    expect(d.contact.contactMethods).toEqual([
      { type: "phone", value: "+49 221 123456" },
      { type: "email", value: "hallo@goldstueck.de" },
    ]);
    expect(d.contact.phone).toBe("+49 221 123456");
  });

  it("hebt Felder ohne Ziel im Konfigurator getrennt auf, statt sie zu verlieren", () => {
    const d = suggestedConfigToDraft(scraped)!;
    expect(d.unmapped).toMatchObject({ rating: 4.8, reviewCount: 128, menuSource: "ocr" });
  });

  it("beschreibt den Entwurf für die Oberfläche", () => {
    const parts = describeDraft(suggestedConfigToDraft(scraped));
    expect(parts).toContain("Name: Café Goldstück");
    expect(parts).toContain("2 Gerichte");
    expect(parts).toContain("2 Bilder");
    expect(describeDraft(null)).toEqual([]);
  });
});

describe("mergeSection", () => {
  it("füllt leere Felder", () => {
    const r = mergeSection({ name: "", type: "" }, { name: "Café Goldstück", type: "cafe" });
    expect(r.merged).toEqual({ name: "Café Goldstück", type: "cafe" });
    expect(r.applied).toEqual(["name", "type"]);
  });

  it("überschreibt NIEMALS, was der Nutzer eingetippt hat", () => {
    const r = mergeSection({ name: "Mein Laden", type: "" }, { name: "Café Goldstück", type: "cafe" });
    expect(r.merged.name).toBe("Mein Laden");
    expect(r.merged.type).toBe("cafe");
    expect(r.applied).toEqual(["type"]);
  });

  it("behandelt einen unveränderten Standardwert als frei", () => {
    // Der Konfigurator startet mit primaryColor "#4F46E5". Steht der Wert noch
    // darauf, hat niemand ihn gewählt – die gescrapte Farbe darf greifen.
    const r = mergeSection(
      { primaryColor: "#4F46E5" },
      { primaryColor: "#660c21" },
      { primaryColor: "#4F46E5" },
    );
    expect(r.merged.primaryColor).toBe("#660c21");
  });

  it("lässt eine bewusst gewählte Farbe stehen", () => {
    const r = mergeSection(
      { primaryColor: "#123456" },
      { primaryColor: "#660c21" },
      { primaryColor: "#4F46E5" },
    );
    expect(r.merged.primaryColor).toBe("#123456");
    expect(r.applied).toEqual([]);
  });

  it("füllt leere Listen, rührt gefüllte nicht an", () => {
    const scraped = [{ id: "a", name: "Flat White" }];
    expect(mergeSection({ menuItems: [] }, { menuItems: scraped }).merged.menuItems)
      .toEqual(scraped);
    const eigene = [{ id: "x", name: "Eigenes Gericht" }];
    expect(mergeSection({ menuItems: eigene }, { menuItems: scraped }).merged.menuItems)
      .toEqual(eigene);
  });

  it("ignoriert undefined im Entwurf", () => {
    const r = mergeSection({ slogan: "" }, { slogan: undefined });
    expect(r.merged.slogan).toBe("");
    expect(r.applied).toEqual([]);
  });

  it("stellt den Feldern auf Wunsch den Bereich voran", () => {
    const r = mergeSection({ name: "" }, { name: "X" }, {}, "business");
    expect(r.applied).toEqual(["business.name"]);
  });
});
