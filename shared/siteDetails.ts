/**
 * Zieht aus dem HTML einer Website die Angaben, die der Scrape offen lässt.
 *
 * Gegen Ausführung 632 nachgemessen liefert der n8n-Flow für einen echten
 * Betrieb zwar Name, Farben, Öffnungszeiten, Telefon, E-Mail und neun
 * Galeriebilder – aber:
 *
 *   address  = ''      (leer, weil der Maps-Zweig nie angebunden wurde)
 *   slogan   = ''
 *   logo     — kommt im ganzen Ablauf nicht vor
 *   social   — kommt im ganzen Ablauf nicht vor
 *
 * Adresse und Logo sind für die Web-App eines Restaurants keine Beigabe:
 * Ohne Adresse weiß niemand, wo der Betrieb liegt, und ohne Logo sieht jede
 * erzeugte Seite gleich aus.
 *
 * Beides steht fast immer schon im HTML – in strukturierten Daten
 * (schema.org/Restaurant) oder in den Metaangaben der Seite. Diese Datei holt
 * es dort heraus, ohne zusätzlichen Dienst und ohne Schlüssel.
 *
 * Rein und ohne Netz, damit es vollständig prüfbar bleibt.
 */

import {
  parseSchemaOpeningHours,
  parseHoursLine,
  hoursQuality,
  type WeekHours,
} from "./openingHours";

export interface SiteSocial {
  instagram?: string;
  facebook?: string;
}

export interface SiteDetails {
  /**
   * Name des Betriebs, wie die Seite selbst ihn angibt: JSON-LD `name`,
   * sonst `og:site_name`. Beide Quellen pflegt der Betreiber (bzw. sein
   * Baukasten) bewusst — anders als die erste Seitenüberschrift, aus der der
   * Scrape-Flow schon „HERZLICH“ und „Reserviere hier online“ gemacht hat.
   */
  siteName?: string;
  /** Absolute Adresse des Logos, falls eines gefunden wurde. */
  logoUrl?: string;
  /** Einzeilig zusammengesetzt, z.B. "Spiekerhof 45, 48143 Münster". */
  address?: string;
  slogan?: string;
  description?: string;
  social?: SiteSocial;
  /**
   * Echte Öffnungszeiten aus den strukturierten Daten.
   *
   * Der n8n-Ablauf füllte hier Standardwerte ein (12:00–22:00), wenn sein
   * Ausdruck nicht traf – und das tat er bei der Form
   * "Monday,Tuesday,…,Sunday 11:30-23:00" nie. Die erste veröffentlichte Seite
   * zeigte damit ERFUNDENE Öffnungszeiten. Falsche sind schlimmer als keine.
   */
  openingHours?: WeekHours;
}

/** Macht aus einer möglicherweise relativen Adresse eine absolute. */
export function absolutize(url: string | undefined, baseUrl: string): string | undefined {
  const raw = (url ?? "").trim();
  if (!raw) return undefined;
  // Data-URIs sind für uns nutzlos: Sie lassen sich nicht in den eigenen
  // Speicher übernehmen und blähen die Konfiguration auf.
  if (/^data:/i.test(raw)) return undefined;
  try {
    return new URL(raw, baseUrl).toString();
  } catch {
    return undefined;
  }
}

/** Liest ein Meta-Attribut, egal ob es an name oder property hängt. */
function meta(html: string, key: string): string | undefined {
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)\\s*=\\s*["']${key}["'][^>]*>`,
    "i",
  );
  const tag = html.match(pattern)?.[0];
  if (!tag) return undefined;
  const value = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
  return value?.trim() || undefined;
}

/** Sammelt alle JSON-LD-Objekte der Seite, auch aus @graph. */
export function collectJsonLd(html: string): any[] {
  const out: any[] = [];
  const blocks = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  const walk = (node: any) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(walk);
    out.push(node);
    if (Array.isArray(node["@graph"])) node["@graph"].forEach(walk);
  };
  for (const block of blocks) {
    try {
      walk(JSON.parse(block[1].trim()));
    } catch {
      // Eine kaputte Auszeichnung darf die übrigen nicht mitreißen.
    }
  }
  return out;
}

const hasType = (node: any, ...types: string[]): boolean => {
  const t = node?.["@type"];
  const list = Array.isArray(t) ? t : [t];
  return list.some((x) => typeof x === "string" && types.includes(x));
};

/**
 * Setzt eine PostalAddress zu einer Zeile zusammen.
 *
 * Reihenfolge wie in Deutschland üblich: Straße, dann Postleitzahl und Ort.
 * Fehlende Teile werden ausgelassen statt durch Kommas markiert – eine Adresse
 * wie ", 48143 " sähe nach einem Fehler aus.
 */
export function formatAddress(node: any): string | undefined {
  if (!node) return undefined;
  if (typeof node === "string") return node.trim() || undefined;

  const street = String(node.streetAddress ?? "").trim();
  const zip = String(node.postalCode ?? "").trim();
  const city = String(node.addressLocality ?? "").trim();

  const cityLine = [zip, city].filter(Boolean).join(" ");
  const line = [street, cityLine].filter(Boolean).join(", ");
  return line || undefined;
}

/**
 * Macht aus dem HTML zeilenweisen Text – für die Rückfälle unten.
 *
 * Anlass: An fünf echten Gastronomie-Seiten gemessen liefern nur zwei
 * strukturierte Daten mit Adresse und Öffnungszeiten. Die übrigen schreiben
 * beides schlicht sichtbar in Fußzeile oder Kontaktbereich. Wer nur
 * schema.org liest, füllt die Web-App bei der Mehrheit der Betriebe nicht.
 */
export function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/?(br|p|div|li|tr|h[1-6]|section|article|td|span)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&auml;/gi, "ä").replace(/&ouml;/gi, "ö").replace(/&uuml;/gi, "ü")
    .replace(/&Auml;/g, "Ä").replace(/&Ouml;/g, "Ö").replace(/&Uuml;/g, "Ü")
    .replace(/&szlig;/gi, "ß")
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)))
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

/**
 * Sucht eine deutsche Anschrift im sichtbaren Text.
 *
 * Anker ist die fünfstellige Postleitzahl mit folgendem Ortsnamen – die ist
 * eindeutig genug, um nicht auf beliebige Zahlen hereinzufallen. Die Straße
 * steht davor, entweder in derselben oder in der Zeile darüber.
 *
 * Bewusst zurückhaltend: Ohne erkennbare Straße wird NICHTS zurückgegeben.
 * Eine Postleitzahl allein steht oft in ganz anderem Zusammenhang, und
 * "48143 Münster" ohne Straße nützt auf einer Restaurantseite niemandem.
 */
export function findAddressInText(text: string): string | undefined {
  // Postleitzahl + Ort.
  //
  // [ \t] statt \s ist wesentlich: \s umfasst den Zeilenumbruch, und dann
  // verschluckte der Ortsname die Folgezeile – aus "48143 Münster" wurde
  // "48143 Münster Öffnungszeiten:".
  //
  // Folgewörter müssen groß beginnen oder zu den üblichen Verbindern gehören
  // ("Frankfurt am Main"). Ohne diese Einschränkung galt "12345 Gästen
  // empfangen wir" als Anschrift.
  const ORTSWORT = "[A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ.-]*";
  const VERBINDER = "(?:am|an|der|im|a\\.|i\\.)";
  const plzRx = new RegExp(
    `\\b(\\d{5})[ \\t]+(${ORTSWORT}(?:[ \\t](?:${VERBINDER}|${ORTSWORT})){0,2})`,
    "g",
  );

  // Hausnummer: auch Bereiche und Zusätze – "12-18", "5a", "3 b".
  const HAUSNR = "\\d{1,4}(?:\\s?[-–/]\\s?\\d{1,4})?\\s?[a-zA-Z]?";
  const strasseRx = new RegExp(
    `(${ORTSWORT}(?:[ \\t]${ORTSWORT}){0,3})[ \\t]+(${HAUSNR})[ \\t]*$`,
  );
  const einzeiligRx = new RegExp(
    `([A-ZÄÖÜ][^,\\n]{2,50}?[ \\t]${HAUSNR})[ \\t]*,?[ \\t]*$`,
  );

  for (const m of text.matchAll(plzRx)) {
    const plzOrt = `${m[1]} ${m[2]}`.trim();
    const davor = text.slice(Math.max(0, m.index! - 120), m.index!);
    // Letzte nicht-leere Zeile vor der Postleitzahl – dort steht die Straße.
    const zeilen = davor.split(/\n/).map((z) => z.trim()).filter(Boolean);
    const kandidat = zeilen[zeilen.length - 1] ?? "";

    // Straße und Postleitzahl in EINER Zeile zuerst prüfen: "Am Hof 12-18,"
    // trägt die Hausnummer am Ende und würde sonst am strengeren Muster
    // darunter scheitern.
    const einzeilig = kandidat.match(einzeiligRx);
    if (einzeilig) return `${einzeilig[1].trim()}, ${plzOrt}`;

    const s = kandidat.match(strasseRx);
    if (s && s[1].length >= 3 && s[1].length <= 60) {
      return `${s[1].trim()} ${s[2].trim()}, ${plzOrt}`;
    }

    // Keine saubere Straße davor: Diese Postleitzahl gehört vermutlich gar
    // nicht zu einer Anschrift. Weitersuchen statt raten – "Seit 12345 Gästen"
    // galt sonst als Adresse, und "48143 Münster" allein nützt auf einer
    // Restaurantseite ohnehin niemandem.
  }
  return undefined;
}

/**
 * Sucht Öffnungszeiten im sichtbaren Text.
 *
 * Genommen wird jede Zeile, die eine Tagesangabe UND zwei Uhrzeiten enthält.
 * parseHoursLine entscheidet, ob daraus etwas wird – und erfindet nichts,
 * wenn die Tagesangabe fehlt.
 */
export function findHoursInText(text: string): WeekHours {
  const out: WeekHours = {};
  const zeilenRx =
    /^[^\n]{0,120}?(?:Mo|Di|Mi|Do|Fr|Sa|So|Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[^\n]{0,120}$/gim;
  for (const m of text.matchAll(zeilenRx)) {
    const zeile = m[0];
    if ((zeile.match(/\d{1,2}[:.]\d{2}/g) ?? []).length < 2) continue;
    for (const [tag, zeiten] of Object.entries(parseHoursLine(zeile))) {
      // Die erste Angabe je Tag gewinnt: Weiter unten stehen oft
      // Sonderzeiten (Küche, Feiertage), die nicht die Öffnungszeit sind.
      if (!out[tag]) out[tag] = zeiten;
    }
  }
  return out;
}

/** Erkennt ein Bild, das nach einem Logo aussieht. */
function findLogoInMarkup(html: string): string | undefined {
  // 1. Ausdrücklich als Symbol ausgezeichnet – am verlässlichsten.
  for (const rel of ["apple-touch-icon", "icon", "shortcut icon"]) {
    const tag = html.match(
      new RegExp(`<link[^>]+rel\\s*=\\s*["'][^"']*${rel}[^"']*["'][^>]*>`, "i"),
    )?.[0];
    const href = tag?.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    if (href) return href;
  }

  // 2. Ein Bild, das sich selbst Logo nennt.
  for (const img of html.matchAll(/<img[^>]*>/gi)) {
    const tag = img[0];
    if (!/logo/i.test(tag)) continue;
    // data-src VOR src: Lazy-Loading-Themes lassen in src einen Platzhalter
    // stehen (ein transparentes GIF) und legen die echte Adresse nach
    // data-src. Andersherum bekäme man den Platzhalter statt des Logos.
    const src =
      tag.match(/\bdata-src\s*=\s*["']([^"']+)["']/i)?.[1] ??
      tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (src) return src;
  }

  return undefined;
}

/**
 * Wertet das HTML einer Seite aus.
 *
 * Reihenfolge der Quellen ist Absicht: strukturierte Daten zuerst (dort steht
 * es sauber getrennt), danach Metaangaben, zuletzt Markup-Heuristik. So gewinnt
 * immer die zuverlässigste vorhandene Quelle.
 */
export function extractSiteDetails(html: string, baseUrl: string): SiteDetails {
  const details: SiteDetails = {};
  const nodes = collectJsonLd(html);

  // ── Strukturierte Daten ──────────────────────────────────────────────────
  const business = nodes.find((n) =>
    hasType(n, "Restaurant", "LocalBusiness", "FoodEstablishment", "CafeOrCoffeeShop", "BarOrPub", "Organization"),
  );

  if (business) {
    if (typeof business.name === "string" && business.name.trim()) {
      details.siteName = business.name.trim();
    }

    const address = formatAddress(business.address);
    if (address) details.address = address;

    const logo =
      typeof business.logo === "string" ? business.logo : business.logo?.url;
    const fromLd = absolutize(logo, baseUrl);
    if (fromLd) details.logoUrl = fromLd;

    if (typeof business.slogan === "string" && business.slogan.trim()) {
      details.slogan = business.slogan.trim();
    }
    if (typeof business.description === "string" && business.description.trim()) {
      details.description = business.description.trim();
    }

    // Echte Öffnungszeiten – nur übernehmen, wenn sie eine Woche ergeben.
    const hours = parseSchemaOpeningHours(business);
    if (hoursQuality(hours).usable) details.openingHours = hours;

    const sameAs: string[] = Array.isArray(business.sameAs)
      ? business.sameAs
      : business.sameAs
        ? [business.sameAs]
        : [];
    for (const link of sameAs) {
      const url = String(link);
      if (/instagram\.com/i.test(url)) (details.social ??= {}).instagram = url;
      if (/facebook\.com/i.test(url)) (details.social ??= {}).facebook = url;
    }
  }

  // ── Metaangaben ──────────────────────────────────────────────────────────
  if (!details.siteName) {
    details.siteName = meta(html, "og:site_name");
  }
  if (!details.description) {
    details.description = meta(html, "og:description") ?? meta(html, "description");
  }
  if (!details.logoUrl) {
    details.logoUrl = absolutize(meta(html, "og:image"), baseUrl);
  }

  // ── Markup-Heuristik ─────────────────────────────────────────────────────
  if (!details.logoUrl) {
    details.logoUrl = absolutize(findLogoInMarkup(html), baseUrl);
  }

  // ── Sichtbarer Text als Rückfall ─────────────────────────────────────────
  //
  // An fünf echten Gastronomie-Seiten gemessen liefern nur zwei strukturierte
  // Daten. Die übrigen schreiben Adresse und Öffnungszeiten schlicht in die
  // Fußzeile. Ohne diesen Rückfall bliebe die erzeugte Web-App bei der
  // Mehrheit der Betriebe halb leer.
  if (!details.address || !details.openingHours) {
    const text = visibleText(html);
    if (!details.address) {
      const address = findAddressInText(text);
      if (address) details.address = address;
    }
    if (!details.openingHours) {
      const hours = findHoursInText(text);
      if (hoursQuality(hours).usable) details.openingHours = hours;
    }
  }

  // Soziale Netze aus gewöhnlichen Links, falls sameAs fehlte.
  if (!details.social?.instagram || !details.social?.facebook) {
    for (const a of html.matchAll(/<a[^>]+href\s*=\s*["']([^"']+)["']/gi)) {
      const href = a[1];
      if (!details.social?.instagram && /(?:^|\/\/|\.)instagram\.com\//i.test(href)) {
        const url = absolutize(href, baseUrl);
        if (url) (details.social ??= {}).instagram = url;
      }
      if (!details.social?.facebook && /(?:^|\/\/|\.)facebook\.com\//i.test(href)) {
        const url = absolutize(href, baseUrl);
        if (url) (details.social ??= {}).facebook = url;
      }
    }
  }

  return details;
}

/** Wurde überhaupt etwas gefunden? Für die Anzeige. */
export function describeSiteDetails(details: SiteDetails): string[] {
  const parts: string[] = [];
  if (details.logoUrl) parts.push("Logo");
  if (details.address) parts.push(`Adresse: ${details.address}`);
  if (details.slogan) parts.push("Slogan");
  if (details.openingHours) {
    parts.push(`${Object.keys(details.openingHours).length} Öffnungstage`);
  }
  if (details.social?.instagram) parts.push("Instagram");
  if (details.social?.facebook) parts.push("Facebook");
  return parts;
}
