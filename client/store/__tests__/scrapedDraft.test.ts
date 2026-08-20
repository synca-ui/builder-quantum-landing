/**
 * Übernahme eines Scrape-Entwurfs in den Konfigurator-Store.
 *
 * Kernzusicherung: Der Entwurf ERSETZT den bisherigen Stand, statt sich
 * darüberzulegen. Nachgewiesen am echten Fall krawummel.de (20.08.2026):
 * Der Scrape lieferte weder Slogan noch Beschreibung, und über das Mischen
 * mit dem alten Zustand standen Slogan („Echte italienische Küche seit
 * 1987“), Beschreibung und Logo des Trattoria-Demo-Entwurfs auf der Seite
 * des vegetarischen Cafés. Die alte Domain-Wahl bestimmte außerdem still
 * das Ziel des Kopfzeilen-Publish.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { useConfiguratorStore } from "../configuratorStore";

const krawummelDraft = {
  business: {
    type: "cafe",
    location: "62 Ludgeristraße, 48143 Münster",
  },
  design: { backgroundColor: "#F3F9E2", primaryColor: "#0F2CCF" },
  content: {
    menuItems: [
      { id: "dish-1", name: "Steaky-K Burger", price: "7.90", available: true },
    ],
  },
  contact: { phone: "025174788117" },
  unmapped: {},
};

describe("applyScrapedDraft", () => {
  beforeEach(() => {
    useConfiguratorStore.getState().resetConfig();
  });

  it("lässt keine Inhalte des vorherigen Entwurfs durchbluten", () => {
    const s = useConfiguratorStore.getState();
    // Vorheriger Entwurf: die Trattoria-Demo.
    s.setBusinessInfo({
      name: "Trattoria Bella Vista",
      slogan: "Echte italienische Küche seit 1987",
      uniqueDescription: "Hausgemachte Pasta und Holzofenpizza.",
      logo: { url: "https://example.org/trattoria-logo.png" } as any,
      domain: { hasDomain: false, selectedDomain: "trattoriabellavista" },
    });

    useConfiguratorStore.getState().applyScrapedDraft(krawummelDraft as any);

    const business = useConfiguratorStore.getState().business;
    // Was der Scrape nicht liefert, fällt auf den Auslieferungszustand zurück —
    // es erscheint NICHT der Text des alten Betriebs.
    expect(business.slogan ?? "").not.toContain("italienische");
    expect(business.uniqueDescription ?? "").not.toContain("Pasta");
    expect(business.name).not.toBe("Trattoria Bella Vista");
    expect((business as any).logo?.url).not.toBe(
      "https://example.org/trattoria-logo.png",
    );
    // Die alte Domain-Wahl darf nicht still das Publish-Ziel bleiben.
    expect(business.domain?.selectedDomain ?? "").not.toBe("trattoriabellavista");
  });

  it("übernimmt die gelieferten Felder des Entwurfs", () => {
    useConfiguratorStore.getState().applyScrapedDraft(krawummelDraft as any);
    const state = useConfiguratorStore.getState();
    expect(state.business.location).toBe("62 Ludgeristraße, 48143 Münster");
    expect(state.design.backgroundColor).toBe("#F3F9E2");
    expect(state.content.menuItems.map((m: any) => m.name)).toEqual([
      "Steaky-K Burger",
    ]);
    expect(state.contact.phone).toBe("025174788117");
  });

  it("behält für ungelieferte Öffnungstage den Standard", () => {
    useConfiguratorStore.getState().applyScrapedDraft({
      ...krawummelDraft,
      content: {
        ...krawummelDraft.content,
        openingHours: { monday: { open: "12:00", close: "21:00", closed: false } },
      },
    } as any);
    const hours = useConfiguratorStore.getState().content.openingHours as any;
    expect(hours.monday).toEqual({ open: "12:00", close: "21:00", closed: false });
    // Die übrigen Tage stehen weiterhin da (Standard), nicht undefined.
    expect(hours.tuesday).toBeDefined();
  });
});
