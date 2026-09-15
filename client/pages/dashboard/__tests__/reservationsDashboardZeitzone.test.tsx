/**
 * Das Web-Dashboard rechnet Reservierungen in der Wanduhr des Betriebs.
 *
 * ANLASS (15.09.2026): handleAddReservation schickte `${datum}T19:00:00.000Z`
 * (Wanduhr als UTC). Seit GET /api/public/reservations/slots echte Zeitpunkte
 * in Europe/Berlin rechnet, galt eine Dashboard-Buchung um 19:00 als 21:00 -
 * 19:00 blieb für Web-Gäste frei (Doppelbuchung), und die Bestätigungsmail
 * nannte 21:00. Anzeige und Tagesfilter liefen in der Zone des Browsers.
 *
 * Der Browser steht in diesem Test absichtlich in New York: Ergebnis darf nur
 * von der Zone des Betriebs abhängen, die der Server mitliefert.
 */
import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true, userId: "u-1", getToken: getTokenStabil }),
}));
// Stabil über Renders, sonst feuerte der useEffect mit [getToken] endlos.
const getTokenStabil = async () => "tok";

import ReservationsDashboard from "../ReservationsDashboard";

const vorherTZ = process.env.TZ;
beforeAll(() => {
  process.env.TZ = "America/New_York";
});
afterAll(() => {
  if (vorherTZ === undefined) delete process.env.TZ;
  else process.env.TZ = vorherTZ;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const BUCHUNGEN = [
  // 19:00 in Köln am 20.09.
  { id: "r-1", guestName: "Yuki", guestEmail: "", guestPhone: "", guestCount: 2, reservationTime: "2026-09-20T17:00:00.000Z", specialRequests: "", status: "PENDING" },
  // 00:30 in Köln am 21.09. - in UTC und in New York noch der 20.09.
  { id: "r-2", guestName: "Spät", guestEmail: "", guestPhone: "", guestCount: 4, reservationTime: "2026-09-20T22:30:00.000Z", specialRequests: "", status: "PENDING" },
];

function fetchAttrappe(posts: any[]) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any, init?: any) => {
    const u = String(url);
    if (u === "/api/configurations") {
      return { json: async () => ({ success: true, data: [{ id: "cfg-1" }] }) } as any;
    }
    if (u.startsWith("/api/dashboard/reservations?")) {
      return { json: async () => ({ success: true, data: BUCHUNGEN, timezone: "Europe/Berlin" }) } as any;
    }
    if (u === "/api/dashboard/reservations" && init?.method === "POST") {
      const body = JSON.parse(init.body);
      posts.push(body);
      return { json: async () => ({ success: true, data: { id: "neu", ...body, status: "PENDING" } }) } as any;
    }
    throw new Error(`unerwartet: ${u}`);
  });
}

describe("ReservationsDashboard - Zone des Betriebs", () => {
  test("zeigt Uhrzeit und Kalendertag in Köln, nicht in der Zone des Browsers", async () => {
    // Nur Date fälschen: Timer bleiben echt, sonst hängt waitFor.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-20T14:00:00.000Z")); // 10:00 in New York, 16:00 in Köln
    fetchAttrappe([]);

    render(<ReservationsDashboard />);

    await waitFor(() => expect(screen.getByText("Yuki")).toBeInTheDocument());
    expect(screen.getByText("19:00")).toBeInTheDocument();
    // Die Buchung um 00:30 gehört in Köln zum 21.09. und steht nicht am 20.09.
    expect(screen.queryByText("Spät")).not.toBeInTheDocument();
  });

  test("neue Reservierung: Datum + Uhrzeit werden in Köln zum echten Zeitpunkt", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-20T14:00:00.000Z"));
    const posts: any[] = [];
    fetchAttrappe(posts);

    render(<ReservationsDashboard />);
    await waitFor(() => expect(screen.getByText("Yuki")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Neue Reservierung/ }));
    const dialog = await screen.findByRole("dialog");
    const datum = dialog.querySelector('input[type="date"]') as HTMLInputElement;
    // Vorbelegt mit dem gewählten Kalendertag - nicht mit dem UTC-Tag.
    expect(datum.value).toBe("2026-09-20");

    fireEvent.change(datum, { target: { value: "2026-09-21" } });
    fireEvent.change(dialog.querySelector('input[type="time"]')!, { target: { value: "19:30" } });
    fireEvent.change(within(dialog).getByPlaceholderText("Max Mustermann"), { target: { value: "Mika" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(posts).toHaveLength(1));
    // 21.09., 19:30 in Köln (MESZ) = 17:30 UTC. Vorher: 2026-09-21T19:30:00.000Z.
    expect(posts[0]).toMatchObject({ configId: "cfg-1", guestName: "Mika", reservationTime: "2026-09-21T17:30:00.000Z" });
  });
});
