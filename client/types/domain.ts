/**
 * Domain-Driven Types for Maitr
 * Separates concerns: Business, Design, Content, Features, Publishing, Integrations
 */

/**
 * Business Information Domain
 * User's business metadata
 */
export interface BusinessInfo {
  name: string;
  type: string; // "restaurant", "cafe", "bar", etc.
  location?: string;
  slogan?: string;
  uniqueDescription?: string;
  logo?: {
    url: string;
    file?: File;
  };
  domain?: {
    hasDomain: boolean;
    domainName?: string;
    selectedDomain?: string;
  };
}

/**
 * Design & Styling Domain
 * Template selection, colors, typography
 */
export interface DesignConfig {
  template: string; // template id from TemplateRegistry

  // Main Colors
  primaryColor: string; // hex - Buttons, CTAs, Links, Akzente
  secondaryColor: string; // hex - Gradients, Hover-States, sekundäre Elemente
  backgroundColor?: string; // hex - Seitenhintergrund
  fontColor?: string; // hex - Haupttextfarbe
  priceColor?: string; // hex - Preisanzeige (unabhängig von Primärfarbe)

  // Typography
  fontFamily: string; // "sans-serif", "serif", "monospace"
  fontSize?: string; // "small", "medium", "large"

  // Header/Navigation Bar Customization
  headerFontColor?: string; // hex - Schriftfarbe der Navigation
  headerFontSize?: string; // "small", "medium", "large"
  headerBackgroundColor?: string; // hex - Hintergrund der Navigation

  // Background
  backgroundImage?: string | null;
  backgroundType?: "color" | "image";
}

/**
 * Content Domain
 * Menu items, gallery, opening hours, etc.
 */
export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price?: number | string;
  imageUrl?: string;
  emoji?: string;
  available?: boolean;
  category?: string;
  image?: { url: string; alt?: string; file?: File };
  images?: { url: string; alt?: string; file?: File }[];
}

export interface GalleryImage {
  id: string;
  url: string;
  title?: string;
  alt?: string;
}

export interface OpeningHours {
  [day: string]: {
    open: string; // "HH:MM" format
    close: string;
    closed: boolean;
  };
}

export interface ContentData {
  menuItems: MenuItem[];
  gallery: GalleryImage[];
  openingHours: OpeningHours;
  homepageDishImageVisibility?: string;
  categories?: string[]; // "Drinks", "Food", etc.
}

/**
 * Features Domain
 * Feature flags for what's enabled
 */
export interface FeatureFlags {
  reservationsEnabled: boolean;
  maxGuests?: number;
  notificationMethod?: string;
  reservationButtonColor?: string;
  reservationButtonTextColor?: string;
  reservationButtonShape?: "rounded" | "pill" | "square";
  onlineOrderingEnabled: boolean;
  onlineStoreEnabled: boolean;
  teamAreaEnabled: boolean;
}

/**
 * Contact & Social Domain
 */
export interface ContactInfo {
  contactMethods: string[];
  socialMedia: Record<string, string>;
  phone?: string;
  email?: string;
}

/**
 * Publishing Domain
 */
export interface PublishingInfo {
  status: "draft" | "published" | "archived";
  publishedUrl?: string;
  previewUrl?: string;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Page Management Domain
 */
export interface PageManagement {
  selectedPages: string[];
  customPages: string[];
}

/**
 * Payment & Offers Domain
 */
export interface PaymentAndOffers {
  paymentOptions?: string[];
  offers?: Array<{
    id: string;
    title: string;
    description?: string;
    discount?: number;
  }>;
  offerBanner?: {
    enabled: boolean;
    text?: string;
    backgroundColor?: string;
  };
}

/**
 * Integration Domain
 * Third-party integrations configuration
 */
export interface IntegrationConfig {
  [key: string]: any;
}

/**
 * Complete Configuration Object
 * Combines all domains
 */
export interface Configuration {
  id?: string;
  userId: string;

  // Main domains
  business: BusinessInfo;
  design: DesignConfig;
  content: ContentData;
  features: FeatureFlags;
  contact: ContactInfo;
  publishing: PublishingInfo;
  pages: PageManagement;
  payments: PaymentAndOffers;

  // Integrations (dynamic, can hold any integration config)
  integrations?: Record<string, IntegrationConfig>;
}

/**
 * For backward compatibility during migration
 * Maps old flat Configuration to new domain structure
 */
export type LegacyConfiguration = Configuration & {
  // Old fields for compatibility
  businessName?: string;
  businessType?: string;
  location?: string;
  slogan?: string;
  uniqueDescription?: string;
  template?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  [key: string]: any;
};
