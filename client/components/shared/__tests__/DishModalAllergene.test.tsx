import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import { DishModal } from "../DishModal";
import type { MenuItem } from "@/types/domain";

/**
 * A1.3 an der Stelle, an der es der Gast sieht.
 *
 * Zwei Fehler dieser Art hat eine Durchsicht am 7.8.2026 gefunden, und beide
 * waren unsichtbar — Gerichte, Preise und Kategorien stimmten:
 *   1. Die Legende wurde vom Server berechnet, aber nicht ausgeliefert.
 *   2. Die Vorschau im Konfigurator reichte sie nicht an dieses Modal weiter,
 *      die veröffentlichte Seite schon — Vorschau und Seite wichen ab.
 *
 * Deshalb prüft dieser Test nicht "wird etwas angezeigt", sondern: Steht dort
 * der KLARTEXT, wenn die Karte eine Legende mitbringt — und das rohe Kürzel,
 * wenn nicht.
 */

const gericht: MenuItem = {
  id: "1",
  name: "Wiener Schnitzel",
  price: "18.90",
  allergens: ["a1", "f"],
  labels: ["scharf"],
};

const farben = {
  fontColor: "#111111",
  backgroundColor: "#ffffff",
  priceColor: "#059669",
  primaryColor: "#14b8a6",
};

describe("DishModal: Allergene und Labels", () => {
  test("schreibt die Kürzel aus, wenn die Karte eine Legende hat", () => {
    render(
      <DishModal
        dish={gericht}
        {...farben}
        onClose={vi.fn()}
        allergenLegend={{ a1: "Weizen", f: "Milch/Laktose" }}
      />,
    );
    expect(screen.getByText("Weizen")).toBeInTheDocument();
    expect(screen.getByText("Milch/Laktose")).toBeInTheDocument();
    // Das rohe Kürzel steht dann nicht mehr da.
    expect(screen.queryByText("a1")).not.toBeInTheDocument();
  });

  test("zeigt das rohe Kürzel, wenn die Karte keine Legende mitbringt", () => {
    // Lieber ein unaufgelöstes Kürzel als eine erfundene Zuordnung: Was "f"
    // bedeutet, legt jede Karte selbst fest.
    render(<DishModal dish={gericht} {...farben} onClose={vi.fn()} />);
    expect(screen.getByText("a1")).toBeInTheDocument();
    expect(screen.getByText("f")).toBeInTheDocument();
  });

  test("löst nur auf, was in der Legende steht", () => {
    render(
      <DishModal
        dish={gericht}
        {...farben}
        onClose={vi.fn()}
        allergenLegend={{ a1: "Weizen" }}
      />,
    );
    expect(screen.getByText("Weizen")).toBeInTheDocument();
    expect(screen.getByText("f")).toBeInTheDocument();
  });

  test("zeigt die Ernährungs-Labels", () => {
    render(<DishModal dish={gericht} {...farben} onClose={vi.fn()} />);
    expect(screen.getByText("scharf")).toBeInTheDocument();
  });

  test("zeigt Varianten und ihre Aufpreise", () => {
    // A1.2 an der Stelle, an der es der Gast sieht.
    //
    // Solange nach Regeln erkannt wurde, landeten Varianten fälschlich als
    // eigene Gerichte auf der Karte — falsch, aber sichtbar. Seit die
    // Strukturierung über ein Modell läuft, hängen sie korrekt als extras am
    // Gericht. Ohne Anzeige wären sie damit ganz verschwunden, und die
    // Verbesserung hätte den Wirt Zeilen gekostet.
    render(
      <DishModal
        dish={{
          id: "3",
          name: "Pizza Margherita",
          price: "9.50",
          extras: [
            { name: "große Portion", price: "3.00" },
            { name: "mit extra Käse", price: "1.20" },
            { name: "ohne Basilikum" },
          ],
        }}
        {...farben}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("große Portion")).toBeInTheDocument();
    expect(screen.getByText("3.00€")).toBeInTheDocument();
    expect(screen.getByText("mit extra Käse")).toBeInTheDocument();
    // Eine Variante ohne Aufpreis wird trotzdem genannt — nur ohne Preis.
    expect(screen.getByText("ohne Basilikum")).toBeInTheDocument();
  });

  test("zeigt keinen Varianten-Block, wenn es keine gibt", () => {
    render(<DishModal dish={gericht} {...farben} onClose={vi.fn()} />);
    expect(screen.queryByText("Dazu wählbar")).not.toBeInTheDocument();
  });

  test("zeigt gar nichts, wenn das Gericht nicht gekennzeichnet ist", () => {
    // Ein leerer Block läse sich wie "geprüft, nichts enthalten".
    render(
      <DishModal
        dish={{ id: "2", name: "Pommes", price: "4.50" }}
        {...farben}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByText(/Allergene und Zusatzstoffe/)).not.toBeInTheDocument();
  });
});
