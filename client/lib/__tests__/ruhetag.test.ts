/**
 * Ruhetage dürfen nicht als Öffnungszeiten erfunden werden.
 *
 * Echtfall krawummel.de (24.08.2026, ein Montag): Der Scrape ließ den Montag
 * korrekt weg — Ruhetag. normalizeOpeningHours füllte fehlende Tage aber mit
 * „09:00–22:00 geöffnet“, und die veröffentlichte Seite zeigte Gästen am
 * Ruhetag „Offen“. Wer davor steht, steht vor verschlossener Tür.
 */
import { describe, expect, it } from "vitest";
import { normalizeConfig } from "../normalizeConfig";

const wocheOhneMontag = {
  tuesday: { open: "12:00", close: "21:00", closed: false },
  wednesday: { open: "12:00", close: "21:00", closed: false },
  thursday: { open: "12:00", close: "21:00", closed: false },
  friday: { open: "12:00", close: "21:00", closed: false },
  saturday: { open: "12:00", close: "21:00", closed: false },
  sunday: { open: "12:00", close: "21:00", closed: false },
};

describe("normalizeConfig – Öffnungszeiten", () => {
  it("macht aus einem fehlenden Tag einen Ruhetag, keinen Öffnungstag", () => {
    const config = normalizeConfig({
      businessName: "Krawummel",
      openingHours: wocheOhneMontag,
    } as any);

    const hours = config.content.openingHours as any;
    expect(hours.monday.closed).toBe(true);
    // Die gelieferten Tage bleiben unangetastet.
    expect(hours.friday).toEqual({ open: "12:00", close: "21:00", closed: false });
  });

  it("fällt ohne jede Zeitangabe weiterhin auf die Standardwoche zurück", () => {
    const config = normalizeConfig({ businessName: "Neu" } as any);
    const hours = config.content.openingHours as any;
    // Standard: geöffnet — ein frischer manueller Entwurf ist keine Woche aus
    // sieben Ruhetagen. Die konkrete Zeit kommt aus den Businesstyp-Vorgaben.
    expect(hours.monday.closed).toBe(false);
    expect(hours.monday.open).toMatch(/^\d{2}:\d{2}$/);
  });

  it("behandelt explizit null gelieferte Tage wie fehlende", () => {
    const config = normalizeConfig({
      businessName: "Krawummel",
      openingHours: { ...wocheOhneMontag, monday: null },
    } as any);
    expect((config.content.openingHours as any).monday.closed).toBe(true);
  });
});
