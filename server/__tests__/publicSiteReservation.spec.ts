// @vitest-environment node
/**
 * Das bestehende Buchungssystem des Betriebs muss die öffentliche Sicht
 * ÜBERLEBEN.
 *
 * Nachgewiesen am Echtfall krawummel.de (21.08.2026): Der Publish speicherte
 * `reservationUrl` + `reservationProvider` („Wix Reservierungen“) korrekt in
 * configData — aber oeffentlicheSiteFelder ließ beide Felder fallen. Die
 * Live-Seite bekam null und stellte das EIGENE Reservierungsformular neben
 * das des Betriebs: genau das Doppelbuchungs-Szenario, das die Erkennung
 * verhindern soll.
 */
import { describe, expect, it, vi } from "vitest";
import { oeffentlicheSiteFelder } from "../utils/publicSiteView";

// GET /api/sites/:subdomain (configurations.ts) führt BEWUSST eine eigene
// Feldliste statt oeffentlicheSiteFelder (eigene Marken-Vorgabewerte, siehe
// Kommentar dort) — deshalb wird die Route hier zusätzlich direkt geprüft:
// Genau diese Liste ist die Quelle der Edge-Injection für *.maitr.de, und
// genau dort fehlten die Felder im Echtfall ein zweites Mal.
const webAppRow = {
  id: "app-1",
  subdomain: "krawummel-route-test",
  publishedAt: new Date("2026-08-21T06:00:00Z"),
  updatedAt: new Date("2026-08-21T06:00:00Z"),
  configData: {
    businessName: "Krawummel",
    reservationsEnabled: true,
    reservationUrl: "https://www.krawummel.de/",
    reservationProvider: "Wix Reservierungen",
  },
};

vi.mock("../db/prisma", () => {
  const prismaMock = {
    webApp: { findUnique: vi.fn(async () => webAppRow) },
  };
  return { default: prismaMock, prisma: prismaMock };
});

const kontext = {
  id: "app-1",
  publishedAt: new Date("2026-08-21T06:00:00Z"),
  updatedAt: new Date("2026-08-21T06:00:00Z"),
};

describe("oeffentlicheSiteFelder – bestehendes Buchungssystem", () => {
  it("reicht reservationUrl und reservationProvider durch (flach)", () => {
    const felder = oeffentlicheSiteFelder(
      {
        businessName: "Krawummel",
        reservationsEnabled: true,
        reservationUrl: "https://www.krawummel.de/",
        reservationProvider: "Wix Reservierungen",
      },
      kontext,
    );
    expect(felder.reservationUrl).toBe("https://www.krawummel.de/");
    expect(felder.reservationProvider).toBe("Wix Reservierungen");
  });

  it("reicht sie auch aus dem verschachtelten features-Objekt durch", () => {
    const felder = oeffentlicheSiteFelder(
      {
        business: { name: "Krawummel" },
        features: {
          reservationsEnabled: true,
          reservationUrl: "https://www.krawummel.de/",
          reservationProvider: "Wix Reservierungen",
        },
      },
      kontext,
    );
    expect(felder.reservationUrl).toBe("https://www.krawummel.de/");
    expect(felder.reservationProvider).toBe("Wix Reservierungen");
  });

  it("liefert undefined, wenn kein bestehendes System bekannt ist", () => {
    const felder = oeffentlicheSiteFelder({ businessName: "Krawummel" }, kontext);
    expect(felder.reservationUrl).toBeUndefined();
    expect(felder.reservationProvider).toBeUndefined();
  });
});

describe("GET /api/sites/:subdomain – bestehendes Buchungssystem", () => {
  it("liefert reservationUrl und reservationProvider aus", async () => {
    const { getPublishedSite } = await import("../routes/configurations");

    const req = { params: { subdomain: "krawummel-route-test" }, headers: {} };
    let body: any = null;
    const res: any = {
      set: () => res,
      status: () => res,
      end: () => res,
      json: (payload: unknown) => {
        body = payload;
        return res;
      },
    };

    await getPublishedSite(req as any, res);

    expect(body?.success).toBe(true);
    expect(body?.data?.reservationUrl).toBe("https://www.krawummel.de/");
    expect(body?.data?.reservationProvider).toBe("Wix Reservierungen");
  });
});
