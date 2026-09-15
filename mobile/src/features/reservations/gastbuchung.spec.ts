/**
 * Gastbuchung eines echten Betriebs (mobile/src/features/reservations/gastbuchung.ts).
 *
 * Zeitpunkte in UTC bzw. mit Versatz, gelesen in Europe/Berlin - unabhängig von
 * der Zeitzone der Maschine.
 */
import { describe, expect, it } from "vitest";
import type { Reservation } from "@maitr/core";

import {
  LETZTE_BUCHUNG_VOR_SCHLUSS_MIN,
  UHRZEITEN,
  bestaetigungAus,
  istReservierung,
  naechsteAnkunft,
  naechsteTage,
  startIso,
  uhrzeitDer,
  uhrzeitenFuer,
  zeitpunktIn,
} from "./gastbuchung";

function reservierung(teil: Partial<Reservation> = {}): Reservation {
  return {
    id: "r1",
    guestName: "Marie Weber",
    partySize: 2,
    start: "2026-09-15T17:00:00.000Z",
    end: "2026-09-15T19:00:00.000Z",
    status: "confirmed",
    source: "maitr",
    ...teil,
  };
}

describe("naechsteTage", () => {
  it("liefert sieben Tage ab heute mit deutschen Beschriftungen", () => {
    const tage = naechsteTage(new Date("2026-09-15T10:00:00+02:00"));
    expect(tage).toHaveLength(7);
    expect(tage[0]).toEqual({
      key: "2026-09-15",
      jahr: 2026,
      monat: 9,
      tag: 15,
      wochentag: 1,
      kurz: "Di",
      datum: "15.",
      lang: "Dienstag, 15. September",
      heute: true,
    });
    expect(tage.map((t) => t.kurz)).toEqual(["Di", "Mi", "Do", "Fr", "Sa", "So", "Mo"]);
    expect(tage.slice(1).every((t) => !t.heute)).toBe(true);
  });

  it("nimmt den Berliner Kalendertag, nicht den von UTC", () => {
    // 22:30 UTC ist in Berlin schon der 16.
    expect(naechsteTage(new Date("2026-09-15T22:30:00Z"))[0].key).toBe("2026-09-16");
  });

  it("läuft über Monats- und Jahresgrenzen und die Zeitumstellung", () => {
    const tage = naechsteTage(new Date("2026-12-29T12:00:00Z"));
    expect(tage.map((t) => t.key)).toEqual([
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
      "2027-01-03",
      "2027-01-04",
    ]);
    const umstellung = naechsteTage(new Date("2026-10-24T12:00:00Z"), 3);
    expect(umstellung.map((t) => t.lang)).toEqual([
      "Samstag, 24. Oktober",
      "Sonntag, 25. Oktober",
      "Montag, 26. Oktober",
    ]);
  });
});

describe("uhrzeitenFuer", () => {
  it("ohne bekannte Öffnungszeit: alle festen Uhrzeiten", () => {
    expect(UHRZEITEN[0]).toBe("8:00");
    expect(UHRZEITEN[UHRZEITEN.length - 1]).toBe("22:00");
    expect(uhrzeitenFuer(null, null)).toEqual({ zeiten: [...UHRZEITEN], grund: "unbekannt" });
  });

  it("schneidet auf die Öffnungszeit zu, letzte Uhrzeit eine Stunde vor Schluss", () => {
    expect(LETZTE_BUCHUNG_VOR_SCHLUSS_MIN).toBe(60);
    const { zeiten, grund } = uhrzeitenFuer({ geschlossen: false, auf: 17 * 60, zu: 21 * 60 }, null);
    expect(grund).toBe("offen");
    expect(zeiten).toEqual(["17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00"]);
  });

  it("ein Fenster über Mitternacht lässt die Abenduhrzeiten stehen", () => {
    const { zeiten } = uhrzeitenFuer({ geschlossen: false, auf: 18 * 60, zu: 2 * 60 }, null);
    expect(zeiten[0]).toBe("18:00");
    expect(zeiten[zeiten.length - 1]).toBe("22:00");
  });

  it("Ruhetag und vergangene Uhrzeiten", () => {
    expect(uhrzeitenFuer({ geschlossen: true }, null)).toEqual({ zeiten: [], grund: "geschlossen" });
    // Heute 19:10: 19:00 ist vorbei, 19:30 noch möglich.
    const heute = uhrzeitenFuer({ geschlossen: false, auf: 17 * 60, zu: 21 * 60 }, 19 * 60 + 10);
    expect(heute.zeiten).toEqual(["19:30", "20:00"]);
    // Heute 20:30: nichts mehr - "keine", nicht "geschlossen".
    expect(uhrzeitenFuer({ geschlossen: false, auf: 17 * 60, zu: 21 * 60 }, 20 * 60 + 30)).toEqual({
      zeiten: [],
      grund: "keine",
    });
  });
});

describe("zeitpunktIn / startIso", () => {
  it("rechnet Berliner Sommerzeit in UTC mit Z um", () => {
    expect(startIso({ jahr: 2026, monat: 9, tag: 16 }, "18:30")).toBe("2026-09-16T16:30:00.000Z");
  });

  it("und Winterzeit", () => {
    expect(startIso({ jahr: 2026, monat: 12, tag: 1 }, "18:30")).toBe("2026-12-01T17:30:00.000Z");
  });

  it("am Tag der Umstellung gilt der Versatz des Abends", () => {
    expect(zeitpunktIn(2026, 10, 25, 18 * 60 + 30).toISOString()).toBe("2026-10-25T17:30:00.000Z");
    expect(zeitpunktIn(2026, 3, 29, 18 * 60 + 30).toISOString()).toBe("2026-03-29T16:30:00.000Z");
  });

  it("unlesbare Uhrzeit → null", () => {
    expect(startIso({ jahr: 2026, monat: 9, tag: 16 }, "abends")).toBeNull();
  });
});

describe("Antwort des Servers", () => {
  it("istReservierung prüft die Form", () => {
    expect(istReservierung(reservierung())).toBe(true);
    expect(istReservierung({ ...reservierung(), start: "morgen" })).toBe(false);
    expect(istReservierung({ error: "Ungültig" })).toBe(false);
    expect(istReservierung(null)).toBe(false);
  });

  it("bestaetigungAus liest die gespeicherte Zeit in Berlin", () => {
    expect(bestaetigungAus(reservierung({ start: "2026-09-16T16:30:00.000Z", partySize: 4 }))).toEqual({
      weekday: "Mi",
      dateLabel: "Mittwoch, 16. September",
      time: "18:30",
      partySize: 4,
      guest: "Marie Weber",
    });
  });

  it("uhrzeitDer", () => {
    expect(uhrzeitDer({ start: "2026-09-15T17:00:00.000Z" })).toBe("19:00");
  });
});

describe("naechsteAnkunft", () => {
  const jetzt = new Date("2026-09-15T18:00:00+02:00");

  it("keine Liste → null (nicht abrufbar), leere Liste → keine mehr", () => {
    expect(naechsteAnkunft({ error: "Nicht gefunden" }, jetzt)).toBeNull();
    expect(naechsteAnkunft(undefined, jetzt)).toBeNull();
    expect(naechsteAnkunft([], jetzt)).toEqual({ naechste: null, nochHeute: 0 });
  });

  it("nimmt die früheste kommende, überspringt Vergangenes, Absagen, No-Shows und Walk-ins", () => {
    const liste = [
      reservierung({ id: "spaet", start: "2026-09-15T19:00:00.000Z" }), // 21:00
      reservierung({ id: "vorbei", start: "2026-09-15T15:00:00.000Z" }), // 17:00
      reservierung({ id: "abgesagt", start: "2026-09-15T16:30:00.000Z", status: "cancelled" }),
      reservierung({ id: "noshow", start: "2026-09-15T16:15:00.000Z", status: "no_show" }),
      reservierung({ id: "walkin", start: "2026-09-15T16:05:00.000Z", status: "walk_in" }),
      reservierung({ id: "anfrage", start: "2026-09-15T17:00:00.000Z", status: "pending" }), // 19:00
      { kaputt: true },
    ];
    const lage = naechsteAnkunft(liste, jetzt);
    expect(lage?.naechste?.id).toBe("anfrage");
    expect(lage?.nochHeute).toBe(2);
  });

  it("alles vorbei → heute keine mehr", () => {
    expect(naechsteAnkunft([reservierung({ start: "2026-09-15T15:00:00.000Z" })], jetzt)).toEqual({
      naechste: null,
      nochHeute: 0,
    });
  });
});
