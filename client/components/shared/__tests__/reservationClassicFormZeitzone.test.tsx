/**
 * Das klassische Reservierungsformular startet auf dem lokalen Kalendertag.
 *
 * ANLASS (15.09.2026): `heuteISO()` nahm `toISOString().split("T")[0]` von der
 * lokalen Mitternacht - in Berlin der Vortag, als Vorgabe UND als `min` des
 * Datumsfelds. Kurz nach Mitternacht fragte das Formular gestern ab.
 *
 * Die Zone der Maschine wird auf Berlin gesetzt: In UTC wäre der alte Code
 * zufällig richtig und der Test blind.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { ReservationClassicForm } from "../ReservationClassicForm";

const vorherTZ = process.env.TZ;
beforeAll(() => {
  process.env.TZ = "Europe/Berlin";
});
afterAll(() => {
  if (vorherTZ === undefined) delete process.env.TZ;
  else process.env.TZ = vorherTZ;
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ReservationClassicForm - Kalendertag", () => {
  test("Vorgabe und Untergrenze sind der lokale Tag, die Slot-Abfrage auch", async () => {
    // Nur Date fälschen: Timer bleiben echt, sonst hängt waitFor.
    vi.useFakeTimers({ toFake: ["Date"] });
    // 15.09., 00:30 in Berlin - in UTC noch der 14.09.
    vi.setSystemTime(new Date("2026-09-14T22:30:00.000Z"));
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      json: async () => ({ success: true, slots: [] }),
    } as any);

    render(<ReservationClassicForm configId="cfg-1" primaryColor="#A81E14" fontColor="#14110D" />);

    const datum = screen.getByLabelText("Datum") as HTMLInputElement;
    expect(datum.value).toBe("2026-09-15");
    expect(datum.min).toBe("2026-09-15");
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(String(fetchMock.mock.calls[0][0])).toContain("date=2026-09-15");
  });
});
