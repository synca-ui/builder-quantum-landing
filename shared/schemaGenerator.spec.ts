import { describe, expect, it } from "vitest";
import { generateRestaurantSchema, schemaPreis } from "./schemaGenerator";

const BASIS = { businessName: "Haus Töller" };

describe("generateRestaurantSchema", () => {
  it("gibt Ruhetage nicht als Öffnungszeiten aus", () => {
    const schema = generateRestaurantSchema({
      ...BASIS,
      openingHours: {
        monday: { open: "12:00", close: "22:00", closed: false },
        tuesday: { open: "00:00", close: "00:00", closed: false },
        sunday: { open: "12:00", close: "22:00", closed: true },
      },
    });
    expect(schema.openingHoursSpecification).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Monday",
        opens: "12:00",
        closes: "22:00",
      },
    ]);
  });

  it("lässt die Öffnungszeiten weg, wenn kein Tag geöffnet ist", () => {
    const schema = generateRestaurantSchema({
      ...BASIS,
      openingHours: { sunday: { open: "12:00", close: "22:00", closed: true } },
    });
    expect(schema.openingHoursSpecification).toBeUndefined();
  });

  it("trennt Straße, Postleitzahl und Ort", () => {
    for (const adresse of [
      "Weyerstraße 96, 50676 Köln",
      "Weyerstraße 96 50676 Köln",
    ]) {
      expect(
        generateRestaurantSchema({ ...BASIS, address: adresse }).address,
      ).toEqual({
        "@type": "PostalAddress",
        streetAddress: "Weyerstraße 96",
        postalCode: "50676",
        addressLocality: "Köln",
        addressCountry: "DE",
      });
    }
  });

  it("übernimmt nur Web-Adressen als Logo, Gerichtbild und Profil-Link", () => {
    const schema = generateRestaurantSchema({
      ...BASIS,
      logo: "blob:https://maitr.de/7f3a",
      menuItems: [
        {
          name: "Tagessuppe",
          price: "5,50",
          image: "data:image/png;base64,AAAA",
        },
      ],
      socialLinks: {
        instagram: "@haustoeller",
        facebook: "https://facebook.com/haustoeller",
      },
    });
    expect(schema.logo).toBeUndefined();
    expect(schema.image).toBeUndefined();
    expect(schema.sameAs).toEqual(["https://facebook.com/haustoeller"]);
    const gericht = schema.hasMenu?.[0].hasMenuSection?.[0].hasMenuItem?.[0];
    expect(gericht?.image).toBeUndefined();
    expect(gericht?.offers).toEqual({
      "@type": "Offer",
      priceCurrency: "EUR",
      price: "5.50",
    });
  });

  it("wirft nicht bei fremd geformten Kartendaten", () => {
    expect(() =>
      generateRestaurantSchema({
        ...BASIS,
        menuItems: [
          {
            name: "Pils",
            description: 42 as unknown as string,
            price: "auf Anfrage",
          },
          { name: undefined as unknown as string },
        ],
      }),
    ).not.toThrow();
  });
});

describe("schemaPreis", () => {
  it.each([
    ["14,50 €", "14.50"],
    ["7.90", "7.90"],
    [7.9, "7.90"],
    ["1.234,50", "1234.50"],
  ])("%s → %s", (roh, erwartet) => {
    expect(schemaPreis(roh)).toBe(erwartet);
  });

  it.each([["auf Anfrage"], [0], [""], [undefined]])(
    "%s → kein Preis",
    (roh) => {
      expect(schemaPreis(roh)).toBeUndefined();
    },
  );
});
