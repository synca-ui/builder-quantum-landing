/**
 * Business Service
 *
 * Handles multi-tenancy setup with transactional consistency:
 * - Ensures User -> Business -> BusinessMember link
 * - Prevents orphaned business records
 * - Provides atomic operations for configuration publish flows
 */

import prisma from "../db/prisma";
import { nextSubdomainCandidate, suggestSubdomain } from "../../shared/subdomain";

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
  // Nur zum Wiederfinden von Zeilen, die vor der Vereinheitlichung entstanden
  // sind - siehe legacyBusinessSlug. Bei den meisten Namen identisch, dann
  // entfällt die zusätzliche Abfrage.
  const alteAdresse = legacyBusinessSlug(businessName);

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
      let gleicheAdresse = await tx.business.findUnique({
        where: { slug: businessSlug },
        select: { id: true },
      });

      // ALTBESTAND. Die Adresse wird hier bei jedem Veröffentlichen neu
      // gerechnet und als Schlüssel benutzt. Wer seinen Betrieb noch unter der
      // alten Regel angelegt hat, würde sich unter der neuen Adresse nicht
      // wiederfinden - und bekäme einen zweiten Betrieb statt einer
      // Aktualisierung. Deshalb: nichts unter der neuen Adresse gefunden und
      // die alte Adresse lautete anders? Dann dort nachsehen.
      //
      // Bewusst nur für den EIGENEN Betrieb: Trägt eine fremde Zeile die alte
      // Adresse, bleibt sie unangetastet, und dieser Aufruf legt unter der neuen
      // Adresse an. Die Altzeile behält ihre Adresse - eine Umbenennung wäre der
      // gefährlichere Eingriff (öffentliche Route GET /venues/:slug/public).
      // Zuerst klären, ob die Zeile unter der NEUEN Adresse überhaupt mir gehört.
      // Davon hängt ab, ob die alte Adresse noch nachgeschlagen werden muss.
      let neueAdresseIstMeine = false;
      if (gleicheAdresse) {
        const meine = await tx.businessMember.findUnique({
          where: { userId_businessId: { userId, businessId: gleicheAdresse.id } },
          select: { businessId: true },
        });
        neueAdresseIstMeine = Boolean(meine);
      }

      // Die alte Adresse wird IMMER nachgeschlagen, solange sie abweicht und
      // unter der neuen nicht schon mein eigener Betrieb liegt.
      //
      // Hier lag ein Loch: Die Prüfung lief ursprünglich nur, wenn unter der
      // neuen Adresse GAR NICHTS lag. Belegt eine FREMDE Zeile die neue Adresse,
      // wurde die eigene Altzeile nie gesucht - der Aufruf fiel direkt ins
      // Ausweichen und legte einen zweiten Betrieb an, obwohl der eigene unter
      // der alten Adresse danebenstand. Genau der Fall, den dieser Rückfall
      // verhindern soll.
      let altzeileIstMeine = false;
      if (!neueAdresseIstMeine && alteAdresse !== businessSlug) {
        const alt = await tx.business.findUnique({
          where: { slug: alteAdresse },
          select: { id: true },
        });
        if (alt) {
          const meine = await tx.businessMember.findUnique({
            where: { userId_businessId: { userId, businessId: alt.id } },
            select: { businessId: true },
          });
          if (meine) {
            console.log(
              "[BusinessService] Betrieb unter alter Adresse gefunden, behalte sie:",
              { alt: alteAdresse, neu: businessSlug },
            );
            gleicheAdresse = alt;
            altzeileIstMeine = true;
          }
        }
      }

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
        // Beide Fälle sind oben bereits geklärt, ohne dritte Abfrage:
        // `altzeileIstMeine` gilt, wenn die Altzeile übernommen wurde (die
        // Mitgliedschaft war die Bedingung dafür), `neueAdresseIstMeine` für die
        // Zeile unter der neuen Adresse. Eine erneute Abfrage könnte hier nur
        // dasselbe Ergebnis liefern - oder, schlimmer, ein abweichendes, wenn
        // jemand die Bedingungen später auseinanderlaufen lässt.
        const eigene = altzeileIstMeine || neueAdresseIstMeine;

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
          //
          // Die Ausweichkandidaten kommen aus derselben gemeinsamen Quelle wie
          // die Adresse selbst. `${slug}-${i}` von Hand ergäbe bei einem langen
          // Namen (die neue Regel lässt 63 Zeichen zu, die alte schnitt bei 50)
          // eine überlange Adresse; nextSubdomainCandidate kürzt dafür den
          // Stamm und nicht den Zähler. Für kurze Namen liefert es dieselben
          // Zeichenketten wie vorher ("zur-post-2", "zur-post-3", ...).
          let kandidat: string | null = null;
          for (let i = 2; i <= 21; i++) {
            const versuch = nextSubdomainCandidate(businessSlug, i - 1);
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
 * Adresse eines Betriebs aus seinem Namen - EINE Regel für alle Wege.
 *
 * WARUM DAS HIER NICHT MEHR SELBST GERECHNET WIRD
 *
 * Bis eben stand an dieser Stelle eine zweite, eigene Slug-Regel. Sie warf
 * alles weg, was nicht a-z0-9 ist, statt es zu übertragen. Gemessen:
 *
 *   Name               alte Regel hier    shared/subdomain.ts
 *   "Café Müller"      caf-mller          cafe-mueller
 *   "Zur Straßenecke"  zur-straenecke     zur-strassenecke
 *   "Ölmühle"          lmhle              oelmuehle
 *
 * Für deutsche Gastronomienamen ist das der Regelfall, nicht die Ausnahme.
 * Beide Regeln schreiben in DIESELBE Spalte (`Business.slug`, @unique): Wer
 * seinen Betrieb über POST /api/maitr/venues anlegt, bekam eine andere Adresse
 * als wer ihn veröffentlicht - für dasselbe Lokal, und damit womöglich zwei
 * Betriebe. Solange nie eine Business-Zeile entstand, konnte das niemand
 * bemerken; seit dem Veröffentlichungspfad schon.
 *
 * `suggestSubdomain` ist die bessere der beiden: sie schreibt Umlaute aus,
 * führt Akzente über NFD auf den Grundbuchstaben zurück, kennt die
 * reservierten Namen und hat 15 Tests in shared/subdomain.spec.ts.
 *
 * DER RÜCKFALL "business": `suggestSubdomain` gibt null zurück, wenn sich kein
 * zulässiger Name ableiten lässt (zu kurz, nur Sonderzeichen, oder reserviert
 * wie "demo"). `Business.slug` ist aber Pflicht, und der Veröffentlichungspfad
 * kann an dieser Stelle nicht mehr nachfragen - die Web-App ist gleich online.
 * Deshalb derselbe Rückfall, den die alte Regel schon hatte. Kollidiert er,
 * greift die Ausweichschleife weiter oben ("business-2", "business-3", ...).
 * POST /api/maitr/venues antwortet im selben Fall 422 und fragt nach - dort
 * gibt es einen Menschen, der einen anderen Namen tippen kann.
 *
 * @param businessName Der Betriebsname
 * @returns Eine als Subdomain zulässige Adresse, nie leer
 */
export function generateBusinessSlug(businessName: string): string {
  return suggestSubdomain(businessName) ?? "business";
}

/**
 * Die ALTE Adressregel - ausschließlich zum WIEDERFINDEN von Altbestand.
 *
 * Niemals für neue Zeilen benutzen. Sie steht nur noch hier, weil
 * `ensureUserBusiness` die Adresse bei JEDER Veröffentlichung neu berechnet
 * und als Schlüssel zum Nachschlagen verwendet. Ohne diesen Rückfall würde die
 * Umstellung einen bereits angelegten "Café Müller" (gespeichert als
 * "caf-mller") beim nächsten Veröffentlichen nicht mehr finden, die Adresse
 * "cafe-mueller" für frei halten und dem Wirt einen ZWEITEN Betrieb anlegen.
 * Das wäre nicht bloß eine Dublette: `taskVenueGuard` (server/maitr/routes.ts)
 * leitet die Betriebskennung aus der EINEN Mitgliedschaft ab und antwortet bei
 * zwei Mitgliedschaften mit 400 - der grüne Knopf in der App wäre tot.
 */
export function legacyBusinessSlug(businessName: string): string {
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
