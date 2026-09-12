import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import { AppRenderer } from "../AppRenderer";

/**
 * Die veröffentlichte Seite — genau das, was der Gast unter
 * <subdomain>.maitr.de sieht.
 *
 * Zwei Befunde vom Echtfall bella12.maitr.de (31.08.2026) sind hier
 * festgenagelt:
 *
 *  1. ANGEBOTE. Im Konfigurator angelegt, in der Vorschau sichtbar, auf der
 *     Live-Seite spurlos weg. Ursache lag in der öffentlichen Feldliste
 *     (siehe server/__tests__/publicSiteAngebote.spec.ts) und in
 *     normalizeConfig; AppRenderer selbst konnte es immer. Dieser Test prüft
 *     die Form, die die API tatsächlich ausliefert — flach.
 *
 *  2. FARBE UNTER DER NOTCH. Der Streifen über dem Seitenanfang war weiß,
 *     während die Kopfzeile cremefarben war. Mobile Safari malt diesen Bereich
 *     mit dem Dokument-Hintergrund, nicht mit dem eines <div> im Baum — und
 *     der stand über client/global.css auf Weiß.
 */
const KOPF_FARBE = "#F9F6EF";

const CONFIG = {
  businessName: "Bella",
  slogan: "Hey wir sind Bella",
  template: "riviera",
  headerBackgroundColor: KOPF_FARBE,
  backgroundColor: "#F3F4F6",
  fontColor: "#1F2E3D",
  headerFontColor: "#1F2E3D",
  selectedPages: ["menu"],
  menuItems: [],
  gallery: [],
  offers: [
    {
      id: "1787219553161",
      name: "Mittagstisch",
      price: "9,99",
      description: "hier gibts Mittag",
    },
  ],
  offerBanner: {
    enabled: true,
    size: "large",
    backgroundColor: "#000000",
    textColor: "#FFFFFF",
    buttonColor: "#FFFFFF",
  },
  offerPageEnabled: true,
};

describe("AppRenderer – Angebote auf der veröffentlichten Seite", () => {
  test("zeigt das Angebots-Banner auf der Startseite", () => {
    render(<AppRenderer config={CONFIG} />);

    expect(screen.getByText("Mittagstisch")).toBeInTheDocument();
    expect(screen.getByText("9,99 €")).toBeInTheDocument();
    expect(screen.getByText(/Zu den Angeboten/)).toBeInTheDocument();
  });

  test("führt vom Banner auf die Angebote-Seite", () => {
    render(<AppRenderer config={CONFIG} />);

    fireEvent.click(screen.getByText(/Zu den Angeboten/));

    expect(
      screen.getByRole("heading", { name: "Angebote" }),
    ).toBeInTheDocument();
  });

  test("zeigt ohne Angebote kein Banner", () => {
    render(
      <AppRenderer
        config={{ ...CONFIG, offers: [], offerBanner: { enabled: false } }}
      />,
    );

    expect(screen.queryByText("Mittagstisch")).not.toBeInTheDocument();
  });
});

describe("AppRenderer – Farbe unter der Notch", () => {
  test("legt die Kopfzeilenfarbe auf theme-color UND das Dokument", () => {
    render(<AppRenderer config={CONFIG} />);

    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    expect(meta?.getAttribute("content")).toBe(KOPF_FARBE);

    // #F9F6EF — jsdom normalisiert Hex zu rgb().
    expect(document.body.style.backgroundColor).toBe("rgb(249, 246, 239)");
    expect(document.documentElement.style.backgroundColor).toBe(
      "rgb(249, 246, 239)",
    );
  });

  test("gibt den Dokument-Hintergrund beim Verlassen wieder frei", () => {
    const { unmount } = render(<AppRenderer config={CONFIG} />);
    unmount();

    expect(document.body.style.backgroundColor).toBe("");
    expect(document.documentElement.style.backgroundColor).toBe("");
  });
});
