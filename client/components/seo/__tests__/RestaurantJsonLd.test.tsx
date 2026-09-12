// @vitest-environment node
// Ohne DOM füllt Helmet den Server-Kontext - wie im Prerender unter Node.
import React from "react";
import { renderToString } from "react-dom/server";
import { HelmetProvider, type HelmetServerState } from "react-helmet-async";
import { describe, expect, it, vi } from "vitest";
import { RestaurantJsonLd, schemaConfigAusSite } from "../RestaurantJsonLd";

// test/setupTests.ts ersetzt Helmet global durch eine Attrappe; hier geht es um genau diese Tags.
vi.unmock("react-helmet-async");

/**
 * Bis 11.09.2026 übergab die Komponente die flache Form an einen Generator,
 * der die verschachtelte Store-Form erwartete (`config.content.menuItems`).
 * Er warf bei jedem Aufruf, der Fehler wurde abgefangen - keine einzige
 * veröffentlichte Seite trug strukturierte Daten.
 */

/** Flach: GET /api/sites/:subdomain und window.__MAITR_CONFIG__ der Edge-Function. */
const FLACH = {
  id: "webapp-1",
  businessName: "Trattoria Bella Vista",
  location: "Weyerstraße 96, 50676 Köln",
  uniqueDescription: "Neapolitanische Pizza aus dem Holzofen",
  phone: "0221 123456",
  email: "ciao@bellavista.de",
  logo: { url: "https://cdn.maitr.de/logo.png" },
  contactMethods: [{ type: "phone", value: "0221 123456" }],
  socialMedia: { instagram: "https://instagram.com/bellavista" },
  openingHours: { monday: { open: "12:00", close: "22:00", closed: false } },
  menuItems: [
    {
      id: "1",
      name: "Margherita",
      price: "9,50",
      category: "Pizza",
      imageUrl: "https://cdn.maitr.de/m.jpg",
    },
  ],
};

/** Normalisiert: so reicht HostAwareRoot die Seite nach dem eigenen fetch() weiter. */
const NORMALISIERT = {
  business: {
    name: "Haus Töller",
    type: "restaurant",
    location: "Weyerstraße 96, 50676 Köln",
    logo: { url: "https://cdn.maitr.de/toeller.png" },
  },
  contact: {
    contactMethods: [],
    socialMedia: {},
    phone: "0221 258 9316",
    email: "info@haus-toeller.de",
  },
  content: {
    openingHours: { sunday: { open: "00:00", close: "00:00", closed: false } },
    menuItems: [
      {
        id: "a",
        name: "Himmel un Ääd",
        price: 16.9,
        category: "Kölsche Klassiker",
      },
    ],
  },
};

function kopfScript(config: unknown): string {
  const kontext: { helmet?: HelmetServerState } = {};
  renderToString(
    <HelmetProvider context={kontext}>
      <RestaurantJsonLd config={config} />
    </HelmetProvider>,
  );
  return kontext.helmet?.script.toString() ?? "";
}

function schemaAus(html: string) {
  const inhalt = html.match(
    /<script[^>]*application\/ld\+json[^>]*>([\s\S]*)<\/script>/,
  )?.[1];
  return inhalt ? JSON.parse(inhalt) : null;
}

describe("schemaConfigAusSite", () => {
  it("nimmt Telefon und E-Mail aus den Feldern daneben, nicht aus contactMethods", () => {
    const eingabe = schemaConfigAusSite(FLACH);
    expect(eingabe?.phone).toBe("0221 123456");
    expect(eingabe?.email).toBe("ciao@bellavista.de");
    expect(eingabe?.logo).toBe("https://cdn.maitr.de/logo.png");
  });

  it("liefert ohne Betriebsnamen kein Schema", () => {
    expect(schemaConfigAusSite({ ...FLACH, businessName: "  " })).toBeNull();
    expect(kopfScript({ ...FLACH, businessName: "" })).toBe("");
  });
});

describe("RestaurantJsonLd", () => {
  it("schreibt das Schema der flachen Seite in den Kopf", () => {
    expect(schemaAus(kopfScript(FLACH))).toMatchObject({
      "@type": "Restaurant",
      name: "Trattoria Bella Vista",
      telephone: "0221 123456",
      address: {
        streetAddress: "Weyerstraße 96",
        postalCode: "50676",
        addressLocality: "Köln",
      },
      sameAs: ["https://instagram.com/bellavista"],
      hasMenu: [
        { hasMenuSection: [{ hasMenuItem: [{ offers: { price: "9.50" } }] }] },
      ],
    });
  });

  it("liest auch die normalisierte Form", () => {
    const schema = schemaAus(kopfScript(NORMALISIERT));
    expect(schema).toMatchObject({
      name: "Haus Töller",
      telephone: "0221 258 9316",
      email: "info@haus-toeller.de",
      logo: "https://cdn.maitr.de/toeller.png",
      hasMenu: [
        {
          hasMenuSection: [
            {
              name: "Kölsche Klassiker",
              hasMenuItem: [{ offers: { price: "16.90" } }],
            },
          ],
        },
      ],
    });
    // Sonntag 00:00–00:00 ist ein Ruhetag, keine Öffnungszeit.
    expect(schema.openingHoursSpecification).toBeUndefined();
  });

  it("bricht den Script-Block nicht auf, auch wenn der Name es versucht", () => {
    const html = kopfScript({
      ...FLACH,
      businessName: "Bella</script><script>alert(1)</script>",
    });
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    expect(schemaAus(html)?.name).toBe(
      "Bella</script><script>alert(1)</script>",
    );
  });
});
