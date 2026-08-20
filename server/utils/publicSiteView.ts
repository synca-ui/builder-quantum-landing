/**
 * Was ein FREMDER von einer veröffentlichten Web-App sehen darf.
 *
 * ANLASS, gemessen ohne jedes Konto: `GET /api/webapps/public/apps/:subdomain`
 * gab `configData` unverändert heraus (`{ config: app.configData }`) - jedes
 * Feld, das der Konfigurator je hineingeschrieben hat, war damit öffentlich.
 * `GET /api/sites/:subdomain` (server/routes/configurations.ts) und
 * `GET /api/subdomains/:subdomain/config` bauten zwar schon je eine explizite
 * Feldliste - führten darin aber `userId` mit, und die erste zusätzlich
 * `reservationEmail`/`reservationNotificationEmail`: die Adresse, an die
 * Buchungsbenachrichtigungen für den BETRIEB gehen. `ReservationsStep.tsx`
 * defaultet dieses Feld sogar auf die Konto-Mailadresse des Wirts, wenn nichts
 * gesetzt ist - kein Feld, das ein Gast je sehen soll.
 *
 * VERGLEICHSSTELLE: `toApiVenue` (server/maitr/routes.ts) und der Kommentar am
 * `Business`-Modell (prisma/schema.prisma) ziehen dieselbe Grenze für den
 * Maitr-Kern - dort ausdrücklich, weil eine Umstellung auf `...business`
 * Postleitzahl und Koordinaten öffentlich ins Netz stellen würde. Diese
 * Funktion zieht dieselbe Grenze für `WebApp.configData` nach und wird von
 * ZWEI der drei Routen benutzt, die diese Spalte öffentlich lesen -
 * `GET /api/webapps/public/apps/:subdomain` und
 * `GET /api/subdomains/:subdomain/config`. Die dritte,
 * `GET /api/sites/:subdomain` (server/routes/configurations.ts), trägt eigene
 * Marken-Vorgabewerte für ein paar Farbfelder und behält darum ihre eigene,
 * aber ebenso geprüfte Feldliste - siehe Kommentar dort.
 *
 * `configData` ist eine Json-Spalte, zur Laufzeit also ein beliebiges Objekt -
 * mal verschachtelt (`config.business.name`, wie der Konfigurator sendet), mal
 * flach (`config.businessName`, wie der Legacy-Publish-Pfad und ältere Zeilen
 * es ablegen). Beide Formen werden gelesen, keine dritte.
 *
 * WARUM EINE POSITIVLISTE UND KEIN `delete geheimesFeld`: Ein neues Feld in
 * `configData` (Stripe-Kennung, Umsatzzahl, was auch immer der Konfigurator als
 * nächstes speichert) ist mit dieser Funktion automatisch NICHT öffentlich, bis
 * es hier ausdrücklich ergänzt wird. Eine Verbotsliste hätte das genau
 * umgekehrte Verhalten - und genau das war der Fehler, der das hier auslöste.
 */

/** Was eine Zeile aus `WebApp` beisteuert - nicht Teil von `configData`. */
export interface OeffentlicherSiteKontext {
  id: string;
  publishedAt: Date | string | null;
  updatedAt: Date | string;
}

/**
 * Baut die öffentliche Ansicht einer veröffentlichten Web-App.
 *
 * @param configData `WebApp.configData` - roh, ungeprüft, aus der Datenbank.
 * @param kontext Felder aus der `WebApp`-Zeile selbst (keine Geheimnisse -
 *   `id` ist die Adresse, unter der die Seite sowieso schon erreichbar ist).
 */
export function oeffentlicheSiteFelder(
  configData: unknown,
  kontext: OeffentlicherSiteKontext,
): Record<string, unknown> {
  const config: Record<string, any> =
    configData && typeof configData === "object" ? (configData as Record<string, any>) : {};
  const business = config.business ?? {};
  const design = config.design ?? {};
  const content = config.content ?? {};
  const features = config.features ?? {};
  const contact = config.contact ?? {};
  const pages = config.pages ?? {};

  return {
    // Die Adresse der Seite selbst - kein Geheimnis, und von
    // `useRecentOrders`/`GET /api/orders/:webAppId/recent` gebraucht
    // (client/pages/Site.tsx liest `formData.id` als `webAppId`).
    id: kontext.id,

    businessName: business.name || config.businessName || "",
    businessType: business.type || config.businessType || "",
    // Freitext-Ortsangabe des Betreibers ("Berlin-Mitte"), NICHT die
    // strukturierte Postleitzahl/Koordinaten aus dem Business-Datensatz -
    // genau die Unterscheidung, vor der der Kommentar am Business-Modell warnt.
    location: business.location || config.location || "",
    slogan: business.slogan || config.slogan || "",
    uniqueDescription: business.uniqueDescription || config.uniqueDescription || "",

    template: design.template || config.template || "modern",
    primaryColor: design.primaryColor || config.primaryColor || "#111827",
    secondaryColor: design.secondaryColor || config.secondaryColor || "#6B7280",
    backgroundColor: design.backgroundColor || config.backgroundColor,
    fontColor: design.fontColor || config.fontColor,
    priceColor: design.priceColor || config.priceColor,
    headerFontColor: design.headerFontColor || config.headerFontColor,
    headerBackgroundColor: design.headerBackgroundColor || config.headerBackgroundColor,
    fontFamily: design.fontFamily || config.fontFamily || "sans-serif",
    headerFontSize: design.headerFontSize || config.headerFontSize || 24,
    logo: design.logo || business.logo?.url || config.logo,
    themeMode: config.themeMode,
    templateThemes: config.templateThemes,

    selectedPages: pages.selectedPages || pages.selected || config.selectedPages || ["home"],
    customPages: pages.customPages || pages.custom || config.customPages || [],

    openingHours: content.openingHours || config.openingHours || {},
    menuItems: content.menuItems || config.menuItems || [],
    // MUSS in der Liste stehen, sonst zeigt die Seite einem Gast mit
    // Unverträglichkeit "a1, f" statt "Weizen, Milch" (siehe subdomains.ts).
    allergenLegend: content.allergenLegend || config.allergenLegend || undefined,
    gallery: content.gallery || config.gallery || [],
    homepageDishImageVisibility: config.homepageDishImageVisibility,

    reservationsEnabled: features.reservationsEnabled ?? config.reservationsEnabled ?? false,
    maxGuests: features.maxGuests || config.maxGuests || 10,
    reservationButtonColor: features.reservationButtonColor || config.reservationButtonColor,
    reservationButtonTextColor:
      features.reservationButtonTextColor || config.reservationButtonTextColor,
    reservationButtonShape: features.reservationButtonShape || config.reservationButtonShape,
    reservationFormStyle: features.reservationFormStyle || config.reservationFormStyle || "classic",
    reservationTimeSlotInterval:
      features.reservationTimeSlotInterval || config.reservationTimeSlotInterval || 30,
    reservationDaysAhead: features.reservationDaysAhead || config.reservationDaysAhead || 7,
    timeSlots: features.timeSlots || config.timeSlots || [],
    // ABSICHTLICH NICHT dabei: reservationEmail / reservationNotificationEmail.
    // Das ist die Adresse für Buchungs-BENACHRICHTIGUNGEN an den Betrieb, nicht
    // die öffentliche Kontaktadresse (die steht unten als `email`/`phone`).

    onlineOrdering: features.onlineOrdering ?? config.onlineOrdering ?? false,
    onlineStore: features.onlineStore ?? config.onlineStore ?? false,
    teamArea: features.teamArea ?? config.teamArea ?? false,

    contactMethods: contact.contactMethods || contact.methods || config.contactMethods || [],
    socialMedia: contact.socialMedia || contact.social || config.socialMedia || {},
    // Die ÖFFENTLICHE Kontaktadresse des Betriebs - der Gast soll anrufen
    // können. Der Betrieb hat sie selbst zur Veröffentlichung freigegeben,
    // indem er sie im Konfigurator als Kontaktangabe der Seite eingetragen hat.
    email: contact.email || config.email || "",
    phone: contact.phone || config.phone || "",

    offers: config.offers || [],
    offerBanner: config.offerBanner,

    status: "published",
    publishedAt: kontext.publishedAt,
    updatedAt: kontext.updatedAt,

    // Jedes weitere Feld aus `configData`, das hier nicht genannt ist -
    // Stripe-Kennungen, Umsatzzahlen, Postleitzahl, Koordinaten, `userId`,
    // was auch immer als Nächstes dazukommt - ist damit NICHT Teil der
    // Antwort. Das ist der Zweck dieser Funktion, kein Versehen.
  };
}
