/**
 * Parität Vorschau ↔ Live-Seite — für JEDES Template.
 *
 * Das Versprechen des Konfigurators ist: Was die iPhone-Vorschau zeigt,
 * bekommt der Gast. Alles Sichtbare — Hero, Gerichte-Liste, Reservieren-
 * Aufruf, Kopfzeile, Kategorie-Reiter — liegt in geteilten Komponenten, die
 * beide Renderer mit denselben Daten aufrufen. Dieser Test rendert dieselbe
 * Konfiguration einmal durch AppRenderer (Live) und einmal durch
 * TemplatePreviewContent (Vorschau, über den Store) und vergleicht das
 * erzeugte HTML dieser Bausteine Zeichen für Zeichen.
 *
 * Er läuft über die Template-Registry (TEMPLATE_IDS), nicht über eine
 * gepflegte Liste: die vier Papier-Templates, die zwei im Picker und der
 * Alt-Bestand (stylish, cozy, nocturne, riviera, verde), dessen
 * veröffentlichte Seiten weiterlaufen. Ein neues Template ist damit
 * automatisch geprüft, statt in einem zweiten Array zu fehlen.
 *
 * Bricht er, zeigt die Vorschau etwas anderes als die veröffentlichte Seite.
 */
import React from "react";
import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { AppRenderer } from "../AppRenderer";
import { TemplatePreviewContent } from "@/components/configurator/preview/TemplatePreviewContent";
import { useConfiguratorStore } from "@/store/configuratorStore";
import { formatPreis, getTemplateLayout, zeigeBilder } from "@/lib/templateLayout";
import { getTemplateButtonShape, getTemplateDesignDefaults, TEMPLATE_IDS } from "@/lib/templateTokens";
import type { MenuItem } from "@/types/domain";

/** Bild an einem Gericht — es entscheidet sich an der Bilder-Regel. */
const BILD = "https://bilder.example/karaage.jpg";

const ITEMS: MenuItem[] = [
  { id: "m1", name: "Karaage", description: "Yuzu-Mayo", price: 8.5, category: "Kleine Teller", imageUrl: BILD },
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

function liveConfig(template: string, bilder: string = "visible") {
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
    homepageDishImageVisibility: bilder,
    reservationsEnabled: true,
    reservationButtonShape: getTemplateButtonShape(template),
    selectedPages: [],
  };
}

function vorschauStore(template: string, bilder: string = "visible") {
  // Ausgangszustand direkt setzen statt über resetConfig: Der Store hat einen
  // Wächter gegen Endlosschleifen (checkThrottleGuard, > 50 Aktionen pro
  // Sekunde), und dieser Test setzt ihn seit 21 Templates × 3 Fällen
  // mehr als 60-mal in zwei Sekunden zurück — ab dem 51. Mal flog er raus.
  useConfiguratorStore.setState(useConfiguratorStore.getInitialState(), true);
  useConfiguratorStore.setState((s: any) => ({
    business: { ...s.business, ...BETRIEB },
    design: { ...s.design, template, ...farben(template) },
    content: {
      ...s.content,
      menuItems: ITEMS,
      categories: KATEGORIEN,
      gallery: [],
      openingHours: HOURS,
      homepageDishImageVisibility: bilder,
    },
    features: {
      ...s.features,
      reservationsEnabled: true,
      reservationButtonShape: getTemplateButtonShape(template),
    },
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

const KARTE = '[data-template-list][data-modus="karte"]';
const HIGHLIGHTS = '[data-template-list][data-modus="highlights"]';

describe.each(TEMPLATE_IDS)("Template '%s': Vorschau = Live", (template) => {
  const layout = getTemplateLayout(template);

  beforeEach(() => {
    vorschauStore(template);
    // jsdom kennt scrollIntoView nicht; CategoryFilter ruft es nach einem
    // Filterklick auf, um den aktiven Reiter ins Bild zu holen.
    (Element.prototype as any).scrollIntoView = vi.fn();
  });

  test("Startseite: Hero, Highlights und Reservieren-Aufruf sind identisch", () => {
    const live = render(<AppRenderer config={liveConfig(template)} />);
    const vorschau = render(<TemplatePreviewContent />);

    for (const selector of ["[data-template-hero]", HIGHLIGHTS, "[data-template-cta]"]) {
      const l = html(live.container, selector);
      const v = html(vorschau.container, selector);
      expect(l, `${selector} fehlt auf der Live-Seite`).not.toBeNull();
      expect(v, `${selector} fehlt in der Vorschau`).toBe(l);
    }

    // Reihenfolge der Bausteine: geteilte Leiste (presse, kiosk) zwischen
    // Hero und Liste, Block, Textlink und der gefüllte Knopf des Bestands
    // unter der Liste — und in beiden Renderern gleich.
    const reihenfolge = (c: HTMLElement) =>
      ["[data-template-hero]", "[data-template-cta]", HIGHLIGHTS].sort((a, b) => {
        const ea = c.querySelector(a)!;
        const eb = c.querySelector(b)!;
        return ea.compareDocumentPosition(eb) & Node.DOCUMENT_POSITION_FOLLOWING
          ? -1
          : 1;
      });
    const soll =
      layout.cta === "geteilt"
        ? ["[data-template-hero]", "[data-template-cta]", HIGHLIGHTS]
        : ["[data-template-hero]", HIGHLIGHTS, "[data-template-cta]"];
    expect(reihenfolge(live.container)).toEqual(soll);
    expect(reihenfolge(vorschau.container)).toEqual(soll);

    // Kopfzeile: gleiche Variante (die Positionierung unterscheidet sich
    // absichtlich — sticky im Rahmen, fixed auf der Seite).
    const nav = (c: HTMLElement) =>
      c.querySelector("[data-nav-variant]")?.getAttribute("data-nav-variant");
    expect(nav(live.container)).toBe(layout.nav);
    expect(nav(vorschau.container)).toBe(nav(live.container));
  });

  test("Speisekarte: gruppierte Liste und Filter-Variante sind identisch", () => {
    const live = render(<AppRenderer config={liveConfig(template)} />);
    const vorschau = render(<TemplatePreviewContent />);

    zurKarte(live.container);
    zurKarte(vorschau.container);

    const l = html(live.container, KARTE);
    expect(l, "Karte fehlt auf der Live-Seite").not.toBeNull();
    expect(html(vorschau.container, KARTE)).toBe(l);

    const filter = (c: HTMLElement) =>
      c.querySelector("[data-filter-variant]")?.getAttribute("data-filter-variant");
    expect(filter(live.container)).toBe(layout.filter);
    expect(filter(vorschau.container)).toBe(filter(live.container));

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

    // Preisschreibweise des Templates: „8.50€“ im Bestand, „8,50“ auf der
    // gesetzten Karte — und beide Renderer schreiben sie gleich.
    expect(l).toContain(formatPreis(8.5, layout.preis));

    // Bilder: EINE Regel für beide Renderer (templateLayout.zeigeBilder).
    // Vorher gab die Vorschau der Karte `showImage` mit und die Live-Seite nie.
    expect(l!.includes(BILD)).toBe(zeigeBilder(template));

    // Seitentitel: Papier-Templates in der Display-Schrift, Bestand ohne
    // eigenen Stil — in beiden Renderern gleich.
    const titel = (c: HTMLElement) => c.querySelector("h2")?.getAttribute("style") ?? null;
    expect(titel(vorschau.container)).toBe(titel(live.container));
    if (layout.eigen) expect(titel(live.container)).toContain("font-template-display");
    else expect(titel(live.container)).toBeNull();

    // Aktiver Filter: flache Liste, in beiden Renderern identisch.
    fireEvent.click(live.container.querySelector('[data-category="Kleine Teller"]')!);
    fireEvent.click(vorschau.container.querySelector('[data-category="Kleine Teller"]')!);
    const gefiltert = html(live.container, KARTE);
    expect(gefiltert).not.toBe(l);
    expect(gefiltert).toContain("Karaage");
    expect(gefiltert).not.toContain("Highball");
    expect(gefiltert).not.toContain("Tagessuppe");
    expect(html(vorschau.container, KARTE)).toBe(gefiltert);

    // Filter „Sonstiges“: auch die Gerichte ohne Kategorie finden beide.
    fireEvent.click(live.container.querySelector('[data-category="Sonstiges"]')!);
    fireEvent.click(vorschau.container.querySelector('[data-category="Sonstiges"]')!);
    const sonstige = html(live.container, KARTE);
    expect(sonstige).toContain("Tagessuppe");
    expect(sonstige).not.toContain("Karaage");
    expect(html(vorschau.container, KARTE)).toBe(sonstige);
  });

  test("Reservierungsseite: Formular und Knopf sind identisch", () => {
    const live = render(<AppRenderer config={liveConfig(template)} />);
    const vorschau = render(<TemplatePreviewContent />);
    fireEvent.click(live.container.querySelector("[data-reservation-cta]")!);
    fireEvent.click(vorschau.container.querySelector("[data-reservation-cta]")!);
    // Die Zeitfenster sind Daten, keine Form: live kommen sie vom Server
    // (hier ohne Konfiguration keine), in der Vorschau aus dem Store. Alles
    // andere am Formular muss Zeichen für Zeichen gleich sein.
    const ohneZeiten = (h: string | null) => h?.replace(/<option[^>]*>[^<]*<\/option>/g, "") ?? null;
    const l = ohneZeiten(html(live.container, "[data-reservation-form]"));
    expect(l, "Reservierungsformular fehlt auf der Live-Seite").not.toBeNull();
    expect(ohneZeiten(html(vorschau.container, "[data-reservation-form]"))).toBe(l);
    // Knopfform des Templates kommt an: eckig heißt 0 px, Pille 9999 px.
    const knopf = live.container.querySelector('[data-reservation-form] button[type="submit"]') as HTMLElement;
    const form = getTemplateButtonShape(template);
    if (form === "square") expect(knopf.style.borderRadius).toBe("0px");
    if (form === "pill") expect(knopf.style.borderRadius).toBe("9999px");
  });

  test("Bilder abgeschaltet: beide Renderer zeigen keine", () => {
    vorschauStore(template, "hidden");
    const live = render(<AppRenderer config={liveConfig(template, "hidden")} />);
    const vorschau = render(<TemplatePreviewContent />);

    zurKarte(live.container);
    zurKarte(vorschau.container);

    const l = html(live.container, KARTE);
    expect(l).not.toContain(BILD);
    expect(html(vorschau.container, KARTE)).toBe(l);
  });
});
