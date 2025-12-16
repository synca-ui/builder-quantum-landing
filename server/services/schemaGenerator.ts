import {
  SchemaOrganization,
  MenuItem as SchemaMenuItem,
  MenuSection,
  RestaurantSchemaConfig,
} from "../../shared/types/schema";

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

/**
 * Extract dietary flags from menu item description
 */
export function extractDietaryFlags(description?: string): string[] {
  if (!description) return [];

  const lowerDesc = description.toLowerCase();
  const flags: string[] = [];

  Object.values(DIETARY_FLAGS).forEach(({ keywords, url }) => {
    if (keywords.some((kw) => lowerDesc.includes(kw))) {
      flags.push(url);
    }
  });

  return flags;
}

/**
 * Group menu items by category for MenuSection structure
 */
function groupByCategory(
  items: RestaurantSchemaConfig["menuItems"] = [],
): Record<string, RestaurantSchemaConfig["menuItems"]> {
  const grouped: Record<string, RestaurantSchemaConfig["menuItems"]> = {};

  items.forEach((item) => {
    const category = item.category || "Main";
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(item);
  });

  return grouped;
}

/**
 * Convert opening hours object to OpeningHoursSpecification array
 */
function formatOpeningHours(
  hours?: Record<string, { open: string; close: string }>,
) {
  if (!hours || Object.keys(hours).length === 0) return undefined;

  const dayMap: Record<string, string> = {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",
  };

  return Object.entries(hours).map(([day, { open, close }]) => ({
    "@type": "OpeningHoursSpecification" as const,
    dayOfWeek: dayMap[day.toLowerCase()] || day,
    opens: open,
    closes: close,
  }));
}

/**
 * Main function: Generate full Restaurant JSON-LD schema
 */
export function generateRestaurantSchema(
  config: RestaurantSchemaConfig,
): SchemaOrganization {
  // Group menu items by category
  const groupedItems = groupByCategory(config.menuItems);

  // Convert grouped items to MenuSection format
  const menuSections: MenuSection[] = Object.entries(groupedItems).map(
    ([categoryName, items]) => ({
      "@type": "MenuSection" as const,
      name: categoryName,
      description: undefined,
      hasMenuItem: items.map((item) => ({
        "@type": "MenuItem" as const,
        name: item.name,
        description: item.description,
        image: item.image,
        offers: item.price
          ? {
              "@type": "Offer" as const,
              priceCurrency: "EUR", // Default to EUR for EU restaurants
              price:
                typeof item.price === "number"
                  ? item.price.toFixed(2)
                  : item.price,
            }
          : undefined,
        suitableForDiet: extractDietaryFlags(item.description),
      })),
    }),
  );

  // Build address
  const addressParts = config.address?.split(",").map((p) => p.trim()) || [];
  const address =
    addressParts.length > 0
      ? {
          "@type": "PostalAddress" as const,
          streetAddress: addressParts[0] || "",
          addressLocality: addressParts[1] || "",
          addressRegion: addressParts[2] || "",
          postalCode: addressParts[3] || "",
          addressCountry: "DE", // Default to Germany for EU
        }
      : undefined;

  // Build aggregated rating if reviews exist
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

  // Build sameAs links from social
  const sameAs: string[] = [];
  if (config.socialLinks?.facebook) sameAs.push(config.socialLinks.facebook);
  if (config.socialLinks?.instagram) sameAs.push(config.socialLinks.instagram);
  if (config.socialLinks?.twitter) sameAs.push(config.socialLinks.twitter);
  if (config.socialLinks?.linkedin) sameAs.push(config.socialLinks.linkedin);

  // Construct the final schema
  const schema: SchemaOrganization = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: config.businessName,
    description: config.description,
    url: config.website,
    image: config.logo || undefined,
    telephone: config.phone,
    email: config.email,
    address: address,
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
    ...(config.logo ? { logo: config.logo } : {}),
  };

  return schema;
}

/**
 * Validate and sanitize schema before storing
 */
export function validateSchema(schema: any): boolean {
  // Basic validation - ensure required fields are present
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
