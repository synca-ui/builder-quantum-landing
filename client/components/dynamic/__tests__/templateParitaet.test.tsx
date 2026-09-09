/**
 * Parität Vorschau ↔ Live-Seite für die Templates mit eigenem Layout.
 *
 * Das Versprechen des Konfigurators ist: Was die iPhone-Vorschau zeigt,
 * bekommt der Gast. Für presse, kiosk, izakaya und morgen liegt alles
 * Sichtbare — Hero, Gerichte-Liste, Reservieren-Aufruf, Kopfzeilen-Form — in
 * geteilten Komponenten, die beide Renderer mit denselben Daten aufrufen.
 * Dieser Test rendert dieselbe Konfiguration einmal durch AppRenderer (Live)
 * und einmal durch TemplatePreviewContent (Vorschau, über den Store) und
 * vergleicht das erzeugte HTML dieser Bausteine Zeichen für Zeichen.
 *
 * Bricht er, zeigt die Vorschau etwas anderes als die veröffentlichte Seite.
 */
import React from "react";
import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { AppRenderer } from "../AppRenderer";
import { TemplatePreviewContent } from "@/components/configurator/preview/TemplatePreviewContent";
import { useConfiguratorStore } from "@/store/configuratorStore";
import { EIGENE_TEMPLATES, getTemplateLayout } from "@/lib/templateLayout";
import { getTemplateDesignDefaults } from "@/lib/templateTokens";
import type { MenuItem } from "@/types/domain";

const ITEMS: MenuItem[] = [
  { id: "m1", name: "Karaage", description: "Yuzu-Mayo", price: 8.5, category: "Kleine Teller" },
  { id: "m2", name: "Nasu Dengaku", description: "Miso, Aubergine", price: 7, category: "Kleine Teller", isHighlight: true },
  { id: "m3", name: "Gyoza, 6 Stk.", description: "Schwein, Lauch", price: 7.5, category: "Kleine Teller" },
  { id: "m4", name: "Highball", description: "Toki, Soda", price: 9, category: "Getränke" },
  { id: "m5", name: "Sake Junmai", description: "0,1 l", price: 6, category: "Getränke" },
  // Ohne Kategorie: live erfindet normalizeConfig „Sonstiges“, der Store
  // lässt das Feld leer — beide Renderer müssen trotzdem dasselbe zeigen.
  { id: "m6", name: "Tagessuppe", description: "täglich wechselnd", price: 4.5 },
] as MenuItem[];

// Absichtlich NICHT in Auftrittsfolge der Gerichte und mit einer (noch)
// leeren Kategorie: Genau so entsteht die Divergenz Filter ↔ Gruppen, wenn
// ein Renderer aus den Gerichten liest und der andere aus der Pflege.
const KATEGORIEN = ["Getränke", "Kleine Teller", "Desserts"];

const TAG = { open: "18:00", close: "23:00", closed: false };
const HOURS = {
  monday: TAG,
  tuesday: TAG,
  wednesday: TAG,
  thursday: TAG,
  friday: TAG,
  saturday: TAG,
  sunday: TAG,
};

const BETRIEB = {
  name: "Yuki Bar",
  type: "restaurant",
  location: "Marktplatz 12, 04103 Leipzig",
  slogan: "Teilen ist der Plan.",
  uniqueDescription: "Drei bis vier Teller pro Kopf. Zettel ausfüllen, hochhalten.",
};

/** Alle Farben explizit, damit keine Seite auf einen anderen Default fällt. */
function farben(template: string) {
  const d = getTemplateDesignDefaults(template);
  return {
    primaryColor: d.primaryColor,
    secondaryColor: d.secondaryColor,
    backgroundColor: d.backgroundColor,
    fontColor: d.fontColor,
    priceColor: d.priceColor,
    headerFontColor: d.headerFontColor,
    headerBackgroundColor: d.headerBackgroundColor,
    fontFamily: d.fontFamily,
  };
}

function liveConfig(template: string) {
  return {
    template,
    businessName: BETRIEB.name,
    businessType: BETRIEB.type,
    location: BETRIEB.location,
    slogan: BETRIEB.slogan,
    uniqueDescription: BETRIEB.uniqueDescription,
    ...farben(template),
    menuItems: ITEMS,
    categories: KATEGORIEN,
    gallery: [],
    openingHours: HOURS,
    reservationsEnabled: true,
    selectedPages: [],
  };
}

function vorschauStore(template: string) {
  useConfiguratorStore.getState().resetConfig();
  useConfiguratorStore.setState((s: any) => ({
    business: { ...s.business, ...BETRIEB },
    design: { ...s.design, template, ...farben(template) },
    content: {
      ...s.content,
      menuItems: ITEMS,
      categories: KATEGORIEN,
      gallery: [],
      openingHours: HOURS,
    },
    features: { ...s.features, reservationsEnabled: true },
    pages: { ...s.pages, selectedPages: [] },
  }));
}

/** HTML eines Bausteins — ohne React-interne Attribute. */
function html(container: HTMLElement, selector: string): string | null {
  const el = container.querySelector(selector);
  return el ? el.outerHTML : null;
}

/** Zur Speisekarte über das Steuerelement der DishList (in beiden gleich). */
function zurKarte(container: HTMLElement) {
  const knopf =
    container.querySelector<HTMLElement>('[aria-label="Ganze Karte anzeigen"]') ??
    Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Zur Karte"),
    );
  expect(knopf, "Sprung zur Karte fehlt").toBeTruthy();
  fireEvent.click(knopf!);
}

describe.each(EIGENE_TEMPLATES)("Template '%s': Vorschau = Live", (template) => {
  beforeEach(() => {
    vorschauStore(template);
    // jsdom kennt scrollIntoView nicht; CategoryFilter ruft es nach einem
    // Filterklick auf, um den aktiven Reiter ins Bild zu holen.
    (Element.prototype as any).scrollIntoView = vi.fn();
  });

  test("Startseite: Hero, Highlights und Reservieren-Aufruf sind identisch", () => {
    const live = render(<AppRenderer config={liveConfig(template)} />);
    const vorschau = render(<TemplatePreviewContent />);

    for (const selector of [
      "[data-template-hero]",
      '[data-template-list][data-modus="highlights"]',
      "[data-template-cta]",
    ]) {
      const l = html(live.container, selector);
      const v = html(vorschau.container, selector);
      expect(l, `${selector} fehlt auf der Live-Seite`).not.toBeNull();
      expect(v, `${selector} fehlt in der Vorschau`).toBe(l);
    }

    // Reihenfolge der Bausteine: geteilte Leiste (presse, kiosk) zwischen
    // Hero und Liste, Block/Textlink (izakaya, morgen) unter der Liste —
    // und in beiden Renderern gleich.
    const reihenfolge = (c: HTMLElement) =>
      [
        "[data-template-hero]",
        "[data-template-cta]",
        '[data-template-list][data-modus="highlights"]',
      ].sort((a, b) => {
        const ea = c.querySelector(a)!;
        const eb = c.querySelector(b)!;
        return ea.compareDocumentPosition(eb) & Node.DOCUMENT_POSITION_FOLLOWING
          ? -1
          : 1;
      });
    const soll =
      getTemplateLayout(template).cta === "geteilt"
        ? ["[data-template-hero]", "[data-template-cta]", '[data-template-list][data-modus="highlights"]']
        : ["[data-template-hero]", '[data-template-list][data-modus="highlights"]', "[data-template-cta]"];
    expect(reihenfolge(live.container)).toEqual(soll);
    expect(reihenfolge(vorschau.container)).toEqual(soll);

    // Kopfzeile: gleiche Variante (die Positionierung unterscheidet sich
    // absichtlich — sticky im Rahmen, fixed auf der Seite).
    expect(
      vorschau.container.querySelector("[data-nav-variant]")?.getAttribute("data-nav-variant"),
    ).toBe(
      live.container.querySelector("[data-nav-variant]")?.getAttribute("data-nav-variant"),
    );
    expect(live.container.querySelector("[data-nav-variant]")?.getAttribute("data-nav-variant")).not.toBe(
      "standard",
    );
  });

  test("Speisekarte: gruppierte Liste und Filter-Variante sind identisch", () => {
    const live = render(<AppRenderer config={liveConfig(template)} />);
    const vorschau = render(<TemplatePreviewContent />);

    zurKarte(live.container);
    zurKarte(vorschau.container);

    const selector = '[data-template-list][data-modus="karte"]';
    const l = html(live.container, selector);
    expect(l, "Karte fehlt auf der Live-Seite").not.toBeNull();
    expect(html(vorschau.container, selector)).toBe(l);

    expect(
      vorschau.container.querySelector("[data-filter-variant]")?.getAttribute("data-filter-variant"),
    ).toBe(
      live.container.querySelector("[data-filter-variant]")?.getAttribute("data-filter-variant"),
    );

    // Reiter: gleiche Kategorien in gleicher Reihenfolge — gepflegte Liste
    // zuerst (auch die leere „Desserts“), nicht Auftrittsfolge der Gerichte.
    const reiter = (c: HTMLElement) =>
      Array.from(c.querySelectorAll('[role="tab"]')).map((b) => b.textContent);
    expect(reiter(live.container)).toEqual(reiter(vorschau.container));
    // „Desserts“ hat kein Gericht → kein Reiter; „Sonstiges“ sammelt die
    // Tagessuppe ohne Kategorie — in Vorschau UND live.
    expect(reiter(live.container)).toEqual(["Alle", "Getränke", "Kleine Teller", "Sonstiges"]);
    expect(l).toContain("Sonstiges");
    expect(l).toContain("Tagessuppe");

    // Seitentitel in der Display-Schrift — in beiden Renderern gleich.
    const titel = (c: HTMLElement) => c.querySelector("h2")?.getAttribute("style") ?? null;
    expect(titel(live.container)).toContain("font-template-display");
    expect(titel(vorschau.container)).toBe(titel(live.container));

    // Aktiver Filter: flache Liste, in beiden Renderern identisch.
    fireEvent.click(live.container.querySelector('[data-category="Kleine Teller"]')!);
    fireEvent.click(vorschau.container.querySelector('[data-category="Kleine Teller"]')!);
    const gefiltert = html(live.container, selector);
    expect(gefiltert).not.toBe(l);
    expect(gefiltert).toContain("Karaage");
    expect(gefiltert).not.toContain("Highball");
    expect(gefiltert).not.toContain("Tagessuppe");
    expect(html(vorschau.container, selector)).toBe(gefiltert);

    // Filter „Sonstiges“: auch die Gerichte ohne Kategorie finden beide.
    fireEvent.click(live.container.querySelector('[data-category="Sonstiges"]')!);
    fireEvent.click(vorschau.container.querySelector('[data-category="Sonstiges"]')!);
    const sonstige = html(live.container, selector);
    expect(sonstige).toContain("Tagessuppe");
    expect(sonstige).not.toContain("Karaage");
    expect(html(vorschau.container, selector)).toBe(sonstige);
  });
});

describe("Bestand bleibt unberührt", () => {
  test("riviera rendert weder DishList noch Template-Hero — das alte Markup gilt", () => {
    const { container } = render(<AppRenderer config={liveConfig("riviera")} />);
    expect(container.querySelector("[data-template-list]")).toBeNull();
    expect(container.querySelector("[data-template-hero]")).toBeNull();
    expect(container.querySelector("[data-template-cta]")).toBeNull();
    // Kein neues Attribut, keine neue Klasse — Markup wie vor den Templates.
    expect(container.querySelector("[data-nav-variant]")).toBeNull();
    expect(container.querySelector("[data-filter-variant]")).toBeNull();
    // Preise wie bisher: mit Punkt und Euro-Zeichen
    expect(container.textContent).toContain("8.50€");
  });
});
