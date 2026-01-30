/**
 * Configuration Normalizer
 *
 * Transformiert flache NeonDB-Daten (Prisma Configuration Model)
 * in das verschachtelte Configuration-Interface aus domain.ts.
 *
 * PROBLEM: Die Datenbank speichert Daten flach (businessName, primaryColor, etc.)
 * LÖSUNG: Diese Utility mappt sie zur verschachtelten Store-Struktur (business.name, design.primaryColor)
 *
 * Verwendet in:
 * - AppRenderer.tsx: Beim Laden publizierter Seiten
 * - Configurator.tsx: Beim Laden gespeicherter Konfigurationen
 * - API-Responses: Beim Empfangen von Backend-Daten
 */

import type {
  Configuration,
  BusinessInfo,
  DesignConfig,
  ContentData,
  FeatureFlags,
  ContactInfo,
  PublishingInfo,
  PageManagement,
  PaymentAndOffers,
  MenuItem,
  OpeningHours,
  GalleryImage,
  ContactMethod,
} from "@/types/domain";
import { getBusinessTypeDefaults } from './businessTypeDefaults';

// ============================================
// TYPES: Flache Datenbank-Struktur (Prisma)
// Entspricht schema.prisma Configuration Model
// ============================================

export interface FlatDatabaseConfig {
  id?: string;
  userId?: string;
  businessId?: string;

  // Business Info (flach)
  businessName?: string;
  businessType?: string;
  location?: string;
  slogan?: string;
  uniqueDescription?: string;

  // Design (flach) - aus schema.prisma
  template?: string;
  selectedTemplate?: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  fontColor?: string;
  priceColor?: string;
  fontFamily?: string;
  fontSize?: string;
  headerFontColor?: string;
  headerFontSize?: string;
  headerBackgroundColor?: string;
  backgroundImage?: string | null;
  backgroundType?: string;

  // Content (JSON fields aus schema.prisma)
  menuItems?: unknown;
  gallery?: unknown;
  openingHours?: unknown;
  categories?: unknown;
  homepageDishImageVisibility?: string;

  // Features (flach aus schema.prisma)
  reservationsEnabled?: boolean;
  maxGuests?: number;
  notificationMethod?: string;
  reservationButtonColor?: string;
  reservationButtonTextColor?: string;
  reservationButtonShape?: string;
  onlineOrdering?: boolean;
  onlineStore?: boolean;
  teamArea?: boolean;

  // Contact (JSON fields)
  contactMethods?: unknown;
  socialMedia?: unknown;
  phone?: string;
  email?: string;

  // Pages (JSON fields)
  selectedPages?: unknown;
  customPages?: unknown;

  // Publishing
  status?: string;
  publishedUrl?: string;
  previewUrl?: string;
  publishedAt?: string | Date;

  // Domain
  domainName?: string;
  selectedDomain?: string;

  // Payments (JSON fields)
  paymentOptions?: unknown;
  offers?: unknown;
  offerBanner?: unknown;

  // Logo
  logo?: unknown;

  // Integrations
  integrations?: unknown;

  // Timestamps
  createdAt?: string | Date;
  updatedAt?: string | Date;

  // Legacy/Extra fields (für Rückwärtskompatibilität)
  [key: string]: unknown;
}

// ============================================
// DEFAULT VALUES
// ============================================

const DEFAULT_BUSINESS_INFO: BusinessInfo = {
  name: '',
  type: 'restaurant',
  location: undefined,
  slogan: undefined,
  uniqueDescription: undefined,
  logo: undefined,
  domain: {
    hasDomain: false,
    domainName: undefined,
    selectedDomain: undefined,
  },
};

const DEFAULT_DESIGN_CONFIG: DesignConfig = {
  template: 'minimalist',
  primaryColor: '#4F46E5',
  secondaryColor: '#7C3AED',
  backgroundColor: '#FFFFFF',
  fontColor: '#000000',
  priceColor: '#059669',
  fontFamily: 'sans-serif',
  fontSize: 'medium',
  headerFontColor: '#000000',
  headerFontSize: 'medium',
  headerBackgroundColor: '#FFFFFF',
  backgroundImage: null,
  backgroundType: 'color',
};

const DEFAULT_CONTENT_DATA: ContentData = {
  menuItems: [],
  gallery: [],
  openingHours: {
    monday: { open: '09:00', close: '22:00', closed: false },
    tuesday: { open: '09:00', close: '22:00', closed: false },
    wednesday: { open: '09:00', close: '22:00', closed: false },
    thursday: { open: '09:00', close: '22:00', closed: false },
    friday: { open: '09:00', close: '23:00', closed: false },
    saturday: { open: '10:00', close: '23:00', closed: false },
    sunday: { open: '10:00', close: '22:00', closed: false },
  },
  categories: [],
  homepageDishImageVisibility: 'visible',
};

const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  reservationsEnabled: false,
  maxGuests: 100,
  notificationMethod: 'email',
  reservationButtonColor: '#2563EB',
  reservationButtonTextColor: '#FFFFFF',
  reservationButtonShape: 'rounded',
  onlineOrderingEnabled: false,
  onlineStoreEnabled: false,
  teamAreaEnabled: false,
};

const DEFAULT_CONTACT_INFO: ContactInfo = {
  contactMethods: [],
  socialMedia: {},
  phone: undefined,
  email: undefined,
};

const DEFAULT_PUBLISHING_INFO: PublishingInfo = {
  status: 'draft',
  publishedUrl: undefined,
  previewUrl: undefined,
  publishedAt: undefined,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const DEFAULT_PAGE_MANAGEMENT: PageManagement = {
  selectedPages: ['home'],
  customPages: [],
};

const DEFAULT_PAYMENT_AND_OFFERS: PaymentAndOffers = {
  paymentOptions: [],
  offers: [],
  offerBanner: {
    enabled: false,
    text: undefined,
    backgroundColor: undefined,
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Sicheres JSON-Parsing mit Fallback
 */
function safeParseJSON<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      console.warn('[normalizeConfig] Failed to parse JSON:', value);
      return fallback;
    }
  }
  return fallback;
}

/**
 * Normalisiert MenuItem-Array aus DB-Daten
 */
function normalizeMenuItems(items: unknown): MenuItem[] {
  const parsed = safeParseJSON<unknown[]>(items, []);
  if (!Array.isArray(parsed)) return [];

  return parsed.map((item: unknown, index: number) => {
    const i = item as Record<string, unknown>;
    return {
      id: (i.id as string) || `item-${index}-${Date.now()}`,
      name: (i.name as string) || 'Unbenanntes Gericht',
      description: (i.description as string) || undefined,
      price: i.price !== undefined ? i.price as (number | string) : undefined,
      imageUrl: (i.imageUrl as string) || (i.image as { url?: string })?.url || undefined,
      emoji: (i.emoji as string) || undefined,
      available: i.available !== false,
      category: (i.category as string) || 'Sonstiges',
      image: i.image as MenuItem['image'] || undefined,
      images: i.images as MenuItem['images'] || undefined,
      isHighlight: i.isHighlight === true,
    };
  });
}

/**
 * Normalisiert Gallery-Array
 */
function normalizeGallery(gallery: unknown): GalleryImage[] {
  const parsed = safeParseJSON<unknown[]>(gallery, []);
  if (!Array.isArray(parsed)) return [];

  return parsed.map((img: unknown, index: number) => {
    const i = img as Record<string, unknown>;
    return {
      id: (i.id as string) || `gallery-${index}-${Date.now()}`,
      url: (i.url as string) || '',
      title: (i.title as string) || undefined,
      alt: (i.alt as string) || undefined,
    };
  });
}

/**
 * Normalisiert OpeningHours aus verschiedenen Formaten
 */
function normalizeOpeningHours(hours: unknown): OpeningHours {
  const parsed = safeParseJSON<Record<string, unknown>>(hours, {});
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const normalized: OpeningHours = {};
  for (const day of days) {
    const dayData = parsed[day] as Record<string, unknown> | undefined;
    if (dayData) {
      normalized[day] = {
        open: (dayData.open as string) || '09:00',
        close: (dayData.close as string) || '22:00',
        closed: dayData.closed === true,
      };
    } else {
      normalized[day] = { open: '09:00', close: '22:00', closed: false };
    }
  }
  return normalized;
}

/**
 * Extrahiert Kategorien aus Menu-Items
 */
function extractCategories(menuItems: MenuItem[]): string[] {
  const categories = new Set<string>();
  menuItems.forEach(item => {
    if (item.category) {
      categories.add(item.category);
    }
  });
  return Array.from(categories);
}

/**
 * Normalisiert Kontaktmethoden zu ContactMethod[] Format
 */
function normalizeContactMethods(methods: unknown): ContactMethod[] {
  const parsed = safeParseJSON<unknown[]>(methods, []);
  if (!Array.isArray(parsed)) return [];

  return parsed.map((m, index) => {
    // Fall 1: Bereits im richtigen Format { type: 'phone', value: '...' }
    if (typeof m === 'object' && m !== null) {
      const method = m as Record<string, unknown>;
      if (method.type && method.value) {
        return {
          type: (method.type as 'phone' | 'email'),
          value: String(method.value),
        };
      }
    }

    // Fall 2: Legacy-Format - String wird zu email konvertiert
    if (typeof m === 'string' && m.trim()) {
      // Heuristik: Enthält @ = email, sonst phone
      const isEmail = m.includes('@');
      return {
        type: isEmail ? 'email' as const : 'phone' as const,
        value: m.trim(),
      };
    }

    // Fall 3: Fallback - leerer Eintrag
    return null;
  }).filter((m): m is ContactMethod => m !== null);
}

/**
 * Normalisiert Social Media Object
 */
function normalizeSocialMedia(social: unknown): Record<string, string> {
  const parsed = safeParseJSON<Record<string, unknown>>(social, {});
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === 'string') {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Normalisiert Logo-Objekt
 */
function normalizeLogo(logo: unknown): BusinessInfo['logo'] {
  if (!logo) return undefined;

  const parsed = safeParseJSON<Record<string, unknown>>(logo, {});
  if (parsed.url && typeof parsed.url === 'string') {
    return { url: parsed.url };
  }

  return undefined;
}

// ============================================
// MAIN NORMALIZATION FUNCTION
// ============================================

/**
 * HAUPTFUNKTION: Transformiert flache DB-Daten zu verschachtelter Configuration
 *
 * @param flatConfig - Flache Daten aus NeonDB/Prisma
 * @param applyDefaults - Ob businessType-Defaults angewendet werden sollen
 * @returns Vollständig normalisierte Configuration
 *
 * @example
 * ```ts
 * // API Response verarbeiten
 * const dbData = await fetch('/api/configuration/123');
 * const normalized = normalizeConfig(dbData);
 * store.loadConfiguration(normalized);
 * ```
 */
export function normalizeConfig(
  flatConfig: FlatDatabaseConfig | null | undefined,
  applyDefaults: boolean = true
): Configuration {
  // Null-Check
  if (!flatConfig) {
    console.warn('[normalizeConfig] Received null/undefined config, using defaults');
    return createDefaultConfiguration();
  }

  // ✅ FIX: Extrahiere verschachtelte Objekte falls vorhanden (gemischte Struktur aus DB)
  const designObj = (flatConfig as any).design || {};
  const featuresObj = (flatConfig as any).features || {};
  const contentObj = (flatConfig as any).content || {};
  const contactObj = (flatConfig as any).contact || {};
  const businessObj = (flatConfig as any).business || {};
  const pagesObj = (flatConfig as any).pages || {};
  const paymentsObj = (flatConfig as any).payments || {};

  // Menu Items normalisieren (prüfe beide Stellen)
  const menuItems = normalizeMenuItems(contentObj.menuItems || flatConfig.menuItems);

  // Kategorien aus Menu-Items oder separat (prüfe beide Stellen)
  const categories = (contentObj.categories || flatConfig.categories)
    ? safeParseJSON<string[]>(contentObj.categories || flatConfig.categories, [])
    : extractCategories(menuItems);

  // Business Type für Defaults (prüfe beide Stellen)
  const businessType = businessObj.type || flatConfig.businessType || 'restaurant';
  const typeDefaults = applyDefaults ? getBusinessTypeDefaults(businessType) : null;

  // Configuration zusammenbauen
  const normalized: Configuration = {
    id: flatConfig.id,
    userId: flatConfig.userId || '',

    // ========== BUSINESS ==========
    business: {
      name: businessObj.name || flatConfig.businessName || DEFAULT_BUSINESS_INFO.name,
      type: businessType,
      location: businessObj.location || flatConfig.location || undefined,
      slogan: businessObj.slogan || flatConfig.slogan || undefined,
      uniqueDescription: businessObj.uniqueDescription || flatConfig.uniqueDescription || undefined,
      logo: normalizeLogo(businessObj.logo || flatConfig.logo),
      domain: businessObj.domain || {
        hasDomain: !!(flatConfig.domainName || flatConfig.selectedDomain),
        domainName: flatConfig.domainName || undefined,
        selectedDomain: flatConfig.selectedDomain || undefined,
      },
    },

    // ========== DESIGN ==========
    // ✅ FIX: Prüfe ZUERST im design Objekt, dann in root-level
    design: {
      template: designObj.template || flatConfig.selectedTemplate || flatConfig.template || DEFAULT_DESIGN_CONFIG.template,
      primaryColor: designObj.primaryColor || flatConfig.primaryColor || DEFAULT_DESIGN_CONFIG.primaryColor,
      secondaryColor: designObj.secondaryColor || flatConfig.secondaryColor || DEFAULT_DESIGN_CONFIG.secondaryColor,
      backgroundColor: designObj.backgroundColor || flatConfig.backgroundColor || DEFAULT_DESIGN_CONFIG.backgroundColor,
      fontColor: designObj.fontColor || flatConfig.fontColor || DEFAULT_DESIGN_CONFIG.fontColor,
      priceColor: designObj.priceColor || flatConfig.priceColor || DEFAULT_DESIGN_CONFIG.priceColor,
      fontFamily: designObj.fontFamily || flatConfig.fontFamily || DEFAULT_DESIGN_CONFIG.fontFamily,
      fontSize: designObj.fontSize || flatConfig.fontSize || DEFAULT_DESIGN_CONFIG.fontSize,
      headerFontColor: designObj.headerFontColor || flatConfig.headerFontColor || DEFAULT_DESIGN_CONFIG.headerFontColor,
      headerFontSize: designObj.headerFontSize || flatConfig.headerFontSize || DEFAULT_DESIGN_CONFIG.headerFontSize,
      headerBackgroundColor: designObj.headerBackgroundColor || flatConfig.headerBackgroundColor || DEFAULT_DESIGN_CONFIG.headerBackgroundColor,
      backgroundImage: designObj.backgroundImage ?? flatConfig.backgroundImage ?? null,
      backgroundType: (designObj.backgroundType || flatConfig.backgroundType as 'color' | 'image') || 'color',
    },

    // ========== CONTENT ==========
    content: {
      menuItems: menuItems.length > 0
        ? menuItems
        : (typeDefaults?.menuItems || DEFAULT_CONTENT_DATA.menuItems),
      gallery: normalizeGallery(contentObj.gallery || flatConfig.gallery),
      openingHours: Object.keys(normalizeOpeningHours(contentObj.openingHours || flatConfig.openingHours)).length > 0
        ? normalizeOpeningHours(contentObj.openingHours || flatConfig.openingHours)
        : (typeDefaults?.openingHours || DEFAULT_CONTENT_DATA.openingHours),
      categories: categories.length > 0
        ? categories
        : (typeDefaults?.categories || DEFAULT_CONTENT_DATA.categories),
      homepageDishImageVisibility: contentObj.homepageDishImageVisibility || flatConfig.homepageDishImageVisibility || 'visible',
    },

    // ========== FEATURES ==========
    // ✅ FIX: Prüfe ZUERST im features Objekt, dann in root-level
    features: {
      reservationsEnabled: featuresObj.reservationsEnabled ?? flatConfig.reservationsEnabled ??
        (typeDefaults?.features?.reservationsEnabled ?? DEFAULT_FEATURE_FLAGS.reservationsEnabled),
      maxGuests: featuresObj.maxGuests ?? flatConfig.maxGuests ?? DEFAULT_FEATURE_FLAGS.maxGuests,
      notificationMethod: featuresObj.notificationMethod || flatConfig.notificationMethod || DEFAULT_FEATURE_FLAGS.notificationMethod,
      reservationButtonColor: featuresObj.reservationButtonColor || flatConfig.reservationButtonColor || DEFAULT_FEATURE_FLAGS.reservationButtonColor,
      reservationButtonTextColor: featuresObj.reservationButtonTextColor || flatConfig.reservationButtonTextColor || DEFAULT_FEATURE_FLAGS.reservationButtonTextColor,
      reservationButtonShape: (featuresObj.reservationButtonShape || flatConfig.reservationButtonShape as 'rounded' | 'pill' | 'square') || DEFAULT_FEATURE_FLAGS.reservationButtonShape,
      onlineOrderingEnabled: featuresObj.onlineOrderingEnabled ?? flatConfig.onlineOrdering ??
        (typeDefaults?.features?.onlineOrderingEnabled ?? DEFAULT_FEATURE_FLAGS.onlineOrderingEnabled),
      onlineStoreEnabled: featuresObj.onlineStoreEnabled ?? flatConfig.onlineStore ?? DEFAULT_FEATURE_FLAGS.onlineStoreEnabled,
      teamAreaEnabled: featuresObj.teamAreaEnabled ?? flatConfig.teamArea ?? DEFAULT_FEATURE_FLAGS.teamAreaEnabled,
    },

    // ========== CONTACT ==========
    contact: {
      contactMethods: normalizeContactMethods(contactObj.contactMethods || flatConfig.contactMethods),
      socialMedia: normalizeSocialMedia(contactObj.socialMedia || flatConfig.socialMedia),
      phone: contactObj.phone || flatConfig.phone || undefined,
      email: contactObj.email || flatConfig.email || undefined,
    },

    // ========== PUBLISHING ==========
    publishing: {
      status: (flatConfig.status as 'draft' | 'published' | 'archived') || DEFAULT_PUBLISHING_INFO.status,
      publishedUrl: flatConfig.publishedUrl || undefined,
      previewUrl: flatConfig.previewUrl || undefined,
      publishedAt: flatConfig.publishedAt
        ? new Date(flatConfig.publishedAt).toISOString()
        : undefined,
      createdAt: flatConfig.createdAt
        ? new Date(flatConfig.createdAt).toISOString()
        : DEFAULT_PUBLISHING_INFO.createdAt,
      updatedAt: flatConfig.updatedAt
        ? new Date(flatConfig.updatedAt).toISOString()
        : DEFAULT_PUBLISHING_INFO.updatedAt,
    },

    // ========== PAGES ==========
    pages: {
      selectedPages: safeParseJSON<string[]>(pagesObj.selectedPages || flatConfig.selectedPages,
        typeDefaults?.pages || DEFAULT_PAGE_MANAGEMENT.selectedPages),
      customPages: safeParseJSON<string[]>(pagesObj.customPages || flatConfig.customPages, DEFAULT_PAGE_MANAGEMENT.customPages),
    },

    // ========== PAYMENTS ==========
    payments: {
      paymentOptions: safeParseJSON<string[]>(paymentsObj.paymentOptions || flatConfig.paymentOptions, DEFAULT_PAYMENT_AND_OFFERS.paymentOptions),
      offers: safeParseJSON(paymentsObj.offers || flatConfig.offers, DEFAULT_PAYMENT_AND_OFFERS.offers),
      offerBanner: (paymentsObj.offerBanner || flatConfig.offerBanner)
        ? safeParseJSON(paymentsObj.offerBanner || flatConfig.offerBanner, DEFAULT_PAYMENT_AND_OFFERS.offerBanner)
        : DEFAULT_PAYMENT_AND_OFFERS.offerBanner,
    },

    // ========== INTEGRATIONS ==========
    integrations: flatConfig.integrations
      ? safeParseJSON<Record<string, unknown>>(flatConfig.integrations, {})
      : {},
  };

  console.log('[normalizeConfig] Successfully normalized config:', normalized.id || 'new');
  return normalized;
}

/**
 * Erstellt eine leere Default-Configuration
 */
export function createDefaultConfiguration(userId: string = ''): Configuration {
  return {
    userId,
    business: { ...DEFAULT_BUSINESS_INFO },
    design: { ...DEFAULT_DESIGN_CONFIG },
    content: { ...DEFAULT_CONTENT_DATA },
    features: { ...DEFAULT_FEATURE_FLAGS },
    contact: { ...DEFAULT_CONTACT_INFO },
    publishing: { ...DEFAULT_PUBLISHING_INFO },
    pages: { ...DEFAULT_PAGE_MANAGEMENT },
    payments: { ...DEFAULT_PAYMENT_AND_OFFERS },
  };
}

// ============================================
// REVERSE: Configuration → Flat DB Format
// ============================================

/**
 * Transformiert verschachtelte Configuration zurück zu flacher DB-Struktur
 * Verwendet für API-Requests an das Backend
 *
 * @param config - Verschachtelte Configuration aus dem Store
 * @returns Flache Struktur für Prisma/NeonDB
 */
export function denormalizeConfig(config: Configuration): FlatDatabaseConfig {
  return {
    id: config.id,
    userId: config.userId,

    // Business (flatten)
    businessName: config.business.name,
    businessType: config.business.type,
    location: config.business.location,
    slogan: config.business.slogan,
    uniqueDescription: config.business.uniqueDescription,
    logo: config.business.logo,
    domainName: config.business.domain?.domainName,
    selectedDomain: config.business.domain?.selectedDomain,

    // Design (flatten)
    template: config.design.template,
    selectedTemplate: config.design.template,
    primaryColor: config.design.primaryColor,
    secondaryColor: config.design.secondaryColor,
    backgroundColor: config.design.backgroundColor,
    fontColor: config.design.fontColor,
    priceColor: config.design.priceColor,
    fontFamily: config.design.fontFamily,
    fontSize: config.design.fontSize,
    headerFontColor: config.design.headerFontColor,
    headerFontSize: config.design.headerFontSize,
    headerBackgroundColor: config.design.headerBackgroundColor,
    backgroundImage: config.design.backgroundImage,
    backgroundType: config.design.backgroundType,

    // Content (als JSON)
    menuItems: config.content.menuItems,
    gallery: config.content.gallery,
    openingHours: config.content.openingHours,
    categories: config.content.categories,
    homepageDishImageVisibility: config.content.homepageDishImageVisibility,

    // Features (flatten)
    reservationsEnabled: config.features.reservationsEnabled,
    maxGuests: config.features.maxGuests,
    notificationMethod: config.features.notificationMethod,
    reservationButtonColor: config.features.reservationButtonColor,
    reservationButtonTextColor: config.features.reservationButtonTextColor,
    reservationButtonShape: config.features.reservationButtonShape,
    onlineOrdering: config.features.onlineOrderingEnabled,
    onlineStore: config.features.onlineStoreEnabled,
    teamArea: config.features.teamAreaEnabled,

    // Contact (als JSON)
    contactMethods: config.contact.contactMethods,
    socialMedia: config.contact.socialMedia,
    phone: config.contact.phone,
    email: config.contact.email,

    // Pages (als JSON)
    selectedPages: config.pages.selectedPages,
    customPages: config.pages.customPages,

    // Publishing
    status: config.publishing.status,
    publishedUrl: config.publishing.publishedUrl,
    previewUrl: config.publishing.previewUrl,
    publishedAt: config.publishing.publishedAt,
    createdAt: config.publishing.createdAt,
    updatedAt: config.publishing.updatedAt,

    // Payments (als JSON)
    paymentOptions: config.payments.paymentOptions,
    offers: config.payments.offers,
    offerBanner: config.payments.offerBanner,

    // Integrations
    integrations: config.integrations,
  };
}

// ============================================
// VALIDATION
// ============================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validiert eine Configuration auf Vollständigkeit
 */
export function validateConfiguration(config: Configuration): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!config.business.name || config.business.name.trim() === '') {
    errors.push('Business name is required');
  }
  if (!config.business.type || config.business.type.trim() === '') {
    errors.push('Business type is required');
  }
  if (!config.design.template || config.design.template.trim() === '') {
    errors.push('Template is required');
  }

  // Warnings (nicht blockierend)
  if (config.content.menuItems.length === 0) {
    warnings.push('No menu items added');
  }
  if (!config.business.location) {
    warnings.push('Location not specified');
  }
  if (config.contact.contactMethods.length === 0 && !config.contact.phone && !config.contact.email) {
    warnings.push('No contact methods added');
  }
  if (Object.keys(config.contact.socialMedia).length === 0) {
    warnings.push('No social media links added');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Prüft ob eine Configuration publizierbar ist
 */
export function canPublish(config: Configuration): boolean {
  const validation = validateConfiguration(config);
  return validation.isValid;
}

/**
 * Gibt den Completion-Prozentsatz einer Configuration zurück
 */
export function getCompletionPercentage(config: Configuration): number {
  let completed = 0;
  const total = 10;

  if (config.business.name) completed++;
  if (config.business.type) completed++;
  if (config.design.template) completed++;
  if (config.business.location) completed++;
  if (config.content.menuItems.length > 0) completed++;
  if (Object.keys(config.content.openingHours).length > 0) completed++;
  if (config.contact.contactMethods.length > 0 || config.contact.phone || config.contact.email) completed++;
  if (Object.keys(config.contact.socialMedia).length > 0) completed++;
  if (config.business.slogan) completed++;
  if (config.business.uniqueDescription) completed++;

  return Math.round((completed / total) * 100);
}

// ============================================
// EXPORTS
// ============================================

export {
  DEFAULT_BUSINESS_INFO,
  DEFAULT_DESIGN_CONFIG,
  DEFAULT_CONTENT_DATA,
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_CONTACT_INFO,
  DEFAULT_PUBLISHING_INFO,
  DEFAULT_PAGE_MANAGEMENT,
  DEFAULT_PAYMENT_AND_OFFERS,
};

export default normalizeConfig;

