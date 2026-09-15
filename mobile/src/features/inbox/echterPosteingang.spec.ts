/**
 * Posteingang eines echten Betriebs (mobile/src/features/inbox/echterPosteingang.ts).
 */
import { describe, expect, it } from "vitest";
import type { Reservation, VenuePresence } from "@maitr/core";

import {
  BEWERTUNG_NEU_MS,
  begruessung,
  berlinerZeit,
  echterPosteingang,
  googleQuelle,
  relativeZeit,
  terminText,
  ungeleseneAnzahl,
} from "./echterPosteingang";

// Dienstag, 15. September 2026, 12:00 in Köln (Sommerzeit, UTC+2).
const JETZT = Date.parse("2026-09-15T10:00:00.000Z");
const MIN = 60_000;
const STD = 60 * MIN;
const TAG = 24 * STD;

function iso(t: number): string {
  return new Date(t).toISOString();
}

function reservierung(teil: Partial<Reservation> = {}): Reservation {
  return {
    id: "r1",
    guestName: "Anna Berg",
    partySize: 2,
    start: "2026-09-17T17:00:00.000Z", // Do 19:00 Berlin
    end: "2026-09-17T19:00:00.000Z",
    status: "pending",
    source: "website",
    createdAt: iso(JETZT - 20 * MIN),
    ...teil,
  };
}

function praesenz(teil: Partial<VenuePresence> = {}, hebel: VenuePresence["bericht"]["hebel"] = []): VenuePresence {
  return {
    status: "bereit",
    fetchedAt: iso(JETZT - 3 * STD),
    bericht: {
      score: 60,
      faktoren: [],
      deckung: { gemessen: 0.7, unbekannt: [], geschaetzt: [], hinweis: "" },
      hebel,
      websiteBefunde: [],
      bewertungen: { schnitt: 4.5, anzahl: 12, themen: [] },
    },
    ...teil,
  };
}

function google(bewertungen: NonNullable<VenuePresence["google"]>["bewertungen"]): VenuePresence["google"] {
  return {
    placeId: "p1",
    name: "Haus Töller",
    reviewCount: 12,
    rating: 4.5,
    bewertungen,
    fotos: [],
    fotoAnzahl: 0,
    status: "OPERATIONAL",
  };
}

describe("berlinerZeit", () => {
  it("rechnet Sommer- und Winterzeit", () => {
    expect(berlinerZeit(Date.parse("2026-07-01T10:00:00Z"))).toMatchObject({ stunde: 12, tag: 1, monat: 7 });
    expect(berlinerZeit(Date.parse("2026-01-10T10:00:00Z"))).toMatchObject({ stunde: 11, tag: 10, monat: 1 });
  });

  it("wechselt am letzten Sonntag im März und Oktober um 01:00 UTC", () => {
    // 2026: 29. März und 25. Oktober.
    expect(berlinerZeit(Date.parse("2026-03-29T00:59:00Z")).stunde).toBe(1);
    expect(berlinerZeit(Date.parse("2026-03-29T01:00:00Z")).stunde).toBe(3);
    expect(berlinerZeit(Date.parse("2026-10-25T00:59:00Z")).stunde).toBe(2);
    expect(berlinerZeit(Date.parse("2026-10-25T01:00:00Z")).stunde).toBe(2);
  });

  it("ordnet 23:30 Berlin dem Berliner Kalendertag zu, nicht dem UTC-Tag", () => {
    const spaet = berlinerZeit(Date.parse("2026-09-14T21:30:00Z"));
    expect(spaet).toMatchObject({ tag: 14, stunde: 23, wochentag: 1 });
    const frueh = berlinerZeit(Date.parse("2026-09-14T22:30:00Z"));
    expect(frueh).toMatchObject({ tag: 15, stunde: 0, wochentag: 2 });
    expect(frueh.tagesnummer - spaet.tagesnummer).toBe(1);
  });
});

describe("relativeZeit", () => {
  it("nennt Minuten, Stunden am selben Tag, gestern und sonst das Datum", () => {
    expect(relativeZeit(JETZT - 10_000, JETZT)).toBe("Gerade eben");
    expect(relativeZeit(JETZT + 5 * MIN, JETZT)).toBe("Gerade eben");
    expect(relativeZeit(JETZT - 20 * MIN, JETZT)).toBe("Vor 20 Min");
    expect(relativeZeit(JETZT - 3 * STD, JETZT)).toBe("Vor 3 Std");
    expect(relativeZeit(JETZT - TAG, JETZT)).toBe("Gestern");
    expect(relativeZeit(JETZT - 8 * TAG, JETZT)).toBe("Mo, 7. Sep");
    expect(relativeZeit(Date.parse("2025-12-01T10:00:00Z"), JETZT)).toBe("Mo, 1. Dez 2025");
  });

  it("sagt kurz nach Mitternacht „Gestern“ statt „Vor 2 Std“ über gestern Abend", () => {
    const nachMitternacht = Date.parse("2026-09-14T22:30:00Z"); // 00:30 Berlin
    expect(relativeZeit(Date.parse("2026-09-14T20:30:00Z"), nachMitternacht)).toBe("Gestern");
  });
});

describe("terminText", () => {
  it("heute, morgen, sonst Wochentag und Datum - immer mit Berliner Uhrzeit", () => {
    expect(terminText(Date.parse("2026-09-15T17:00:00Z"), JETZT)).toBe("Heute, 19:00");
    expect(terminText(Date.parse("2026-09-16T10:30:00Z"), JETZT)).toBe("Morgen, 12:30");
    expect(terminText(Date.parse("2026-09-17T17:00:00Z"), JETZT)).toBe("Do, 17. Sep, 19:00");
  });
});

describe("echterPosteingang · Reservierungen", () => {
  it("macht aus einer offenen Anfrage einen Eintrag mit Eingangszeit und Ziel /tische", () => {
    const [eintrag] = echterPosteingang({ reservierungen: [reservierung()], praesenz: null, jetzt: JETZT });
    expect(eintrag).toEqual({
      id: "res_r1",
      kind: "reservation",
      title: "Neue Reservierungsanfrage · Anna Berg",
      body: "Do, 17. Sep, 19:00 · 2 Personen · wartet auf Bestätigung",
      time: "Vor 20 Min",
      href: "/tische",
      zeitpunkt: JETZT - 20 * MIN,
    });
  });

  it("lässt bestätigte, abgesagte, No-Shows, Walk-ins und begonnene Termine weg", () => {
    const liste = [
      reservierung({ id: "a", status: "confirmed" }),
      reservierung({ id: "b", status: "cancelled" }),
      reservierung({ id: "c", status: "no_show" }),
      reservierung({ id: "d", status: "walk_in" }),
      reservierung({ id: "e", start: iso(JETZT - MIN) }),
      reservierung({ id: "f" }),
    ];
    expect(echterPosteingang({ reservierungen: liste, praesenz: null, jetzt: JETZT }).map((e) => e.id)).toEqual([
      "res_f",
    ]);
  });

  it("übersteht kaputte Zeilen und fehlende Felder, ohne etwas zu erfinden", () => {
    const liste: unknown[] = [
      null,
      "<html>",
      { id: "x" },
      reservierung({ id: "ohne", guestName: "  ", partySize: 1, createdAt: undefined }),
    ];
    const eintraege = echterPosteingang({ reservierungen: liste, praesenz: null, jetzt: JETZT });
    expect(eintraege).toHaveLength(1);
    expect(eintraege[0]).toMatchObject({
      title: "Neue Reservierungsanfrage · Ohne Namen",
      body: "Do, 17. Sep, 19:00 · 1 Person · wartet auf Bestätigung",
      time: "Anfrage offen",
      zeitpunkt: null,
    });
  });
});

describe("echterPosteingang · Präsenz", () => {
  const hebel = (id: string) => ({
    id,
    titel: `Titel ${id}`,
    detail: `Detail ${id}`,
    punkte: 0,
    quelle: "google" as const,
  });

  it("nimmt nur die warnenden Hebel und führt sie zum Profil-Check", () => {
    const p = praesenz({}, [
      hebel("google_nicht_gefunden"),
      hebel("photos"),
      hebel("google_geschlossen"),
      hebel("menu"),
      hebel("hours_diff"),
    ]);
    const eintraege = echterPosteingang({ reservierungen: null, praesenz: p, jetzt: JETZT });
    expect(eintraege.map((e) => e.id)).toEqual([
      "hebel_google_geschlossen",
      "hebel_google_nicht_gefunden",
      "hebel_hours_diff",
    ]);
    expect(eintraege[0]).toMatchObject({
      kind: "system",
      title: "Titel google_geschlossen",
      body: "Detail google_geschlossen",
      href: "/profil-check",
      time: "Vor 3 Std",
    });
  });

  it("zeigt Google-Bewertungen der letzten sieben Tage, ältere nicht", () => {
    const p = praesenz({
      google: google([
        { id: "places/1/reviews/neu", autor: "Marta K.", rating: 4, text: "Sehr   nette Bedienung.", createdAt: iso(JETZT - 2 * STD) },
        { id: "places/1/reviews/grenze", autor: "", rating: 5, text: "", createdAt: iso(JETZT - BEWERTUNG_NEU_MS) },
        { id: "places/1/reviews/alt", autor: "Alt", rating: 1, text: "Zu alt", createdAt: iso(JETZT - BEWERTUNG_NEU_MS - MIN) },
        { id: "places/1/reviews/kaputt", autor: "X", rating: 3, text: "", createdAt: "gestern" },
      ]),
    });
    const eintraege = echterPosteingang({ reservierungen: null, praesenz: p, jetzt: JETZT });
    expect(eintraege).toEqual([
      {
        id: "rev_places/1/reviews/neu",
        kind: "review",
        title: "Neue 4★-Bewertung bei Google von Marta K.",
        body: "„Sehr nette Bedienung.“",
        time: "Vor 2 Std",
        href: "/bewertungen",
        zeitpunkt: JETZT - 2 * STD,
      },
      expect.objectContaining({
        id: "rev_places/1/reviews/grenze",
        title: "Neue 5★-Bewertung bei Google",
        body: "Nur Sterne, kein Kommentar",
        time: "Di, 8. Sep",
      }),
    ]);
  });

  it("kürzt lange Bewertungstexte", () => {
    const lang = "Wort ".repeat(40);
    const p = praesenz({ google: google([{ id: "r", autor: "A", rating: 5, text: lang, createdAt: iso(JETZT - MIN * 5) }]) });
    const [eintrag] = echterPosteingang({ reservierungen: null, praesenz: p, jetzt: JETZT });
    expect(eintrag.body.length).toBeLessThanOrEqual(92);
    expect(eintrag.body.endsWith("…“")).toBe(true);
  });

  it("verträgt einen Bericht ohne Hebelliste und einen Eintrag ohne Bewertungsliste", () => {
    const kaputt = praesenz({ google: { ...google([])!, bewertungen: undefined as never } });
    (kaputt.bericht as { hebel?: unknown }).hebel = undefined;
    expect(echterPosteingang({ reservierungen: null, praesenz: kaputt, jetzt: JETZT })).toEqual([]);
  });
});

describe("echterPosteingang · gemischt", () => {
  it("sortiert neueste zuerst, Einträge ohne Zeitpunkt ans Ende", () => {
    const p = praesenz(
      {
        fetchedAt: iso(JETZT - 5 * STD),
        google: google([{ id: "g", autor: "B", rating: 5, text: "Top", createdAt: iso(JETZT - 1 * STD) }]),
      },
      [{ id: "hours_diff", titel: "Öffnungszeiten weichen ab", detail: "…", punkte: 0, quelle: "google" }],
    );
    const liste = [
      reservierung({ id: "neu", createdAt: iso(JETZT - 10 * MIN) }),
      reservierung({ id: "ohne", createdAt: undefined }),
      reservierung({ id: "alt", createdAt: iso(JETZT - 2 * TAG) }),
    ];
    const ids = echterPosteingang({ reservierungen: liste, praesenz: p, jetzt: JETZT }).map((e) => e.id);
    expect(ids).toEqual(["res_neu", "rev_g", "hebel_hours_diff", "res_alt", "res_ohne"]);
  });

  it("liefert ohne Anfragen und ohne Präsenz eine leere Liste - kein Café Goldstück", () => {
    expect(echterPosteingang({ reservierungen: null, praesenz: null, jetzt: JETZT })).toEqual([]);
    expect(echterPosteingang({ reservierungen: [], praesenz: null, jetzt: JETZT })).toEqual([]);
  });

  it("hält die Kennungen über zwei Abrufe stabil", () => {
    const eins = echterPosteingang({ reservierungen: [reservierung()], praesenz: null, jetzt: JETZT });
    const zwei = echterPosteingang({ reservierungen: [reservierung()], praesenz: null, jetzt: JETZT + 30 * MIN });
    expect(zwei.map((e) => e.id)).toEqual(eins.map((e) => e.id));
    expect(zwei[0].time).toBe("Vor 50 Min");
  });
});

describe("ungeleseneAnzahl", () => {
  it("zählt nur vorhandene, nicht gelesene Einträge", () => {
    const eintraege = [{ id: "res_a" }, { id: "rev_b" }, { id: "hebel_c" }];
    expect(ungeleseneAnzahl(eintraege, {})).toBe(3);
    expect(ungeleseneAnzahl(eintraege, { res_a: true, in_review: true })).toBe(2);
  });
});

describe("googleQuelle", () => {
  it("zählt einen Stand ohne Google-Eintrag nicht als Antwort von Google", () => {
    // Präsenz ist da (Bericht, fetchedAt), Google aber nie gefragt - kein Schlüssel.
    expect(googleQuelle(praesenz({ status: "kein_schluessel" }), false)).toBe("fehlt");
    expect(googleQuelle(praesenz({ status: "fehler" }), false)).toBe("fehlt");
    expect(googleQuelle(praesenz({ status: "ausstehend", fetchedAt: undefined }), false)).toBe("fehlt");
    expect(googleQuelle(null, false)).toBe("fehlt");
  });

  it("wartet, solange der Präsenzabruf ohne Google-Eintrag läuft", () => {
    expect(googleQuelle(null, true)).toBe("laedt");
    expect(googleQuelle(praesenz({ status: "ausstehend" }), true)).toBe("laedt");
  });

  it("nimmt einen vorhandenen Eintrag und ein ausdrückliches „nicht gefunden“ als Antwort", () => {
    expect(googleQuelle(praesenz({ google: google([]) }), false)).toBe("da");
    // Stehen gebliebener Eintrag nach einem gescheiterten Abruf: Er ist nicht falsch geworden.
    expect(googleQuelle(praesenz({ status: "fehler", google: google([]) }), true)).toBe("da");
    expect(googleQuelle(praesenz({ status: "nicht_gefunden" }), false)).toBe("da");
  });
});

describe("begruessung", () => {
  it("folgt der Berliner Uhr mit den Grenzen des Servers", () => {
    expect(begruessung(Date.parse("2026-09-15T08:59:00Z"))).toBe("Guten Morgen,"); // 10:59
    expect(begruessung(Date.parse("2026-09-15T09:00:00Z"))).toBe("Hallo,"); // 11:00
    expect(begruessung(Date.parse("2026-09-15T15:00:00Z"))).toBe("Guten Abend,"); // 17:00
  });
});
