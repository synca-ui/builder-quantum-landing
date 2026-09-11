import { Helmet } from "react-helmet-async";
import type { RestaurantSchemaConfig } from "@shared/types/schema";
import { generateRestaurantSchema } from "@shared/schemaGenerator";

interface RestaurantJsonLdProps {
  /**
   * Die veröffentlichte Seite - flach, wie GET /api/sites/:subdomain und die
   * Edge-Injection sie liefern, oder normalisiert (business/contact/content).
   */
  config: any;
}

function text(wert: unknown): string | undefined {
  return typeof wert === "string" && wert.trim() ? wert.trim() : undefined;
}

/** Veröffentlichte Seite → Eingabe des Schema-Generators. Ohne Betriebsnamen kein Schema. */
export function schemaConfigAusSite(
  config: any,
): RestaurantSchemaConfig | null {
  if (!config || typeof config !== "object") return null;

  const business = config.business ?? {};
  const contact = config.contact ?? {};
  const content = config.content ?? {};

  const businessName = text(business.name) ?? text(config.businessName);
  if (!businessName) return null;

  const social = contact.socialMedia ?? config.socialMedia ?? {};
  const logo = business.logo ?? config.logo;
  const location = text(business.location) ?? text(config.location);
  const menuItems = content.menuItems ?? config.menuItems;

  return {
    businessName,
    businessType: text(business.type) ?? text(config.businessType),
    description:
      text(business.uniqueDescription) ??
      text(config.uniqueDescription) ??
      text(business.slogan) ??
      text(config.slogan),
    location,
    address: location,
    // contactMethods sind Objekte ({ type, value }); Telefon und E-Mail stehen daneben.
    phone: text(contact.phone) ?? text(config.phone),
    email: text(contact.email) ?? text(config.email),
    website: text(config.publishing?.publishedUrl) ?? text(config.publishedUrl),
    logo: text(typeof logo === "string" ? logo : logo?.url),
    openingHours: content.openingHours ?? config.openingHours,
    menuItems: (Array.isArray(menuItems) ? menuItems : []).map((item: any) => ({
      id: item?.id,
      name: item?.name,
      description: item?.description,
      price: item?.price,
      category: item?.category,
      image: item?.image || item?.imageUrl,
    })),
    socialLinks: {
      facebook: text(social.facebook),
      instagram: text(social.instagram),
      twitter: text(social.twitter),
      linkedin: text(social.linkedin),
    },
  };
}

/** Schreibt das Restaurant-Schema (JSON-LD) in den Kopf der Seite. */
export function RestaurantJsonLd({ config }: RestaurantJsonLdProps) {
  const schemaConfig = schemaConfigAusSite(config);
  if (!schemaConfig) return null;

  let json: string;
  try {
    // "<" escapen: Betriebsname und Karte stammen aus fremdem HTML, ein
    // "</script>" darin würde den Block sonst vorzeitig beenden.
    json = JSON.stringify(generateRestaurantSchema(schemaConfig)).replace(
      /</g,
      "\\u003c",
    );
  } catch (error) {
    console.warn("Failed to generate restaurant schema:", error);
    return null;
  }

  return (
    <Helmet>
      <script type="application/ld+json">{json}</script>
    </Helmet>
  );
}

export default RestaurantJsonLd;
