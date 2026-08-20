import { describe, it, expect } from "vitest";
import { terminImRahmen } from "../routes/publicReservations";

/**
 * `POST /api/public/reservations` ist ohne Anmeldung erreichbar. Ohne Grenze
 * nach oben liess sich der Kalender eines Betriebs mit Buchungen belegen, die
 * niemand je einloest - `GET /slots` meldet die Zeiten dann als vergeben.
 * Gemessen ging eine `reservationTime` im Jahr 2099 durch.
 */

describe("terminImRahmen", () => {
  const jetzt = new Date("2026-08-14T12:00:00.000Z");

  it("nimmt einen Termin morgen an", () => {
    expect(
      terminImRahmen(new Date("2026-08-15T19:00:00.000Z"), 7, jetzt),
    ).toBe(true);
  });

  it("weist das Jahr 2099 ab", () => {
    // Der Fall aus der Untersuchung.
    expect(
      terminImRahmen(new Date("2099-01-01T00:00:00.000Z"), 7, jetzt),
    ).toBe(false);
  });

  it("weist die Vergangenheit ab", () => {
    expect(
      terminImRahmen(new Date("2026-08-13T19:00:00.000Z"), 7, jetzt),
    ).toBe(false);
  });

  it("laesst eine kleine Toleranz nach hinten", () => {
    // Zwischen Auswahl im Formular und Ankunft der Anfrage vergehen Sekunden,
    // und die Uhr des Klienten darf leicht abweichen.
    expect(
      terminImRahmen(new Date("2026-08-14T11:58:00.000Z"), 7, jetzt),
    ).toBe(true);
    expect(
      terminImRahmen(new Date("2026-08-14T11:50:00.000Z"), 7, jetzt),
    ).toBe(false);
  });

  it("richtet sich nach daysAhead des Betriebs", () => {
    const in10Tagen = new Date("2026-08-24T19:00:00.000Z");
    expect(terminImRahmen(in10Tagen, 7, jetzt)).toBe(false);
    expect(terminImRahmen(in10Tagen, 30, jetzt)).toBe(true);
  });

  it("weist ein ungueltiges Datum ab", () => {
    // `new Date("unfug")` ergibt Invalid Date; ohne diese Zeile liefe der
    // Vergleich still auf NaN und ergaebe false - richtig, aber aus Versehen.
    expect(terminImRahmen(new Date("unfug"), 7, jetzt)).toBe(false);
  });
});
