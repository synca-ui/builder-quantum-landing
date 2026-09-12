/**
 * Flächen in der Sekundärfarbe bleiben lesbar — mit JEDER Nutzerfarbe.
 *
 * Eisdiele und Imbissbude legen den Hero auf die Sekundärfarbe, Aperitivo
 * und Eisdiele ihre Karten, Aperitivo die Kategorie-Marker. Stellt der
 * Betrieb die Sekundärfarbe dunkel, stand dort vorher dunkler Text auf
 * dunkler Fläche. Jetzt rechnen die Komponenten den Text gegen die
 * tatsächliche Fläche (Mischfarbe bei Transparenz) und weichen auf Weiß aus.
 */
import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Hero } from "../Hero";
import { DishList } from "../DishList";
import { kontrast, mische } from "@/lib/templateLayout";
import type { MenuItem } from "@/types/domain";

/** „rgb(r, g, b)“ → „#RRGGBB“, für den Kontrast gegen die Fläche. */
function hex(rgb: string): string {
  const m = /rgb\((\d+), (\d+), (\d+)\)/.exec(rgb)!;
  return "#" + [m[1], m[2], m[3]].map((c) => Number(c).toString(16).padStart(2, "0")).join("");
}

const DUNKEL = "#1F2A44"; // Navy als Sekundärfarbe
const HELL = "#BEE3C9"; // Pistazie
const FARBEN = {
  primaryColor: "#C93560",
  fontColor: "#3B2A2A",
  backgroundColor: "#FFF8F0",
  priceColor: "#3B2A2A",
};
const ITEMS: MenuItem[] = [
  { id: "m1", name: "Karaage", price: 8.5, category: "Kleine Teller" },
  { id: "m2", name: "Highball", price: 9, category: "Getränke" },
] as MenuItem[];

function heroTitel(template: string, secondaryColor: string) {
  const { container } = render(
    <Hero
      template={template}
      slogan="Teilen ist der Plan."
      businessName="Yuki Bar"
      secondaryColor={secondaryColor}
      {...FARBEN}
    />,
  );
  return container.querySelector("h1") as HTMLElement;
}

describe.each(["gelato", "imbiss"])("Hero '%s'", (template) => {
  test("helle Sekundärfarbe: Titel in der Textfarbe", () => {
    expect(heroTitel(template, HELL).style.color).toBe("rgb(59, 42, 42)");
  });
});

test("imbiss: Schild in voller Sekundärfarbe — dunkel heißt weißer Titel", () => {
  expect(heroTitel("imbiss", DUNKEL).style.color).toBe("rgb(255, 255, 255)");
});

test("gelato: Block zu 60 % — der Titel weicht von der Textfarbe ab und erreicht AA auf der Mischfläche", () => {
  const titel = heroTitel("gelato", DUNKEL).style.color;
  expect(titel).not.toBe("rgb(59, 42, 42)");
  const flaeche = mische(DUNKEL, FARBEN.backgroundColor, 0.6);
  expect(kontrast(hex(titel), flaeche)).toBeGreaterThanOrEqual(4.5);
});

describe("Karten und Marker", () => {
  test("aperitivo: Kreis-Karte und Marker-Überschrift auf dunkler Sekundärfläche in Weiß", () => {
    const { container } = render(
      <DishList
        template="aperitivo"
        modus="karte"
        alle={ITEMS}
        anzeigen={ITEMS}
        gruppieren
        secondaryColor={DUNKEL}
        {...FARBEN}
      />,
    );
    // Karte: Sekundärfarbe zu 40 % über Creme ist mittelhell — die Textfarbe
    // muss darauf AA erreichen, egal ob sie bleibt oder ausweicht.
    const karte = container.querySelector('[data-dish-variant="kreis"]') as HTMLElement;
    const flaeche = mische(DUNKEL, FARBEN.backgroundColor, 0.4);
    expect(kontrast(hex(karte.style.color), flaeche)).toBeGreaterThanOrEqual(4.5);
    // Marker: volle Sekundärfarbe — Navy verlangt Weiß.
    const marker = container.querySelector("h3 span") as HTMLElement;
    expect(marker.style.color).toBe("rgb(255, 255, 255)");
  });

  test("gelato: Sticker auf heller Fläche bleibt in der Textfarbe", () => {
    const { container } = render(
      <DishList
        template="gelato"
        modus="karte"
        alle={ITEMS}
        anzeigen={ITEMS}
        secondaryColor={HELL}
        {...FARBEN}
      />,
    );
    const karte = container.querySelector('[data-dish-variant="sticker"]') as HTMLElement;
    expect(karte.style.color).toBe("rgb(59, 42, 42)");
  });
});
