/**
 * Macht aus einem gescrapten Entwurf etwas, das POST /api/webapps/apps/publish
 * annimmt – ohne dass jemand den manuellen Konfigurator durchläuft.
 *
 * Der Publish-Endpunkt lehnt eine Konfiguration ab, solange drei Felder fehlen
 * (validatePublishData in server/routes/webapps.ts):
 *
 *   business.name    – mindestens zwei Zeichen
 *   business.type    – irgendein nicht-leerer Wert
 *   design.template  – irgendein nicht-leerer Wert
 *
 * Der Scrape liefert die letzten beiden nicht zuverlässig: businessType nur,
 * wenn die Seite es hergibt, und template nur, wenn der Flow eine Vorlage
 * geraten hat. Ohne Ersatzwerte bräche der automatische Modus also am Ende
 * einer minutenlangen Analyse mit "Geschäftstyp ist erforderlich" ab – für
 * einen Modus, dessen ganzer Zweck es ist, keine Eingaben zu verlangen.
 *
 * Diese Funktion setzt deshalb Standardwerte, sagt aber ausdrücklich, welche.
 * Die Oberfläche zeigt das an: Geraten und geraten-und-verschwiegen sind zwei
 * verschiedene Dinge, und der Betreiber muss wissen, was er da veröffentlicht.
 *
 * Rein und ohne Seiteneffekte, damit es ohne Netz und ohne React prüfbar ist.
 */
import {
  FALLBACK_TEMPLATE,
  type ConfiguratorDraft,
  type ContactInfo,
  type ContentData,
  type DesignConfig,
  type BusinessInfo,
  type MenuItem,
} from "./suggestedConfig";

/**
 * Derselbe Wert, auf den client/lib/normalizeConfig.ts fällt, wenn kein Typ
 * gesetzt ist. Bewusst gleichgezogen: Sonst veröffentlicht der automatische
 * Modus mit einem Typ, den der Renderer anschließend anders auslegt.
 */
export const FALLBACK_BUSINESS_TYPE = "restaurant";

/** Mindestlänge des Betriebsnamens, wie validatePublishData sie prüft. */
export const MIN_BUSINESS_NAME_LENGTH = 2;

/** Die verschachtelte Form, die der Publish-Endpunkt erwartet. */
export interface PublishConfig {
  business: Partial<BusinessInfo>;
  design: Partial<DesignConfig>;
  content: Partial<ContentData>;
  contact: Partial<ContactInfo>;
  features?: {
    reservationsEnabled?: boolean;
    /** Buchungsadresse des bestehenden Systems – siehe FeatureFlags. */
    reservationUrl?: string;
    reservationProvider?: string;
  };
}

// ─── Farben: aus der gescrapten Palette ableiten ─────────────────────────────
//
// An der ersten echten Veröffentlichung gemessen: Der Scrape lieferte Bordeaux
// (#660c21), Gold (#b8860a) und Creme (#f1e5d0) – ausgeliefert wurde trotzdem
// eine LILA Kopfzeile (#5e30eb) mit grünen Preisen (#059669). Grund: Der
// automatische Modus setzte nur die drei Grundfarben, und für alles Weitere
// griffen die Standardwerte des Servers (configurations.ts), die von der
// Marke des Betriebs nichts wissen.

/** Relative Leuchtdichte nach WCAG. 0 = schwarz, 1 = weiß. */
export function relativeLuminance(hex: string): number {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const channel = (i: number) => {
    const v = parseInt(full.slice(i * 2, i * 2 + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

/** Kontrastverhältnis zweier Farben nach WCAG (1 bis 21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Dunkle oder helle Schrift, je nachdem, was auf dem Grund lesbar ist. */
export function readableTextOn(background: string): string {
  return relativeLuminance(background) > 0.4 ? "#1f2937" : "#f8f7f4";
}

/** Untergrenze für Fließtext nach WCAG AA. */
const MIN_CONTRAST = 4.5;

// ─── A4.1: Der Hintergrund ist nie grell ─────────────────────────────────────

function hexZuRgb(hex: string): [number, number, number] | null {
  const raw = hex.replace("#", "").trim();
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function rgbZuHex(r: number, g: number, b: number): string {
  const teil = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${teil(r)}${teil(g)}${teil(b)}`;
}

/** RGB (0–255) nach HSL (h in Grad, s und l als 0–1). */
export function rgbZuHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
  else if (max === gn) h = ((bn - rn) / d + 2) * 60;
  else h = ((rn - gn) / d + 4) * 60;
  return [h, s, l];
}

/** HSL zurück nach RGB. */
export function hslZuRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const kanal = (t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const hn = h / 360;
  return [kanal(hn + 1 / 3) * 255, kanal(hn) * 255, kanal(hn - 1 / 3) * 255];
}

/**
 * Buntheit einer Farbe (0 = grau, 1 = maximal bunt).
 *
 * Nicht die HSL-Sättigung allein: Creme (#f1e5d0) hat eine Sättigung von 0,55
 * und wirkt trotzdem weich, weil es sehr hell ist. Ein Signalrot mit derselben
 * Sättigung bei mittlerer Helligkeit ist grell. Erst das Produkt aus beidem
 * beschreibt, was das Auge als "grell" liest.
 */
export function buntheit(s: number, l: number): number {
  return (1 - Math.abs(2 * l - 1)) * s;
}

/** Ab hier gilt ein Hintergrund als grell. */
const MAX_BUNTHEIT = 0.18;
/** Zielhelligkeit für helle Hintergründe. */
const HELL_ZIEL = 0.93;
/** Zielhelligkeit für dunkle Hintergründe (bewusste dunkle Gestaltung). */
const DUNKEL_ZIEL = 0.16;
/** Ab dieser Helligkeit gilt ein Hintergrund als hell gemeint. */
const DUNKEL_GRENZE = 0.3;

/**
 * Macht aus einer beliebigen gescrapten Farbe einen Hintergrund, der nie grell
 * ist — mit derselben Grundfarbe, damit die Marke erkennbar bleibt.
 *
 * A4.1 aus dem Feedback vom 6.8.2026: "Hintergrundfarbe nie grell — immer eine
 * weiche Farbe. Als Regel im Code, nicht als Zufall." Genau das war das
 * Problem: Der Scrape nimmt die auffälligste Farbe des Stylesheets, und das ist
 * auf einer Restaurantseite regelmäßig die Signalfarbe eines Knopfes. Als
 * vollflächiger Hintergrund ist ein sattes Rot oder Grün unlesbar und billig.
 *
 * Regel: Der Farbton bleibt immer. Ist die Buntheit über der Grenze, wird die
 * Helligkeit an den hellen oder dunklen Rand gezogen und die Sättigung nur so
 * weit gesenkt, wie danach noch nötig ist.
 *
 * Dunkel gemeinte Hintergründe bleiben dunkel: Ein Steakhaus mit
 * anthrazitfarbener Seite soll nicht plötzlich weiß werden.
 *
 * Farben, die schon weich sind, kommen buchstabengleich zurück — sonst wandert
 * eine bewusst gesetzte Farbe (Creme #f1e5d0) bei jedem Lauf ein wenig.
 */
export function softenBackground(hex?: string): string | undefined {
  if (!hex) return undefined;
  const rgb = hexZuRgb(hex);
  if (!rgb) return undefined;

  const [h, s, l] = rgbZuHsl(...rgb);
  if (buntheit(s, l) <= MAX_BUNTHEIT) return hex;

  const neueHelligkeit = l < DUNKEL_GRENZE ? DUNKEL_ZIEL : HELL_ZIEL;
  // Wie viel Sättigung an dieser Helligkeit noch in die Grenze passt.
  const spielraum = 1 - Math.abs(2 * neueHelligkeit - 1);
  const neueSaettigung = Math.min(s, MAX_BUNTHEIT / spielraum);

  return rgbZuHex(...hslZuRgb(h, neueSaettigung, neueHelligkeit));
}

/**
 * Füllt die abgeleiteten Farben, wo der Scrape nur die Grundpalette liefert.
 *
 * Regeln: Kopfzeile auf dem Seitenhintergrund, Schrift darin in der
 * Primärfarbe – außer sie ist darauf unleserlich, dann schlicht dunkel/hell.
 * Preise in der Sekundärfarbe (statt des markenfremden Standard-Grüns), mit
 * demselben Lesbarkeits-Rückfall. Bereits gesetzte Werte bleiben unberührt.
 */
export function deriveCohesiveColors(
  design: Partial<DesignConfig>,
): Partial<DesignConfig> {
  const out = { ...design };
  // A4.1: Der Hintergrund wird hier entschärft, BEVOR die übrigen Farben
  // daraus abgeleitet werden. Sonst rechnet der Rest gegen einen Grund, der so
  // nie ausgeliefert wird, und die Kontrastprüfungen unten stimmen nicht mehr.
  const weich = softenBackground(out.backgroundColor);
  if (weich) out.backgroundColor = weich;
  const background = out.backgroundColor ?? "#FFFFFF";

  if (!out.fontColor) out.fontColor = readableTextOn(background);
  if (!out.headerBackgroundColor) out.headerBackgroundColor = background;

  if (!out.headerFontColor) {
    const wish = out.primaryColor;
    out.headerFontColor =
      wish && contrastRatio(wish, out.headerBackgroundColor) >= MIN_CONTRAST
        ? wish
        : readableTextOn(out.headerBackgroundColor);
  }

  if (!out.priceColor) {
    const candidates = [out.secondaryColor, out.primaryColor].filter(
      (c): c is string => Boolean(c),
    );
    out.priceColor =
      candidates.find((c) => contrastRatio(c, background) >= MIN_CONTRAST) ??
      readableTextOn(background);
  }

  return out;
}

// ─── Highlights: die drei Aushängeschilder der Startseite ────────────────────

/**
 * Kategorien, deren Gerichte als Aushängeschild taugen. Getränke tun das
 * nicht: Niemand wirbt auf der Startseite mit einer Cola.
 */
const HIGHLIGHT_CATEGORIES = new Set([
  "Hauptgerichte", "Fisch", "Vom Grill", "Schnitzel", "Vegetarisch",
  "Pasta", "Pizza", "Burger", "Vorspeisen",
]);

const DRINK_CATEGORIES = new Set([
  "Getränke", "Weine", "Biere", "Cocktails", "Heißgetränke",
]);

/**
 * Markiert die drei Gerichte, die die Startseite zeigen soll.
 *
 * Anlass: AppRenderer zeigt als "Highlights" die markierten Gerichte – und
 * füllt ohne Markierung mit ZUFÄLLIGEN auf. Bei der ersten echten Karte (141
 * Positionen, davon 71 Getränke) bestand die Startseite damit meist aus
 * Getränken. Niemand hatte die Markierung je gesetzt.
 *
 * Gewählt wird nach einfachen, erklärbaren Signalen: Hauptgericht-Kategorie,
 * vorhandene Beschreibung (der Wirt fand das Gericht erklärenswert), Preis im
 * oberen Bereich. Die Reihenfolge der Karte bleibt unverändert – nur die
 * Markierung kommt dazu.
 */
export function markHighlights(items: MenuItem[], count = 3): MenuItem[] {
  if (!items.length) return items;

  const prices = items
    .map((i) => parseFloat(String(i.price ?? "")))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  const median = prices.length ? prices[Math.floor(prices.length / 2)] : 0;

  const score = (item: MenuItem): number => {
    let s = 0;
    const category = item.category ?? "";
    if (HIGHLIGHT_CATEGORIES.has(category)) s += 3;
    if (DRINK_CATEGORIES.has(category)) s -= 5;
    if (item.description) s += 2;
    const price = parseFloat(String(item.price ?? ""));
    if (Number.isFinite(price) && price >= median) s += 1;
    return s;
  };

  const chosen = new Set(
    items
      .map((item, index) => ({ item, index, s: score(item) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.index - b.index)
      .slice(0, count)
      .map((x) => x.item.id),
  );

  if (!chosen.size) return items;
  return items.map((item) =>
    chosen.has(item.id) ? { ...item, isHighlight: true } : item,
  );
}

export interface BuildPublishConfigResult {
  /** null, wenn ein Pflichtfeld fehlt, das sich nicht ersetzen lässt. */
  config: PublishConfig | null;
  /**
   * Felder, die nicht aus dem Scrape stammen, sondern aus einem Standardwert.
   * Für die Anzeige – der Nutzer soll sehen, was geraten wurde.
   */
  defaulted: string[];
  /** Warum sich nichts bauen ließ. Leer, wenn config gesetzt ist. */
  blocking: string[];
}

/**
 * Seiten müssen hier NICHT gesetzt werden.
 *
 * AppRenderer (client/components/dynamic/AppRenderer.tsx, "AUTO-DISCOVERY")
 * blendet Speisekarte, Galerie und Kontakt von selbst ein, sobald die
 * entsprechenden Daten vorliegen. Eine selectedPages-Liste mitzuschicken würde
 * daran nichts verbessern und wäre eine zweite Wahrheit über dieselbe Frage.
 */
export interface BuildPublishOptions {
  /**
   * Reservierungen einschalten – gesetzt, wenn der Scrape auf der Website
   * eine Reservierungsmöglichkeit erkannt hat (ScraperJob.hasReservation).
   * Die Formular-Einzelheiten (Zeitfenster, Vorlauf) kommen aus den
   * Server-Standardwerten; hier fällt nur die Grundsatzentscheidung.
   */
  enableReservations?: boolean;
  /**
   * Das BESTEHENDE Buchungssystem des Betriebs (shared/reservation.ts).
   * Ist es bekannt, wird dorthin verlinkt statt ein eigenes Formular
   * anzubieten – sonst liefen Buchungen durch zwei Systeme, die
   * voneinander nichts wissen, und derselbe Tisch würde zweimal vergeben.
   */
  reservation?: { provider: string; url: string } | null;
}

export function buildPublishConfig(
  draft: ConfiguratorDraft | null | undefined,
  options: BuildPublishOptions = {},
): BuildPublishConfigResult {
  if (!draft) {
    return { config: null, defaulted: [], blocking: ["Kein Analyseergebnis"] };
  }

  const blocking: string[] = [];
  const defaulted: string[] = [];

  const name = draft.business.name?.trim() ?? "";
  if (name.length < MIN_BUSINESS_NAME_LENGTH) {
    // Nicht ersetzbar: Ein erfundener Betriebsname stünde anschließend auf
    // einer öffentlich erreichbaren Seite.
    blocking.push(
      "Der Name des Betriebs wurde nicht gefunden – ohne ihn lässt sich nichts veröffentlichen.",
    );
  }

  let type = draft.business.type?.trim() ?? "";
  if (!type) {
    type = FALLBACK_BUSINESS_TYPE;
    defaulted.push(`Geschäftstyp: „${FALLBACK_BUSINESS_TYPE}“ angenommen`);
  }

  let template = draft.design.template?.trim() ?? "";
  if (!template) {
    template = FALLBACK_TEMPLATE;
    defaulted.push(`Vorlage: „${FALLBACK_TEMPLATE}“ angenommen`);
  }

  if (blocking.length) return { config: null, defaulted, blocking };

  // Abgeleitete Farben und Highlight-Markierung – siehe die Funktionen oben.
  const design = deriveCohesiveColors({ ...draft.design, template });
  const content: Partial<ContentData> = { ...draft.content };
  if (content.menuItems?.length) {
    content.menuItems = markHighlights(content.menuItems as MenuItem[]);
  }

  const config: PublishConfig = {
    // Der Entwurf wird durchgereicht, die drei Pflichtfelder überschrieben.
    // Reihenfolge ist wichtig: erst der Scrape, dann die Ersatzwerte.
    business: { ...draft.business, name, type },
    design,
    content,
    contact: { ...draft.contact },
  };

  // Ein bestehendes System hat Vorrang: verlinken statt ersetzen.
  if (options.reservation) {
    config.features = {
      reservationsEnabled: true,
      reservationUrl: options.reservation.url,
      reservationProvider: options.reservation.provider,
    };
  } else if (options.enableReservations) {
    config.features = { reservationsEnabled: true };
  }

  return { config, defaulted, blocking: [] };
}

/**
 * Zählt die Bilder im Entwurf, die noch auf fremdem Hosting liegen.
 *
 * Der Scrape sammelt Galeriebilder als URLs der analysierten Website ein und
 * reicht sie unverändert weiter (siehe die Warnung in mapGallery). Wird so
 * veröffentlicht, hängt die ausgelieferte Web-App an fremdem Hosting: Die
 * Bilder verschwinden, sobald die Quelle sie umbenennt, und jeder Aufruf
 * meldet dem fremden Server, wer die Seite besucht.
 *
 * Deshalb wird die Zahl in der Oberfläche genannt, statt sie zu verschweigen.
 */
export function countExternalImages(
  draft: ConfiguratorDraft | null | undefined,
  ownHostPatterns: string[] = ["supabase.co", "maitr.de"],
): number {
  const gallery = draft?.content?.gallery ?? [];
  return gallery.filter((image) => {
    const url = image?.url ?? "";
    if (!/^https?:\/\//i.test(url)) return false;
    return !ownHostPatterns.some((host) => url.includes(host));
  }).length;
}
