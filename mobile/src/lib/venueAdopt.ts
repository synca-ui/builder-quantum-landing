/**
 * Vom Server-Betrieb (`@maitr/core/types#Venue`) zum Betriebsprofil der App.
 *
 * ANLASS: `adoptVenue` übernahm bisher nur die Kennung und den Namen. Alles
 * andere im Profil blieb die Fixture "Café Goldstück" (Körnerstr. 27, Mo–Fr
 * 8–18) - auch für einen echten Betrieb, der über den Konfigurator längst
 * Adresse, Slogan und Öffnungszeiten mitgebracht hatte. Seit die
 * Veröffentlichung der Web-App den Betrieb vollständig anlegt
 * (server/services/businessProfil.ts), kann die App ihn hier übernehmen.
 *
 * Rein und ohne React, damit es sich prüfen lässt.
 */
import type { OpeningHours, Venue, VenueMenu } from "@maitr/core/types";
import { DAYS } from "@maitr/core/types";

/** Spiegelt `OpeningHour` aus store.tsx - hier ohne Import, um Kreise zu vermeiden. */
export interface ProfilZeile {
  id: string;
  label: string;
  value: string;
  closed?: boolean;
}

export interface ProfilAusVenue {
  name: string;
  tagline: string;
  bio: string;
  instagramBio: string;
  street: string;
  city: string;
  tags: string[];
  hours: ProfilZeile[];
}

const TAG_KURZ: Record<string, string> = {
  monday: "Mo",
  tuesday: "Di",
  wednesday: "Mi",
  thursday: "Do",
  friday: "Fr",
  saturday: "Sa",
  sunday: "So",
};

const TAG_LANG: Record<string, string> = {
  monday: "Montag",
  tuesday: "Dienstag",
  wednesday: "Mittwoch",
  thursday: "Donnerstag",
  friday: "Freitag",
  saturday: "Samstag",
  sunday: "Sonntag",
};

/** "17:00" → "17:00", "09:30" → "9:30" - so, wie die Fixture es schreibt. */
function uhr(wert: string): string {
  return wert.replace(/^0(\d):/, "$1:");
}

/**
 * Öffnungszeiten → Zeilen fürs Profil, gleiche Tage in Folge zusammengefasst:
 * Mo–Sa 17:00–23:59 wird "Mo bis Sa · 17:00 – 23:59", der Sonntag "Geschlossen".
 * Tage, die der Server nicht kennt, tauchen nicht auf - nichts erfinden.
 */
export function zeilenAusOeffnungszeiten(zeiten: OpeningHours | undefined): ProfilZeile[] {
  if (!zeiten) return [];
  const eintraege = DAYS.filter((tag) => zeiten[tag]).map((tag) => {
    const t = zeiten[tag]!;
    const wert = t.closed ? "Geschlossen" : `${uhr(t.open)} – ${uhr(t.close)}`;
    return { tag, wert, closed: t.closed };
  });

  const zeilen: ProfilZeile[] = [];
  let i = 0;
  while (i < eintraege.length) {
    let j = i;
    while (j + 1 < eintraege.length && eintraege[j + 1].wert === eintraege[i].wert) j++;
    const von = eintraege[i].tag;
    const bis = eintraege[j].tag;
    const label =
      i === j
        ? TAG_LANG[von]
        : j === i + 1
          ? `${TAG_KURZ[von]} und ${TAG_KURZ[bis]}`
          : `${TAG_KURZ[von]} bis ${TAG_KURZ[bis]}`;
    zeilen.push({
      id: i === j ? von : `${von}_${bis}`,
      label,
      value: eintraege[i].wert,
      ...(eintraege[i].closed ? { closed: true } : {}),
    });
    i = j + 1;
  }
  return zeilen;
}

/**
 * Das Profil, das die App für diesen Betrieb zeigt. Der Server ist die
 * Wahrheit: Was er nicht liefert, bleibt LEER statt Fixture - ein echter
 * Betrieb darf nicht mit der Adresse des Demo-Cafés erscheinen.
 */
export function profilAusVenue(venue: Partial<Venue> & { name?: string }): ProfilAusVenue {
  return {
    name: venue.name ?? "",
    tagline: venue.tagline ?? "",
    bio: venue.description ?? "",
    instagramBio: venue.tagline ?? "",
    street: venue.street ?? "",
    city: venue.city ?? "",
    tags: Array.isArray(venue.tags) ? venue.tags : [],
    hours: zeilenAusOeffnungszeiten(venue.openingHours),
  };
}

/** Präfix der Kennungen, die aus der Server-Speisekarte stammen. */
export const SERVER_MENU_PREFIX = "srv-";

export interface MenuZeile {
  id: string;
  name: string;
  price: string;
  category: string;
}

/** 14.5 → "14,50 €"; 0 → "auf Anfrage" (die Karte nannte keinen Preis). */
export function preisText(betrag: number): string {
  if (!Number.isFinite(betrag) || betrag <= 0) return "auf Anfrage";
  return `${betrag.toFixed(2).replace(".", ",")} €`;
}

/** Server-Speisekarte → die Zeilen des Speisekarten-Screens. */
export function menuZeilenAusServer(menu: VenueMenu | null | undefined): MenuZeile[] {
  if (!menu || !Array.isArray(menu.categories)) return [];
  const zeilen: MenuZeile[] = [];
  for (const kategorie of menu.categories) {
    for (const item of kategorie.items ?? []) {
      if (!item?.id || !item?.name) continue;
      zeilen.push({
        id: `${SERVER_MENU_PREFIX}${item.id}`,
        name: item.name,
        price: preisText(item.price),
        category: kategorie.name,
      });
    }
  }
  return zeilen;
}

/**
 * Darf die lokale Karte durch die des Servers ersetzt werden? Ja, wenn sie leer
 * ist oder nur aus Server-Zeilen besteht. Was der Wirt selbst in der App
 * angelegt hat, bleibt - die App überschreibt keine eigene Arbeit.
 */
export function darfMenuUebernehmen(lokal: ReadonlyArray<{ id: string }>): boolean {
  return lokal.every((m) => m.id.startsWith(SERVER_MENU_PREFIX));
}
