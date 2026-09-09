/**
 * DishList — die geteilte Gerichte-Liste der Templates mit eigenem Layout.
 *
 * Geprüft wird, was die Entwürfe zeigen und was ein Bestands-Template nie
 * hatte: laufende Nummern im Register, der Zähler „01 — 03 / 05“, Rahmen-
 * kästen im 2×2-Raster mit Füllzelle bei ungerader Zahl, Punktlinien-Zeilen
 * ohne Euro-Zeichen, kursive Kategorie-Überschriften in Kobalt.
 */
import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { DishList } from "../DishList";
import { waehleHighlights } from "@/lib/templateLayout";
import type { MenuItem } from "@/types/domain";

const ITEMS: MenuItem[] = [
  { id: "m1", name: "Karaage", description: "Yuzu-Mayo", price: 8.5, category: "Kleine Teller" },
  { id: "m2", name: "Nasu Dengaku", description: "Miso, Aubergine", price: 7, category: "Kleine Teller", isHighlight: true },
  { id: "m3", name: "Gyoza, 6 Stk.", description: "Schwein, Lauch", price: 7.5, category: "Kleine Teller" },
  { id: "m4", name: "Highball", description: "Toki, Soda", price: 9, category: "Getränke" },
  { id: "m5", name: "Sake Junmai", description: "0,1 l", price: 6, category: "Getränke" },
] as MenuItem[];

const FARBEN = {
  fontColor: "#1E1B16",
  priceColor: "#1E1B16",
  primaryColor: "#9C2B22",
  secondaryColor: "#D8CFBE",
  backgroundColor: "#F5F0E6",
};

function highlights(template: string, anzahl: number) {
  return render(
    <DishList
      template={template}
      modus="highlights"
      alle={ITEMS}
      anzeigen={waehleHighlights(ITEMS, anzahl)}
      categories={["Kleine Teller", "Getränke"]}
      onAlle={() => {}}
      {...FARBEN}
    />,
  );
}

function karte(template: string) {
  return render(
    <DishList
      template={template}
      modus="karte"
      alle={ITEMS}
      anzeigen={ITEMS}
      categories={["Kleine Teller", "Getränke"]}
      gruppieren
      {...FARBEN}
    />,
  );
}

describe("kiosk — numeriertes Register", () => {
  test("Leiste mit Zähler, Nummern aus der ganzen Karte, Preise mit Komma", () => {
    const { container, getByText, getByLabelText } = highlights("kiosk", 3);
    expect(getByText("Register")).toBeInTheDocument();
    // Highlights: m2 (markiert) zuerst, dann m1, m3 → Positionen 02, 01, 03
    expect(getByLabelText("Ganze Karte anzeigen").textContent?.replace(/\s+/g, " ")).toBe(
      "01 — 03 / 05",
    );
    const zeilen = container.querySelectorAll('[data-dish-variant="register"]');
    expect(zeilen).toHaveLength(3);
    expect(zeilen[0].textContent).toContain("02");
    expect(zeilen[0].textContent).toContain("7,00");
    expect(zeilen[1].textContent).toContain("01");
    expect(zeilen[1].textContent).toContain("8,50");
    expect(container.textContent).not.toContain("€");
  });

  test("Speisekarte gruppiert mit Zähler je Kategorie", () => {
    const { container, getByText } = karte("kiosk");
    expect(getByText("Kleine Teller")).toBeInTheDocument();
    expect(getByText("Getränke")).toBeInTheDocument();
    expect(container.querySelectorAll('[data-dish-variant="register"]')).toHaveLength(5);
    // Nummern folgen der Position in der ganzen Karte: Highball ist Nr. 04
    const highball = Array.from(container.querySelectorAll("article")).find((a) =>
      a.textContent?.includes("Highball"),
    );
    expect(highball?.textContent).toContain("04");
  });
});

describe("izakaya — Rahmenkästen 2×2", () => {
  test("vier Highlights im Raster, Leiste „Heute 4 von 5“", () => {
    const { container, getByText, getByLabelText } = highlights("izakaya", 4);
    expect(getByText("Heute")).toBeInTheDocument();
    expect(getByLabelText("Ganze Karte anzeigen").textContent).toBe("4 von 5");
    expect(container.querySelectorAll('[data-dish-variant="box"]')).toHaveLength(4);
    // gerade Anzahl → keine Füllzelle
    expect(container.querySelectorAll('section [aria-hidden="true"]:not(img)').length).toBe(
      // Bildplatzhalter (4 Kästen ohne Bild) — aber keine leere Füllzelle:
      4,
    );
    expect(container.querySelector(".grid.grid-cols-2")).not.toBeNull();
  });

  test("ungerade Kategorie bekommt eine Füllzelle, damit das Raster schließt", () => {
    const { container } = karte("izakaya");
    const raster = container.querySelectorAll(".grid.grid-cols-2");
    expect(raster).toHaveLength(2); // je Kategorie ein Raster
    // „Kleine Teller“ hat 3 Kästen → 3 Kästen + 1 Füllzelle = 4 Kinder
    expect(raster[0].children).toHaveLength(4);
    // „Getränke“ hat 2 Kästen → keine Füllzelle
    expect(raster[1].children).toHaveLength(2);
  });
});

describe("presse — Punktlinien", () => {
  test("Kategorie-Kapitälchen, ganze Beträge ohne Nachkommastellen, kein Euro", () => {
    const { container, getByText } = karte("presse");
    expect(getByText("Kleine Teller").className).toContain("uppercase");
    const zeilen = container.querySelectorAll('[data-dish-variant="leader"]');
    expect(zeilen).toHaveLength(5);
    const highball = Array.from(zeilen).find((a) => a.textContent?.includes("Highball"));
    expect(highball?.textContent).toContain("9");
    expect(highball?.textContent).not.toContain("9,00");
    expect(highball?.querySelector(".border-dotted")).not.toBeNull();
    expect(container.textContent).not.toContain("€");
  });

  test("Highlights stehen unter Kategorie-Überschriften und führen zur Karte", () => {
    const { getByText } = highlights("presse", 3);
    expect(getByText("Kleine Teller")).toBeInTheDocument();
    expect(getByText("Zur Karte")).toBeInTheDocument();
  });
});

describe("morgen — Linienkarte", () => {
  test("kursive Kobalt-Überschrift mit Linie, Preise in Primärfarbe", () => {
    const { container, getByText } = karte("morgen");
    const kopf = getByText("Kleine Teller");
    expect(kopf.className).toContain("italic");
    expect((kopf as HTMLElement).style.color).toBe("rgb(156, 43, 34)"); // primaryColor
    expect(container.querySelectorAll('[data-dish-variant="ruled"]')).toHaveLength(5);
  });
});

describe("Zuordnung", () => {
  test("jede Liste trägt ihr Template als Datenattribut — Anker für den Paritätstest", () => {
    for (const t of ["presse", "kiosk", "izakaya", "morgen"]) {
      const { container, unmount } = karte(t);
      expect(container.querySelector(`[data-template-list="${t}"]`)).not.toBeNull();
      unmount();
    }
  });
});
