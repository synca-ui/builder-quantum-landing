/**
 * Macht aus dem Text einer Speisekarte einzelne Gerichte.
 *
 * Das ist das Herzstück des automatischen Modus: Ob am Ende eine brauchbare
 * Web-App herauskommt, hängt fast vollständig daran, ob die Karte erkannt wird.
 * Alles andere (Name, Farben, Öffnungszeiten) ist vergleichsweise leicht.
 *
 * Die Eingabe kommt aus drei Quellen und sieht jedes Mal etwas anders aus:
 *   - Gemini-OCR über ein Foto oder ein PDF der Karte
 *   - direkt aus einem PDF gezogener Text
 *   - aus dem HTML einer Menü-Seite geschälter Text
 * Deshalb arbeitet dieser Parser rein auf Text, ohne Netz und ohne Kenntnis der
 * Herkunft – und ist damit vollständig prüfbar.
 *
 * Vorgänger war ein einzeiliger Ausdruck im n8n-Knoten "Code: Text-PDF → Menü".
 * Der scheiterte an vier Dingen, die auf echten deutschen Karten die Regel sind:
 *   1. "12,-" statt "12,00" – die übliche Schreibweise, wurde nie erkannt
 *   2. Preis in der nächsten Zeile (zweispaltige Karten, OCR trennt die Spalten)
 *   3. Führungspunkte: "Schnitzel .......... 12,50" landeten mit im Namen
 *   4. IDs aus Date.now()+Math.random() – bei jedem erneuten Scrape andere IDs,
 *      dieselben Gerichte galten dadurch als neu
 */

export interface ParsedMenuItem {
  id: string;
  name: string;
  description?: string;
  /** Normalisiert auf Punkt als Dezimaltrenner, z.B. "12.50". */
  price?: string;
  category?: string;
}

/** Unter- und Obergrenze, außerhalb derer eine Zahl kein Preis sein kann. */
const MIN_PRICE = 0.5;
const MAX_PRICE = 300;

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 200;

/**
 * Überschriften erkennen. Reihenfolge zählt: Die erste Übereinstimmung gewinnt,
 * deshalb steht das Spezifische vor dem Allgemeinen ("Kaffee" vor "Warme
 * Getränke" wäre falsch herum).
 */
const CATEGORY_PATTERNS: Array<[RegExp, string]> = [
  [/vorspeis|antipast|starter|appetizer|kleinigkeit|zum\s+anfang/i, "Vorspeisen"],
  [/suppe|soup|eintopf|brühe/i, "Suppen"],
  [/salat|salad|bowl/i, "Salate"],
  [/pizz/i, "Pizza"],
  [/pasta|nudel|spaghetti|penne|lasagne/i, "Pasta"],
  [/burger/i, "Burger"],
  [/sandwich|wrap|toast|baguette|panini/i, "Sandwiches"],
  [/schnitzel/i, "Schnitzel"],
  [/steak|vom\s+grill|grillgerich/i, "Vom Grill"],
  [/fisch|fish|meeresfrüchte|seafood/i, "Fisch"],
  [/vegetarisch|vegan|veggie/i, "Vegetarisch"],
  [/beilage|side\s?dish/i, "Beilagen"],
  [/dessert|nachspeise|nachtisch|kuchen|eis\b|süßspeis/i, "Desserts"],
  [/frühstück|breakfast|brunch/i, "Frühstück"],
  [/kaffee|coffee|tee\b|heißgetränk|warme\s+getränk/i, "Heißgetränke"],
  [/wein|wine|schorle/i, "Weine"],
  [/bier|beer|vom\s+fass/i, "Biere"],
  [/cocktail|longdrink|spirituos|schnaps|aperitif/i, "Cocktails"],
  [/getränk|drink|alkoholfrei|limonade|softdrink/i, "Getränke"],
  [/snack|fingerfood/i, "Snacks"],
  [/haupt(gericht|speise)|main\s?(course|dish)|fleisch|geflügel|klassiker|spezialität/i, "Hauptgerichte"],
];

const DEFAULT_CATEGORY = "Hauptgerichte";

/**
 * Zeilen, die nie ein Gericht sind – Fußzeilen, Hinweise, Öffnungszeiten.
 * Ohne diese Liste erzeugt jede Karte mit "Preise inkl. 19% MwSt." ein Gericht
 * namens "Preise inkl." zum Preis von 19,00 €.
 */
const NOISE_PATTERNS: RegExp[] = [
  /\bmwst\b|mehrwertsteuer|inkl\.\s*\d+\s*%|zzgl\./i,
  /\böffnungszeit|\bruhetag|\bküche\s+(bis|von)\b/i,
  /\ballergen|\bzusatzstoff|\bkennzeichnung/i,
  /^\s*(tel|telefon|fon|fax|e-?mail|www\.|http)/i,
  /\bseite\s+\d+\b|^\s*\d+\s*\/\s*\d+\s*$/i,
  /\bpfand\b|\bcorkage\b|\bkorkgeld\b/i,
  /\bab\s+\d+\s+personen\b|\bmindestens\b/i,
];

/** Zeitangaben und Telefonnummern dürfen nicht als Preis durchgehen. */
const TIME_CONTEXT = /\b\d{1,2}[.:]\d{2}\s*(uhr|h\b|am\b|pm\b)/i;

/**
 * Führungspunkte, Trennlinien und Aufzählungszeichen, die zwischen Name und
 * Preis stehen: "Wiener Schnitzel .......... 18,90".
 */
const LEADER_CHARS = /[.…·•∙‧・\-–—_|~*]{2,}\s*$/;

/** Allergenkennzeichnung am Ende: "(1,2,3)", "(A, C)", "¹²", "*", "**". */
const ALLERGEN_SUFFIX = /(?:\s*\((?:[0-9A-Za-z]{1,3})(?:\s*[,;.]\s*[0-9A-Za-z]{1,3})*\)|\s*[¹²³⁴⁵⁶⁷⁸⁹\*†‡]+)\s*$/;

interface PriceHit {
  /** Auf Punkt normalisiert, immer mit zwei Nachkommastellen. */
  value: string;
  start: number;
  end: number;
}

/**
 * Stabile, herkunftsbezogene ID – gleiche Karte, gleiche IDs.
 * Bewusst identisch zu slugId in shared/suggestedConfig.ts aufgebaut, damit
 * Gerichte aus beiden Wegen beim Zusammenführen zusammenfallen.
 */
function slugId(prefix: string, value: string, index: number): string {
  const slug = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${prefix}-${index}-${slug || "item"}`;
}

/**
 * Findet alle Preise in einer Zeile.
 *
 * Drei Schreibweisen müssen durch, alle drei kommen auf deutschen Karten vor:
 *   "12,50" / "12.50"   – mit Nachkommastellen
 *   "12,-" / "12,–"     – der Strich steht für ",00"
 *   "€ 12" / "12 EUR"   – ohne Nachkommastellen, nur mit Währung erkennbar
 *
 * Ohne Währungszeichen wird eine nackte ganze Zahl NICHT als Preis gewertet:
 * "Pizza mit 4 Sorten Käse" enthält sonst einen Preis von 4,00 €.
 */
export function findPrices(line: string): PriceHit[] {
  const hits: PriceHit[] = [];
  if (TIME_CONTEXT.test(line)) return hits;

  // 1) Zahl mit Nachkommastellen oder Strich, Währung optional davor/dahinter
  const withDecimals = /(?:(€|EUR)\s*)?(\d{1,3})[.,](\d{2}|[-–—])\s*(€|EUR)?/gi;
  // 2) Ganze Zahl, aber nur MIT Währungszeichen
  const currencyOnly = /(?:(€|EUR)\s*(\d{1,3})(?![.,]?\d)|(\d{1,3})\s*(€|EUR))/gi;

  const claimed: Array<[number, number]> = [];
  const overlaps = (s: number, e: number) =>
    claimed.some(([cs, ce]) => s < ce && e > cs);

  for (const m of line.matchAll(withDecimals)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    // Teil einer längeren Ziffernfolge? Dann Telefonnummer/PLZ, kein Preis.
    if (/\d/.test(line[start - 1] ?? "")) continue;
    if (/\d/.test(line[end] ?? "")) continue;
    const cents = /^[-–—]$/.test(m[3]) ? "00" : m[3];
    const value = `${m[2]}.${cents}`;
    if (!inRange(value)) continue;
    claimed.push([start, end]);
    hits.push({ value, start, end });
  }

  for (const m of line.matchAll(currencyOnly)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    if (overlaps(start, end)) continue;
    const digits = m[2] ?? m[3];
    if (!digits) continue;
    const value = `${digits}.00`;
    if (!inRange(value)) continue;
    claimed.push([start, end]);
    hits.push({ value, start, end });
  }

  return hits.sort((a, b) => a.start - b.start);
}

function inRange(value: string): boolean {
  const n = parseFloat(value);
  return Number.isFinite(n) && n >= MIN_PRICE && n <= MAX_PRICE;
}

/** Säubert den Textteil vor dem Preis zu einem Gerichtnamen. */
export function cleanItemName(raw: string): string {
  let name = raw
    .replace(LEADER_CHARS, " ")
    .replace(/[.…·•∙]{3,}/g, " ")
    .replace(/^[\s\-–—•*·|>»]+/, "")
    .replace(/[\s\-–—•*·|]+$/, "")
    .trim();
  // Allergenklammern mehrfach abtragen: "Schnitzel (1,2) *"
  for (let i = 0; i < 3; i++) {
    const next = name.replace(ALLERGEN_SUFFIX, "").trim();
    if (next === name) break;
    name = next;
  }
  return name.replace(/\s{2,}/g, " ").trim();
}

function isNoise(line: string): boolean {
  return NOISE_PATTERNS.some((rx) => rx.test(line));
}

/**
 * Erkennt eine Kategorie-Überschrift.
 *
 * Zwei Wege, weil Karten es unterschiedlich halten: entweder ein bekanntes
 * Stichwort ("Vorspeisen"), oder eine kurze Zeile in Großbuchstaben ohne Preis
 * ("UNSERE KLASSIKER"). Zeilen mit Preis sind nie Überschriften.
 */
export function detectCategory(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 60) return null;
  if (findPrices(trimmed).length > 0) return null;
  if (isNoise(trimmed)) return null;

  for (const [rx, name] of CATEGORY_PATTERNS) {
    if (rx.test(trimmed)) return name;
  }

  // Großbuchstaben-Überschrift ohne bekanntes Stichwort: als eigene Kategorie
  // übernehmen, statt sie zu verwerfen – Karten erfinden gern eigene Namen.
  const letters = trimmed.replace(/[^A-Za-zÄÖÜäöüß]/g, "");
  if (
    letters.length >= 3 &&
    letters === letters.toUpperCase() &&
    trimmed.split(/\s+/).length <= 5
  ) {
    return titleCase(trimmed);
  }

  return null;
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1))
    .trim();
}

/**
 * Taugt die Zeile als Beschreibung zum Gericht darüber?
 *
 * Beschreibungen haben keinen Preis, sind länger als ein Wort und keine
 * Überschrift. Ohne die Längenobergrenze zieht ein Fließtext-Absatz am Ende der
 * Karte als "Beschreibung" in das letzte Gericht.
 */
function looksLikeDescription(line: string): boolean {
  const t = line.trim();
  if (t.length < 4 || t.length > MAX_DESCRIPTION_LENGTH) return false;
  if (findPrices(t).length > 0) return false;
  if (detectCategory(t)) return false;
  if (isNoise(t)) return false;
  return /\s/.test(t); // mindestens zwei Wörter
}

export interface ParseOptions {
  /** Präfix der erzeugten IDs, z.B. "ocr" oder "pdf". */
  idPrefix?: string;
}

/**
 * Zerlegt den Text einer Speisekarte in Gerichte.
 *
 * Vorgehen je Zeile:
 *   1. Rauschen und Überschriften abfangen (Überschrift setzt die Kategorie)
 *   2. Preise suchen. Steht einer in der Zeile, ist der Text davor der Name.
 *   3. Steht der Preis ALLEIN in der Zeile, gehört er zum Namen aus der
 *      vorherigen Zeile – so sehen zweispaltige Karten nach der OCR aus.
 *   4. Die Folgezeile wird zur Beschreibung, wenn sie wie eine aussieht.
 *
 * Doppelte Gerichte werden zusammengeführt: Karten wiederholen Positionen gern
 * (Tagesempfehlung und Hauptteil), und zweimal dasselbe Gericht in der Web-App
 * sieht nach einem Fehler aus.
 */
export function parseMenuText(
  text: string,
  options: ParseOptions = {},
): ParsedMenuItem[] {
  const prefix = options.idPrefix ?? "menu";
  if (typeof text !== "string" || !text.trim()) return [];

  const lines = text.split(/\r\n|\r|\n/);
  const items: ParsedMenuItem[] = [];
  const seen = new Set<string>();
  let category = DEFAULT_CATEGORY;
  /** Name aus einer preislosen Zeile, falls der Preis erst darunter steht. */
  let pendingName: string | null = null;
  /** Beschreibung zwischen diesem Namen und seinem Preis (zweispaltige Karten). */
  let pendingDescription: string | null = null;

  const clearPending = () => {
    pendingName = null;
    pendingDescription = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || isNoise(line)) {
      clearPending();
      continue;
    }

    const heading = detectCategory(line);
    if (heading) {
      category = heading;
      clearPending();
      continue;
    }

    const prices = findPrices(line);
    if (prices.length === 0) {
      const candidate = cleanItemName(line);
      const usable =
        candidate.length >= MIN_NAME_LENGTH &&
        candidate.length <= MAX_NAME_LENGTH;

      // Steht schon ein Name an und diese Zeile liest sich wie eine
      // Beschreibung, gehört sie dazu – in zweispaltigen Karten steht sie
      // ZWISCHEN Name und Preis, nicht dahinter.
      if (pendingName && !pendingDescription && looksLikeDescription(line)) {
        pendingDescription = line.replace(/\s{2,}/g, " ");
        continue;
      }

      // Sonst beginnt hier ein neuer Name. Der bisherige hatte keinen Preis
      // und war damit kein Gericht.
      pendingName = usable ? candidate : null;
      pendingDescription = null;
      continue;
    }

    const first = prices[0];
    let name = cleanItemName(line.slice(0, first.start));
    let description: string | null = null;
    /** Stand der Preis in derselben Zeile wie der Name? */
    let sameLine = true;

    // Preis steht allein in der Zeile -> Name (und ggf. Beschreibung) von oben.
    if (name.length < MIN_NAME_LENGTH && pendingName) {
      name = pendingName;
      description = pendingDescription;
      sameLine = false;
    }
    clearPending();

    if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) continue;
    // Ein Name, der nur aus Ziffern besteht, ist ein Zahlendreher, kein Gericht.
    if (!/[A-Za-zÄÖÜäöüß]/.test(name)) continue;

    const key = name.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);

    // Nur im gewöhnlichen Aufbau (Name UND Preis in einer Zeile) darf die
    // Folgezeile die Beschreibung sein. Kam der Name aus der Zeile darüber,
    // ist die Folgezeile mit hoher Wahrscheinlichkeit das NÄCHSTE Gericht –
    // sie als Beschreibung zu schlucken hat dort jedes zweite Gericht gekostet.
    if (sameLine) {
      const next = lines[i + 1]?.trim() ?? "";
      if (next && looksLikeDescription(next)) {
        description = next.replace(/\s{2,}/g, " ");
        i++;
      }
    }

    const item: ParsedMenuItem = {
      id: slugId(prefix, name, items.length),
      name,
      price: first.value,
      category,
    };
    if (description) item.description = description;

    items.push(item);
  }

  return items;
}

/**
 * Wie gut ist das Ergebnis? Dient der Entscheidung, ob ein zweiter Weg
 * (z.B. OCR statt direkter PDF-Text) versucht werden soll.
 *
 * Ein einzelnes Gericht aus einer zwölfseitigen Karte bedeutet, dass die
 * Erkennung praktisch gescheitert ist – dann lieber noch einmal anders lesen,
 * als dem Nutzer eine Karte mit einer Position auszuliefern.
 */
export function menuQuality(items: ParsedMenuItem[]): {
  count: number;
  withPrice: number;
  categories: number;
  usable: boolean;
} {
  const withPrice = items.filter((i) => i.price).length;
  const categories = new Set(items.map((i) => i.category)).size;
  return {
    count: items.length,
    withPrice,
    categories,
    // Drei Gerichte mit Preis sind die Untergrenze, ab der eine Karte im
    // Konfigurator überhaupt etwas darstellt.
    usable: withPrice >= 3,
  };
}
