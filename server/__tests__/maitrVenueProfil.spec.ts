// @vitest-environment node
/**
 * Die Sicht des Inhabers auf seine Betriebe (`GET /venues`) und die
 * Speisekarte (`GET /venues/:venueId/menu`) in server/maitr/routes.ts.
 *
 * ANLASS: Die Maitr-App übernimmt den ERSTEN Eintrag von `GET /venues`. In der
 * Produktion hängen sechs Betriebe an einem Konto (jede veröffentlichte
 * Web-App mit neuem Namen legt einen an), und ohne Reihenfolge war es Zufall,
 * welchen die App zeigte. Außerdem kam von den Betriebsdaten der
 * Veröffentlichung nichts an: `toApiVenue` liefert bewusst nur die
 * öffentliche Allowlist - die eigene Sicht braucht mehr.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    businessMember: { findMany: vi.fn(), findUnique: vi.fn() },
    menuCategory: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../db/prisma", () => ({ default: prismaMock, prisma: prismaMock }));

import { venuesRouter } from "../maitr/routes";
import { maitrErrorHandler } from "../maitr/index";

const ICH = "user-wirt";

const TOELLER = {
  id: "biz-toeller",
  slug: "haus-toeller",
  name: "Haus Töller",
  tagline: "Traditionelles Kölsches Brauhaus",
  description: "Kölsch vom Holzfass.",
  cuisine: "bar",
  logoUrl: "https://www.haus-toeller.de/assets/img/icon-512.png",
  primaryColor: "#0a1b2e",
  secondaryColor: "#0a1b2e",
  timezone: "Europe/Berlin",
  tags: [],
  openingHours: { monday: { closed: false, open: "17:00", close: "23:59" }, sunday: { closed: true } },
  socialLinks: { instagram: "https://www.instagram.com/haustoeller/", tiktok: "" },
  contactInfo: {
    phone: "0221 2589316",
    email: "info@haus-toeller.de",
    address: "Weyerstraße 96, 50676 Köln",
    website: "https://haus-toeller.maitr.de",
  },
  postalCode: "50676",
  maitrScore: 55,
  updatedAt: new Date("2026-09-04T13:40:00Z"),
};

const ALT = {
  id: "biz-alt",
  slug: "krawummel",
  name: "Krawummel",
  tagline: null,
  description: null,
  cuisine: null,
  logoUrl: null,
  primaryColor: "#0f2ccf",
  secondaryColor: "#ffffff",
  timezone: "Europe/Berlin",
  tags: [],
  openingHours: null,
  socialLinks: null,
  contactInfo: null,
  postalCode: null,
  maitrScore: 0,
  updatedAt: new Date("2026-08-20T10:00:00Z"),
};

function appAls(userId: string) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as express.Request & { userId?: string }).userId = userId;
    next();
  });
  app.use("/venues", venuesRouter);
  app.use(maitrErrorHandler);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /venues - die Sicht des Inhabers", () => {
  it("liefert das ganze Profil der Veröffentlichung, zuletzt veröffentlichter Betrieb zuerst", async () => {
    prismaMock.businessMember.findMany.mockImplementation(async (args: any) => {
      // Die Reihenfolge kommt aus der Datenbank - der Test prüft, dass die
      // Route sie überhaupt verlangt, und reicht sie dann wie Postgres durch.
      expect(args.orderBy).toEqual({ business: { updatedAt: "desc" } });
      return [
        { userId: ICH, businessId: TOELLER.id, role: "OWNER", business: TOELLER },
        { userId: ICH, businessId: ALT.id, role: "OWNER", business: ALT },
      ];
    });

    const res = await request(appAls(ICH)).get("/venues");
    expect(res.status).toBe(200);
    expect(res.body.map((v: any) => v.id)).toEqual(["biz-toeller", "biz-alt"]);

    const [toeller, alt] = res.body;
    expect(toeller).toMatchObject({
      name: "Haus Töller",
      slug: "haus-toeller",
      tagline: "Traditionelles Kölsches Brauhaus",
      description: "Kölsch vom Holzfass.",
      cuisine: "bar",
      logoUrl: "https://www.haus-toeller.de/assets/img/icon-512.png",
      primaryColor: "#0a1b2e",
      phone: "0221 2589316",
      email: "info@haus-toeller.de",
      website: "https://haus-toeller.maitr.de",
      street: "Weyerstraße 96",
      city: "50676 Köln",
      postalCode: "50676",
      maitrScore: 55,
      openingHours: { monday: { closed: false, open: "17:00", close: "23:59" }, sunday: { closed: true } },
    });
    // Leere Kanäle fallen weg.
    expect(toeller.socialLinks).toEqual({ instagram: "https://www.instagram.com/haustoeller/" });

    // Eine Altzeile ohne Profil bleibt schlank - keine null-Werte im JSON.
    expect(alt).toMatchObject({ name: "Krawummel", slug: "krawummel" });
    expect(alt).not.toHaveProperty("logoUrl");
    expect(alt).not.toHaveProperty("street");
    expect(alt).not.toHaveProperty("openingHours");
  });
});

describe("GET /venues/:venueId/menu - die Speisekarte der Web-App", () => {
  it("liefert Kategorien und Gerichte in Kartenreihenfolge, Preise als Zahl", async () => {
    prismaMock.businessMember.findUnique.mockResolvedValue({
      userId: ICH,
      businessId: TOELLER.id,
      role: "STAFF",
    });
    prismaMock.menuCategory.findMany.mockImplementation(async (args: any) => {
      expect(args.where).toEqual({ businessId: TOELLER.id });
      expect(args.orderBy).toEqual({ sortOrder: "asc" });
      return [
        {
          id: "cat-1",
          name: "Kalte Speisen",
          items: [
            // Prisma liefert Decimal-Objekte - hier als String nachgestellt,
            // JSON würde daraus sonst "4.9" machen.
            { id: "i-1", name: "Halver Hahn", description: null, price: "4.90", imageUrl: null },
          ],
        },
        {
          id: "cat-2",
          name: "Warme Speisen",
          items: [
            { id: "i-2", name: "Himmel un Ääd", description: "mit Flönz", price: "14.50", imageUrl: "https://x/y.jpg" },
          ],
        },
      ];
    });

    const res = await request(appAls(ICH)).get(`/venues/${TOELLER.id}/menu`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      categories: [
        { id: "cat-1", name: "Kalte Speisen", items: [{ id: "i-1", name: "Halver Hahn", price: 4.9 }] },
        {
          id: "cat-2",
          name: "Warme Speisen",
          items: [
            { id: "i-2", name: "Himmel un Ääd", description: "mit Flönz", price: 14.5, imageUrl: "https://x/y.jpg" },
          ],
        },
      ],
    });
  });

  it("bleibt hinter der Mitgliedschaft: fremder Betrieb → 403", async () => {
    prismaMock.businessMember.findUnique.mockResolvedValue(null);
    const res = await request(appAls(ICH)).get("/venues/biz-fremd/menu");
    expect(res.status).toBe(403);
    expect(prismaMock.menuCategory.findMany).not.toHaveBeenCalled();
  });
});
