/**
 * Server-side Configuration Validation Schemas
 * STRICT validation - no passthrough, rejects unknown fields
 */

import { z } from "zod";
// DAYS ist die kanonische Wochentagsliste - jetzt in packages/core/src/types
// definiert (die gemeinsame Sprache von Web, Server und App), vorher in
// shared/suggestedConfig.ts und von dort re-exportiert. Hier wiederverwendet
// statt ein zweites Mal geschrieben (Grundsatz: erweitern, nicht duplizieren) -
// siehe StrictOpeningHoursSchema unten.
import { DAYS } from "@maitr/core/types";

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
  /**
   * Allergen-Kuerzel und Ernaehrungs-Labels am Gericht (A1.3).
   *
   * Ohne diese beiden Zeilen streift Zod sie beim Speichern still ab — die
   * Erkennung liest sie aus der Karte, und beim naechsten Laden sind sie weg.
   * Bei einer Kennzeichnungspflicht ist genau das der teuerste Verlust.
   */
  allergens: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional(),
  /** Aufpreise und Groessen, die zu diesem Gericht gehoeren (A1.2). */
  extras: z
    .array(
      z.object({
        name: z.string(),
        price: z.string().optional(),
        allergens: z.array(z.string()).optional(),
      }),
    )
    .optional(),
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

/**
 * HH:MM mit echten Grenzen (Stunde 00-23, Minute 00-59) - im Unterschied zur
 * Ziffernform-Regex oben, die z. B. "99:99" durchlässt. Nur für
 * StrictOpeningHoursSchema unten.
 */
const strictOpeningTimeSchema = z
  .string()
  .regex(
    /^([01]\d|2[0-3]):[0-5]\d$/,
    "Uhrzeit muss als HH:MM mit gültiger Stunde (00-23) und Minute (00-59) vorliegen",
  );

/**
 * Ein Tageseintrag ist entweder geschlossen (keine Uhrzeiten - "sonntags
 * geschlossen" braucht kein erfundenes `open`/`close`, Grundsatz: lieber eine
 * Lücke als eine erfundene Angabe) oder geöffnet mit beiden Uhrzeiten. Dieselbe
 * Unterscheidung beschreibt `DayHours` in packages/core/src/types/index.ts -
 * hier als `z.discriminatedUnion("closed", …)` die geprüfte Fassung davon.
 *
 * Zod streift bei z.object() unbekannte Schlüssel im Vorgabemodus ("strip")
 * von selbst ab (kein `.strict()`, kein `.passthrough()` hier) - eine Altzeile
 * wie {closed:true, open:"00:00", close:"00:00"} wird beim Lesen also nicht
 * verworfen, sondern auf {closed:true} zurückgeschnitten. Nachgeprüft statt nur
 * angenommen: `StrictClosedDaySchema.parse({closed:true, open:"00:00",
 * close:"00:00"})` liefert `{closed:true}`, keine offenen Uhrzeiten.
 */
const StrictClosedDaySchema = z.object({ closed: z.literal(true) });
const StrictOpenDaySchema = z.object({
  closed: z.literal(false),
  open: strictOpeningTimeSchema,
  close: strictOpeningTimeSchema,
});
const StrictDayHoursSchema = z.discriminatedUnion("closed", [
  StrictClosedDaySchema,
  StrictOpenDaySchema,
]);

/**
 * Warum es hier zwei Öffnungszeiten-Schemata gibt, und warum OpeningHoursSchema
 * oben absichtlich lose bleibt:
 *
 * OpeningHoursSchema hängt an ContentDataSchema (unten) und damit am
 * Konfigurator, der Altbestand in der Datenbank hat. Eine Verschärfung dort
 * könnte das Speichern bestehender Konfigurationen abweisen. OpeningHoursSchema
 * bleibt deshalb, wie es war: Schlüssel beliebig (jeder String, in beliebiger
 * Zahl und Länge), Uhrzeit nur als Ziffernform geprüft.
 *
 * StrictOpeningHoursSchema hier daneben gilt für Business.openingHours - die
 * Wahrheit für die Maitr-Oberflächen (App und das öffentliche Gastprofil
 * `GET /venues/:slug/public`, das OHNE Anmeldung ausgeliefert wird; siehe
 * `toApiVenue` in server/maitr/routes.ts). Für einen Wert, der ungeprüft an
 * einen zahlenden Gast geht, reicht "sieht aus wie eine Uhrzeit" nicht - er
 * muss wirklich eine sein.
 *
 * Gemessen wurde: ohne diese Schranke nahm PATCH /venues/:venueId 2000
 * beliebig benannte Schlüssel à 200 Zeichen an (509 023 Byte in der Zeile)
 * und lieferte sie öffentlich, unangemeldet, wieder aus; dazu Tage wie
 * "Montag" oder "friday " (kein Leser im Repo erkennt sie) und Uhrzeiten wie
 * {"open":"99:99","close":"88:88"}.
 *
 * Baut auf denselben Bausteinen wie OpeningHoursSchema auf, verschärft aber:
 * - Schlüssel NUR aus DAYS (@maitr/core/types) - eine Allowlist über z.enum,
 *   keine Regex. Daraus folgt zugleich die Obergrenze von sieben Einträgen:
 *   mehr als sieben verschiedene Wochentage gibt es nicht, und ein
 *   JS-Objekt kann denselben Schlüssel nicht zweimal tragen.
 * - Uhrzeit wirklich gültig (strictOpeningTimeSchema): Stunde 00-23,
 *   Minute 00-59, statt nur Ziffernform.
 * - Der Tageseintrag folgt StrictDayHoursSchema oben (geschlossen ohne
 *   Uhrzeiten, geöffnet mit beiden).
 *
 * KEINE Reihenfolge-Prüfung (open < close) mehr: Ein Betrieb mit Sperrstunde
 * nach Mitternacht öffnet z. B. freitags 18:00 und schließt 01:00 - "open"
 * liegt dann als Uhrzeit NACH "close", obwohl die Zeitspanne richtig ist. Eine
 * Regel, die open < close verlangt, kann 20:00-02:00 nicht von einem
 * Tippfehler unterscheiden und weist damit jede Bar, jede Küche mit
 * Sperrstunde nach Mitternacht und jeden 24-Stunden-Betrieb (00:00-00:00) ab -
 * das ist keine Härtung, das ist eine Fachlücke, und sie richtet mehr Schaden
 * an als die Tippfehler, die sie fangen würde.
 */
export const StrictOpeningHoursSchema = z.record(z.enum(DAYS), StrictDayHoursSchema);

// Content Data Schema
export const ContentDataSchema = z.object({
  menuItems: z.array(MenuItemSchema).default([]),
  /**
   * Bedeutung der Allergen-Kuerzel, wie die Karte des Betriebs sie angibt.
   * Muss mitgespeichert werden: Die Zuordnung ist je Betrieb verschieden,
   * eine feste Tabelle waere falsch statt unvollstaendig.
   */
  allergenLegend: z.record(z.string()).optional(),
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
  reservationEmail: z.string().optional(),
  reservationFormStyle: z.enum(["classic", "modern"]).optional().default("classic"),
  reservationNotificationEmail: z.string().optional(),
  reservationTimeSlotInterval: z.number().optional().default(30),
  reservationDaysAhead: z.number().optional().default(7),
  timeSlots: z.array(z.string()).optional(),
  onlineOrderingEnabled: z.boolean().default(false),
  onlineStoreEnabled: z.boolean().default(false),
  teamAreaEnabled: z.boolean().default(false),
});

// Contact Info Schema
export const ContactInfoSchema = z.object({
  contactMethods: z
    .array(
      z.union([
        z.string(), // Legacy support
        z.object({
          type: z.string(),
          value: z.string(),
        }),
      ]),
    )
    .default([]),
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
//
// Achtung, Form folgt dem Konfigurator: Der Angebote-Schritt
// (FeatureConfigStep → OffersStep) erzeugt {id, name, price, image,
// description}. Das frühere Schema verlangte stattdessen ein Pflichtfeld
// "title" — jede Konfiguration mit auch nur EINEM Angebot fiel beim
// Speichern mit 400 durch, und weil der Fehler clientseitig nur geloggt
// wird, merkte es niemand.
export const PaymentAndOffersSchema = z.object({
  paymentOptions: z.array(z.string()).optional(),
  offers: z
    .array(
      z.object({
        id: z.string(),
        // Konfigurator-Form
        name: z.string().optional(),
        price: z.union([z.string(), z.number()]).optional(),
        image: z.string().nullable().optional(),
        // Alt-/Zusatzfelder
        title: z.string().optional(),
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
      textColor: z.string().optional(),
      buttonColor: z.string().optional(),
      /** Bannergröße auf der Startseite: small | medium | large. */
      size: z.string().optional(),
    })
    .optional(),
  /** Schalter "Angebote-Tab in der Navigation zeigen" (OffersStep). */
  offerPageEnabled: z.boolean().optional(),
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
    status: z
      .enum(["draft", "published", "archived"])
      .optional()
      .default("draft"),
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
    contactMethods: z
      .array(
        z.union([
          z.string(),
          z.object({
            type: z.string(),
            value: z.string(),
          }),
        ]),
      )
      .default([]),
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
    reservationEmail: z.string().optional(),
    reservationFormStyle: z.string().optional().default("classic"),
    reservationNotificationEmail: z.string().optional(),
    reservationTimeSlotInterval: z.coerce.number().optional().default(30),
    reservationDaysAhead: z.coerce.number().optional().default(7),
    timeSlots: z.array(z.string()).optional(),
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
