/**
 * Zod Validation Schemas for Domain Types
 * Ensures data integrity at runtime
 */

import { z } from "zod";
import type {
  BusinessInfo,
  DesignConfig,
  ContentData,
  FeatureFlags,
  ContactInfo,
  PublishingInfo,
  PageManagement,
  PaymentAndOffers,
  Configuration,
} from "./domain";

// Business Info Schema
export const BusinessInfoSchema = z.object({
  name: z.string().min(1, "Business name is required").max(100),
  type: z.string().min(1),
  location: z.string().optional(),
  slogan: z.string().optional(),
  uniqueDescription: z.string().optional(),
  domain: z
    .object({
      hasDomain: z.boolean(),
      domainName: z.string().optional(),
      selectedDomain: z.string().optional(),
    })
    .optional(),
});

// Design Config Schema
export const DesignConfigSchema = z.object({
  template: z.string().min(1, "Template is required"),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color"),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color"),
  fontFamily: z.enum(["sans-serif", "serif", "monospace"]),
  fontColor: z.string().optional(),
  fontSize: z.enum(["small", "medium", "large"]).optional(),
  backgroundColor: z.string().optional(),
  backgroundImage: z.string().nullable().optional(),
  backgroundType: z.enum(["color", "image"]).optional(),
});

// Menu Item Schema
export const MenuItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.union([z.number(), z.string()]).optional(),
  imageUrl: z.string().url().optional(),
  emoji: z.string().optional(),
  available: z.boolean().optional().default(true),
  category: z.string().optional(),
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
    open: z.string().regex(/^\d{2}:\d{2}$/),
    close: z.string().regex(/^\d{2}:\d{2}$/),
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
  maxGuests: z.number().positive().optional(),
  notificationMethod: z.string().optional(),
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
  publishedUrl: z.string().url().optional(),
  previewUrl: z.string().url().optional(),
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

// Complete Configuration Schema (STRICT - no passthrough!)
export const ConfigurationSchema = z
  .object({
    id: z.string().uuid().optional(),
    userId: z.string().min(1),
    business: BusinessInfoSchema,
    design: DesignConfigSchema,
    content: ContentDataSchema,
    features: FeatureFlagsSchema,
    contact: ContactInfoSchema,
    publishing: PublishingInfoSchema,
    pages: PageManagementSchema,
    payments: PaymentAndOffersSchema,
    integrations: z.record(z.any()).optional(),
  })
  .strict(); // 🔥 NO PASSTHROUGH! Rejects unknown fields

// Type inference from Zod
export type BusinessInfoType = z.infer<typeof BusinessInfoSchema>;
export type DesignConfigType = z.infer<typeof DesignConfigSchema>;
export type ContentDataType = z.infer<typeof ContentDataSchema>;
export type FeatureFlagsType = z.infer<typeof FeatureFlagsSchema>;
export type ContactInfoType = z.infer<typeof ContactInfoSchema>;
export type PublishingInfoType = z.infer<typeof PublishingInfoSchema>;
export type PageManagementType = z.infer<typeof PageManagementSchema>;
export type PaymentAndOffersType = z.infer<typeof PaymentAndOffersSchema>;
export type ConfigurationType = z.infer<typeof ConfigurationSchema>;

/**
 * Validation helper function
 */
export function validateConfiguration(data: unknown): Configuration {
  const validatedData = ConfigurationSchema.parse(data);
  return validatedData as unknown as Configuration;
}

/**
 * Safe validation (returns errors instead of throwing)
 */
export function validateConfigurationSafe(data: unknown) {
  return ConfigurationSchema.safeParse(data);
}
