// @vitest-environment node
/**
 * Der Präsenzbericht aus öffentlichen Daten
 * (packages/core/src/analytics/oeffentlichePraesenz.ts).
 *
 * Gemessen am Muster eines echten Brauhauses: Google kennt Schnitt, Anzahl,
 * fünf Bewertungen, drei Fotos, Öffnungszeiten und Telefon, aber keine
 * Website; die Website ist erreichbar, mobil, mit Reservierung, ohne
 * strukturierte Daten; Maitr hat Karte und Beschreibung.
 */
import { describe, expect, it } from "vitest";
import {
  datasetAusPraesenz,
  oeffnungszeitenWeichenAb,
  praesenzBericht,
  type GoogleEintrag,
  type PraesenzSnapshot,
  type WebsitePruefung,
} from "../analytics/oeffentlichePraesenz";

const NOW = "2026-09-15T09:00:00.000Z";
const tageZurueck = (tage: number) => new Date(Date.parse(NOW) - tage * 86_400_000).toISOString();

const GOOGLE: GoogleEintrag = {
  placeId: "ChIJtoeller",
  name: "Haus Töller",
  adresse: "Weyerstraße 96, 50676 Köln",
  rating: 4.6,
  reviewCount: 312,
  bewertungen: [
    { id: "r1", autor: "Anna K.", rating: 5, text: "Tolles Kölsch, super freundliches Personal.", createdAt: tageZurueck(4) },
    { id: "r2", autor: "Ben", rating: 3, text: "Lange Wartezeit am Samstag, sonst okay.", createdAt: tageZurueck(20) },
    { id: "r3", autor: "Cem", rating: 5, text: "Himmel un Ääd wie bei Oma.", createdAt: tageZurueck(70) },
  ],
  fotos: ["https://lh3.googleusercontent.com/a", "https://lh3.googleusercontent.com/b"],
  fotoAnzahl: 3,
  oeffnungszeiten: {
    monday: { closed: false, open: "17:00", close: "23:59" },
    sunday: { closed: true },
  },
  telefon: "0221 2589316",
  mapsUrl: "https://maps.google.com/?cid=1",
  status: "OPERATIONAL",
  aussenplaetze: true,
  reservierbar: false,
};

const WEBSITE: WebsitePruefung = {
  url: "https://www.haus-toeller.de/",
  erreichbar: true,
  https: true,
  titel: "Haus Töller – Kölsches Brauhaus",
  mobilTauglich: true,
  strukturierteDaten: false,
  speisekarteVerlinkt: true,
  reservierung: { anbieter: "OpenTable", url: "https://www.opentable.de/haus-toeller" },
  oeffnungszeitenGefunden: true,
  adresseGefunden: true,
  instagram: "https://www.instagram.com/haustoeller/",
};

const SNAPSHOT: PraesenzSnapshot = {
  now: NOW,
  google: GOOGLE,
  googleStatus: "bereit",
  website: WEBSITE,
  maitr: {
    name: "Haus Töller",
    hatSpeisekarte: true,
    hatBeschreibung: true,
    tags: [],
    oeffnungszeiten: {
      monday: { closed: false, open: "17:00", close: "23:59" },
      sunday: { closed: true },
    },
    instagram: "https://www.instagram.com/haustoeller/",
    website: "https://haus-toeller.maitr.de",
  },
};

describe("datasetAusPraesenz", () => {
  it("nimmt Googles Gesamtschnitt, die fünf Bewertungen und nur gemessene Profilsignale", () => {
    const d = datasetAusPraesenz(SNAPSHOT);
    expect(d.reviewSummary).toEqual({ averageRating: 4.6, total: 312 });
    expect(d.reviews.map((r) => r.id)).toEqual(["r1", "r2", "r3"]);
    expect(d.profile).toEqual({
      hasMenu: true,
      hasBio: true,
      hasInstagram: true,
      photoCount: 3,
      hasOpeningHours: true,
      hasWebsite: false,
      hasPhone: true,
      hasOutdoorAttribute: true,
      hasReservation: true,
    });
    expect(d.coverage).toEqual({ unknown: ["responsiveness", "reach"], estimated: ["activity"] });
  });

  it("lässt ohne Google-Eintrag alles offen, was nur Google messen kann", () => {
    const d = datasetAusPraesenz({ ...SNAPSHOT, google: null, googleStatus: "kein_schluessel", website: null });
    expect(d.profile).toEqual({ hasMenu: true, hasBio: true, hasInstagram: true });
    expect(d.reviewSummary).toBeUndefined();
    expect(d.coverage?.unknown).toEqual(["responsiveness", "reach", "rating", "activity"]);
    expect(d.coverage?.estimated).toEqual([]);
  });

  /*
   * ANLASS (Prüfbefund): Eine Seite, die beim Abruf kurz hing, trägt nur negative
   * Befunde. Weil `website` gesetzt war, galt "keine Reservierung" als GEMESSEN -
   * Score runter, Hebel "Online-Reservierung anbieten" obendrauf.
   */
  it("wertet eine unerreichbare Website wie keine: keine gemessene 'keine Reservierung', keine Karte aus ihr", () => {
    const ausfall: WebsitePruefung = {
      url: "https://www.haus-toeller.de/",
      erreichbar: false,
      https: true,
      mobilTauglich: false,
      strukturierteDaten: false,
      speisekarteVerlinkt: false,
      oeffnungszeitenGefunden: false,
      adresseGefunden: false,
      fehler: "Zeitüberschreitung - die Seite hat nicht rechtzeitig geantwortet.",
    };
    const ohneMaitrWissen = { ...SNAPSHOT.maitr, hatSpeisekarte: false, instagram: undefined };
    const d = datasetAusPraesenz({ ...SNAPSHOT, google: null, googleStatus: "kein_schluessel", website: ausfall, maitr: ohneMaitrWissen });
    expect(d.profile).not.toHaveProperty("hasReservation");
    expect(d.profile).toEqual({ hasMenu: false, hasBio: true, hasInstagram: false });
    expect(praesenzBericht({ ...SNAPSHOT, google: null, googleStatus: "kein_schluessel", website: ausfall }).hebel.map((h) => h.id)).not.toContain(
      "reservation",
    );

    // Gegenprobe: Dieselbe Seite erreichbar, ohne Reservierungs-Widget - das IST gemessen.
    const erreichbarOhne = { ...WEBSITE, reservierung: undefined };
    expect(datasetAusPraesenz({ ...SNAPSHOT, google: null, website: erreichbarOhne }).profile.hasReservation).toBe(false);
  });
});

describe("praesenzBericht", () => {
  it("rechnet den Score über die bekannten Faktoren und sagt, worauf er beruht", () => {
    const b = praesenzBericht(SNAPSHOT);
    expect(b.deckung.gemessen).toBe(0.7);
    expect(b.deckung.unbekannt).toEqual(["responsiveness", "reach"]);
    expect(b.deckung.hinweis).toContain("3 von 5 Faktoren");
    expect(b.deckung.hinweis).toContain("Google-Freigabe");
    expect(b.score).toBeGreaterThan(60);
    expect(b.score).toBeLessThan(90);
    expect(b.bewertungen).toMatchObject({ schnitt: 4.6, anzahl: 312, juengste: tageZurueck(4) });
    expect(b.bewertungen.themen.map((t) => t.topic)).toContain("Wartezeit");
  });

  it("nennt die fehlenden Signale als Hebel mit Punkten - Fotos und Website bei Google", () => {
    const b = praesenzBericht(SNAPSHOT);
    const ids = b.hebel.map((h) => h.id);
    expect(ids).toContain("photos");
    expect(ids).toContain("website");
    expect(ids).not.toContain("menu");
    expect(ids).not.toContain("hours");
    expect(ids).not.toContain("google_nicht_gefunden");
    const website = b.hebel.find((h) => h.id === "website")!;
    expect(website.punkte).toBeGreaterThan(0);
    expect(website.detail).toContain("https://haus-toeller.maitr.de");
    expect(website.url).toBe(GOOGLE.mapsUrl);
    // Absteigend nach Punkten.
    const punkte = b.hebel.map((h) => h.punkte);
    expect([...punkte].sort((a, c) => c - a)).toEqual(punkte);
  });

  it("macht aus der Website-Prüfung eine Befundliste mit Klartext", () => {
    const b = praesenzBericht(SNAPSHOT);
    const befund = Object.fromEntries(b.websiteBefunde.map((w) => [w.id, w]));
    expect(befund.erreichbar.ok).toBe(true);
    expect(befund.schema.ok).toBe(false);
    expect(befund.reservation).toMatchObject({ ok: true, detail: "über OpenTable" });
    expect(befund.instagram.ok).toBe(true);
  });

  it("ohne Google-Eintrag: Hinweis statt erfundener Sterne, kein Google-Hebel", () => {
    const b = praesenzBericht({ ...SNAPSHOT, google: null, googleStatus: "kein_schluessel" });
    expect(b.bewertungen).toEqual({ schnitt: null, anzahl: 0, themen: [] });
    expect(b.deckung.hinweis).toContain("noch nicht abgerufen");
    expect(b.hebel.map((h) => h.id)).not.toContain("photos");
    expect(b.hebel.map((h) => h.id)).not.toContain("rating");
  });

  it("nicht gefunden: der erste Hebel ist das fehlende Unternehmensprofil", () => {
    const b = praesenzBericht({ ...SNAPSHOT, google: null, googleStatus: "nicht_gefunden" });
    expect(b.hebel[0]).toMatchObject({ id: "google_nicht_gefunden", url: "https://business.google.com/" });
  });

  it("warnt, wenn Google und Maitr verschiedene Öffnungszeiten nennen", () => {
    const b = praesenzBericht({
      ...SNAPSHOT,
      maitr: {
        ...SNAPSHOT.maitr,
        oeffnungszeiten: { monday: { closed: false, open: "16:00", close: "23:00" }, sunday: { closed: true } },
      },
    });
    const diff = b.hebel.find((h) => h.id === "hours_diff")!;
    expect(diff.detail).toContain("Mo");
    expect(diff.punkte).toBe(0);
  });

  it("noch keine Bewertung: Hebel heißt 'Erste Google-Bewertungen sammeln'", () => {
    const b = praesenzBericht({
      ...SNAPSHOT,
      google: { ...GOOGLE, rating: undefined, reviewCount: 0, bewertungen: [] },
    });
    expect(b.hebel.find((h) => h.id === "rating")?.titel).toBe("Erste Google-Bewertungen sammeln");
    expect(b.bewertungen.schnitt).toBeNull();
  });

  it("geschlossener Betrieb bei Google steht ganz oben", () => {
    const b = praesenzBericht({ ...SNAPSHOT, google: { ...GOOGLE, status: "CLOSED_TEMPORARILY" } });
    expect(b.hebel[0].id).toBe("google_geschlossen");
  });
});

describe("oeffnungszeitenWeichenAb", () => {
  it("vergleicht nur Tage, die beide kennen", () => {
    expect(
      oeffnungszeitenWeichenAb(
        { monday: { closed: false, open: "17:00", close: "23:59" }, tuesday: { closed: true } },
        { monday: { closed: false, open: "17:00", close: "23:00" }, wednesday: { closed: true } },
      ),
    ).toEqual(["monday"]);
    expect(oeffnungszeitenWeichenAb(undefined, { monday: { closed: true } })).toEqual([]);
  });
});
