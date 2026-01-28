/**
 * Helper Functions
 *
 * Zentrale Utility-Funktionen für App-Rendering und Konfiguration
 */

/**
 * Normalisiert Bild-URLs aus verschiedenen Formaten
 * - String URLs
 * - Objekte mit url-Property
 * - File-Objekte (Browser File API)
 */
export function normalizeImageSrc(img: any): string {
  if (!img) return "/placeholder.svg";
  if (typeof img === "string") return img;
  const url = img?.url;
  if (typeof url === "string") return url;
  const file = (img as any)?.file || img;
  if (typeof File !== "undefined" && file instanceof File) {
    return URL.createObjectURL(file);
  }
  return "/placeholder.svg";
}

/**
 * Page ID zu deutschem Label mappen
 */
export function getPageLabel(pageId: string): string {
  const labels: Record<string, string> = {
    home: "Startseite",
    menu: "Speisekarte",
    gallery: "Galerie",
    about: "Über uns",
    contact: "Kontakt",
    reservations: "Reservieren",
    offers: "Angebote",
  };
  return labels[pageId] || pageId;
}

/**
 * Formatiert Öffnungszeiten für einzelnen Tag
 */
export function formatDayHours(day: { open: string; close: string; closed: boolean } | undefined): string {
  if (!day) return 'Keine Angabe';
  if (day.closed) return 'Geschlossen';
  return `${day.open} - ${day.close}`;
}

/**
 * Deutsche Wochentag-Namen
 */
export const DAY_NAMES: Record<string, string> = {
  monday: 'Montag',
  tuesday: 'Dienstag',
  wednesday: 'Mittwoch',
  thursday: 'Donnerstag',
  friday: 'Freitag',
  saturday: 'Samstag',
  sunday: 'Sonntag',
};

/**
 * Prüft ob eine Seite automatisch erkannt werden soll
 * (Auto-Discovery basierend auf vorhandenen Daten)
 */
export function shouldAutoDiscoverPage(
  pageId: string,
  data: {
    menuItems?: any[];
    gallery?: any[];
    openingHours?: any;
    reservationsEnabled?: boolean;
  }
): boolean {
  switch (pageId) {
    case "menu":
      return (data.menuItems?.length ?? 0) > 0;
    case "gallery":
      return (data.gallery?.length ?? 0) > 0;
    case "reservations":
      return data.reservationsEnabled === true;
    default:
      return false;
  }
}

