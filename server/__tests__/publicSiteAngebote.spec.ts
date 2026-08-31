// @vitest-environment node
/**
 * Angebote müssen die öffentliche Sicht ÜBERLEBEN.
 *
 * Nachgemessen am Echtfall bella12.maitr.de (31.08.2026): Im Konfigurator war
 * das Angebot „Mittagstisch" angelegt, das Banner auf „Groß" gestellt und der
 * Angebote-Tab eingeschaltet — die Live-Vorschau zeigte alles. Die
 * veröffentlichte Seite zeigte nichts davon, und
 * `GET /api/sites/bella12` antwortete mit `offers: []` und `offerBanner: null`.
 *
 * Grund: Beide öffentlichen Feldlisten lasen ausschließlich die FLACHE Form
 * (`config.offers`). Der Konfigurator legt Angebote aber unter `payments` ab,
 * und `flatConfig` im Publish (server/routes/webapps.ts) kannte diese Felder
 * nicht — die flache Form entstand also nie. Dieselbe Klasse Fehler wie beim
 * Logo und beim Buchungslink, siehe publicSiteReservation.spec.ts.
 */
import { describe, expect, it, vi } from "vitest";
import { oeffentlicheSiteFelder } from "../utils/publicSiteView";

const ANGEBOT = {
  id: "1787219553161",
  name: "Mittagstisch",
  price: "9,99",
  image: "https://cdn.example/mittagstisch.jpg",
  description: "hier gibts Mittag",
};

const BANNER = {
  enabled: true,
  size: "large",
  backgroundColor: "#000000",
  textColor: "#FFFFFF",
  buttonColor: "#FFFFFF",
};

// GET /api/sites/:subdomain (configurations.ts) führt BEWUSST eine eigene
// Feldliste statt oeffentlicheSiteFelder — und genau diese Route ist die
// Quelle der Edge-Injection für *.maitr.de, also die Stelle, an der die
// Angebote im Echtfall verloren gingen. Deshalb wird sie hier mitgeprüft.
const webAppRow = {
  id: "app-1",
  subdomain: "bella12-route-test",
  publishedAt: new Date("2026-08-31T06:00:00Z"),
  updatedAt: new Date("2026-08-31T06:00:00Z"),
  configData: {
    business: { name: "Bella" },
    payments: {
      offers: [ANGEBOT],
      offerBanner: BANNER,
      offerPageEnabled: true,
    },
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
  publishedAt: new Date("2026-08-31T06:00:00Z"),
  updatedAt: new Date("2026-08-31T06:00:00Z"),
};

describe("oeffentlicheSiteFelder – Angebote", () => {
  it("reicht Angebote, Banner und Tab-Schalter aus payments durch", () => {
    const felder = oeffentlicheSiteFelder(
      {
        business: { name: "Bella" },
        payments: {
          offers: [ANGEBOT],
          offerBanner: BANNER,
          offerPageEnabled: true,
        },
      },
      kontext,
    );

    expect(felder.offers).toEqual([ANGEBOT]);
    expect(felder.offerBanner).toMatchObject({ enabled: true, size: "large" });
    expect(felder.offerPageEnabled).toBe(true);
  });

  it("reicht sie auch in der flachen Altform durch", () => {
    const felder = oeffentlicheSiteFelder(
      {
        businessName: "Bella",
        offers: [ANGEBOT],
        offerBanner: BANNER,
        offerPageEnabled: true,
      },
      kontext,
    );

    expect(felder.offers).toEqual([ANGEBOT]);
    expect(felder.offerBanner).toMatchObject({ enabled: true });
    expect(felder.offerPageEnabled).toBe(true);
  });

  it("bleibt ohne Angebote leer statt undefined", () => {
    const felder = oeffentlicheSiteFelder({ businessName: "Bella" }, kontext);
    expect(felder.offers).toEqual([]);
    expect(felder.offerBanner).toBeUndefined();
    expect(felder.offerPageEnabled).toBe(false);
  });
});

describe("GET /api/sites/:subdomain – Angebote", () => {
  it("liefert Angebote, Banner und Tab-Schalter aus payments aus", async () => {
    const { getPublishedSite } = await import("../routes/configurations");

    const req = { params: { subdomain: "bella12-route-test" }, headers: {} };
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
    expect(body?.data?.offers).toEqual([ANGEBOT]);
    expect(body?.data?.offerBanner).toMatchObject({
      enabled: true,
      size: "large",
    });
    expect(body?.data?.offerPageEnabled).toBe(true);
  });
});
