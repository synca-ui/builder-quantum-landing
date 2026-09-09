/**
 * "Geöffnet"-Badge bei Sperrstunde nach Mitternacht.
 *
 * ANLASS: `isCurrentlyOpen` verglich ZEICHENKETTEN
 * (`currentTime >= open && currentTime <= close`). Für eine Bar mit
 * 18:00–02:00 war das um 22:00 Uhr falsch — "22:00" <= "02:00" ist falsch —,
 * die Seite meldete also "Geschlossen", während der Laden voll war. Umgekehrt
 * blieb um 00:30 das noch laufende Fenster des Vortags unsichtbar, weil nur
 * der heutige Eintrag geprüft wurde.
 *
 * Geprüft wird über die echte Komponente mit gestellter Uhr, nicht über die
 * Hilfsfunktion: Der Badge hängt zusätzlich am `hasHours`-Zweig, und genau die
 * Kombination sieht der Gast.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { OpeningHours } from "../OpeningHours";

/** Ein Mittwoch — mittendrin in der Woche, damit "gestern" ein Dienstag ist. */
function stelleUhr(iso: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
}

afterEach(() => {
  vi.useRealTimers();
});

/** Bar: jeden Tag 18:00 bis 02:00. */
const BAR = Object.fromEntries(
  ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(
    (tag) => [tag, { open: "18:00", close: "02:00", closed: false }],
  ),
) as any;

/**
 * Der Badge im Kopf der Öffnungszeiten. Beschriftung "Offen" bzw.
 * "Geschlossen" (die kompakte Variante der Komponente sagt "Geöffnet" - hier
 * wird bewusst der Badge geprüft, den die veröffentlichte Seite zeigt).
 */
function zeigtGeoeffnet(): boolean {
  return screen.queryAllByText("Offen").length > 0;
}

describe("Öffnen-Badge", () => {
  it("meldet um 22:00 geöffnet, wenn bis 02:00 ausgeschenkt wird", () => {
    stelleUhr("2026-09-09T22:00:00"); // Mittwoch
    render(<OpeningHours hours={BAR} fontColor="#000" />);
    expect(zeigtGeoeffnet()).toBe(true);
  });

  it("meldet um 00:30 noch geöffnet — das Fenster von gestern läuft", () => {
    stelleUhr("2026-09-10T00:30:00"); // Donnerstag früh, Mittwoch-Fenster läuft
    render(<OpeningHours hours={BAR} fontColor="#000" />);
    expect(zeigtGeoeffnet()).toBe(true);
  });

  it("meldet um 03:00 geschlossen", () => {
    stelleUhr("2026-09-10T03:00:00");
    render(<OpeningHours hours={BAR} fontColor="#000" />);
    expect(zeigtGeoeffnet()).toBe(false);
  });

  it("behandelt 00:00 als Ende des Abends, nicht als Anfang", () => {
    stelleUhr("2026-09-09T22:00:00");
    const bis0 = { ...BAR, wednesday: { open: "18:00", close: "00:00", closed: false } };
    render(<OpeningHours hours={bis0} fontColor="#000" />);
    expect(zeigtGeoeffnet()).toBe(true);
  });

  it("bleibt bei gewöhnlichen Zeiten richtig", () => {
    // Haus Töller: Mo–Sa 17:00–23:59.
    stelleUhr("2026-09-09T18:30:00");
    const brauhaus = { ...BAR, wednesday: { open: "17:00", close: "23:59", closed: false } };
    const { unmount } = render(<OpeningHours hours={brauhaus} fontColor="#000" />);
    expect(zeigtGeoeffnet()).toBe(true);
    unmount();

    vi.setSystemTime(new Date("2026-09-09T16:00:00"));
    render(<OpeningHours hours={brauhaus} fontColor="#000" />);
    expect(zeigtGeoeffnet()).toBe(false);
  });

  it("meldet an einem Ruhetag geschlossen, auch wenn gestern lange offen war", () => {
    stelleUhr("2026-09-09T22:00:00");
    const mitRuhetag = { ...BAR, wednesday: { open: "", close: "", closed: true } };
    render(<OpeningHours hours={mitRuhetag} fontColor="#000" />);
    // Das Dienstag-Fenster endete um 02:00 — um 22:00 gilt es nicht mehr.
    expect(zeigtGeoeffnet()).toBe(false);
  });
});
