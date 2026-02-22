import {
  Configuration as RestaurantSchemaConfig,
  MenuItem,
} from "../types/domain"; // Sicherstellen, dass dieser Pfad exakt stimmt

/**
 * Client-seitige Generierung des Schema.org JSON-LD für Restaurants.
 * Mappt die verschachtelten Store-Domänen auf strukturierte SEO-Daten.
 */

export interface SchemaOrganization {
  "@context": "https://schema.org";
  "@type": string;
  [key: string]: any;
}

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
  kosher: { keywords: ["kosher"], url: "https://schema.org/KosherDiet" },
  halal: { keywords: ["halal"], url: "https://schema.org/HalalDiet" },
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

export function extractDietaryFlags(description?: string): string[] {
  if (!description) return [];
  const lowerDesc = description.toLowerCase();
  const flags: string[] = [];
  Object.values(DIETARY_FLAGS).forEach(({ keywords, url }) => {
    if (keywords.some((kw) => lowerDesc.includes(kw))) flags.push(url);
  });
  return flags;
}

function groupByCategory(items: MenuItem[] = []): Record<string, MenuItem[]> {
  const grouped: Record<string, MenuItem[]> = {};
  items.forEach((item) => {
    const category = item.category || "Allgemein";
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(item);
  });
  return grouped;
}

function formatOpeningHours(
  hours?: RestaurantSchemaConfig["content"]["openingHours"],
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
  return Object.entries(hours).map(([day, { open, close, closed }]) => ({
    "@type": "OpeningHoursSpecification" as const,
    dayOfWeek: dayMap[day.toLowerCase()] || day,
    opens: closed ? undefined : open,
    closes: closed ? undefined : close,
  }));
}

export function generateRestaurantSchema(
  config: RestaurantSchemaConfig,
): SchemaOrganization {
  // Zugriff über content-Domäne
  const groupedItems = groupByCategory(config.content.menuItems);

  const menuSections = Object.entries(groupedItems).map(
    ([categoryName, items]) => ({
      "@type": "MenuSection" as const,
      name: categoryName,
      hasMenuItem: items.map((item) => ({
        "@type": "MenuItem" as const,
        name: item.name,
        description: item.description,
        image: item.image?.url || item.imageUrl,
        offers: item.price
          ? {
              "@type": "Offer" as const,
              priceCurrency: "EUR",
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

  // Standort-Extraktion aus business-Domäne
  const addressParts =
    config.business.location?.split(",").map((p) => p.trim()) || [];
  const address =
    addressParts.length > 0
      ? {
          "@type": "PostalAddress" as const,
          streetAddress: addressParts[0] || "",
          addressLocality: addressParts[1] || "",
          addressRegion: addressParts[2] || "",
          postalCode: addressParts[3] || "",
          addressCountry: "DE",
        }
      : undefined;

  // Social Media aus contact-Domäne
  const sameAs: string[] = [];
  const social = config.contact.socialMedia || {};
  if (social.facebook) sameAs.push(social.facebook);
  if (social.instagram) sameAs.push(social.instagram);
  if (social.twitter) sameAs.push(social.twitter);
  if (social.linkedin) sameAs.push(social.linkedin);

  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: config.business.name, // Korrekter Pfad
    description: config.business.uniqueDescription || config.business.slogan,
    url: config.publishing?.publishedUrl,
    image: config.business.logo?.url,
    telephone: config.contact.phone,
    email: config.contact.email,
    address: address,
    openingHoursSpecification: formatOpeningHours(config.content.openingHours),
    ...(menuSections.length > 0
      ? {
          hasMenu: [
            {
              "@type": "Menu" as const,
              name: `${config.business.name} Menü`,
              hasMenuSection: menuSections,
            },
          ],
        }
      : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    logo: config.business.logo?.url,
  };
}
