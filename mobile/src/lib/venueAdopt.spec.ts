/**
 * Vom Server-Betrieb zum App-Profil (mobile/src/lib/venueAdopt.ts).
 */
import { describe, expect, it } from "vitest";
import {
  darfMenuUebernehmen,
  kategorienDerKarte,
  menuZeilenAusServer,
  preisText,
  profilAusSchnappschuss,
  profilAusVenue,
  zeilenAusOeffnungszeiten,
  type ProfilAusVenue,
} from "./venueAdopt";

describe("zeilenAusOeffnungszeiten", () => {
  it("fasst gleiche Tage in Folge zusammen und nennt den Ruhetag", () => {
    const zeilen = zeilenAusOeffnungszeiten({
      monday: { closed: false, open: "17:00", close: "23:59" },
      tuesday: { closed: false, open: "17:00", close: "23:59" },
      wednesday: { closed: false, open: "17:00", close: "23:59" },
      thursday: { closed: false, open: "17:00", close: "23:59" },
      friday: { closed: false, open: "17:00", close: "23:59" },
      saturday: { closed: false, open: "17:00", close: "23:59" },
      sunday: { closed: true },
    });
    expect(zeilen).toEqual([
      { id: "monday_saturday", label: "Mo bis Sa", value: "17:00 – 23:59" },
      { id: "sunday", label: "Sonntag", value: "Geschlossen", closed: true },
    ]);
  });

  it("zwei Tage heißen 'und', einzelne Tage ausgeschrieben, führende Null fällt", () => {
    expect(
      zeilenAusOeffnungszeiten({
        saturday: { closed: false, open: "09:30", close: "17:00" },
        sunday: { closed: false, open: "09:30", close: "17:00" },
        monday: { closed: false, open: "08:00", close: "18:00" },
      }),
    ).toEqual([
      { id: "monday", label: "Montag", value: "8:00 – 18:00" },
      { id: "saturday_sunday", label: "Sa und So", value: "9:30 – 17:00" },
    ]);
  });

  it("fasst nur lückenlose Tage zusammen - ein unbekannter Tag dazwischen trennt", () => {
    expect(
      zeilenAusOeffnungszeiten({
        monday: { closed: false, open: "09:00", close: "18:00" },
        wednesday: { closed: false, open: "09:00", close: "18:00" },
        thursday: { closed: false, open: "09:00", close: "18:00" },
      }),
    ).toEqual([
      { id: "monday", label: "Montag", value: "9:00 – 18:00" },
      { id: "wednesday_thursday", label: "Mi und Do", value: "9:00 – 18:00" },
    ]);
  });

  it("erfindet nichts: ohne Zeiten keine Zeilen", () => {
    expect(zeilenAusOeffnungszeiten(undefined)).toEqual([]);
    expect(zeilenAusOeffnungszeiten({})).toEqual([]);
  });
});

describe("profilAusVenue", () => {
  it("übernimmt das Profil des Servers und lässt Unbekanntes leer statt Fixture", () => {
    const profil = profilAusVenue({
      id: "biz-1",
      name: "Haus Töller",
      tagline: "Traditionelles Kölsches Brauhaus",
      description: "Kölsch vom Holzfass.",
      street: "Weyerstraße 96",
      city: "50676 Köln",
      timezone: "Europe/Berlin",
      tags: ["Kölsch"],
      openingHours: { sunday: { closed: true } },
    });
    expect(profil).toEqual({
      name: "Haus Töller",
      tagline: "Traditionelles Kölsches Brauhaus",
      bio: "Kölsch vom Holzfass.",
      instagramBio: "Traditionelles Kölsches Brauhaus",
      street: "Weyerstraße 96",
      city: "50676 Köln",
      tags: ["Kölsch"],
      hours: [{ id: "sunday", label: "Sonntag", value: "Geschlossen", closed: true }],
    });
    // Ein frisch im Onboarding angelegter Betrieb kennt nur seinen Namen.
    expect(profilAusVenue({ id: "b", name: "Neu", timezone: "Europe/Berlin", tags: [] })).toEqual({
      name: "Neu",
      tagline: "",
      bio: "",
      instagramBio: "",
      street: "",
      city: "",
      tags: [],
      hours: [],
    });
  });

  it("übernimmt Telefon, Website, Instagram, Logo und Slug der Veröffentlichung", () => {
    const profil = profilAusVenue({
      id: "biz-1",
      name: "Haus Töller",
      timezone: "Europe/Berlin",
      tags: [],
      slug: "haus-toeller",
      phone: "0221 2589316",
      website: "https://haus-toeller.maitr.de",
      logoUrl: "https://www.haus-toeller.de/assets/img/icon-512.png",
      socialLinks: { instagram: "https://www.instagram.com/haustoeller/", tiktok: "" },
    });
    expect(profil).toMatchObject({
      phone: "0221 2589316",
      website: "https://haus-toeller.maitr.de",
      instagram: "https://www.instagram.com/haustoeller/",
      logoUrl: "https://www.haus-toeller.de/assets/img/icon-512.png",
      slug: "haus-toeller",
    });
  });

  it("schreibt fehlende Zusatzfelder als undefined aus - der Store-Merge erbt sonst den alten Betrieb", () => {
    const vorher = { ...profilAusVenue({ id: "a", name: "Alt", phone: "0221 1", timezone: "Europe/Berlin", tags: [] }) };
    const neu = profilAusVenue({ id: "b", name: "Neu", timezone: "Europe/Berlin", tags: [] });
    // Genau so übernimmt `adoptVenue` in store.tsx: `{ ...v, ...profil }`.
    const gemischt = { ...vorher, ...neu };
    expect(gemischt.phone).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(neu, "phone")).toBe(true);
    // Leere Strings sind keine Angabe.
    expect(profilAusVenue({ id: "c", name: "C", phone: "  ", socialLinks: { instagram: "" }, timezone: "Europe/Berlin", tags: [] })).toMatchObject({
      phone: undefined,
      instagram: undefined,
    });
  });
});

describe("profilAusSchnappschuss", () => {
  const VORGABE: ProfilAusVenue = {
    name: "Café Goldstück",
    tagline: "Kaffee",
    bio: "Bio",
    instagramBio: "Ig",
    street: "Körnerstr. 27",
    city: "50823 Köln",
    tags: ["WLAN"],
    hours: [{ id: "mo_fr", label: "Mo bis Fr", value: "8:00 – 18:00" }],
  };

  it("ein alter Schnappschuss ohne die neuen Felder bleibt, wie er ist", () => {
    const alt = {
      name: "Haus Töller",
      tagline: "Brauhaus",
      bio: "",
      instagramBio: "Brauhaus",
      street: "Weyerstraße 96",
      city: "50676 Köln",
      tags: [],
      hours: [{ id: "sunday", label: "Sonntag", value: "Geschlossen", closed: true }],
    };
    const profil = profilAusSchnappschuss(alt, VORGABE);
    expect(profil).toEqual(alt);
    expect(profil?.phone).toBeUndefined();
  });

  it("übernimmt die neuen Felder, wenn sie gespeichert waren", () => {
    expect(
      profilAusSchnappschuss({ ...VORGABE, phone: "0221 1", instagram: "@haustoeller", slug: "haus-toeller" }, VORGABE),
    ).toMatchObject({ phone: "0221 1", instagram: "@haustoeller", slug: "haus-toeller" });
  });

  it("verwirft falsch geformte Felder statt beim ersten Lesen abzustürzen", () => {
    const profil = profilAusSchnappschuss(
      {
        name: 42,
        tagline: "Bleibt",
        hours: [{ id: "monday", label: "Montag", value: "9:00 – 17:00" }, { id: 1 }, null],
        tags: ["ok", 3],
        instagram: { url: "x" },
        phone: ["0221"],
      },
      VORGABE,
    );
    expect(profil).toMatchObject({
      name: "Café Goldstück",
      tagline: "Bleibt",
      tags: ["ok"],
      hours: [{ id: "monday", label: "Montag", value: "9:00 – 17:00" }],
    });
    expect(profil?.instagram).toBeUndefined();
    expect(profil?.phone).toBeUndefined();
    // Kein Objekt - kein Profil; der Anfangszustand bleibt.
    expect(profilAusSchnappschuss(null, VORGABE)).toBeNull();
    expect(profilAusSchnappschuss("kaputt", VORGABE)).toBeNull();
    expect(profilAusSchnappschuss([], VORGABE)).toBeNull();
  });
});

describe("Speisekarte vom Server", () => {
  it("formatiert Preise deutsch und markiert Server-Zeilen an der Kennung", () => {
    const zeilen = menuZeilenAusServer({
      categories: [
        { id: "c1", name: "Kalte Speisen", items: [{ id: "i1", name: "Halver Hahn", price: 4.9 }] },
        { id: "c2", name: "Suppe", items: [{ id: "i2", name: "Tagessuppe", price: 0 }] },
      ],
    });
    expect(zeilen).toEqual([
      { id: "srv-i1", name: "Halver Hahn", price: "4,90 €", category: "Kalte Speisen" },
      { id: "srv-i2", name: "Tagessuppe", price: "auf Anfrage", category: "Suppe" },
    ]);
    expect(preisText(14.5)).toBe("14,50 €");
    expect(menuZeilenAusServer(null)).toEqual([]);
  });

  it("überschreibt keine Karte, die der Wirt selbst angelegt hat", () => {
    expect(darfMenuUebernehmen([])).toBe(true);
    expect(darfMenuUebernehmen([{ id: "srv-i1" }])).toBe(true);
    expect(darfMenuUebernehmen([{ id: "srv-i1" }, { id: "m-3" }])).toBe(false);
  });
});

describe("kategorienDerKarte", () => {
  it("nimmt die Kategorien der Karte in Kartenreihenfolge statt fester Vorschläge", () => {
    // Genau der Fall, an dem die übernommene Karte unsichtbar blieb: Keine der
    // Kategorien heißt Kaffee/Gebäck/Frühstück/Getränke.
    expect(
      kategorienDerKarte([
        { category: "Kalte Speisen" },
        { category: "Warme Speisen" },
        { category: "Kalte Speisen" },
        { category: "" },
      ]),
    ).toEqual(["Kalte Speisen", "Warme Speisen", "Speisekarte"]);
    expect(kategorienDerKarte([])).toEqual([]);
  });
});
