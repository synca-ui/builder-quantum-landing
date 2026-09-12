/**
 * Vom Server-Betrieb zum App-Profil (mobile/src/lib/venueAdopt.ts).
 */
import { describe, expect, it } from "vitest";
import {
  darfMenuUebernehmen,
  menuZeilenAusServer,
  preisText,
  profilAusVenue,
  zeilenAusOeffnungszeiten,
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
