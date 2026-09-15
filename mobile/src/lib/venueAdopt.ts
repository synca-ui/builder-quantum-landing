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
  /*
   * Die folgenden Felder liefert nur `GET /venues` (bzw. die PATCH-Antwort) aus der
   * Veröffentlichung der Web-App. ANLASS: `profilAusVenue` verwarf sie, obwohl der
   * Server sie schickte - kein Screen konnte ehrlich „@konto verlinkt" zeigen oder
   * die Telefonnummer des Betriebs anbieten. Optional, weil ein im Onboarding
   * angelegter Betrieb sie nicht hat und ältere Gerätespeicher-Schnappschüsse sie
   * nicht kennen: Jeder Leser muss mit `undefined` rechnen.
   */
  /** Telefon aus `contactInfo.phone`. */
  phone?: string;
  /** Die veröffentlichte Web-App (`contactInfo.website`), z. B. "https://haus-toeller.maitr.de". */
  website?: string;
  /** Instagram-Verweis aus `socialLinks.instagram` - so, wie die Web-App ihn kennt (meist eine URL). */
  instagram?: string;
  /** Logo; kann noch auf das Hosting der Quellwebsite zeigen. */
  logoUrl?: string;
  /** Adresse des Betriebs in Maitr - unveränderlich. */
  slug?: string;
}

/** Nur nicht-leere Zeichenketten; alles andere wird `undefined`. */
function text(wert: unknown): string | undefined {
  return typeof wert === "string" && wert.trim() ? wert.trim() : undefined;
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
    // Nur LÜCKENLOSE Tage zusammenfassen. Vorher zählte allein der gleiche Wert:
    // Mo, Mi und Do mit 9-18 Uhr wurden "Mo bis Do" - und behaupteten damit
    // Zeiten für einen Dienstag, den der Server gar nicht kennt.
    while (
      j + 1 < eintraege.length &&
      eintraege[j + 1].wert === eintraege[i].wert &&
      DAYS.indexOf(eintraege[j + 1].tag) === DAYS.indexOf(eintraege[j].tag) + 1
    ) {
      j++;
    }
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
  const social =
    venue.socialLinks && typeof venue.socialLinks === "object" ? venue.socialLinks : undefined;
  return {
    name: venue.name ?? "",
    tagline: venue.tagline ?? "",
    bio: venue.description ?? "",
    instagramBio: venue.tagline ?? "",
    street: venue.street ?? "",
    city: venue.city ?? "",
    tags: Array.isArray(venue.tags) ? venue.tags : [],
    hours: zeilenAusOeffnungszeiten(venue.openingHours),
    // Absichtlich AUSGESCHRIEBEN, auch wenn der Wert `undefined` ist: Der Store
    // übernimmt das Profil per `{ ...alt, ...neu }`. Ein weggelassener Schlüssel
    // ließe dort die Telefonnummer des VORHERIGEN Betriebs (oder eines alten
    // Standes) stehen - ein ausdrückliches `undefined` überschreibt sie.
    phone: text(venue.phone),
    website: text(venue.website),
    instagram: text(social?.instagram),
    logoUrl: text(venue.logoUrl),
    slug: text(venue.slug),
  };
}

const OPTIONALE_PROFILFELDER = ["phone", "website", "instagram", "logoUrl", "slug"] as const;
const PFLICHT_TEXTFELDER = ["name", "tagline", "bio", "instagramBio", "street", "city"] as const;

function istProfilZeile(wert: unknown): wert is ProfilZeile {
  if (!wert || typeof wert !== "object") return false;
  const z = wert as Partial<ProfilZeile>;
  return (
    typeof z.id === "string" &&
    typeof z.label === "string" &&
    typeof z.value === "string" &&
    (z.closed === undefined || typeof z.closed === "boolean")
  );
}

/**
 * Betriebsprofil aus dem Gerätespeicher-Schnappschuss (AsyncStorage) prüfen.
 *
 * ANLASS: Das Profil hat neue, optionale Felder bekommen (siehe `ProfilAusVenue`).
 * Schnappschüsse von davor kennen sie nicht - das ist unkritisch, sie fehlen dann
 * einfach. Kritisch wäre ein Schnappschuss, in dem ein Feld eine andere Form hat
 * (etwa `instagram` als Objekt, `hours` kein Array): Der erste Screen, der
 * `hours.map` oder `instagram.replace` ruft, stürzte ab - bei jedem Kaltstart
 * wieder, weil der kaputte Stand ja gespeichert bleibt.
 *
 * Deshalb Feld für Feld: Was passt, wird übernommen; was fehlt oder falsch geformt
 * ist, kommt aus `vorgabe` (Pflichtfelder) bzw. entfällt (optionale Felder).
 * `null`, wenn der Wert gar kein Objekt ist - dann bleibt der Anfangszustand.
 */
export function profilAusSchnappschuss<T extends ProfilAusVenue>(roh: unknown, vorgabe: T): T | null {
  if (!roh || typeof roh !== "object" || Array.isArray(roh)) return null;
  const s = roh as Record<string, unknown>;
  const profil: T = { ...vorgabe };
  const ziel = profil as Record<string, unknown>;
  for (const feld of PFLICHT_TEXTFELDER) {
    if (typeof s[feld] === "string") ziel[feld] = s[feld];
  }
  if (Array.isArray(s.tags)) ziel.tags = s.tags.filter((t): t is string => typeof t === "string");
  if (Array.isArray(s.hours)) ziel.hours = s.hours.filter(istProfilZeile);
  for (const feld of OPTIONALE_PROFILFELDER) {
    // Die Vorgabe (Demo-Seed) trägt diese Felder nicht - ein fehlendes oder
    // falsch geformtes Feld bleibt also leer, statt einen fremden Wert zu erben.
    ziel[feld] = text(s[feld]);
  }
  return profil;
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

/**
 * Kategorien in der Reihenfolge, in der sie in der Karte vorkommen.
 *
 * Vorher filterte der Screen fest auf die vier Vorschläge oben. Die Karte eines
 * echten Betriebs (aus der Web-App, `menuZeilenAusServer`) heißt aber
 * "Vorspeisen", "Hauptgerichte" oder "Speisekarte" - alle ihre Gerichte fielen
 * durch den Filter, und weil `menu.length > 0` war, zeigte der Screen weder die
 * Karte noch den Leerzustand: eine leere Seite trotz übernommener Speisekarte.
 */
export function kategorienDerKarte(menu: ReadonlyArray<{ category: string }>): string[] {
  const reihenfolge: string[] = [];
  for (const m of menu) {
    const k = m.category?.trim() || "Speisekarte";
    if (!reihenfolge.includes(k)) reihenfolge.push(k);
  }
  return reihenfolge;
}
