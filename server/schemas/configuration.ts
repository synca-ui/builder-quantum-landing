/**
 * Server-side Configuration Validation Schemas
 * STRICT validation - no passthrough, rejects unknown fields
 */

import { z } from "zod";

// Business Info Schema
export const BusinessInfoSchema = z.object({
  name: z.string().min(1, "Business name is required").max(100),
  type: z.string().min(1, "Business type is required"),
  location: z.string().optional(),
  slogan: z.string().optional(),
  uniqueDescription: z.string().optional(),
  domain: z
    .object({
      hasDomain: z.boolean().default(false),
      domainName: z.string().optional(),
      selectedDomain: z.string().optional(),
    })
    .optional(),
});

// Design Config Schema
export const DesignConfigSchema = z.object({
  template: z.string().min(1, "Template is required"),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color format"),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Invalid hex color format"),
  fontFamily: z
    .enum(["sans-serif", "serif", "monospace"])
    .default("sans-serif"),
  fontColor: z.string().optional(),
  priceColor: z.string().optional(),
  headerFontColor: z.string().optional(),
  headerFontSize: z.string().optional(),
  headerBackgroundColor: z.string().optional(),
  fontSize: z.enum(["small", "medium", "large"]).optional(),
  backgroundColor: z.string().optional(),
  backgroundImage: z.string().nullable().optional(),
  backgroundType: z.enum(["color", "image"]).optional(),
  logo: z.string().optional(),
});

// Menu Item Schema
export const MenuItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.coerce.number().positive().optional(),
  imageUrl: z.string().url().optional().or(z.string().length(0)),
  emoji: z.string().optional(),
  available: z.boolean().optional().default(true),
  category: z.string().optional(),
  isHighlight: z.boolean().optional(),
});

// Gallery Image Schema
export const GalleryImageSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  title: z.string().optional(),
  alt: z.string().optional(),
});

// Opening Hours Schema
export const OpeningHoursSchema = z.record(
  z.string(),
  z.object({
    open: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
    close: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
    closed: z.boolean(),
  }),
);

// Content Data Schema
export const ContentDataSchema = z.object({
  menuItems: z.array(MenuItemSchema).default([]),
  gallery: z.array(GalleryImageSchema).default([]),
  openingHours: OpeningHoursSchema.default({}),
  homepageDishImageVisibility: z.string().optional(),
  categories: z.array(z.string()).default([]),
});

// Feature Flags Schema
export const FeatureFlagsSchema = z.object({
  reservationsEnabled: z.boolean().default(false),
  maxGuests: z.number().positive().default(10),
  notificationMethod: z.string().default("email"),
  reservationButtonColor: z.string().optional(),
  reservationButtonTextColor: z.string().optional(),
  reservationButtonShape: z.string().optional(),
  onlineOrderingEnabled: z.boolean().default(false),
  onlineStoreEnabled: z.boolean().default(false),
  teamAreaEnabled: z.boolean().default(false),
});

// Contact Info Schema
export const ContactInfoSchema = z.object({
  contactMethods: z.array(z.string()).default([]),
  socialMedia: z.record(z.string()).default({}),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

// Publishing Info Schema
export const PublishingInfoSchema = z.object({
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  publishedUrl: z.string().optional(),
  previewUrl: z.string().optional(),
  publishedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

// Page Management Schema
export const PageManagementSchema = z.object({
  selectedPages: z.array(z.string()).default(["home"]),
  customPages: z.array(z.string()).default([]),
});

// Payment and Offers Schema
export const PaymentAndOffersSchema = z.object({
  paymentOptions: z.array(z.string()).optional(),
  offers: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        description: z.string().optional(),
        discount: z.number().optional(),
      }),
    )
    .optional(),
  offerBanner: z
    .object({
      enabled: z.boolean(),
      text: z.string().optional(),
      backgroundColor: z.string().optional(),
    })
    .optional(),
});

// Integration Config Schema (flexible, no strict validation)
export const IntegrationConfigSchema = z.record(z.any());

/**
 * STRICT Configuration Schema - NEW DOMAIN-DRIVEN STRUCTURE
 * Rejects any unknown fields
 */
export const ConfigurationSchema = z
  .object({
    id: z.string().uuid().optional(),
    userId: z.string().default("anonymous"),
    business: BusinessInfoSchema,
    design: DesignConfigSchema,
    content: ContentDataSchema,
    features: FeatureFlagsSchema,
    contact: ContactInfoSchema,
    pages: PageManagementSchema,
    payments: PaymentAndOffersSchema,
    integrations: IntegrationConfigSchema.optional(),
    // Publishing-related fields (flattened for backward compatibility)
    status: z.enum(["draft", "published", "archived"]).optional().default("draft"),
    publishedUrl: z.string().optional(),
    previewUrl: z.string().optional(),
    publishing: PublishingInfoSchema.optional(),
  })
  .strict();

/**
 * LEGACY Configuration Schema - FOR BACKWARD COMPATIBILITY
 * Accepts old flat structure, BUT IS STRICT (no passthrough)
 */
export const LegacyConfigurationSchema = z
  .object({
    id: z.string().optional(),
    userId: z.string().default("anonymous"),
    businessName: z.string().default(""),
    businessType: z.string().default(""),
    location: z.string().optional(),
    slogan: z.string().optional(),
    uniqueDescription: z.string().optional(),
    template: z.string().default(""),
    homepageDishImageVisibility: z.string().optional(),
    primaryColor: z.string().default("#111827"),
    secondaryColor: z.string().default("#6B7280"),
    fontFamily: z.string().default("sans-serif"),
    selectedPages: z.array(z.string()).default([]),
    customPages: z.array(z.string()).default([]),
    openingHours: z.record(z.any()).default({}),
    menuItems: z.array(z.any()).default([]),
    reservationsEnabled: z.coerce.boolean().default(false),
    maxGuests: z.coerce.number().default(10),
    notificationMethod: z.string().default("email"),
    contactMethods: z.array(z.any()).default([]),
    socialMedia: z.record(z.string()).default({}),
    gallery: z.array(z.any()).default([]),
    onlineOrdering: z.coerce.boolean().default(false),
    onlineStore: z.coerce.boolean().default(false),
    teamArea: z.coerce.boolean().default(false),
    hasDomain: z.coerce.boolean().default(false),
    domainName: z.string().optional(),
    selectedDomain: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    status: z.enum(["draft", "published", "archived"]).default("draft"),
    publishedUrl: z.string().optional(),
    previewUrl: z.string().optional(),
    paymentOptions: z.array(z.string()).default([]),
    offers: z.array(z.any()).default([]),
    offerBanner: z.any().optional(),
    businessId: z.string().optional().nullable(),
    selectedTemplate: z.string().optional().nullable(),
    backgroundColor: z.string().optional(),
    backgroundType: z.enum(["color", "image"]).optional(),
    fontColor: z.string().optional(),
    priceColor: z.string().optional(),
    headerFontColor: z.string().optional(),
    headerFontSize: z.string().optional(),
    headerBackgroundColor: z.string().optional(),
    reservationButtonColor: z.string().optional(),
    reservationButtonTextColor: z.string().optional(),
    reservationButtonShape: z.string().optional(),
  })
  .strict();

export type Configuration = z.infer<typeof ConfigurationSchema>;
export type LegacyConfiguration = z.infer<typeof LegacyConfigurationSchema>;

/**
 * Validation helpers
 */
export function validateConfiguration(data: unknown): Configuration {
  try {
    return ConfigurationSchema.parse(data);
  } catch (error) {
    throw new Error(
      `Configuration validation failed: ${error instanceof z.ZodError ? error.message : String(error)}`,
    );
  }
}

export function validateLegacyConfiguration(
  data: unknown,
): LegacyConfiguration {
  try {
    return LegacyConfigurationSchema.parse(data);
  } catch (error) {
    throw new Error(
      `Legacy configuration validation failed: ${error instanceof z.ZodError ? error.message : String(error)}`,
    );
  }
}

export function safeParse(data: unknown) {
  return ConfigurationSchema.safeParse(data);
}

