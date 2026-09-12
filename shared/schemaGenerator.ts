import type {
  MenuSection,
  RestaurantSchemaConfig,
  SchemaOrganization,
} from "./types/schema";

/**
 * Dietary restriction keywords to detect from menu item descriptions
 */
const DIETARY_FLAGS = {
  vegan: {
    keywords: ["vegan", "100% plant-based"],
    url: "https://schema.org/VeganDiet",
  },
  vegetarian: {
    keywords: ["vegetarian", "no meat"],
    url: "https://schema.org/VegetarianDiet",
  },
  glutenFree: {
    keywords: ["gluten-free", "gluten free", "gf"],
    url: "https://schema.org/GlutenFreeDiet",
  },
  kosher: {
    keywords: ["kosher"],
    url: "https://schema.org/KosherDiet",
  },
  halal: {
    keywords: ["halal"],
    url: "https://schema.org/HalalDiet",
  },
  dairyFree: {
    keywords: ["dairy-free", "dairy free"],
    url: "https://schema.org/DairyFree",
  },
  lowFat: {
    keywords: ["low-fat", "low fat"],
    url: "https://schema.org/LowFatDiet",
  },
  lowSodium: {
    keywords: ["low-sodium", "low sodium"],
    url: "https://schema.org/LowSodiumDiet",
  },
};

const DAY_MAP: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

/**
 * Extract dietary flags from menu item description
 */
export function extractDietaryFlags(description?: string): string[] {
  if (typeof description !== "string" || !description) return [];

  const lowerDesc = description.toLowerCase();
  const flags: string[] = [];

  Object.values(DIETARY_FLAGS).forEach(({ keywords, url }) => {
    if (keywords.some((kw) => lowerDesc.includes(kw))) {
      flags.push(url);
    }
  });

  return flags;
}

function text(wert: unknown): string | undefined {
  return typeof wert === "string" && wert.trim() ? wert.trim() : undefined;
}

/** Nur absolute Web-Adressen: blob:-/data:-URLs und Instagram-Handles kann Google nicht abrufen. */
function webUrl(wert: unknown): string | undefined {
  const url = text(wert);
  return url && /^https?:\/\//i.test(url) ? url : undefined;
}

/**
 * Preis im schema.org-Format ("14.50"). Karten liefern "14,50 €", 7.9 oder
 * "auf Anfrage" - Letzteres ergibt keinen Preis statt eines ungültigen.
 */
export function schemaPreis(price: unknown): string | undefined {
  let betrag = Number.NaN;
  if (typeof price === "number") {
    betrag = price;
  } else if (typeof price === "string") {
    let roh = price.replace(/[^\d,.]/g, "");
    if (roh.includes(",")) roh = roh.replace(/\./g, "").replace(",", ".");
    betrag = Number.parseFloat(roh);
  }
  return Number.isFinite(betrag) && betrag > 0 ? betrag.toFixed(2) : undefined;
}

/**
 * Group menu items by category for MenuSection structure
 */
function groupByCategory(
  items: RestaurantSchemaConfig["menuItems"] = [],
): Record<string, RestaurantSchemaConfig["menuItems"]> {
  const grouped: Record<string, RestaurantSchemaConfig["menuItems"]> = {};

  items.forEach((item) => {
    if (!text(item?.name)) return;
    const category = text(item.category) || "Main";
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(item);
  });

  return grouped;
}

/**
 * Öffnungszeiten → OpeningHoursSpecification. Geschlossene Tage fallen weg,
 * ebenso 00:00–00:00: So schreiben schema.org-Quellen und der Scraper einen
 * Ruhetag, und genau so stand er schon einmal als offener Tag auf einer Seite.
 */
function formatOpeningHours(hours?: RestaurantSchemaConfig["openingHours"]) {
  if (!hours || typeof hours !== "object") return undefined;

  const spezifikation = Object.entries(hours)
    .filter(
      ([, tag]) =>
        tag &&
        !tag.closed &&
        text(tag.open) &&
        text(tag.close) &&
        tag.open !== tag.close,
    )
    .map(([day, { open, close }]) => ({
      "@type": "OpeningHoursSpecification" as const,
      dayOfWeek: DAY_MAP[day.toLowerCase()] || day,
      opens: open,
      closes: close,
    }));

  return spezifikation.length > 0 ? spezifikation : undefined;
}

/** "Weyerstraße 96, 50676 Köln" → Straße, Postleitzahl und Ort getrennt. */
function postalAddress(adresse?: string): SchemaOrganization["address"] {
  const roh = text(adresse);
  if (!roh) return undefined;

  const plzOrt = roh.match(/^(.+?),?\s+(\d{5})\s+(.+)$/);
  if (plzOrt) {
    return {
      "@type": "PostalAddress",
      streetAddress: plzOrt[1].trim(),
      postalCode: plzOrt[2],
      addressLocality: plzOrt[3].trim(),
      addressCountry: "DE",
    };
  }

  const teile = roh
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return {
    "@type": "PostalAddress",
    streetAddress: teile[0],
    addressLocality: teile.slice(1).join(", "),
    addressCountry: "DE",
  };
}

/**
 * Main function: Generate full Restaurant JSON-LD schema
 */
export function generateRestaurantSchema(
  config: RestaurantSchemaConfig,
): SchemaOrganization {
  const groupedItems = groupByCategory(config.menuItems);

  const menuSections: MenuSection[] = Object.entries(groupedItems).map(
    ([categoryName, items]) => ({
      "@type": "MenuSection" as const,
      name: categoryName,
      hasMenuItem: items.map((item) => {
        const price = schemaPreis(item.price);
        return {
          "@type": "MenuItem" as const,
          name: item.name,
          description: text(item.description),
          image: webUrl(item.image),
          offers: price
            ? {
                "@type": "Offer" as const,
                priceCurrency: "EUR",
                price,
              }
            : undefined,
          suitableForDiet: extractDietaryFlags(item.description),
        };
      }),
    }),
  );

  const aggregateRating =
    config.reviews && config.reviews.length > 0
      ? {
          "@type": "AggregateRating" as const,
          ratingValue:
            config.reviews.reduce((sum, r) => sum + r.rating, 0) /
            config.reviews.length,
          ratingCount: config.reviews.length,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined;

  const sameAs = [
    config.socialLinks?.facebook,
    config.socialLinks?.instagram,
    config.socialLinks?.twitter,
    config.socialLinks?.linkedin,
  ]
    .map(webUrl)
    .filter((url): url is string => Boolean(url));

  const logo = webUrl(config.logo);

  const schema: SchemaOrganization = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: config.businessName,
    description: text(config.description),
    url: webUrl(config.website),
    image: logo,
    telephone: text(config.phone),
    email: text(config.email),
    address: postalAddress(config.address),
    ...(config.latitude && config.longitude
      ? {
          geo: {
            "@type": "GeoCoordinates" as const,
            latitude: config.latitude,
            longitude: config.longitude,
          },
        }
      : {}),
    openingHoursSpecification: formatOpeningHours(config.openingHours),
    ...(menuSections.length > 0
      ? {
          hasMenu: [
            {
              "@type": "Menu" as const,
              name: `${config.businessName} Menu`,
              hasMenuSection: menuSections,
            },
          ],
        }
      : {}),
    aggregateRating: aggregateRating,
    ...(sameAs.length > 0 ? { sameAs } : {}),
    ...(logo ? { logo } : {}),
  };

  return schema;
}

/**
 * Validate and sanitize schema before storing
 */
export function validateSchema(schema: any): boolean {
  if (!schema["@context"] || schema["@context"] !== "https://schema.org") {
    return false;
  }
  if (
    !schema["@type"] ||
    !["Restaurant", "LocalBusiness"].includes(schema["@type"])
  ) {
    return false;
  }
  if (!schema.name || typeof schema.name !== "string") {
    return false;
  }
  return true;
}

/**
 * Convert schema to pretty-printed JSON string for storage/display
 */
export function schemaToJsonString(schema: SchemaOrganization): string {
  return JSON.stringify(schema, null, 2);
}

/**
 * Detect if config likely needs a schema (has sufficient business data)
 */
export function hasEnoughDataForSchema(
  config: RestaurantSchemaConfig,
): boolean {
  return (
    !!config.businessName &&
    !!config.openingHours &&
    Object.keys(config.openingHours).length > 0
  );
}
