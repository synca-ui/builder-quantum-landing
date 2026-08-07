import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import { CategoryFilter } from "../CategoryFilter";

/**
 * Der Anlass für diese Datei steht im Feedback vom 6.8.2026 als A2.1:
 * "Alle Kategorien einblendbar — aktuell steht '6 mehr', nicht anklickbar."
 *
 * Genau so war es: Der Hinweis war ein <div> ohne onClick, und die Kategorien
 * dahinter waren im ganzen Bildschirm nicht erreichbar. Bei einer automatisch
 * erkannten Karte ist das kein Randfall — der Messkorpus vom 7.8.2026 enthält
 * Karten mit 14 und 19 Kategorien.
 */

const KATEGORIEN = [
  "Vorspeisen",
  "Suppen",
  "Salate",
  "Hauptgerichte",
  "Fisch",
  "Desserts",
  "Weine",
  "Biere",
];

function aufbauen(props: Partial<React.ComponentProps<typeof CategoryFilter>> = {}) {
  const onCategoryChange = vi.fn();
  render(
    <CategoryFilter
      categories={KATEGORIEN}
      activeCategory={null}
      onCategoryChange={onCategoryChange}
      fontColor="#111111"
      backgroundColor="#ffffff"
      {...props}
    />,
  );
  return { onCategoryChange };
}

describe("CategoryFilter", () => {
  test("zeigt zunächst nur maxVisible Kategorien und meldet den Rest", () => {
    aufbauen();
    expect(screen.getByRole("tab", { name: "Vorspeisen" })).toBeInTheDocument();
    // 8 Kategorien, Vorgabe maxVisible = 5 -> 3 verborgen
    expect(screen.queryByRole("tab", { name: "Weine" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+3 mehr" })).toBeInTheDocument();
  });

  test("macht die verborgenen Kategorien per Klick erreichbar", () => {
    // Das ist der Kern von A2.1. Vorher war der Hinweis ein <div>: Dieser Test
    // fände dort schon keinen Knopf.
    aufbauen();

    fireEvent.click(screen.getByRole("button", { name: "+3 mehr" }));

    expect(screen.getByRole("tab", { name: "Weine" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Biere" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "weniger" })).toBeInTheDocument();
  });

  test("eine aufgeklappte Kategorie ist auch wirklich wählbar", () => {
    const { onCategoryChange } = aufbauen();

    fireEvent.click(screen.getByRole("button", { name: "+3 mehr" }));
    fireEvent.click(screen.getByRole("tab", { name: "Biere" }));

    expect(onCategoryChange).toHaveBeenCalledWith("Biere");
  });

  test("klappt wieder zu", () => {
    aufbauen();

    fireEvent.click(screen.getByRole("button", { name: "+3 mehr" }));
    fireEvent.click(screen.getByRole("button", { name: "weniger" }));

    expect(screen.queryByRole("tab", { name: "Weine" })).not.toBeInTheDocument();
  });

  test("klappt von selbst auf, wenn die gewählte Kategorie hinten liegt", () => {
    // Sonst ist gefiltert, aber nirgends erkennbar wonach.
    aufbauen({ activeCategory: "Biere" });
    expect(screen.getByRole("tab", { name: "Biere" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Biere" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("zeigt keinen Knopf, wenn ohnehin alles sichtbar ist", () => {
    aufbauen({ categories: ["Vorspeisen", "Desserts"] });
    expect(screen.queryByRole("button", { name: /mehr/ })).not.toBeInTheDocument();
  });

  test("rendert gar nichts ohne Kategorien", () => {
    const { container } = render(
      <CategoryFilter
        categories={[]}
        activeCategory={null}
        onCategoryChange={vi.fn()}
        fontColor="#111111"
        backgroundColor="#ffffff"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
