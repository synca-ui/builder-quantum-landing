// @vitest-environment node
//
// Bewusst ohne jsdom: Die Abbildung ist eine reine Funktion und braucht kein DOM.
//
// Nachtrag 7.8.2026 zur Ursache des ERR_REQUIRE_ESM, das hier bisher als
// Paketfehler notiert war: Es ist die NODE-VERSION. jsdom 27 zieht
// html-encoding-sniffer@6, das per require() ein ESM-Modul lädt — das kann Node
// erst ab 22.12. Auf einem Rechner mit Node 22.11 fällt damit die GESAMTE
// Client-Suite still aus, und ein grüner Lauf sieht trotzdem vollständig aus.
// Mit einer neueren Node-Version läuft alles, auch ohne diese Zeile hier.
import { describe, expect, it } from "vitest";
import {
  suggestedConfigToDraft,
  plausibleBusinessName,
  plausibleEmail,
  istGalerieMuell,
  normalizeSocialLinks,
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

/**
 * A3.1 aus dem Feedback vom 6.8.2026: Der Betriebsname kam als "Herzlich" an —
 * aus dem "Herzlich willkommen" der Startseite. Die Ursache liegt im n8n-Flow;
 * hier steht die Absicherung, durch die jedes Scrape-Ergebnis muss.
 */
describe("plausibleBusinessName", () => {
  it("verwirft den Fehlerfall aus dem Feedback", () => {
    expect(plausibleBusinessName("Herzlich")).toBeUndefined();
    expect(plausibleBusinessName("Willkommen")).toBeUndefined();
  });

  it("schält die Begrüßung ab und behält den Namen dahinter", () => {
    expect(plausibleBusinessName("Herzlich willkommen im Gasthof Adler")).toBe(
      "Gasthof Adler",
    );
    expect(plausibleBusinessName("Willkommen bei uns im Landgasthof Krone")).toBe(
      "Landgasthof Krone",
    );
    expect(plausibleBusinessName("Welcome to Ristorante Bella Vista")).toBe(
      "Ristorante Bella Vista",
    );
  });

  it("nimmt aus einem Seitentitel den Teil, der ein Name sein kann", () => {
    expect(plausibleBusinessName("Gasthof Adler | Startseite")).toBe("Gasthof Adler");
    expect(plausibleBusinessName("Startseite – Hotel Krone")).toBe("Hotel Krone");
  });

  it("verwirft Gattungsbegriffe, die allein stehen", () => {
    // "Gasthof" ist kein Name, "Gasthof Adler" schon.
    expect(plausibleBusinessName("Restaurant")).toBeUndefined();
    expect(plausibleBusinessName("Speisekarte")).toBeUndefined();
    expect(plausibleBusinessName("Über uns")).toBeUndefined();
    expect(plausibleBusinessName("Gasthof")).toBeUndefined();
  });

  it("lässt echte Namen unangetastet", () => {
    expect(plausibleBusinessName("Gasthof Rössle")).toBe("Gasthof Rössle");
    expect(plausibleBusinessName("Ratskeller Leipzig")).toBe("Ratskeller Leipzig");
    expect(plausibleBusinessName("  Zum Löwen  ")).toBe("Zum Löwen");
  });

  it("lässt Anführungszeichen stehen, die zum Namen gehören", () => {
    // Echte Karte aus dem Messkorpus. Der Gedankenstrich trennt hier NICHT
    // Seitenmöbel ab, sondern steht mitten im Namen.
    expect(plausibleBusinessName("\u201eZUR POST\u201c HOTEL – GASTHOF")).toBe(
      "\u201eZUR POST\u201c HOTEL – GASTHOF",
    );
    // Umschließen sie den ganzen Namen, kommen sie weg.
    expect(plausibleBusinessName("\u201eZur Post\u201c")).toBe("Zur Post");
  });

  it("liefert lieber nichts als etwas Erfundenes", () => {
    expect(plausibleBusinessName("")).toBeUndefined();
    expect(plausibleBusinessName(undefined)).toBeUndefined();
    expect(plausibleBusinessName("   ")).toBeUndefined();
    expect(plausibleBusinessName("123")).toBeUndefined();
  });

  it("verwirft Handlungsaufforderungen von Buttons und Widgets", () => {
    // Echter Fall krawummel.de (Wix): Der Flow griff den Text des
    // Reservierungs-Widgets als Betriebsnamen.
    expect(plausibleBusinessName("Reserviere hier online")).toBeUndefined();
    expect(plausibleBusinessName("Jetzt online reservieren")).toBeUndefined();
    expect(plausibleBusinessName("Tisch reservieren")).toBeUndefined();
    expect(plausibleBusinessName("Jetzt bestellen")).toBeUndefined();
    expect(plausibleBusinessName("Online bestellen")).toBeUndefined();
    expect(plausibleBusinessName("Book a table")).toBeUndefined();
    expect(plausibleBusinessName("Order online now")).toBeUndefined();
  });

  it("hält echte Namen von der Aufforderungs-Regel fern", () => {
    // Enthält ein Wort außerhalb von Verb+Füllwörtern → kein Knopf.
    expect(plausibleBusinessName("Gasthaus Zur Bestellung")).toBe(
      "Gasthaus Zur Bestellung",
    );
    expect(plausibleBusinessName("Buchenhof")).toBe("Buchenhof");
    expect(plausibleBusinessName("Restaurant Bestella")).toBe(
      "Restaurant Bestella",
    );
  });
});

/**
 * Echter Fall krawummel.de: Der Flow fischte die Sentry-Fehlerberichtsadresse
 * des Wix-Baukastens aus dem JavaScript der Seite und lieferte sie als
 * Kontakt-E-Mail des Betriebs.
 */
describe("plausibleEmail", () => {
  it("verwirft Technik-Adressen aus Baukasten-JavaScript", () => {
    expect(
      plausibleEmail("605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com"),
    ).toBeUndefined();
    expect(plausibleEmail("abc@sentry.io")).toBeUndefined();
    expect(plausibleEmail("kontakt@o123.ingest.sentry.io")).toBeUndefined();
    expect(plausibleEmail("info@example.com")).toBeUndefined();
  });

  it("verwirft Maschinen-IDs als lokalen Teil", () => {
    expect(
      plausibleEmail("0123456789abcdef01234567@irgendein-dienst.de"),
    ).toBeUndefined();
  });

  it("lässt echte Adressen durch", () => {
    expect(plausibleEmail("info@grosser-kiepenkerl.de")).toBe(
      "info@grosser-kiepenkerl.de",
    );
    expect(plausibleEmail("  reservierung@krawummel.de ")).toBe(
      "reservierung@krawummel.de",
    );
  });

  it("verwirft alles, was keine Adresse ist", () => {
    expect(plausibleEmail("")).toBeUndefined();
    expect(plausibleEmail("kein-at-zeichen")).toBeUndefined();
    expect(plausibleEmail(undefined)).toBeUndefined();
  });
});

/**
 * Echter Fall krawummel.de: Zwischen den zehn "Galeriebildern" lagen zwei
 * 30×30-Icons, das generische Wix-Favicon und ein absichtlich unscharfer
 * Ladeplatzhalter (blur_2, 141×94).
 */
describe("istGalerieMuell", () => {
  it("erkennt Icons, Favicons und Ladeplatzhalter", () => {
    expect(
      istGalerieMuell(
        "https://static.wixstatic.com/media/0fdef751.png/v1/fill/w_30,h_30,al_c,q_85/0fdef751.png",
      ),
    ).toBe(true);
    expect(
      istGalerieMuell(
        "https://static.wixstatic.com/media/x.jpg/v1/fill/w_141,h_94,al_c,q_80,usm_0.66_1.00_0.01,blur_2/x.jpg",
      ),
    ).toBe(true);
    expect(istGalerieMuell("https://static.parastorage.com/client/pfavico.ico")).toBe(true);
    expect(istGalerieMuell("https://example.org/logo.svg")).toBe(true);
  });

  it("lässt echte Fotos durch", () => {
    expect(
      istGalerieMuell(
        "https://static.wixstatic.com/media/y.jpg/v1/fill/w_410,h_461,al_c,q_80/y.jpg",
      ),
    ).toBe(false);
    expect(
      istGalerieMuell("https://www.krawummel.de/uploads/terrasse.jpg"),
    ).toBe(false);
  });

  it("wirkt in der Galerie-Abbildung", () => {
    const draft = suggestedConfigToDraft({
      gallery: [
        "https://static.wixstatic.com/icon.png/v1/fill/w_30,h_30/icon.png",
        "https://www.krawummel.de/uploads/terrasse.jpg",
        "https://static.parastorage.com/client/pfavico.ico",
      ],
    } as SuggestedConfig)!;
    expect(draft.content.gallery?.map((g) => g.url)).toEqual([
      "https://www.krawummel.de/uploads/terrasse.jpg",
    ]);
  });
});

describe("Hintergrund-Entschärfung im Entwurf", () => {
  it("mildert grelle Scrape-Hintergründe ab (ein Scrape, ein Ergebnis)", () => {
    // krawummel.de lieferte #bada55 — über "Erst anpassen" landete das roh
    // auf der veröffentlichten Seite, während "Jetzt veröffentlichen"
    // dieselbe Farbe abmilderte.
    const draft = suggestedConfigToDraft({
      backgroundColor: "#bada55",
    } as SuggestedConfig)!;
    expect(draft.design.backgroundColor).toBeDefined();
    expect(draft.design.backgroundColor!.toLowerCase()).not.toBe("#bada55");
  });

  it("lässt weiche Farben buchstabengleich stehen", () => {
    const draft = suggestedConfigToDraft({
      backgroundColor: "#FBF7F0",
    } as SuggestedConfig)!;
    expect(draft.design.backgroundColor).toBe("#FBF7F0");
  });
});

/**
 * A3.3 aus dem Feedback vom 6.8.2026: "Social-Media-Konten korrekt übernehmen."
 *
 * Der Fehler war kein falscher Wert, sondern ein fehlendes Feld: siteDetails
 * las Instagram und Facebook aus dem HTML, der Publish-Endpunkt nahm sie unter
 * contact.socialMedia entgegen — dazwischen fiel alles auf den Boden.
 */
describe("normalizeSocialLinks", () => {
  it("übernimmt echte Profil-Adressen", () => {
    expect(
      normalizeSocialLinks({
        instagram: "https://www.instagram.com/gasthof_adler/",
        facebook: "https://facebook.com/GasthofAdler",
      }),
    ).toEqual({
      instagram: "https://www.instagram.com/gasthof_adler/",
      facebook: "https://facebook.com/GasthofAdler",
    });
  });

  it("verwirft ein Handle ohne Adresse", () => {
    // Aus "@gasthof_adler" eine URL zu bauen hieße, eine Adresse zu erfinden,
    // die es womöglich nicht gibt.
    expect(normalizeSocialLinks({ instagram: "@gasthof_adler" })).toEqual({});
    expect(normalizeSocialLinks({ facebook: "GasthofAdler" })).toEqual({});
  });

  it("verwirft einen Kanal, der nicht zur Adresse passt", () => {
    // Sonst führt das Instagram-Symbol auf Facebook.
    expect(
      normalizeSocialLinks({ instagram: "https://facebook.com/GasthofAdler" }),
    ).toEqual({});
  });

  it("ignoriert unbekannte Kanäle", () => {
    // Für die hat die Web-App weder Symbol noch Platz.
    expect(normalizeSocialLinks({ myspace: "https://myspace.com/x" })).toEqual({});
  });

  it("führt twitter und x zusammen", () => {
    expect(normalizeSocialLinks({ twitter: "https://twitter.com/adler" })).toEqual({
      x: "https://twitter.com/adler",
    });
    expect(normalizeSocialLinks({ x: "https://x.com/adler" })).toEqual({
      x: "https://x.com/adler",
    });
  });

  it("kommt mit fehlenden und kaputten Werten klar", () => {
    expect(normalizeSocialLinks(undefined)).toEqual({});
    expect(normalizeSocialLinks(null)).toEqual({});
    expect(normalizeSocialLinks({ instagram: "" })).toEqual({});
    expect(normalizeSocialLinks({ instagram: "nicht mal eine url" })).toEqual({});
  });

  it("landet über suggestedConfigToDraft im Entwurf", () => {
    const draft = suggestedConfigToDraft({
      businessName: "Gasthof Adler",
      socialMedia: { instagram: "https://instagram.com/adler" },
    });
    expect(draft?.contact.socialMedia).toEqual({
      instagram: "https://instagram.com/adler",
    });
  });
});
