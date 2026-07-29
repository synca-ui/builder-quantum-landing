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

export interface SiteSocial {
  instagram?: string;
  facebook?: string;
}

export interface SiteDetails {
  /** Absolute Adresse des Logos, falls eines gefunden wurde. */
  logoUrl?: string;
  /** Einzeilig zusammengesetzt, z.B. "Spiekerhof 45, 48143 Münster". */
  address?: string;
  slogan?: string;
  description?: string;
  social?: SiteSocial;
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
  if (details.social?.instagram) parts.push("Instagram");
  if (details.social?.facebook) parts.push("Facebook");
  return parts;
}
