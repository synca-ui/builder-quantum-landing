/**
 * Das „modern“-Reservierungsformular schickt den Kalendertag, den der Gast
 * gewählt hat, und die Vorschau rechnet Zeitpunkte wie der Server.
 *
 * ANLASS (15.09.2026): `toISO()` nahm `toISOString().split("T")[0]` von lokalen
 * Mitternächten - in Berlin der Vortag. „Morgen“ buchte für heute, „Heute“ fragte
 * gestern ab und scheiterte mit „max. 7 Tage im Voraus“. Die Vorschau baute
 * `${datum}T19:00:00.000Z`, während GET /slots längst 17:00Z liefert.
 *
 * Die Zone der Maschine wird auf Berlin gesetzt: In UTC wäre der alte Code
 * zufällig richtig und der Test blind.
 */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import ReservationFormModern from "../ReservationFormModern";

const vorherTZ = process.env.TZ;
beforeAll(() => {
  process.env.TZ = "Europe/Berlin";
});
afterAll(() => {
  if (vorherTZ === undefined) delete process.env.TZ;
  else process.env.TZ = vorherTZ;
});

beforeEach(() => {
  // Nur Date fälschen: Timer bleiben echt, sonst hängt waitFor.
  vi.useFakeTimers({ toFake: ["Date"] });
  // 15.09., 00:30 in Berlin - in UTC noch der 14.09.
  vi.setSystemTime(new Date("2026-09-14T22:30:00.000Z"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ReservationFormModern - Kalendertag und Zeitpunkte", () => {
  test("live: „Heute“ und „Morgen“ fragen den lokalen Tag ab, nicht den UTC-Vortag", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      json: async () => ({ success: true, slots: [] }),
    } as any);

    render(<ReservationFormModern configId="cfg-1" businessName="Café Test" />);

    const letzteAbfrage = () => String(fetchMock.mock.calls[fetchMock.mock.calls.length - 1][0]);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(letzteAbfrage()).toContain("date=2026-09-15");

    fireEvent.click(screen.getByRole("button", { name: "Morgen" }));
    await waitFor(() => expect(letzteAbfrage()).toContain("date=2026-09-16"));
  });

  test("Vorschau: Zeitfenster sind echte Zeitpunkte in Europe/Berlin - wie GET /slots", async () => {
    const posts: any[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url: any, init?: any) => {
      posts.push(JSON.parse(init.body));
      return { json: async () => ({ success: true }) } as any;
    });

    render(<ReservationFormModern configId="preview" previewSlots={["19:00"]} businessName="Café Test" />);

    fireEvent.click(await screen.findByRole("button", { name: "19:00" }));
    fireEvent.click(screen.getByRole("button", { name: "Tisch anfragen" }));
    fireEvent.change(await screen.findByPlaceholderText("Max Mustermann"), { target: { value: "Yuki" } });
    fireEvent.click(screen.getByRole("button", { name: "Tisch anfragen" }));

    await waitFor(() => expect(posts).toHaveLength(1));
    // 15.09., 19:00 MESZ = 17:00 UTC. Vorher: 2026-09-14T19:00:00.000Z (Vortag UND UTC).
    expect(posts[0].reservationTime).toBe("2026-09-15T17:00:00.000Z");
  });
});
