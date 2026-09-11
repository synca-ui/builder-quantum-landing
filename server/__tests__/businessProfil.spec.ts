// @vitest-environment node
/**
 * Betriebsprofil und Speisekarte aus der veröffentlichten Konfiguration
 * (server/services/businessProfil.ts) - die reine Abbildung, ohne Datenbank.
 *
 * Gemessen am echten Fall haus-toeller.de (04.09.2026): Was der automatische
 * Konfigurator dort veröffentlicht, muss in der Maitr-App als vollständiger
 * Betrieb ankommen - Slogan, Adresse mit Postleitzahl, Telefon, Öffnungszeiten
 * mit Ruhetag, soziale Netze, Speisekarte.
 */
import { describe, expect, it } from "vitest";
import {
  betriebsprofilAusConfig,
  preisAlsZahl,
  speisekarteAusConfig,
  strengeOeffnungszeiten,
} from "../services/businessProfil";

/** Die Konfiguration, wie shared/autoPublish.ts sie für haus-toeller.de baut. */
const TOELLER = {
  business: {
    name: "Haus Töller",
    type: "bar",
    location: "Weyerstraße 96, 50676 Köln",
    slogan: "Traditionelles Kölsches Brauhaus",
    uniqueDescription: "Kölsch vom Holzfass, hausgemachte rheinische Küche.",
    logo: { url: "https://www.haus-toeller.de/assets/img/icon-512.png" },
  },
  design: { primaryColor: "#0a1b2e", template: "modern" },
  content: {
    openingHours: {
      monday: { open: "17:00", close: "23:59", closed: false },
      saturday: { open: "17:00", close: "23:59", closed: false },
      sunday: { open: "00:00", close: "00:00", closed: false },
    },
    menuItems: [
      { id: "a", name: "Halver Hahn", price: "4.90", category: "Kalte Speisen" },
      { id: "b", name: "Himmel un Ääd", price: "14,50 €", category: "Warme Speisen", description: "mit Flönz" },
      { id: "c", name: "Tagessuppe", price: "auf Anfrage", category: "Suppe" },
      { id: "d", name: "   ", price: "1.00", category: "Suppe" },
    ],
  },
  contact: {
    phone: "0221 2589316",
    email: "info@haus-toeller.de",
    contactMethods: [{ type: "phone", value: "0221 2589316" }],
    socialMedia: {
      facebook: "https://www.facebook.com/haustoeller/",
      instagram: "https://www.instagram.com/haustoeller/",
      tiktok: "",
    },
  },
};

describe("betriebsprofilAusConfig", () => {
  it("bringt den ganzen Betrieb mit - nicht nur den Namen", () => {
    const profil = betriebsprofilAusConfig(TOELLER, {
      publishedUrl: "https://haus-toeller.maitr.de",
    });
    expect(profil.tagline).toBe("Traditionelles Kölsches Brauhaus");
    expect(profil.description).toContain("Kölsch vom Holzfass");
    expect(profil.cuisine).toBe("bar");
    expect(profil.logoUrl).toBe("https://www.haus-toeller.de/assets/img/icon-512.png");
    expect(profil.contactInfo).toEqual({
      phone: "0221 2589316",
      email: "info@haus-toeller.de",
      address: "Weyerstraße 96, 50676 Köln",
      website: "https://haus-toeller.maitr.de",
    });
    expect(profil.postalCode).toBe("50676");
    // Leere Kanäle fallen weg.
    expect(profil.socialLinks).toEqual({
      facebook: "https://www.facebook.com/haustoeller/",
      instagram: "https://www.instagram.com/haustoeller/",
    });
  });

  it("liest auch die flache Altform", () => {
    const profil = betriebsprofilAusConfig({
      businessName: "Alt",
      slogan: "Flach",
      location: "Hauptstr. 1, 48143 Münster",
      phone: "0251 1",
      openingHours: { friday: { open: "11:00", close: "22:00", closed: false } },
    });
    expect(profil.tagline).toBe("Flach");
    expect(profil.contactInfo?.phone).toBe("0251 1");
    expect(profil.postalCode).toBe("48143");
    expect(profil.openingHours).toEqual({ friday: { closed: false, open: "11:00", close: "22:00" } });
  });

  it("lässt Platzhalter-Logos und data:-URLs draußen", () => {
    expect(
      betriebsprofilAusConfig({ business: { logo: { url: "https://example.com/apple-touch-icon.png" } } })
        .logoUrl,
    ).toBeUndefined();
    expect(
      betriebsprofilAusConfig({ business: { logo: { url: "data:image/png;base64,AAAA" } } }).logoUrl,
    ).toBeUndefined();
  });

  it("schreibt nichts, wo nichts ist", () => {
    expect(betriebsprofilAusConfig({})).toEqual({});
  });
});

describe("strengeOeffnungszeiten", () => {
  it("macht aus der losen Konfigurator-Form die enge App-Form inkl. Ruhetag", () => {
    expect(strengeOeffnungszeiten(TOELLER.content.openingHours)).toEqual({
      monday: { closed: false, open: "17:00", close: "23:59" },
      saturday: { closed: false, open: "17:00", close: "23:59" },
      sunday: { closed: true },
    });
  });

  it("wirft unbekannte Tage und ungültige Zeiten weg statt sie zu erfinden", () => {
    expect(
      strengeOeffnungszeiten({
        Montag: { open: "09:00", close: "18:00", closed: false },
        tuesday: { open: "9-18", close: "", closed: false },
        Friday: { open: "11:00", close: "23:00", closed: false },
      }),
    ).toEqual({ friday: { closed: false, open: "11:00", close: "23:00" } });
    expect(strengeOeffnungszeiten({ tuesday: { open: "99:99", close: "10:00", closed: false } })).toBeUndefined();
    expect(strengeOeffnungszeiten({})).toBeUndefined();
    expect(strengeOeffnungszeiten(null)).toBeUndefined();
  });
});

describe("speisekarteAusConfig", () => {
  it("gruppiert in Kartenreihenfolge, liest jede Preisschreibweise, lässt Leeres weg", () => {
    const karte = speisekarteAusConfig(TOELLER);
    expect(karte.map((k) => k.name)).toEqual(["Kalte Speisen", "Warme Speisen", "Suppe"]);
    expect(karte[0].items).toEqual([{ name: "Halver Hahn", price: 4.9 }]);
    expect(karte[1].items[0]).toEqual({ name: "Himmel un Ääd", price: 14.5, description: "mit Flönz" });
    // "auf Anfrage" → 0; das Gericht ohne Namen fehlt.
    expect(karte[2].items).toEqual([{ name: "Tagessuppe", price: 0 }]);
  });

  it("liefert eine leere Karte, wenn die Konfiguration keine hat", () => {
    expect(speisekarteAusConfig({})).toEqual([]);
    expect(speisekarteAusConfig({ content: { menuItems: "kaputt" } })).toEqual([]);
  });
});

describe("preisAlsZahl", () => {
  it("versteht Punkt, Komma, Euro-Zeichen und Zahlen", () => {
    expect(preisAlsZahl("14.50")).toBe(14.5);
    expect(preisAlsZahl("14,5")).toBe(14.5);
    expect(preisAlsZahl("14,50 €")).toBe(14.5);
    expect(preisAlsZahl("€ 9")).toBe(9);
    expect(preisAlsZahl(12)).toBe(12);
    expect(preisAlsZahl("auf Anfrage")).toBe(0);
    expect(preisAlsZahl(-3)).toBe(0);
    expect(preisAlsZahl(undefined)).toBe(0);
  });
});
