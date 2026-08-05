/**
 * Business Service
 *
 * Handles multi-tenancy setup with transactional consistency:
 * - Ensures User -> Business -> BusinessMember link
 * - Prevents orphaned business records
 * - Provides atomic operations for configuration publish flows
 */

import prisma from "../db/prisma";

export interface BusinessSetupResult {
  userId: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  isMembershipNew: boolean;
}

/**
 * Ensures a User has a Business with proper BusinessMember linkage.
 *
 * Flow:
 * 1. Verify User exists in Prisma (already done by auth middleware)
 * 2. Upsert Business using slug (create if doesn't exist, update if does)
 * 3. Create BusinessMember with OWNER role if user-business pairing is new
 * 4. All in a single transaction for atomicity
 *
 * @param userId The Prisma User ID (from req.user.id)
 * @param businessName The business name to use for slug generation
 * @param templateId Optional template ID to link
 * @param designTokens Optional design system tokens
 * @returns BusinessSetupResult with businessId and membership status
 * @throws Error if transaction fails
 */
export async function ensureUserBusiness(
  userId: string,
  businessName: string,
  templateId?: string,
  designTokens?: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
  },
): Promise<BusinessSetupResult> {
  const businessSlug = generateBusinessSlug(businessName);

  return await (prisma as any).$transaction(async (tx: any) => {
    try {
      console.log("[BusinessService] Starting transaction:", {
        userId,
        businessName,
        businessSlug,
        hasTemplate: !!templateId,
      });

      // Step 1: Verify user exists
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // Step 1b: Vorlage nur verknüpfen, wenn es sie wirklich gibt.
      //
      // `templateId` ist ein Fremdschlüssel auf `Template` (schema.prisma:59).
      // Zeigt er auf eine Vorlage, die in dieser Datenbank nicht existiert,
      // bricht der Insert mit P2003 ab – und wir stünden wieder genau da, wo
      // wir herkommen: ohne Betrieb, ohne Mitgliedschaft. `Template.id` hat
      // keinen Vorgabewert, die Zeilen entstehen ausschließlich über
      // prisma/seed.ts; ob das je gelaufen ist, weiß dieser Code nicht.
      //
      // Die Verknüpfung ist Beiwerk – Farben und Schrift stehen ohnehin direkt
      // am Betrieb. Sie darf das Anlegen nicht gefährden: lieber ein Betrieb
      // ohne Vorlagenbezug als gar keiner.
      let vorlagenBezug: string | undefined;
      if (templateId) {
        const vorlage = await tx.template.findUnique({
          where: { id: templateId },
          select: { id: true },
        });
        if (vorlage) {
          vorlagenBezug = vorlage.id;
        } else {
          console.warn(
            "[BusinessService] Vorlage unbekannt, Betrieb wird ohne Bezug angelegt:",
            { templateId, businessSlug },
          );
        }
      }

      // Step 2: Upsert Business
      //
      // Hier stand bis eben zusätzlich `template: templateId || "minimalist"`.
      // `template` ist im Schema aber KEIN Textfeld, sondern die Relation
      // (`template Template? @relation(fields: [templateId], ...)`). Prisma
      // nimmt dort nur ein verschachteltes Schreibobjekt entgegen, niemals eine
      // Zeichenkette – der Aufruf ist deshalb bei JEDER Veröffentlichung
      // gescheitert, still verschluckt vom Aufrufer. Ergebnis: 0 Zeilen in
      // Business. Der Fremdschlüssel `templateId` erledigt dieselbe Aufgabe.
      //
      // `undefined` bei templateId heißt für Prisma "Feld nicht anfassen" –
      // im update-Zweig bleibt ein bereits gesetzter Bezug damit erhalten,
      // statt bei unbekannter Vorlage gelöscht zu werden.
      // MANDANTENTRENNUNG — hier lag eine Lücke, die erst durch die Reparatur
      // oben erreichbar wurde.
      //
      // Der frühere Upsert traf den Betrieb über den GLOBALEN slug und legte
      // danach bedingungslos eine OWNER-Mitgliedschaft an (Step 4). Zwei Wirte mit
      // demselben Betriebsnamen ergeben denselben slug — der zweite wäre damit
      // Mitinhaber des ersten geworden. Schlimmer noch: Der update-Zweig hätte
      // Name, Farben und Vorlage des ersten mit den Daten des zweiten
      // überschrieben. Solange nie ein Betrieb entstand, konnte das nicht
      // auffallen; ab jetzt schon.
      //
      // Deshalb drei getrennte Fälle statt eines blinden Upserts.
      const gleicheAdresse = await tx.business.findUnique({
        where: { slug: businessSlug },
        select: { id: true },
      });

      const gemeinsameFelder = {
        name: businessName,
        templateId: vorlagenBezug,
        primaryColor: designTokens?.primaryColor || "#000000",
        secondaryColor: designTokens?.secondaryColor || "#ffffff",
        fontFamily: designTokens?.fontFamily || "sans",
      };

      let business: { id: string; name: string; slug: string };

      if (!gleicheAdresse) {
        // Fall 1: Adresse frei — Betrieb entsteht neu.
        business = await tx.business.create({
          data: { slug: businessSlug, ...gemeinsameFelder, status: "DRAFT" },
          select: { id: true, name: true, slug: true },
        });
      } else {
        const eigene = await tx.businessMember.findUnique({
          where: { userId_businessId: { userId, businessId: gleicheAdresse.id } },
          select: { businessId: true },
        });

        if (eigene) {
          // Fall 2: eigener Betrieb, erneut veröffentlicht — aktualisieren.
          business = await tx.business.update({
            where: { id: gleicheAdresse.id },
            data: { ...gemeinsameFelder, updatedAt: new Date() },
            select: { id: true, name: true, slug: true },
          });
        } else {
          // Fall 3: Die Adresse gehört einem FREMDEN Betrieb. Dann bekommt dieser
          // hier eine freie, statt den fremden zu übernehmen. Der slug ist nur der
          // Schlüssel des Betriebsdatensatzes — die öffentliche Subdomain der
          // Web-App vergibt webapps.ts getrennt davon.
          let kandidat: string | null = null;
          for (let i = 2; i <= 21; i++) {
            const versuch = `${businessSlug}-${i}`;
            const belegt = await tx.business.findUnique({
              where: { slug: versuch },
              select: { id: true },
            });
            if (!belegt) {
              kandidat = versuch;
              break;
            }
          }
          if (!kandidat) {
            throw new Error(
              `Keine freie Betriebsadresse für "${businessSlug}" gefunden (20 Versuche)`,
            );
          }
          console.warn(
            "[BusinessService] Betriebsadresse gehört einem anderen Betrieb, weiche aus:",
            { gewuenscht: businessSlug, verwendet: kandidat },
          );
          business = await tx.business.create({
            data: { slug: kandidat, ...gemeinsameFelder, status: "DRAFT" },
            select: { id: true, name: true, slug: true },
          });
        }
      }

      // Step 3: Check if user-business membership already exists
      const existingMembership = await tx.businessMember.findUnique({
        where: {
          userId_businessId: {
            userId,
            businessId: business.id,
          },
        },
      });

      let isMembershipNew = false;

      // Step 4: Create membership if it doesn't exist
      if (!existingMembership) {
        await tx.businessMember.create({
          data: {
            userId,
            businessId: business.id,
            role: "OWNER", // First user to link is always the owner
          },
        });
        isMembershipNew = true;
      }

      console.log("[BusinessService] Transaction completed:", {
        businessId: business.id,
        isMembershipNew,
      });

      return {
        userId,
        businessId: business.id,
        businessName: business.name,
        businessSlug: business.slug,
        isMembershipNew,
      };
    } catch (error) {
      console.error("[BusinessService] Transaction failed:", {
        userId,
        businessSlug,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });
}

/**
 * Generate a URL-safe slug from business name
 * @param businessName The business name
 * @returns A slug suitable for use as a database slug
 */
export function generateBusinessSlug(businessName: string): string {
  return (
    businessName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "business"
  );
}

/**
 * Link a Configuration to a Business (via the Configuration.userId relationship)
 * This ensures configurations are associated with a business for publish operations
 *
 * @param businessId The Business ID
 * @param configurationId The Configuration ID
 * @returns Promise that resolves when link is established
 */
export async function linkConfigurationToBusiness(
  businessId: string,
  configurationId: string,
): Promise<void> {
  try {
    // Note: Configuration has userId field, so the link is implicit via User -> Business -> BusinessMember
    // This function is for logging/auditing purposes
    console.log("[BusinessService] Configuration linked to business:", {
      businessId,
      configurationId,
    });
  } catch (error) {
    console.error("[BusinessService] Error linking configuration:", error);
    throw error;
  }
}

/**
 * Get user's primary business (the first/main business they own)
 * @param userId The User ID
 * @returns Business or null if user has no businesses
 */
export async function getUserPrimaryBusiness(userId: string) {
  try {
    const membership = await (prisma as any).businessMember.findFirst({
      where: {
        userId,
        role: "OWNER",
      },
      include: {
        business: true,
      },
      orderBy: {
        business: {
          createdAt: "asc",
        },
      },
    });

    return membership?.business || null;
  } catch (error) {
    console.error(
      "[BusinessService] Error getting user primary business:",
      error,
    );
    return null;
  }
}

/**
 * Get all businesses for a user
 * @param userId The User ID
 * @returns Array of businesses the user has access to
 */
export async function getUserBusinesses(userId: string) {
  try {
    const memberships = await (prisma as any).businessMember.findMany({
      where: { userId },
      include: { business: true },
    });

    return memberships.map((m: any) => m.business);
  } catch (error) {
    console.error("[BusinessService] Error getting user businesses:", error);
    return [];
  }
}

export default {
  ensureUserBusiness,
  generateBusinessSlug,
  linkConfigurationToBusiness,
  getUserPrimaryBusiness,
  getUserBusinesses,
};
