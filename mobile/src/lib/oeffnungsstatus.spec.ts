/**
 * Öffnungsstatus aus Profil und Google (mobile/src/lib/oeffnungsstatus.ts).
 *
 * Alle Zeitpunkte stehen in UTC und werden in Europe/Berlin gelesen - so hängt
 * das Ergebnis nicht an der Zeitzone der Maschine, auf der die Suite läuft.
 * Im September gilt in Berlin UTC+2.
 */
import { describe, expect, it } from "vitest";
import type { OpeningHours } from "@maitr/core/types";

import {
  fensterAusGoogle,
  fensterAusProfil,
  fensterFuer,
  minutenAus,
  oeffnungsstatus,
  statusZeile,
  tageDerZeile,
  uhrzeit,
  wanduhrIn,
} from "./oeffnungsstatus";
import { zeilenAusOeffnungszeiten, type ProfilZeile } from "./venueAdopt";

/** Dienstag, 15.09.2026, hh:mm Berliner Zeit. */
const dienstag = (hhmm: string) => new Date(`2026-09-15T${hhmm}:00+02:00`);
/** Mittwoch, 16.09.2026, hh:mm Berliner Zeit. */
const mittwoch = (hhmm: string) => new Date(`2026-09-16T${hhmm}:00+02:00`);

const zeile = (id: string, value: string, closed?: boolean): ProfilZeile => ({
  id,
  label: id,
  value,
  ...(closed ? { closed } : {}),
});

describe("wanduhrIn", () => {
  it("liest Datum, Wochentag und Minute in Berlin, nicht in UTC", () => {
    // 23:30 UTC am Dienstag ist in Berlin schon Mittwoch 01:30.
    expect(wanduhrIn(new Date("2026-09-15T23:30:00Z"))).toEqual({
      jahr: 2026,
      monat: 9,
      tag: 16,
      wochentag: 2,
      minute: 90,
    });
  });

  it("kennt die Winterzeit", () => {
    expect(wanduhrIn(new Date("2026-12-01T17:30:00Z")).minute).toBe(18 * 60 + 30);
  });

  it("fällt bei unbekannter Zone auf die Geräteuhr zurück, statt zu werfen", () => {
    const jetzt = new Date("2026-09-15T10:00:00Z");
    expect(wanduhrIn(jetzt, "Mond/Tycho").minute).toBe(jetzt.getHours() * 60 + jetzt.getMinutes());
  });
});

describe("Hilfen", () => {
  it("minutenAus liest Doppelpunkt und Punkt, lehnt Unsinn ab", () => {
    expect(minutenAus("9:30")).toBe(570);
    expect(minutenAus("09.30")).toBe(570);
    expect(minutenAus("24:00")).toBe(1440);
    expect(minutenAus("24:30")).toBeNull();
    expect(minutenAus("abends")).toBeNull();
  });

  it("uhrzeit schreibt Mitternacht als Schluss 24:00", () => {
    expect(uhrzeit(570)).toBe("9:30");
    expect(uhrzeit(0)).toBe("0:00");
    expect(uhrzeit(0, true)).toBe("24:00");
  });

  it("tageDerZeile: Folge gilt lückenlos, Fixture-Kennungen gar nicht", () => {
    expect(tageDerZeile({ id: "monday" })).toEqual(["monday"]);
    expect(tageDerZeile({ id: "monday_wednesday" })).toEqual(["monday", "tuesday", "wednesday"]);
    expect(tageDerZeile({ id: "mo_fr" })).toEqual([]);
    expect(tageDerZeile({ id: "friday_monday" })).toEqual([]);
  });

  it("fensterAusProfil: geschlossen, lesbar, unlesbar", () => {
    const zeilen = [
      zeile("monday", "Geschlossen", true),
      zeile("tuesday", "17:00 – 23:59"),
      zeile("wednesday", "nach Absprache"),
    ];
    expect(fensterAusProfil(zeilen, "monday")).toEqual({ geschlossen: true });
    expect(fensterAusProfil(zeilen, "tuesday")).toEqual({ geschlossen: false, auf: 1020, zu: 1439 });
    expect(fensterAusProfil(zeilen, "wednesday")).toBeNull();
    expect(fensterAusProfil(zeilen, "thursday")).toBeNull();
  });

  it("fensterAusGoogle: Ruhetag als 00:00-00:00 ist unbekannt, nicht rund um die Uhr", () => {
    const google: OpeningHours = {
      monday: { closed: true },
      tuesday: { closed: false, open: "00:00", close: "00:00" },
    };
    expect(fensterAusGoogle(google, "monday")).toEqual({ geschlossen: true });
    expect(fensterAusGoogle(google, "tuesday")).toBeNull();
    expect(fensterAusGoogle(undefined, "monday")).toBeNull();
  });
});

describe("oeffnungsstatus", () => {
  const profil = zeilenAusOeffnungszeiten({
    monday: { closed: true },
    tuesday: { closed: false, open: "17:00", close: "23:00" },
    wednesday: { closed: false, open: "17:00", close: "23:00" },
  });
  const google: OpeningHours = {
    tuesday: { closed: false, open: "09:00", close: "12:00" },
    thursday: { closed: false, open: "08:00", close: "14:00" },
  };

  it("hat das Profil Vorrang vor Google", () => {
    const status = oeffnungsstatus(dienstag("20:00"), profil, google);
    expect(status).toEqual({ label: "Jetzt geöffnet", offen: true, zusatz: "bis 23:00" });
    expect(fensterFuer("tuesday", profil, google)).toEqual({ geschlossen: false, auf: 1020, zu: 1380 });
  });

  it("fällt auf Google zurück, wenn das Profil den Tag nicht kennt", () => {
    const donnerstag = new Date("2026-09-17T10:00:00+02:00");
    expect(oeffnungsstatus(donnerstag, profil, google)).toEqual({
      label: "Jetzt geöffnet",
      offen: true,
      zusatz: "bis 14:00",
    });
  });

  it("vor der Öffnung: geschlossen mit Uhrzeit, danach ohne", () => {
    expect(oeffnungsstatus(dienstag("15:00"), profil, undefined)).toEqual({
      label: "Jetzt geschlossen",
      offen: false,
      zusatz: "öffnet 17:00",
    });
    expect(oeffnungsstatus(dienstag("23:30"), profil, undefined)).toEqual({
      label: "Jetzt geschlossen",
      offen: false,
    });
  });

  it("meldet den Ruhetag", () => {
    const montag = new Date("2026-09-14T12:00:00+02:00");
    expect(oeffnungsstatus(montag, profil, undefined)).toEqual({
      label: "Heute geschlossen",
      offen: false,
    });
  });

  it("Sperrstunde nach Mitternacht gehört zum Vortag", () => {
    const bar = [zeile("tuesday", "18:00 – 2:00"), zeile("wednesday", "Geschlossen", true)];
    // Mittwoch 01:30 - der Dienstag läuft noch, obwohl Mittwoch Ruhetag ist.
    expect(oeffnungsstatus(mittwoch("01:30"), bar, undefined)).toEqual({
      label: "Jetzt geöffnet",
      offen: true,
      zusatz: "bis 2:00",
    });
    expect(oeffnungsstatus(mittwoch("02:30"), bar, undefined)).toEqual({
      label: "Heute geschlossen",
      offen: false,
    });
    // Am Dienstagabend selbst: offen bis 2:00.
    expect(oeffnungsstatus(dienstag("23:00"), bar, undefined)).toEqual({
      label: "Jetzt geöffnet",
      offen: true,
      zusatz: "bis 2:00",
    });
  });

  it("Mitternacht als Schluss heißt 24:00", () => {
    const google00: OpeningHours = { tuesday: { closed: false, open: "17:00", close: "00:00" } };
    expect(oeffnungsstatus(dienstag("22:00"), [], google00)?.zusatz).toBe("bis 24:00");
  });

  it("unbekannter Tag → null statt geratener Auskunft", () => {
    expect(oeffnungsstatus(dienstag("12:00"), [], undefined)).toBeNull();
    // Die Demo-Fixture "mo_fr" sagt nichts Verlässliches.
    expect(oeffnungsstatus(dienstag("12:00"), [zeile("mo_fr", "8:00 – 18:00")], undefined)).toBeNull();
  });

  it("statusZeile fasst Label und Zusatz zusammen", () => {
    expect(statusZeile({ label: "Jetzt geöffnet", offen: true, zusatz: "bis 23:00" })).toBe(
      "Jetzt geöffnet · bis 23:00",
    );
    expect(statusZeile({ label: "Heute geschlossen", offen: false })).toBe("Heute geschlossen");
  });
});
