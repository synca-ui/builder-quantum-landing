import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import { ErgebnisFarben } from "../ErgebnisFarben";
import { buntheit, rgbZuHsl, contrastRatio } from "@shared/autoPublish";
import type { DesignConfig } from "@shared/suggestedConfig";

/**
 * A2.3 aus dem Feedback vom 6.8.2026: "Farben direkt anpassbar."
 *
 * Vorher stand auf der Ergebnisseite nur "Alles lässt sich danach im
 * Konfigurator ändern" — für eine Farbänderung also 15 Schritte.
 *
 * Geprüft wird hier vor allem das, was man beim Anschauen NICHT sieht: dass
 * die abgeleiteten Farben mitwandern und die Hintergrundregel aus A4.1 auch
 * für eine selbst gewählte Farbe gilt.
 */

const hslVon = (hex: string) => {
  const raw = hex.replace("#", "");
  return rgbZuHsl(
    parseInt(raw.slice(0, 2), 16),
    parseInt(raw.slice(2, 4), 16),
    parseInt(raw.slice(4, 6), 16),
  );
};

function aufbauen(
  design: Partial<DesignConfig> = {
    primaryColor: "#14b8a6",
    backgroundColor: "#ffffff",
  },
) {
  const onChange = vi.fn();
  render(<ErgebnisFarben design={design} onChange={onChange} />);
  return { onChange };
}

describe("ErgebnisFarben", () => {
  test("zeigt die drei Farben, die der Wirt anfassen darf", () => {
    aufbauen();
    expect(screen.getByLabelText(/Primär/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Sekundär/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Hintergrund/)).toBeInTheDocument();
  });

  test("meldet eine geänderte Primärfarbe nach oben", () => {
    const { onChange } = aufbauen();
    fireEvent.change(screen.getByLabelText(/Primär/), {
      target: { value: "#ff0000" },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].primaryColor).toBe("#ff0000");
  });

  test("rechnet die abgeleiteten Farben neu", () => {
    // Der eigentliche Grund für diesen Test: Ohne das Zurücksetzen der
    // abgeleiteten Werte bliebe nach dem Wechsel auf einen dunklen Grund die
    // dunkle Schrift stehen — unlesbar, und niemand merkt es beim Klicken.
    const { onChange } = aufbauen({
      primaryColor: "#14b8a6",
      backgroundColor: "#ffffff",
      fontColor: "#1f2937",
    });
    fireEvent.change(screen.getByLabelText(/Hintergrund/), {
      target: { value: "#101010" },
    });
    const neu = onChange.mock.calls[0][0];
    expect(contrastRatio(neu.fontColor, neu.backgroundColor)).toBeGreaterThanOrEqual(4.5);
  });

  test("entschärft eine grelle Wunschfarbe SICHTBAR", () => {
    // A4.1 gilt auch für eine selbst gewählte Farbe. Sie still im Hintergrund
    // anzuwenden hieße, dem Wirt eine andere Farbe zu zeigen als die, die er
    // bekommt — deshalb steht der entschärfte Wert im Feld.
    const { onChange } = aufbauen({
      primaryColor: "#14b8a6",
      backgroundColor: "#e01b24",
    });
    const feld = screen.getByLabelText(/Hintergrund/) as HTMLInputElement;
    const [, s, l] = hslVon(feld.value);
    expect(buntheit(s, l)).toBeLessThanOrEqual(0.19);
    expect(feld.value.toLowerCase()).not.toBe("#e01b24");
    expect(onChange).not.toHaveBeenCalled(); // nur Anzeige, kein stiller Schreibvorgang
  });

  test("lässt eine weiche Farbe unangetastet", () => {
    aufbauen({ primaryColor: "#14b8a6", backgroundColor: "#f1e5d0" });
    expect((screen.getByLabelText(/Hintergrund/) as HTMLInputElement).value).toBe(
      "#f1e5d0",
    );
  });
});
