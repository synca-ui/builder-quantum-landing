// @vitest-environment node
/**
 * @maitr/core/zeitzone - die eine Wanduhr-Rechnung für Server, Web und App.
 *
 * ANLASS (15.09.2026): Nach dem Zonenfix in GET /slots bauten Web-Dashboard,
 * Formular-Vorschau und Gast-Verwaltungsseite weiter Wanduhr-als-UTC bzw.
 * nahmen das Datum aus `toISOString()`. Die Grundrechnung prüft
 * server/__tests__/zeitzone.spec.ts über die Durchreiche; hier stehen die
 * Helfer, die die Clients dafür neu brauchen.
 *
 * Alles mit fester Zone als Parameter - nur die zwei lokalen Helfer hängen
 * von der Zone der Maschine ab, und die Tests setzen sie deshalb ausdrücklich.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  datumIn,
  formatiereInZone,
  lokalesDatumAusISO,
  lokalesDatumISO,
  wanduhrFeldIn,
  zeitpunktAusWanduhrFeld,
} from "../zeitzone";

describe("datumIn", () => {
  it("liefert den Kalendertag in der Zone, nicht in UTC", () => {
    // 20.09., 23:30 UTC ist in Köln schon der 21.09.
    expect(datumIn(new Date("2026-09-20T23:30:00.000Z"), "Europe/Berlin")).toBe("2026-09-21");
    expect(datumIn(new Date("2026-09-20T23:30:00.000Z"), "UTC")).toBe("2026-09-20");
    // Winter: 23:30 UTC ist 00:30 MEZ.
    expect(datumIn(new Date("2026-01-09T23:30:00.000Z"), "Europe/Berlin")).toBe("2026-01-10");
  });
});

describe("wanduhrFeldIn / zeitpunktAusWanduhrFeld", () => {
  it("zeigt die Kölner Wanduhr und wandelt sie verlustfrei zurück", () => {
    const gebucht = new Date("2026-09-20T17:00:00.000Z"); // 19:00 in Köln
    expect(wanduhrFeldIn(gebucht, "Europe/Berlin")).toBe("2026-09-20T19:00");
    expect(zeitpunktAusWanduhrFeld("2026-09-20T19:00", "Europe/Berlin")?.toISOString()).toBe(gebucht.toISOString());
    // Browser liefern je nach step auch Sekunden mit.
    expect(zeitpunktAusWanduhrFeld("2026-09-20T19:00:00", "Europe/Berlin")?.toISOString()).toBe(gebucht.toISOString());
  });

  it("Rundreise bleibt über die Umstellung stabil", () => {
    for (const iso of ["2026-03-29T00:30:00.000Z", "2026-03-29T01:30:00.000Z", "2026-10-25T02:30:00.000Z", "2026-01-10T18:00:00.000Z"]) {
      const zeitpunkt = new Date(iso);
      expect(zeitpunktAusWanduhrFeld(wanduhrFeldIn(zeitpunkt, "Europe/Berlin"), "Europe/Berlin")?.toISOString()).toBe(iso);
    }
  });

  it("gibt null für Unlesbares", () => {
    expect(zeitpunktAusWanduhrFeld("", "Europe/Berlin")).toBeNull();
    expect(zeitpunktAusWanduhrFeld("20.09.2026 19:00", "Europe/Berlin")).toBeNull();
  });
});

describe("formatiereInZone", () => {
  it("formatiert in der Zone des Betriebs, unabhängig von der Zone der Maschine", () => {
    const gebucht = new Date("2026-09-20T17:00:00.000Z");
    expect(formatiereInZone(gebucht, "Europe/Berlin", { dateStyle: "full", timeStyle: "short" })).toBe(
      "Sonntag, 20. September 2026 um 19:00",
    );
    expect(formatiereInZone(gebucht, "Europe/Berlin", { hour: "2-digit", minute: "2-digit" })).toBe("19:00");
  });

  it("wirft bei unbekannter Zone nicht, sondern rechnet wie wanduhrIn in UTC", () => {
    expect(formatiereInZone(new Date("2026-09-20T17:00:00.000Z"), "Mars/Olympus", { hour: "2-digit", minute: "2-digit" })).toBe(
      "17:00",
    );
  });
});

describe("lokalesDatumISO / lokalesDatumAusISO in Berlin", () => {
  const vorher = process.env.TZ;
  // Der Fehler zeigt sich nur östlich von Greenwich - auf einer Maschine in UTC
  // wäre `toISOString().split("T")[0]` zufällig richtig und der Test blind.
  beforeAll(() => {
    process.env.TZ = "Europe/Berlin";
  });
  afterAll(() => {
    if (vorher === undefined) delete process.env.TZ;
    else process.env.TZ = vorher;
  });

  it("nimmt den lokalen Tag einer lokalen Mitternacht, nicht den UTC-Vortag", () => {
    const mitternacht = new Date(2026, 8, 15, 0, 0, 0, 0);
    // Vorbedingung: Die Zone hat gegriffen (sonst sagte der Test nichts aus).
    expect(mitternacht.toISOString()).toBe("2026-09-14T22:00:00.000Z");
    expect(lokalesDatumISO(mitternacht)).toBe("2026-09-15");
  });

  it("liest YYYY-MM-DD als lokale Mitternacht und ist Gegenstück zu lokalesDatumISO", () => {
    const datum = lokalesDatumAusISO("2026-09-15");
    expect(datum?.getHours()).toBe(0);
    expect(datum && lokalesDatumISO(datum)).toBe("2026-09-15");
    expect(lokalesDatumAusISO("15.09.2026")).toBeNull();
  });
});
