/**
 * Die ausgelieferte Seite erfindet nichts — und verliert das Logo nicht.
 *
 * ZWEI BEFUNDE, beide am echten Fall haus-toeller.de nachgestellt.
 *
 * 1. `normalizeConfig` füllte leere Felder mit den Musterdaten des
 *    Geschäftstyps (client/lib/businessTypeDefaults.ts), und BEIDE Renderer
 *    der veröffentlichten Seite riefen es ohne das Gegenargument auf. Ein
 *    automatisch veröffentlichter Betrieb ohne erkannte Speisekarte
 *    (businessType "bar") bekam damit "Mojito 9.50 · Aperol Spritz 8.50 · Old
 *    Fashioned 11.00" und die Öffnungszeiten 18:00–02:00 auf seine echte
 *    Web-App gestellt.
 *
 * 2. `normalizeLogo` schickte den Wert durch `JSON.parse`. Beide öffentlichen
 *    Feldlisten des Servers liefern das Logo aber als blosse Adresse
 *    (`logo: business.logo?.url`) — der Parse warf, das Logo verschwand von
 *    JEDER ausgelieferten Seite.
 */
import { describe, it, expect } from "vitest";
import { normalizeConfig } from "../normalizeConfig";

/** Was der Server für Haus Töller ausliefert: kein Menü, keine Zeiten, Logo als String. */
const VOM_SERVER = {
  businessName: "Haus Töller",
  businessType: "bar",
  slogan: "Traditionelles Kölsches Brauhaus",
  location: "Weyerstraße 96, 50676 Köln",
  logo: "https://qzsdrgvwoddqkvqxhxfi.supabase.co/storage/v1/object/public/media/logo.png",
  menuItems: [],
  gallery: [],
  openingHours: {},
  primaryColor: "#0a1b2e",
};

describe("normalizeConfig für die ausgelieferte Seite (applyDefaults=false)", () => {
  it("stellt keine erfundene Speisekarte auf die Seite", () => {
    const c = normalizeConfig(VOM_SERVER as any, false);
    expect(c.content.menuItems).toEqual([]);
    // Die Vorgabe des Geschäftstyps "bar" wäre eine Cocktailkarte gewesen.
    const namen = JSON.stringify(c.content.menuItems);
    expect(namen).not.toContain("Mojito");
    expect(namen).not.toContain("Aperol");
  });

  it("erfindet keine Öffnungszeiten, wenn keine hinterlegt sind", () => {
    const c = normalizeConfig(VOM_SERVER as any, false);
    // Leer heisst leer. Die Anzeige blendet sich dann aus bzw. schreibt
    // "Keine Angabe" — beides ehrlicher als 18:00–02:00 oder 09:00–22:00.
    expect(c.content.openingHours).toEqual({});
  });

  it("gibt hinterlegte Öffnungszeiten unverändert weiter, inklusive Ruhetag", () => {
    const c = normalizeConfig(
      {
        ...VOM_SERVER,
        openingHours: {
          monday: { open: "17:00", close: "23:59", closed: false },
          sunday: { open: "00:00", close: "00:00", closed: true },
        },
      } as any,
      false,
    );
    expect(c.content.openingHours.monday).toEqual({
      open: "17:00",
      close: "23:59",
      closed: false,
    });
    expect(c.content.openingHours.sunday.closed).toBe(true);
    // Nicht genannte Tage sind Ruhetage (Commit 30004bd), keine Öffnungstage.
    expect(c.content.openingHours.tuesday).toEqual({
      open: "",
      close: "",
      closed: true,
    });
  });

  it("behält die Musterdaten für die Vorschau des Konfigurators", () => {
    // Dort sind sie ein Vorschlag, den der Wirt vor sich sieht und
    // überschreibt — nicht etwas, das ein Gast zu lesen bekommt.
    const vorschau = normalizeConfig(VOM_SERVER as any);
    expect(vorschau.content.menuItems.length).toBeGreaterThan(0);
  });
});

describe("normalizeLogo", () => {
  it("nimmt die blosse Adresse an, die der Server wirklich liefert", () => {
    const c = normalizeConfig(VOM_SERVER as any, false);
    expect(c.business.logo).toEqual({ url: VOM_SERVER.logo });
  });

  it("versteht weiterhin die Objektform und JSON aus der Datenbank", () => {
    expect(
      normalizeConfig(
        { ...VOM_SERVER, logo: { url: "https://x.de/l.png" } } as any,
        false,
      ).business.logo,
    ).toEqual({ url: "https://x.de/l.png" });
    expect(
      normalizeConfig(
        { ...VOM_SERVER, logo: '{"url":"https://x.de/l.png"}' } as any,
        false,
      ).business.logo,
    ).toEqual({ url: "https://x.de/l.png" });
  });

  it("macht aus Unbrauchbarem kein Logo", () => {
    for (const wert of ["", "   ", null, undefined, 42]) {
      expect(
        normalizeConfig({ ...VOM_SERVER, logo: wert } as any, false).business
          .logo,
      ).toBeUndefined();
    }
  });
});
