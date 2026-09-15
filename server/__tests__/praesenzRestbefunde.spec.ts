// @vitest-environment node
/**
 * Restbefunde der Abschlussprüfung vom 15.09.2026: Mittagspausen aus Google,
 * Kulanz nur für dieselbe Website, "keine Reservierung" nur mit Beleg.
 */
import { describe, expect, it } from "vitest";
import { tageMitPauseAus, zeitenAusPerioden, googleEintragAus } from "../maitr/praesenz/places";
import { gleicheSeite } from "../maitr/praesenz";
import { datasetAusPraesenz, type GoogleEintrag, type PraesenzSnapshot } from "@maitr/core/analytics";

const MITTAG_ABEND = [0, 1, 2, 3, 4, 5, 6].flatMap((day) => [
  { open: { day, hour: 11, minute: 30 }, close: { day, hour: 14, minute: 30 } },
  { open: { day, hour: 17, minute: 30 }, close: { day, hour: 23, minute: 0 } },
]);

describe("Mittagspausen aus Google", () => {
  it("führt Pausentage getrennt, damit ein Betrieb mit Pause nicht wie einer ohne Zeiten aussieht", () => {
    expect(zeitenAusPerioden(MITTAG_ABEND)).toEqual({});
    expect(tageMitPauseAus(MITTAG_ABEND)).toEqual([
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ]);
    const eintrag = googleEintragAus({
      id: "p1",
      displayName: { text: "Haus Töller" },
      regularOpeningHours: { periods: MITTAG_ABEND.slice(0, 2) },
    });
    expect(eintrag.tageMitPause).toEqual(["sunday"]);
    expect(googleEintragAus({ id: "p2", displayName: { text: "X" } })).not.toHaveProperty("tageMitPause");
  });
});

describe("gleicheSeite", () => {
  it("vergleicht den Host ohne www, Pfad und Endschrägstrich", () => {
    expect(gleicheSeite("https://www.haus-toeller.de/", "http://haus-toeller.de")).toBe(true);
    expect(gleicheSeite("https://alt.de/", "https://neu.de/")).toBe(false);
    expect(gleicheSeite("kaputt", "kaputt")).toBe(false);
  });
});

describe("hasReservation nur mit Beleg", () => {
  const google: GoogleEintrag = {
    placeId: "p1",
    name: "Haus Töller",
    reviewCount: 10,
    bewertungen: [],
    fotos: [],
    fotoAnzahl: 0,
    status: "OPERATIONAL",
  };
  const basis: PraesenzSnapshot = {
    now: "2026-09-15T10:00:00.000Z",
    google,
    googleStatus: "bereit",
    website: null,
    maitr: { name: "Haus Töller", hatSpeisekarte: false, hatBeschreibung: false, tags: [] },
  };

  it("Google-Eintrag ohne Reservierungsattribut und ohne Website: keine Aussage", () => {
    expect(datasetAusPraesenz(basis).profile).not.toHaveProperty("hasReservation");
  });

  it("Googles Attribut oder eine erreichbare Website ohne Buchungsweg sind Aussagen", () => {
    expect(datasetAusPraesenz({ ...basis, google: { ...google, reservierbar: false } }).profile.hasReservation).toBe(false);
    expect(datasetAusPraesenz({ ...basis, google: { ...google, reservierbar: true } }).profile.hasReservation).toBe(true);
    const website = {
      url: "https://haus-toeller.de/",
      erreichbar: true,
      https: true,
      mobilTauglich: true,
      strukturierteDaten: false,
      speisekarteVerlinkt: false,
      oeffnungszeitenGefunden: false,
      adresseGefunden: false,
    };
    expect(datasetAusPraesenz({ ...basis, website }).profile.hasReservation).toBe(false);
    expect(
      datasetAusPraesenz({ ...basis, website: { ...website, erreichbar: false } }).profile,
    ).not.toHaveProperty("hasReservation");
  });
});
