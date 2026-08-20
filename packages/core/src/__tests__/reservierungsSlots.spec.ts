// @vitest-environment node
/**
 * Zeitfenster × Öffnungszeiten — die Logik, die Server
 * (GET /api/public/reservations/slots) und Konfigurator-Vorschau teilen.
 * Divergenz hieße: Die Vorschau bietet Zeiten an, die der Server ablehnt.
 */
import { describe, expect, it } from "vitest";
import {
  slotImOeffnungsfenster,
  slotsFuerDatum,
  wochentagSchluessel,
} from "../reservierungsSlots";

describe("wochentagSchluessel", () => {
  it("ordnet Datum dem richtigen Wochentag zu (UTC)", () => {
    expect(wochentagSchluessel("2026-08-20")).toBe("thursday");
    expect(wochentagSchluessel("2026-08-23")).toBe("sunday");
  });

  it("gibt null für Unlesbares", () => {
    expect(wochentagSchluessel("kein-datum")).toBeNull();
  });
});

describe("slotImOeffnungsfenster", () => {
  const tag = { closed: false, open: "11:30", close: "22:00" };

  it("innerhalb/außerhalb des Fensters", () => {
    expect(slotImOeffnungsfenster("12:00", tag)).toBe(true);
    expect(slotImOeffnungsfenster("22:00", tag)).toBe(true);
    expect(slotImOeffnungsfenster("11:00", tag)).toBe(false);
    expect(slotImOeffnungsfenster("23:00", tag)).toBe(false);
  });

  it("Ruhetag bietet nichts an", () => {
    expect(slotImOeffnungsfenster("12:00", { closed: true })).toBe(false);
  });

  it("Sperrstunde nach Mitternacht (18:00–01:00)", () => {
    const bar = { closed: false, open: "18:00", close: "01:00" };
    expect(slotImOeffnungsfenster("23:30", bar)).toBe(true);
    expect(slotImOeffnungsfenster("00:30", bar)).toBe(true);
    expect(slotImOeffnungsfenster("12:00", bar)).toBe(false);
  });

  it("open == close heißt durchgehend geöffnet", () => {
    expect(
      slotImOeffnungsfenster("03:00", {
        closed: false,
        open: "00:00",
        close: "00:00",
      }),
    ).toBe(true);
  });

  it("kein Tageseintrag → nicht filtern (Altbestand)", () => {
    expect(slotImOeffnungsfenster("12:00", undefined)).toBe(true);
  });
});

describe("slotsFuerDatum", () => {
  const zeitfenster = ["12:00", "13:00", "18:00", "19:00"];

  it("filtert gegen die Öffnungszeiten des Wochentags", () => {
    // 2026-08-20 ist ein Donnerstag
    const oeffnung = {
      thursday: { closed: false, open: "17:00", close: "23:00" },
    } as any;
    expect(slotsFuerDatum(zeitfenster, oeffnung, "2026-08-20")).toEqual([
      "18:00",
      "19:00",
    ]);
  });

  it("Ruhetag → keine Zeitfenster", () => {
    const oeffnung = { thursday: { closed: true } } as any;
    expect(slotsFuerDatum(zeitfenster, oeffnung, "2026-08-20")).toEqual([]);
  });

  it("leere Öffnungszeiten (Altbestand) → unverändert", () => {
    expect(slotsFuerDatum(zeitfenster, {}, "2026-08-20")).toEqual(zeitfenster);
    expect(slotsFuerDatum(zeitfenster, null, "2026-08-20")).toEqual(
      zeitfenster,
    );
  });
});
