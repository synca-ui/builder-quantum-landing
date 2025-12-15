import { SchemaOrganization, MenuItem as SchemaMenuItem, RestaurantSchemaConfig } from '../shared/types/schema';

/**
 * Client-side schema generation (mirrors server version)
 * This allows schemas to be generated in the browser without API call
 */

const DIETARY_FLAGS = {
  vegan: {
    keywords: ["vegan", "100% plant-based"],
    url: "https://schema.org/VeganDiet"
  },
  vegetarian: {
    keywords: ["vegetarian", "no meat"],
    url: "https://schema.org/VegetarianDiet"
  },
  glutenFree: {
    keywords: ["gluten-free", "gluten free", "gf"],
    url: "https://schema.org/GlutenFreeDiet"
  },
  kosher: {
    keywords: ["kosher"],
    url: "https://schema.org/KosherDiet"
  },
  halal: {
    keywords: ["halal"],
    url: "https://schema.org/HalalDiet"
  },
  dairyFree: {
    keywords: ["dairy-free", "dairy free"],
    url: "https://schema.org/DairyFree"
  },
  lowFat: {
    keywords: ["low-fat", "low fat"],
    url: "https://schema.org/LowFatDiet"
  },
  lowSodium: {
    keywords: ["low-sodium", "low sodium"],
    url: "https://schema.org/LowSodiumDiet"
  }
};

export function extractDietaryFlags(description?: string): string[] {
  if (!description) return [];

  const lowerDesc = description.toLowerCase();
  const flags: string[] = [];

  Object.values(DIETARY_FLAGS).forEach(({ keywords, url }) => {
    if (keywords.some(kw => lowerDesc.includes(kw))) {
      flags.push(url);
    }
  });

  return flags;
}

function groupByCategory(
  items: RestaurantSchemaConfig["menuItems"] = []
): Record<string, RestaurantSchemaConfig["menuItems"]> {
  const grouped: Record<string, RestaurantSchemaConfig["menuItems"]> = {};

  items.forEach(item => {
    const category = item.category || "Main";
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(item);
  });

  return grouped;
}

function formatOpeningHours(
  hours?: Record<string, { open: string; close: string }>
) {
  if (!hours || Object.keys(hours).length === 0) return undefined;

  const dayMap: Record<string, string> = {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday"
  };

  return Object.entries(hours).map(([day, { open, close }]) => ({
    "@type": "OpeningHoursSpecification" as const,
    dayOfWeek: dayMap[day.toLowerCase()] || day,
    opens: open,
    closes: close
  }));
}

export function generateRestaurantSchema(
  config: RestaurantSchemaConfig
): SchemaOrganization {
  const groupedItems = groupByCategory(config.menuItems);

  const menuSections = Object.entries(groupedItems).map(
    ([categoryName, items]) => ({
      "@type": "MenuSection" as const,
      name: categoryName,
      description: undefined,
      hasMenuItem: items.map(item => ({
        "@type": "MenuItem" as const,
        name: item.name,
        description: item.description,
        image: item.image,
        offers: item.price
          ? {
              "@type": "Offer" as const,
              priceCurrency: "EUR",
              price: typeof item.price === "number" 
                ? item.price.toFixed(2) 
                : item.price
            }
          : undefined,
        suitableForDiet: extractDietaryFlags(item.description)
      }))
    })
  );

  const addressParts = config.address?.split(",").map(p => p.trim()) || [];
  const address =
    addressParts.length > 0
      ? {
          "@type": "PostalAddress" as const,
          streetAddress: addressParts[0] || "",
          addressLocality: addressParts[1] || "",
          addressRegion: addressParts[2] || "",
          postalCode: addressParts[3] || "",
          addressCountry: "DE"
        }
      : undefined;

  const aggregateRating =
    config.reviews && config.reviews.length > 0
      ? {
          "@type": "AggregateRating" as const,
          ratingValue:
            config.reviews.reduce((sum, r) => sum + r.rating, 0) /
            config.reviews.length,
          ratingCount: config.reviews.length,
          bestRating: 5,
          worstRating: 1
        }
      : undefined;

  const sameAs: string[] = [];
  if (config.socialLinks?.facebook) sameAs.push(config.socialLinks.facebook);
  if (config.socialLinks?.instagram) sameAs.push(config.socialLinks.instagram);
  if (config.socialLinks?.twitter) sameAs.push(config.socialLinks.twitter);
  if (config.socialLinks?.linkedin) sameAs.push(config.socialLinks.linkedin);

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
            longitude: config.longitude
          }
        }
      : {}),
    openingHoursSpecification: formatOpeningHours(config.openingHours),
    ...(menuSections.length > 0
      ? {
          hasMenu: [
            {
              "@type": "Menu" as const,
              name: `${config.businessName} Menu`,
              hasMenuSection: menuSections
            }
          ]
        }
      : {}),
    aggregateRating: aggregateRating,
    ...(sameAs.length > 0 ? { sameAs } : {}),
    ...(config.logo ? { logo: config.logo } : {})
  };

  return schema;
}
