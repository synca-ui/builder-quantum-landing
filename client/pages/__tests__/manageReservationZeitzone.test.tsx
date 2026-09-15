/**
 * Die Gast-Verwaltungsseite (/r/:id aus der Bestätigungsmail) zeigt und
 * bearbeitet die Uhrzeit als Wanduhr des Betriebs.
 *
 * ANLASS (15.09.2026): Seit echte Zeitpunkte gespeichert werden (19:00 Köln =
 * 17:00Z), belegte die Seite das Feld mit `toISOString().slice(0, 16)` - also
 * 17:00 - und schickte bei jedem Speichern `new Date(feld).toISOString()` mit,
 * im Browser gelesen. Wer nur die Personenzahl änderte, verschob die Buchung.
 *
 * Der Browser steht absichtlich in Lissabon (eine Stunde hinter Köln): Das
 * Ergebnis darf nur von der Zone des Betriebs abhängen.
 */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import ManageReservation from "../ManageReservation";

const vorherTZ = process.env.TZ;
beforeAll(() => {
  process.env.TZ = "Europe/Lisbon";
});
afterAll(() => {
  if (vorherTZ === undefined) delete process.env.TZ;
  else process.env.TZ = vorherTZ;
});
afterEach(() => vi.restoreAllMocks());

const RESERVIERUNG = {
  id: "res-1",
  guestName: "Yuki",
  guestCount: 2,
  reservationTime: "2026-09-20T17:00:00.000Z", // 19:00 in Köln
  specialRequests: "",
  status: "PENDING",
  business: { name: "Café Test", timezone: "Europe/Berlin" },
};

function seite(puts: any[]) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any, init?: any) => {
    expect(String(url)).toBe("/api/public/reservations/res-1?t=tok");
    if (init?.method === "PUT") {
      const body = JSON.parse(init.body);
      puts.push(body);
      const reservationTime = body.reservationTime ?? RESERVIERUNG.reservationTime;
      return { json: async () => ({ success: true, data: { ...RESERVIERUNG, ...body, reservationTime } }) } as any;
    }
    return { json: async () => ({ success: true, data: RESERVIERUNG }) } as any;
  });
  render(
    <MemoryRouter initialEntries={["/r/res-1?t=tok"]}>
      <Routes>
        <Route path="/r/:id" element={<ManageReservation />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ManageReservation - Uhrzeit in der Zone des Betriebs", () => {
  test("zeigt 19:00 Kölner Zeit und schickt keine Zeit mit, wenn nur die Personenzahl geändert wird", async () => {
    const puts: any[] = [];
    seite(puts);

    expect(await screen.findByText("Sonntag, 20. September 2026 um 19:00 Uhr")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ändern" }));
    const feld = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    expect(feld.value).toBe("2026-09-20T19:00");

    fireEvent.change(document.querySelector('input[type="number"]')!, { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0].guestCount).toBe(4);
    expect(puts[0]).not.toHaveProperty("reservationTime");
  });

  test("eine geänderte Uhrzeit wird als Kölner Wanduhr zurückgewandelt", async () => {
    const puts: any[] = [];
    seite(puts);

    fireEvent.click(await screen.findByRole("button", { name: "Ändern" }));
    fireEvent.change(document.querySelector('input[type="datetime-local"]')!, { target: { value: "2026-09-20T20:30" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(puts).toHaveLength(1));
    // 20:30 MESZ = 18:30 UTC - nicht 19:30 UTC (Lissabon) und nicht 20:30 UTC.
    expect(puts[0].reservationTime).toBe("2026-09-20T18:30:00.000Z");
    expect(await screen.findByText("Sonntag, 20. September 2026 um 20:30 Uhr")).toBeInTheDocument();
  });
});
