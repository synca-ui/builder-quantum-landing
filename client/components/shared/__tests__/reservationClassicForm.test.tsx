/**
 * Das klassische Reservierungsformular bucht wirklich — mit demselben
 * Payload wie das „modern“-Formular. Bis 10.09.2026 war sein Knopf in
 * beiden Renderern eine Attrappe.
 */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ReservationClassicForm } from "../ReservationClassicForm";

const FARBEN = { primaryColor: "#A81E14", fontColor: "#14110D" };
const TAG = { open: "12:00", close: "23:00", closed: false };
const HOURS: any = { monday: TAG, tuesday: TAG, wednesday: TAG, thursday: TAG, friday: TAG, saturday: TAG, sunday: TAG };

afterEach(() => vi.restoreAllMocks());

describe("ReservationClassicForm", () => {
  test("live: holt Zeitfenster vom Server und sendet die Anfrage mit demselben Payload wie „modern“", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any, init?: any) => {
      const u = String(url);
      if (u.startsWith("/api/public/reservations/slots")) {
        return { json: async () => ({ success: true, slots: [{ time: "18:00", datetime: "2026-09-11T18:00:00.000Z", available: true }, { time: "19:00", datetime: "2026-09-11T19:00:00.000Z", available: false }] }) } as any;
      }
      expect(u).toBe("/api/public/reservations");
      const body = JSON.parse(init.body);
      expect(body).toMatchObject({ configId: "cfg-1", guestName: "Yuki", guestEmail: "yuki@example.de", guestCount: 3, reservationTime: "2026-09-11T18:00:00.000Z" });
      expect(body.guestPhone).toBeUndefined();
      return { json: async () => ({ success: true }) } as any;
    });

    render(<ReservationClassicForm configId="cfg-1" maxGuests={6} buttonShape="square" {...FARBEN} />);
    await waitFor(() => expect(screen.getByText("18:00 Uhr")).toBeInTheDocument());
    expect((screen.getByText("19:00 Uhr") as HTMLOptionElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Uhrzeit"), { target: { value: "18:00" } });
    fireEvent.change(screen.getByLabelText("Anzahl Gäste"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Yuki" } });
    fireEvent.change(screen.getByLabelText("Telefon / E-Mail"), { target: { value: "yuki@example.de" } });
    fireEvent.click(screen.getByRole("button", { name: "Reservierung anfragen" }));

    await waitFor(() => expect(screen.getByText("Anfrage gesendet")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(document.querySelector('[data-reservation-form][data-state="gesendet"]')).not.toBeNull();
    // Knopfform kommt an
    expect((screen.getByRole("button", { name: "Neue Reservierung" }) as HTMLElement).style.borderRadius).toBe("0px");
  });

  test("validiert Name und Uhrzeit, bevor etwas gesendet wird", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({ json: async () => ({ success: true, slots: [] }) } as any);
    render(<ReservationClassicForm configId="cfg-1" {...FARBEN} />);
    fireEvent.click(screen.getByRole("button", { name: "Reservierung anfragen" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Namen");
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Yuki" } });
    fireEvent.click(screen.getByRole("button", { name: "Reservierung anfragen" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Uhrzeit");
    // Nur die Slot-Abfrage, keine Reservierung
    expect(fetchMock.mock.calls.every((c) => String(c[0]).includes("/slots"))).toBe(true);
  });

  test("Vorschau: Zeitfenster aus dem Store, Absenden ohne Netz", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(
      <ReservationClassicForm previewSlots={["12:00", "13:00", "18:00", "19:00"]} previewOpeningHours={HOURS} {...FARBEN} />,
    );
    await waitFor(() => expect(screen.getByText("18:00 Uhr")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Uhrzeit"), { target: { value: "18:00" } });
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Yuki" } });
    fireEvent.click(screen.getByRole("button", { name: "Reservierung anfragen" }));
    expect(await screen.findByText("Anfrage gesendet")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("Serverfehler wird gezeigt, das Formular bleibt stehen", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) =>
      String(url).includes("/slots")
        ? ({ json: async () => ({ success: true, slots: [{ time: "18:00", datetime: "x", available: true }] }) } as any)
        : ({ json: async () => ({ success: false, error: "Ausgebucht" }) } as any),
    );
    render(<ReservationClassicForm configId="cfg-1" {...FARBEN} />);
    await waitFor(() => expect(screen.getByText("18:00 Uhr")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Uhrzeit"), { target: { value: "18:00" } });
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Yuki" } });
    fireEvent.click(screen.getByRole("button", { name: "Reservierung anfragen" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ausgebucht");
    expect(screen.getByLabelText("Name")).toHaveValue("Yuki");
  });
});
