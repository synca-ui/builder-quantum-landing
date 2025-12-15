/**
 * Schema.org JSON-LD types for Restaurant/LocalBusiness
 * These are simplified versions of full Schema.org types
 */

export interface SchemaOrganization {
  "@context": "https://schema.org";
  "@type": "Restaurant" | "LocalBusiness";
  name: string;
  description?: string;
  url?: string;
  image?: string | string[];
  telephone?: string;
  email?: string;
  address?: {
    "@type": "PostalAddress";
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
  geo?: {
    "@type": "GeoCoordinates";
    latitude: number;
    longitude: number;
  };
  openingHoursSpecification?: OpeningHoursSpecification[];
  hasMenu?: Menu[];
  aggregateRating?: AggregateRating;
  review?: Review[];
  priceRange?: string;
  sameAs?: string[];
  logo?: string;
}

export interface OpeningHoursSpecification {
  "@type": "OpeningHoursSpecification";
  dayOfWeek: string | string[];
  opens: string;
  closes: string;
  validFrom?: string;
  validThrough?: string;
}

export interface Menu {
  "@type": "Menu";
  name: string;
  hasMenuSection?: MenuSection[];
}

export interface MenuSection {
  "@type": "MenuSection";
  name: string;
  description?: string;
  hasMenuItem?: MenuItem[];
}

export interface MenuItem {
  "@type": "MenuItem";
  name: string;
  description?: string;
  image?: string;
  offers?: {
    "@type": "Offer";
    priceCurrency: string;
    price: string | number;
  };
  suitableForDiet?: string[]; // URLs like https://schema.org/VeganDiet
}

export interface AggregateRating {
  "@type": "AggregateRating";
  ratingValue: number;
  ratingCount: number;
  bestRating?: number;
  worstRating?: number;
}

export interface Review {
  "@type": "Review";
  reviewRating: {
    "@type": "Rating";
    ratingValue: number;
  };
  author: {
    "@type": "Person";
    name: string;
  };
  reviewBody: string;
  datePublished: string;
}

export interface RestaurantSchemaConfig {
  businessName: string;
  businessType?: string;
  description?: string;
  location?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  primaryColor?: string;
  openingHours?: Record<string, { open: string; close: string }>;
  menuItems?: Array<{
    id?: string;
    name: string;
    description?: string;
    price?: string | number;
    category?: string;
    image?: string;
  }>;
  latitude?: number;
  longitude?: number;
  reviews?: Array<{
    rating: number;
    author: string;
    text: string;
    date: string;
  }>;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
}
