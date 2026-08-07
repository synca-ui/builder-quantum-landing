/**
 * Übersetzt das `suggestedConfig`, das der n8n-Deep-Scrape-Flow erzeugt, in die
 * Form, die der Konfigurator verwendet.
 *
 * Herkunft: Der Knoten "Code: suggestedConfig bauen" im Deep-Scrape-Flow schreibt
 * das Objekt nach ScraperJob.suggestedConfig. Es enthält bereits alles Wesentliche –
 * Farben aus dem Stylesheet, Speisekarte (aus HTML, PDF oder per OCR aus einem
 * Bild), Galerie, Öffnungszeiten, Kontaktdaten und Google-Maps-Angaben.
 *
 * Diese Funktion ist bewusst rein und ohne Seiteneffekte: Sie ist die gemeinsame
 * Grundlage für zwei Dinge – das Vorbefüllen des manuellen Konfigurators und den
 * vollautomatischen Modus. Beide brauchen dieselbe Übersetzung, deshalb liegt sie
 * an genau einer Stelle.
 */
/**
 * Zielformen, strukturgleich zu client/types/domain.ts. Bewusst hier definiert
 * statt von "@/types/domain" importiert: Dieses Modul wird auch vom Express-
 * Server benutzt, und der kann den Client-Alias "@" nicht auflösen. Da
 * TypeScript strukturell typisiert, bleiben die Ergebnisse den Domain-Typen
 * zuweisbar.
 */
export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price?: number | string;
  imageUrl?: string;
  category?: string;
  available?: boolean;
  /**
   * Allergen- und Zusatzstoff-Kuerzel, wie sie auf der Karte stehen.
   * Was sie bedeuten, steht in ContentData.allergenLegend derselben Karte —
   * die Zuordnung ist je Betrieb verschieden. Siehe shared/menuParser.ts.
   */
  allergens?: string[];
  /** Ernaehrungs-Labels: ["vegan"], ["vegetarisch", "glutenfrei"]. */
  labels?: string[];
  /**
   * Erscheint im Bereich "Highlights" der Startseite. Ohne diese Markierung
   * würfelt AppRenderer drei ZUFÄLLIGE Gerichte – bei einer Karte mit 141
   * Positionen meist Getränke. shared/autoPublish.ts setzt sie beim
   * automatischen Veröffentlichen.
   */
  isHighlight?: boolean;
}

export interface GalleryImage {
  id: string;
  url: string;
  title?: string;
  alt?: string;
}

export interface OpeningHours {
  [day: string]: { open: string; close: string; closed: boolean };
}

export interface ContactMethod {
  type: "phone" | "email";
  value: string;
}

export interface BusinessInfo {
  name?: string;
  type?: string;
  location?: string;
  slogan?: string;
  uniqueDescription?: string;
  /**
   * Strukturgleich zu BusinessInfo.logo in client/types/domain.ts. Der Scrape
   * liefert kein Logo; es kommt aus shared/siteDetails.ts und wird beim
   * Veröffentlichen in den eigenen Speicher übernommen.
   */
  logo?: { url: string };
}

export interface DesignConfig {
  template?: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  /**
   * Die vier folgenden setzt shared/autoPublish.ts aus der gescrapten Palette.
   * Bleiben sie leer, fällt der Server beim Ausliefern auf seine Standardwerte
   * zurück (configurations.ts) – lila Kopfzeile und grüne Preise, die mit
   * jeder gescrapten Markenfarbe kollidieren.
   */
  fontColor?: string;
  priceColor?: string;
  headerFontColor?: string;
  headerBackgroundColor?: string;
}

export interface ContentData {
  menuItems?: MenuItem[];
  gallery?: GalleryImage[];
  openingHours?: OpeningHours;
  categories?: string[];
  /**
   * Was die Kuerzel an den Gerichten bedeuten, wie die Karte selbst es angibt:
   * { "a1": "Weizen", "f": "Milch/Laktose" }.
   *
   * Muss von der Karte kommen und darf nicht fest verdrahtet werden: Beim
   * Landgasthof zum Loewen ist "f" die Milch, bei der Kneipe am Kirchplatz ist
   * Milch "g". Eine feste Tabelle waere nicht unvollstaendig, sondern falsch.
   */
  allergenLegend?: Record<string, string>;
}

export interface ContactInfo {
  contactMethods?: ContactMethod[];
  phone?: string;
  email?: string;
  /**
   * Soziale Netze des Betriebs, nach Kanal: { instagram: "https://…" }.
   *
   * A3.3 aus dem Feedback vom 6.8.2026. shared/siteDetails.ts liest Instagram
   * und Facebook seit jeher aus dem HTML, und server/routes/webapps.ts nimmt
   * sie unter contact.socialMedia entgegen — dazwischen fehlte die Zuordnung,
   * die gefundenen Konten fielen also still auf den Boden.
   */
  socialMedia?: Record<string, string>;
}

/** Rohform, wie sie aus /api/scraper-job/full kommt. Alle Felder optional. */
export interface SuggestedConfig {
  businessName?: string;
  businessType?: string;
  slogan?: string;
  description?: string;
  location?: string;
  phone?: string;
  email?: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  colors?: string[];
  fontFamily?: string;
  template?: string;
  menuItems?: Array<{
    name?: string;
    description?: string;
    price?: number | string;
    category?: string;
    imageUrl?: string;
    allergens?: string[];
    labels?: string[];
  }>;
  /** Kuerzel-Legende der Karte, siehe ContentData.allergenLegend. */
  allergenLegend?: Record<string, string>;
  /** Soziale Netze, falls der Flow sie liefert: { instagram: "https://…" }. */
  socialMedia?: Record<string, string>;
  gallery?: string[];
  openingHours?: Record<string, { open?: string; close?: string; closed?: boolean }>;
  rating?: number | null;
  reviewCount?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  instagramFollowers?: number | null;
  menuSource?: string;
  scrapedAt?: string;
}

export interface ConfiguratorDraft {
  business: Partial<BusinessInfo>;
  design: Partial<DesignConfig>;
  content: Partial<ContentData>;
  contact: Partial<ContactInfo>;
  /** Felder ohne Entsprechung im Konfigurator – siehe UNMAPPED_FIELDS. */
  unmapped: Record<string, unknown>;
}

/**
 * Die Vorlagen-Namen laufen auseinander: Der Flow vergibt
 * "minimalist" | "bold" | "classic", die TemplateRegistry kennt aber
 * "minimalist" | "modern" | "stylish" | "cozy". Zwei der drei Werte gäbe es
 * also gar nicht, ein direktes Durchreichen würde die Vorschau brechen.
 *
 * "bold" -> "modern", weil dessen Beschreibung in der Registry wörtlich
 * "Contemporary design with bold colors" lautet. "classic" -> "cozy" als
 * nächstliegende Entsprechung.
 *
 * Sauberer wäre, beide Seiten auf dasselbe Vokabular zu bringen – entweder gibt
 * der Flow direkt Registry-IDs aus, oder die Registry bekommt die fehlenden
 * Vorlagen. Bis dahin übersetzt diese Tabelle.
 */
const TEMPLATE_MAP: Record<string, string> = {
  minimalist: "minimalist",
  bold: "modern",
  classic: "cozy",
  modern: "modern",
  stylish: "stylish",
  cozy: "cozy",
};

/**
 * Greift, wenn der Flow einen unbekannten Vorlagennamen liefert – und im
 * automatischen Veröffentlichen, wenn er gar keinen liefert. Exportiert, damit
 * shared/autoPublish.ts denselben Wert benutzt und nicht ein zweiter Standard
 * daneben entsteht.
 */
export const FALLBACK_TEMPLATE = "modern";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

/** Diese Felder liefert der Scrape, der Konfigurator hat aber kein Ziel dafür. */
export const UNMAPPED_FIELDS = [
  "rating",
  "reviewCount",
  "latitude",
  "longitude",
  "instagramFollowers",
  "menuSource",
  "scrapedAt",
] as const;

const isHex = (v?: string): v is string =>
  typeof v === "string" && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());

const isHttpUrl = (v?: string): v is string =>
  typeof v === "string" && /^https?:\/\//i.test(v.trim());

/**
 * Kanäle, die die Web-App anzeigen kann. Ein unbekannter Kanal wäre ein Link
 * ins Nichts: Die Oberfläche hat für ihn kein Symbol und keinen Platz.
 */
const SOCIAL_KANAELE = [
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "x",
  "twitter",
  "linkedin",
  "pinterest",
] as const;

/**
 * Bringt die gefundenen Konten in die Form, die die Web-App erwartet.
 *
 * Zwei Dinge werden dabei geprüft, beide aus dem Grundsatz "lieber eine Lücke
 * als eine erfundene Angabe":
 *   - Nur echte http(s)-Adressen. Ein Handle wie "@gasthof_adler" ist kein
 *     Link; daraus eine URL zu bauen hieße, eine Adresse zu erfinden, die es
 *     womöglich gar nicht gibt.
 *   - Nur bekannte Kanäle, und der Kanalname muss zur Adresse passen. Ein
 *     Eintrag { instagram: "https://facebook.com/…" } führt den Gast sonst
 *     unter dem falschen Symbol auf die falsche Seite.
 */
export function normalizeSocialLinks(
  raw?: Record<string, string> | null,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== "object") return out;

  for (const [rohKanal, rohUrl] of Object.entries(raw)) {
    const kanal = String(rohKanal).trim().toLowerCase();
    if (!(SOCIAL_KANAELE as readonly string[]).includes(kanal)) continue;
    const url = clean(String(rohUrl ?? ""));
    if (!isHttpUrl(url)) continue;

    // Passt die Adresse zum Kanal? "x" heißt auf der Domain weiterhin twitter.
    const erwartet =
      kanal === "x" || kanal === "twitter" ? /(^|\.)(x|twitter)\.com\//i
      : new RegExp(`(^|\\.)${kanal}\\.com/`, "i");
    let host = "";
    try {
      host = `${new URL(url).hostname}/`;
    } catch {
      continue;
    }
    if (!erwartet.test(host)) continue;

    out[kanal === "twitter" ? "x" : kanal] = url;
  }
  return out;
}

const clean = (v?: string): string | undefined => {
  const t = typeof v === "string" ? v.trim() : "";
  return t.length ? t : undefined;
};

/**
 * Begrüßungsformeln, die auf deutschen Restaurantseiten vor dem Namen stehen.
 * "Herzlich willkommen im Gasthof Adler" ist die Überschrift, nicht der Name.
 */
const BEGRUESSUNG =
  /^\s*(herzlich\s+)?(willkommen|wilkommen|welcome)\s*(bei|beim|im|in|auf|zu|zur|zum)?\s*(uns\s*(im|in|bei)?\s*)?/i;

/**
 * Seitenmöbel: Navigations- und Seitentitel-Zusätze. Nur diese dürfen beim
 * Zerlegen eines Seitentitels wegfallen.
 */
const SEITEN_MOEBEL = new Set([
  "herzlich", "willkommen", "wilkommen", "welcome",
  "home", "start", "startseite", "hauptseite", "index",
  "menu", "menü", "speisekarte", "karte", "getränkekarte", "tageskarte",
  "kontakt", "impressum", "datenschutz", "anfahrt", "aktuelles", "news",
  "über uns", "ueber uns", "wir über uns", "galerie", "bilder",
]);

/**
 * Gattungswörter. Allein sind sie kein Name, als Teil eines Namens aber
 * unverzichtbar — deshalb NUR für die Schlussprüfung des vollständigen
 * Ergebnisses, nicht fürs Zerlegen: Sonst würde aus
 * "„Zur Post“ Hotel – Gasthof" beim Trennstrich der halbe Name abgeschnitten.
 */
const NIE_ALLEIN = new Set([
  "restaurant", "gasthof", "gasthaus", "hotel", "cafe", "café", "bar",
  "pizzeria", "wirtshaus", "landgasthof", "biergarten", "kneipe",
  "unser restaurant", "gastronomie",
]);

/** Passende Anführungszeichenpaare, die einen ganzen Namen umschließen. */
const KLAMMERPAARE: Array<[string, string]> = [
  ['"', '"'],
  ["'", "'"],
  ["„", "“"],
  ["»", "«"],
  ["«", "»"],
];

/**
 * Prüft, ob das, was der Scrape als Betriebsnamen liefert, überhaupt einer
 * sein kann — und schält die Begrüßung ab, wenn der Name dahinter steht.
 *
 * Anlass ist ein echter Fehlerfall aus dem Feedback vom 6.8.2026 (A3.1): Der
 * Betrieb hieß im Ergebnis "Herzlich" — offensichtlich aus dem
 * "Herzlich willkommen" der Startseite gegriffen. Die Ursache liegt im
 * n8n-Flow, der die Überschrift der Seite als Namen nimmt. Diese Funktion ist
 * die Absicherung auf unserer Seite: Sie ist die einzige Stelle, durch die ein
 * Scrape-Ergebnis in den Konfigurator gelangt.
 *
 * Bleibt nichts Brauchbares übrig, wird `undefined` zurückgegeben — der Wirt
 * trägt den Namen dann selbst ein. Das ist besser als ein falscher Name, den
 * er erst bemerkt, wenn die Web-App online ist.
 */
export function plausibleBusinessName(raw?: string): string | undefined {
  let name = clean(raw);
  if (!name) return undefined;

  const istMoebel = (t: string) =>
    SEITEN_MOEBEL.has(t.toLowerCase().replace(/[.!?]+$/, "")) ||
    BEGRUESSUNG.test(t);

  // Seitentitel tragen oft Zusätze: "Gasthof Adler | Startseite". Zerlegt wird
  // nur, wenn danach GENAU EIN Teil übrig bleibt, der kein Seitenmöbel ist —
  // sonst zerschneidet die Regel Namen, die selbst einen Gedankenstrich haben.
  const teile = name
    .split(/\s*[|•·–—]\s*|\s+-\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (teile.length > 1) {
    const echte = teile.filter((t) => !istMoebel(t));
    if (echte.length === 1) name = echte[0];
    else if (echte.length === 0) return undefined;
  }

  // Füllwörter nur abtragen, wenn wirklich eine Begrüßung davorstand.
  // "Zum Löwen" ist ein Wirtshausname, kein Rest einer Begrüßung — ein
  // pauschales Abschneiden machte daraus "Löwen".
  if (BEGRUESSUNG.test(name)) {
    name = name.replace(BEGRUESSUNG, "").trim();
    name = name.replace(
      /^(bei|beim|im|in|auf|zu|zur|zum|to|at|unserem|unserer|dem|der)\s+/i,
      "",
    );
  }
  name = name.replace(/^[\s,;:]+|[\s,;:!.]+$/g, "").trim();

  // Anführungszeichen nur abnehmen, wenn sie den GANZEN Namen umschließen.
  // '„ZUR POST“ HOTEL' behält seine — sie gehören zum Namen.
  for (const [auf, zu] of KLAMMERPAARE) {
    if (name.length > 2 && name.startsWith(auf) && name.endsWith(zu)) {
      name = name.slice(auf.length, -zu.length).trim();
      break;
    }
  }

  if (name.length < 2) return undefined;
  const klein = name.toLowerCase();
  if (SEITEN_MOEBEL.has(klein) || NIE_ALLEIN.has(klein)) return undefined;
  // Ein Name ganz ohne Buchstaben ist keiner.
  if (!/[A-Za-zÄÖÜäöüß]/.test(name)) return undefined;

  return name;
}

/**
 * Stabile, herkunftsbezogene ID. Bewusst kein Zufall und kein Zeitstempel:
 * Bei erneutem Scrape derselben Seite sollen dieselben Einträge dieselbe ID
 * bekommen, sonst gelten sie beim Zusammenführen als neu.
 */
const slugId = (prefix: string, value: string, index: number): string => {
  const slug = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${prefix}-${index}-${slug || "item"}`;
};

function mapOpeningHours(
  raw: SuggestedConfig["openingHours"],
): OpeningHours | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: OpeningHours = {};
  for (const day of DAYS) {
    const entry = raw[day];
    if (!entry) continue;
    const open = clean(entry.open);
    const close = clean(entry.close);
    // Ohne Zeiten ist der Eintrag wertlos – dann lieber den Standard des
    // Konfigurators stehen lassen, als "undefined" hineinzuschreiben.
    if (!open || !close) continue;
    out[day] = { open, close, closed: entry.closed === true };
  }
  return Object.keys(out).length ? out : undefined;
}

function mapMenuItems(raw: SuggestedConfig["menuItems"]): MenuItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => {
      const name = clean(item?.name);
      if (!name) return null;
      // Schlüssel bewusst nur setzen, wenn ein Wert vorliegt. Ein Feld auf
      // undefined zu setzen ist kein gültiges JSON – und diese Objekte landen
      // über Prisma in einer Json-Spalte, die undefined ablehnt.
      const mapped: MenuItem = {
        id: slugId("scraped-dish", name, index),
        name,
        available: true,
      };
      const description = clean(item?.description);
      if (description) mapped.description = description;
      const category = clean(item?.category);
      if (category) mapped.category = category;
      if (item?.price !== undefined && item?.price !== null && item.price !== "") {
        mapped.price = item.price;
      }
      if (isHttpUrl(item?.imageUrl)) {
        mapped.imageUrl = item.imageUrl!.trim();
      }
      // Kennzeichnung nur uebernehmen, wenn welche da ist: Ein leeres Array
      // liest sich in der App wie "geprueft, nichts enthalten" — und das waere
      // bei einer Kennzeichnungspflicht eine Aussage, die niemand gemacht hat.
      const allergene = Array.isArray(item?.allergens)
        ? item.allergens.map((a) => String(a).trim().toLowerCase()).filter(Boolean)
        : [];
      if (allergene.length) mapped.allergens = [...new Set(allergene)];
      const labels = Array.isArray(item?.labels)
        ? item.labels.map((l) => String(l).trim().toLowerCase()).filter(Boolean)
        : [];
      if (labels.length) mapped.labels = [...new Set(labels)];
      return mapped;
    })
    .filter((x): x is MenuItem => x !== null);
}

function mapGallery(raw: SuggestedConfig["gallery"]): GalleryImage[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: GalleryImage[] = [];
  raw.forEach((url, index) => {
    if (!isHttpUrl(url)) return;
    const trimmed = url.trim();
    if (seen.has(trimmed)) return;
    seen.add(trimmed);
    // ACHTUNG: Das sind FREMDE URLs von der gescrapten Seite. Sie werden hier
    // nur durchgereicht. Vor dem Veröffentlichen müssen die Bilder in den
    // eigenen Speicher übernommen werden – sonst hängt die ausgelieferte
    // Web-App an fremdem Hosting und die Bilder verschwinden ohne Vorwarnung.
    out.push({ id: slugId("scraped-img", trimmed, index), url: trimmed });
  });
  return out;
}

/**
 * Baut aus dem Scrape-Ergebnis einen Entwurf für den Konfigurator.
 * Gibt null zurück, wenn nichts Brauchbares drinsteht.
 */
export function suggestedConfigToDraft(
  suggested: SuggestedConfig | null | undefined,
): ConfiguratorDraft | null {
  if (!suggested || typeof suggested !== "object") return null;

  const business: Partial<BusinessInfo> = {};
  // Nicht clean(), sondern geprüft: siehe plausibleBusinessName — der Scrape
  // liefert hier gelegentlich die Seitenüberschrift statt des Betriebsnamens.
  const name = plausibleBusinessName(suggested.businessName);
  if (name) business.name = name;
  if (clean(suggested.businessType)) business.type = clean(suggested.businessType);
  if (clean(suggested.location)) business.location = clean(suggested.location);
  if (clean(suggested.slogan)) business.slogan = clean(suggested.slogan);
  // Im Konfigurator heißt das Feld uniqueDescription.
  if (clean(suggested.description)) {
    business.uniqueDescription = clean(suggested.description);
  }

  const design: Partial<DesignConfig> = {};
  if (isHex(suggested.primaryColor)) design.primaryColor = suggested.primaryColor.trim();
  if (isHex(suggested.secondaryColor)) {
    design.secondaryColor = suggested.secondaryColor.trim();
  }
  if (isHex(suggested.backgroundColor)) {
    design.backgroundColor = suggested.backgroundColor.trim();
  }
  if (clean(suggested.fontFamily)) design.fontFamily = clean(suggested.fontFamily);
  if (clean(suggested.template)) {
    design.template =
      TEMPLATE_MAP[suggested.template!.trim().toLowerCase()] ?? FALLBACK_TEMPLATE;
  }

  const content: Partial<ContentData> = {};
  const menuItems = mapMenuItems(suggested.menuItems);
  if (menuItems.length) content.menuItems = menuItems;
  const gallery = mapGallery(suggested.gallery);
  if (gallery.length) content.gallery = gallery;
  const openingHours = mapOpeningHours(suggested.openingHours);
  if (openingHours) content.openingHours = openingHours;
  const categories = [...new Set(menuItems.map((m) => m.category).filter(Boolean))];
  if (categories.length) content.categories = categories as string[];

  // Legende nur übernehmen, wenn sie überhaupt gebraucht wird: Ohne Kürzel an
  // den Gerichten ist sie eine Tabelle, die niemand aufschlägt.
  const legende = suggested.allergenLegend;
  if (legende && typeof legende === "object") {
    const sauber: Record<string, string> = {};
    for (const [kuerzel, bedeutung] of Object.entries(legende)) {
      const k = String(kuerzel).trim().toLowerCase();
      const b = clean(String(bedeutung));
      if (k && b) sauber[k] = b;
    }
    if (Object.keys(sauber).length) content.allergenLegend = sauber;
  }

  const contact: Partial<ContactInfo> = {};
  const phone = clean(suggested.phone);
  const email = clean(suggested.email);
  if (phone) contact.phone = phone;
  if (email) contact.email = email;
  const methods = [
    ...(phone ? [{ type: "phone" as const, value: phone }] : []),
    ...(email ? [{ type: "email" as const, value: email }] : []),
  ];
  if (methods.length) contact.contactMethods = methods;

  const social = normalizeSocialLinks(suggested.socialMedia);
  if (Object.keys(social).length) contact.socialMedia = social;

  const unmapped: Record<string, unknown> = {};
  for (const key of UNMAPPED_FIELDS) {
    const value = (suggested as Record<string, unknown>)[key];
    if (value !== undefined && value !== null) unmapped[key] = value;
  }

  const hasAnything =
    Object.keys(business).length ||
    Object.keys(design).length ||
    Object.keys(content).length ||
    Object.keys(contact).length;

  return hasAnything ? { business, design, content, contact, unmapped } : null;
}

/** Kurzfassung für die Oberfläche: was wurde tatsächlich gefunden? */
export function describeDraft(draft: ConfiguratorDraft | null): string[] {
  if (!draft) return [];
  const parts: string[] = [];
  if (draft.business.name) parts.push(`Name: ${draft.business.name}`);
  if (draft.content.menuItems?.length) {
    parts.push(`${draft.content.menuItems.length} Gerichte`);
  }
  if (draft.content.gallery?.length) {
    parts.push(`${draft.content.gallery.length} Bilder`);
  }
  if (draft.content.openingHours) {
    parts.push(`${Object.keys(draft.content.openingHours).length} Öffnungstage`);
  }
  if (draft.design.primaryColor) parts.push(`Farben aus der Website`);
  return parts;
}

// ─── Zusammenführen mit dem bestehenden Konfigurator-Zustand ─────────────────

/**
 * Führt einen Entwurf in einen bestehenden Zustand ein, OHNE Eingaben des
 * Nutzers zu überschreiben.
 *
 * Die Regel: Ein Feld gilt als "frei", wenn es leer ist ODER noch exakt auf dem
 * Standardwert des Konfigurators steht. Nur dann wird der gescrapte Wert
 * gesetzt. Damit lässt sich das Vorbefüllen gefahrlos auch dann auslösen, wenn
 * jemand schon halb fertig getippt hat – seine Arbeit bleibt in jedem Fall
 * stehen.
 *
 * Rein und ohne Seiteneffekte, damit es ohne React prüfbar bleibt.
 */
export interface MergeResult<T> {
  merged: T;
  /** Namen der Felder, die tatsächlich gesetzt wurden – für die Anzeige. */
  applied: string[];
}

function isFree(currentValue: unknown, defaultValue: unknown): boolean {
  if (currentValue === undefined || currentValue === null) return true;
  if (typeof currentValue === "string" && currentValue.trim() === "") return true;
  if (Array.isArray(currentValue) && currentValue.length === 0) return true;
  // Noch auf dem Auslieferungszustand -> zählt als nicht vom Nutzer gesetzt.
  return defaultValue !== undefined && currentValue === defaultValue;
}

export function mergeSection<T extends Record<string, any>>(
  current: T,
  incoming: Partial<T>,
  defaults: Partial<T> = {},
  label = "",
): MergeResult<T> {
  const merged: T = { ...current };
  const applied: string[] = [];
  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined) continue;
    if (!isFree(current[key], defaults[key])) continue;
    (merged as Record<string, unknown>)[key] = value;
    applied.push(label ? `${label}.${key}` : key);
  }
  return { merged, applied };
}
