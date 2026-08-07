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
  /**
   * Allergen- und Zusatzstoff-Kürzel, wie sie auf der Karte am Gericht stehen —
   * kleingeschrieben, in der Reihenfolge des Auftretens: ["a1", "j", "f"].
   *
   * Bewusst die ROHEN Kürzel und keine ausgeschriebenen Namen: Was ein Kürzel
   * bedeutet, legt jede Karte selbst fest. Auf der Karte des Landgasthofs zum
   * Löwen ist "f" die Milch, bei der Kneipe am Kirchplatz ist Milch "g". Eine
   * feste Tabelle wäre nicht unvollständig, sondern falsch — und bei einer
   * Kennzeichnungspflicht ist eine falsche Angabe schlimmer als keine.
   * Aufgelöst wird über die Legende derselben Karte (parseAllergenLegend).
   */
  allergens?: string[];
  /**
   * Ernährungs-Labels am Gericht: ["vegan"], ["vegetarisch", "glutenfrei"].
   *
   * Getrennt von allergens, weil es etwas anderes aussagt: "vegan" ist kein
   * Allergen, sondern eine Eigenschaft, nach der Gäste filtern. Sie zusammen
   * in ein Feld zu werfen hieße, unter "Allergene" etwas anzuzeigen, das
   * keines ist.
   */
  labels?: string[];
  /**
   * Aufpreise, Groessen und Beilagen, die zu DIESEM Gericht gehoeren:
   * [{ name: "Kaese", price: "1.20" }, { name: "grosse Portion", price: "10.90" }].
   *
   * A1.2 aus dem Feedback vom 6.8.2026: "Zusatzpunkte einer Speise (Beilagen,
   * Varianten, 'dazu…') als Teil des Gerichts darstellen, nicht als eigenes
   * Gericht." Vorher stand auf der Karte des Landgasthofs zum Loewen ein
   * eigenstaendiges Gericht namens "Kaese" fuer 1,20 EUR — direkt neben dem
   * Rumpsteak.
   */
  extras?: Array<{ name: string; price?: string; allergens?: string[] }>;
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
  // \bgrill\b statt der Phrase "vom grill": Die Überschriften-Prüfung testet
  // nur das Kernwort HINTER dem Einleitungswort – bei "Vom Grill" also "Grill".
  [/steak|grill/i, "Vom Grill"],
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
  // "zzgl." nur im Steuer- und Gebuehrenzusammenhang. Ohne diese Einengung
  // fiel die Zeile "16,95 EUR zzgl. Beilage Ihrer Wahl" unter Rauschen — und
  // mit ihr das Gericht darueber. Auf einer Karte des Messkorpus kostete das
  // 27 von 56 Gerichten.
  /\bmwst\b|mehrwertsteuer|inkl\.\s*\d+\s*%|\bzzgl\.\s*(mwst|mehrwertsteuer|ust|steuer|\d+\s*%)/i,
  /\böffnungszeit|\bruhetag|\bküche\s+(bis|von)\b/i,
  /\burlaub\b|\bbetriebsferien\b|\bbetriebsurlaub\b|\bgeschlossen\b/i,
  // "Allergen" allein macht eine Zeile noch nicht zu Rauschen: Karten
  // schreiben die Kennzeichnung ausdruecklich ans Gericht ("… Allergene: C, D,
  // G, M"). Diese Regel warf genau die Zeilen weg, in denen die Angabe steht.
  // Rauschen ist nur der allgemeine HINWEIS darauf.
  /\ballergie|\bunvertr(ä|ae)glichkeit|\bzusatzstoff|\bkennzeichnungspflicht/i,
  /^\s*(tel|telefon|fon|fax|e-?mail|www\.|http)/i,
  /\bseite\s+\d+\b|^\s*\d+\s*\/\s*\d+\s*$/i,
  /\bpfand\b|\bcorkage\b|\bkorkgeld\b/i,
  /\bab\s+\d+\s+personen\b|\bmindestens\b/i,
  // Zuschlagshinweise sind keine Gerichte: "…behalten wir uns vor, einen
  // Aufschlag von 5,00 EUR zu erheben" stand sonst als Gericht auf der Karte.
  /\baufschlag\b|\bbehalten\s+wir\s+uns\s+vor\b|\bteilungsgebühr\b/i,
  /\bänderungen\s+vorbehalten\b|\bsolange\s+der\s+vorrat\b|\birrtümer\s+vorbehalten\b/i,
];

/** Zeitangaben und Telefonnummern dürfen nicht als Preis durchgehen. */
const TIME_CONTEXT = /\b\d{1,2}[.:]\d{2}\s*(uhr|h\b|am\b|pm\b)/i;

/**
 * Datumsangaben mit Punkt: "03.08.", "07.08.2026", "02.08.26".
 *
 * Ohne diese Prüfung wurde aus "Tagesessen 03.08.- 07.08.2026" ein Gericht
 * namens "Tagesessen" zum Preis von 3,08 €.
 */
const DATUM = /\b\d{1,2}\.\d{1,2}\.(\d{2,4})?/g;

/**
 * Führungspunkte, Trennlinien und Aufzählungszeichen, die zwischen Name und
 * Preis stehen: "Wiener Schnitzel .......... 18,90".
 */
const LEADER_CHARS = /[.…·•∙‧・\-–—_|~*]{2,}\s*$/;

/** Allergenkennzeichnung am Ende: "(1,2,3)", "(A, C)", "¹²", "*", "**". */
const ALLERGEN_SUFFIX = /(?:\s*\((?:[0-9A-Za-z]{1,3})(?:\s*[,;.]\s*[0-9A-Za-z]{1,3})*\)|\s*[¹²³⁴⁵⁶⁷⁸⁹\*†‡]+)\s*$/;

/**
 * Kennzeichnungsklammer IRGENDWO in der Zeile: "(a1, j, f)", "(2, f, k)", "(o)".
 *
 * Nicht nur am Ende wie ALLERGEN_SUFFIX: Auf echten Karten steht die Klammer
 * regelmäßig mitten in der Zeile, vor dem Preis — "mit Pfifferlingen in Rahm
 * (f, o) 15,80".
 */
const KENNZEICHNUNGS_KLAMMER = /\(([^()]{1,60})\)/g;

/** Hochgestellte Ziffern als Kennzeichnung: "Schnitzel¹²". */
const HOCHGESTELLT = /[¹²³⁴⁵⁶⁷⁸⁹]/g;
const HOCH_ZU_ZIFFER: Record<string, string> = {
  "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5",
  "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
};

/** Ein einzelnes Kürzel: eine bis drei Stellen, Buchstabe oder Ziffer. */
const IST_KUERZEL = /^[0-9a-z]{1,3}$/;

/**
 * Ausdrücklich beschriftete Kennzeichnung am Zeilenende:
 *   "…| Dillöl | Apfelchip   Allergene: C, D, G, M"
 *   "…| Pumpernickel  Allergene: A,B,C,D,M."
 *
 * Diese Form braucht keine Legende zur Absicherung: Wer "Allergene:" schreibt,
 * meint Allergene. Gefunden an einer Hamburger Karte, die im ersten Korpus
 * nicht vorkam — dort wurde die Zeile sogar als Rauschen verworfen, weil das
 * Wort "Allergen" darin stand.
 */
const AUSDRUECKLICHE_KENNZEICHNUNG =
  /\ballergene?\s*:\s*([0-9a-zA-Z]{1,3}(?:\s*[,;]\s*[0-9a-zA-Z]{1,3})*)\s*\.?\s*$/i;

/**
 * Ernährungs-Labels, wie sie auf deutschen Karten am Gericht stehen — meist
 * geklammert oder mit einem Symbol daneben, das im Text ohnehin verlorengeht.
 *
 * Der Schlüssel ist die vereinheitlichte Form: "vegan", "vegetarisch",
 * "glutenfrei", "laktosefrei", "scharf". Ohne diese Vereinheitlichung stünden
 * in derselben Web-App "veg.", "vegetar." und "vegetarisch" nebeneinander.
 */
const LABEL_MUSTER: Array<[RegExp, string]> = [
  [/\bvegan\b/i, "vegan"],
  [/\bvegetarisch\b|\bveggie\b|\bvegetar\./i, "vegetarisch"],
  [/\bglutenfrei\b|\bgluten\s*frei\b/i, "glutenfrei"],
  [/\blaktosefrei\b|\blactosefrei\b|\blaktose\s*frei\b/i, "laktosefrei"],
  [/\bscharf\b|\bpikant\b/i, "scharf"],
];
// Bewusst NICHT dabei: "hausgemacht", "regional", "bio". Am Korpus geprüft
// treffen sie fast nur Fließtext ("Reinerts hausgemachte Rinderkraftbrühe",
// "dazu hausgemachte Spätzle") — das ist Werbesprache im Namen, keine
// Eigenschaft, nach der ein Gast filtert. Ein Label, das bei jedem zweiten
// Gericht steht, sagt nichts mehr.

/**
 * Liest die Ernährungs-Labels aus einer Zeile.
 *
 * Bewusst über den ganzen Text und nicht nur über Klammern: Karten schreiben
 * "Reispfanne vegan 12,50" genauso oft wie "Reispfanne (vegan)". Die
 * Wortgrenzen im Muster verhindern dabei, dass "Veganer Käse" in einer
 * Beschreibung etwas anderes trifft als beabsichtigt.
 */
export function extractLabels(zeile: string): string[] {
  const gefunden: string[] = [];
  for (const [muster, name] of LABEL_MUSTER) {
    if (muster.test(zeile) && !gefunden.includes(name)) gefunden.push(name);
  }
  return gefunden;
}

/**
 * Kennzeichnung OHNE Klammern am Zeilenende: "…Cremesuppe   a, g".
 *
 * Diese Schreibweise ist genauso verbreitet wie die geklammerte, aber weit
 * gefährlicher zu erkennen: "Rösti mit Speck und Ei" endet ebenfalls auf zwei
 * Buchstaben. Deshalb wird sie NUR anerkannt, wenn die Kürzel in der Legende
 * derselben Karte stehen — siehe extractAllergenCodes.
 */
const KUERZEL_AM_ZEILENENDE =
  /(?:^|\s)((?:[0-9a-zA-Z]{1,3})(?:\s*,\s*[0-9a-zA-Z]{1,3})*)\s*$/;

/**
 * Die Form, die ein Kennzeichnungs-Kürzel OHNE Legende haben muss.
 *
 * Enger als IST_KUERZEL, und zwar aus einem Grund, der schwerer wiegt als
 * Vollständigkeit: Ohne diese Einengung wird aus "(0,5l)" die Kennzeichnung
 * ["0","5l"], aus "(DE)" ein Allergen "de" und aus "(BIO)" eines namens "bio".
 * Eine ERFUNDENE Allergenangabe ist bei Kennzeichnungspflicht schlimmer als
 * eine fehlende — jemand mit einer Unverträglichkeit trifft danach eine
 * Entscheidung.
 *
 * Erlaubt sind deshalb nur die drei Formen, die auf Karten tatsächlich als
 * Kennzeichnung vorkommen: eine Ziffer ("1"), ein Buchstabe ("f"), oder ein
 * Buchstabe mit Ziffer ("a1").
 */
const STRENGES_KUERZEL = /^(?:\d{1,2}|[a-z]|[a-z]\d)$/i;

/**
 * Liest die Kürzel aus einer Klammer.
 *
 * Bringt die Karte eine Legende mit, ist SIE der Maßstab: Was dort nicht
 * erklärt wird, ist keine Kennzeichnung. Ohne Legende bleibt nur die Form —
 * dann gilt der strenge Schnitt oben.
 */
function kuerzelAusKlammer(inhalt: string, bekannt?: Set<string>): string[] | null {
  const teile = inhalt.split(/[,;\/]/).map((t) => t.trim()).filter(Boolean);
  if (!teile.length) return null;
  if (!teile.every((t) => IST_KUERZEL.test(t.toLowerCase()))) return null;

  const klein = teile.map((t) => t.toLowerCase());
  if (bekannt && bekannt.size > 0) {
    return klein.every((t) => bekannt.has(t)) ? klein : null;
  }
  return klein.every((t) => STRENGES_KUERZEL.test(t)) ? klein : null;
}

/**
 * Freistehende Kuerzelliste irgendwo in der Zeile: "38. Gyros 2,4,11,i,g
 * saftiges Schweinegeschnetzeltes …".
 *
 * Griechische, tuerkische und indische Karten schreiben die Kennzeichnung
 * regelmaessig so — direkt hinter dem Namen, vor der Beschreibung, ohne
 * Klammer und ohne Beschriftung. Auf drei Karten der Pruefmenge betraf das
 * 281 Gerichte, von denen kein einziges eine Kennzeichnung bekam.
 *
 * Zwei Schranken gegen erfundene Angaben: mindestens ZWEI Kuerzel, und jedes
 * muss in der Legende der Karte stehen. Ohne Legende greift die Regel nicht.
 */
function kuerzelListeInZeile(zeile: string, bekannt?: Set<string>): string[] | null {
  if (!bekannt || bekannt.size === 0) return null;
  for (const t of zeile.matchAll(/(?:^|\s)([0-9a-zA-Z]{1,3}(?:\s*,\s*[0-9a-zA-Z]{1,3})+)(?=\s|$)/g)) {
    const teile = t[1].split(/\s*,\s*/).map((x) => x.trim().toLowerCase());
    if (teile.length >= 2 && teile.every((x) => bekannt.has(x))) return teile;
  }
  return null;
}

/** Liest die ungeklammerten Kürzel am Zeilenende, gegen die Legende geprüft. */
function kuerzelAmEnde(zeile: string, bekannt?: Set<string>): string[] | null {
  if (!bekannt || bekannt.size === 0) return null;
  const treffer = zeile.match(KUERZEL_AM_ZEILENENDE);
  if (!treffer) return null;
  const teile = treffer[1].split(/\s*,\s*/).map((t) => t.trim().toLowerCase());
  if (!teile.length || !teile.every((t) => bekannt.has(t))) return null;
  return teile;
}

/**
 * Liest die Allergen- und Zusatzstoff-Kürzel aus einer Zeile.
 *
 * Eine Klammer zählt nur, wenn ihr GESAMTER Inhalt aus Kürzeln besteht.
 * Sonst wäre "(ca. 250 g)" eine Kennzeichnung mit dem Kürzel "g" — und weil
 * das je nach Karte "Sesam" oder "Milch" heißt, stünde am Hüftsteak eine
 * erfundene Allergenangabe. Bei einer Kennzeichnungspflicht ist das der
 * schlimmere Fehler als eine fehlende Angabe.
 *
 * `bekannt` sind die Kürzel aus der Legende der Karte. Nur mit ihnen wird auch
 * die ungeklammerte Schreibweise am Zeilenende gelesen.
 */
export function extractAllergenCodes(
  zeile: string,
  bekannt?: Set<string>,
): string[] {
  const gefunden: string[] = [];
  const merken = (k: string) => {
    const klein = k.toLowerCase();
    if (!gefunden.includes(klein)) gefunden.push(klein);
  };

  // Ausdrueckliche Beschriftung zuerst — sie ist die verlaesslichste Form.
  const beschriftet = zeile.match(AUSDRUECKLICHE_KENNZEICHNUNG);
  if (beschriftet) {
    beschriftet[1]
      .split(/[,;]/)
      .map((t) => t.trim())
      .filter((t) => IST_KUERZEL.test(t.toLowerCase()))
      .forEach(merken);
  }

  for (const treffer of zeile.matchAll(KENNZEICHNUNGS_KLAMMER)) {
    kuerzelAusKlammer(treffer[1], bekannt)?.forEach(merken);
  }

  // Der ungeklammerte Fall zählt nur auf dem Teil ohne Klammern — sonst würde
  // eine Klammer am Zeilenende doppelt gelesen.
  const ohneKlammern = zeile.replace(KENNZEICHNUNGS_KLAMMER, " ");
  kuerzelAmEnde(ohneKlammern, bekannt)?.forEach(merken);
  kuerzelListeInZeile(ohneKlammern, bekannt)?.forEach(merken);

  for (const hoch of zeile.match(HOCHGESTELLT) ?? []) {
    merken(HOCH_ZU_ZIFFER[hoch] ?? hoch);
  }

  return gefunden;
}

/** Entfernt die erkannte Kennzeichnung aus einem Text. */
export function stripAllergenCodes(zeile: string, bekannt?: Set<string>): string {
  let out = zeile
    .replace(AUSDRUECKLICHE_KENNZEICHNUNG, "")
    .replace(KENNZEICHNUNGS_KLAMMER, (ganz, inhalt: string) =>
      kuerzelAusKlammer(inhalt, bekannt) ? " " : ganz,
    )
    .replace(HOCHGESTELLT, "");

  if (kuerzelAmEnde(out, bekannt)) {
    out = out.replace(KUERZEL_AM_ZEILENENDE, "");
  }

  return out
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/[\s,;]+$/, "")
    .trim();
}

/**
 * Zeilen, die eine Legende einleiten. Ab hier stehen keine Gerichte mehr,
 * sondern die Erklärung der Kürzel.
 */
const LEGENDEN_KOPF =
  /^\s*(liste\s+der\s+|unsere\s+)?(zusatz-?\s*und\s+(allergen|inhalts)stoffe|allergene?\s+und\s+zusatzstoffe|allergen(e|stoffe)?(\s*[-–]?\s*legende)?|legende|zusatzstoffe|kennzeichnung(en)?)\s*:?\s*$/i;

/**
 * Liest die Legende einer Karte: welches Kürzel steht für welchen Stoff.
 *
 * Zwei Schreibweisen, beide auf echten Karten belegt:
 *   "Weizen=a1, Roggen=a2, Milch/Laktose=f"     (Name = Kürzel)
 *   "a: Glutenhaltiges Getreide"                (Kürzel : Name)
 *
 * Ohne diese Auflösung steht in der Web-App "(a1, f)" — für den Gast wertlos.
 * Mit ihr steht dort "Weizen, Milch/Laktose".
 *
 * Rückgabe ist kleingeschrieben nach Kürzel: { "a1": "Weizen", "f": "Milch/Laktose" }.
 */
export function parseAllergenLegend(text: string): Record<string, string> {
  const legende: Record<string, string> = {};
  if (typeof text !== "string" || !text.trim()) return legende;

  const setze = (kuerzel: string, name: string) => {
    const k = kuerzel.trim().toLowerCase();
    const n = name.trim().replace(/[,;.]+$/, "").trim();
    if (!IST_KUERZEL.test(k) || n.length < 2 || n.length > 60) return;
    // Die erste Nennung gewinnt: Karten wiederholen die Legende gern verkürzt.
    if (!legende[k]) legende[k] = n;
  };

  const zeilen = text.split(/\r\n|\r|\n/);
  let imLegendenteil = false;

  for (const roh of zeilen) {
    const zeile = roh.trim();
    if (!zeile) continue;
    if (LEGENDEN_KOPF.test(zeile)) {
      imLegendenteil = true;
      continue;
    }

    // Form "Name=kürzel", auch mehrfach pro Zeile. Funktioniert auch außerhalb
    // des Legendenteils, weil das Gleichheitszeichen eindeutig genug ist.
    const gleich = [...zeile.matchAll(/([^=,;]{2,60}?)\s*=\s*([0-9a-z]{1,3})(?=\s*[,;]|\s*$)/gi)];
    if (gleich.length) {
      for (const g of gleich) setze(g[2], g[1]);
      continue;
    }

    // Form "kürzel: Name" — nur im Legendenteil, sonst kollidiert sie mit
    // Gerichtszeilen wie "Tagesempfehlung: Rinderroulade".
    if (imLegendenteil) {
      // "a: Gluten", "1. mit Farbstoff", "a) Gluten"
      const doppel = zeile.match(/^([0-9a-z]{1,3})\s*[:.)]\s*(.{2,60})$/i);
      if (doppel) {
        setze(doppel[1], doppel[2]);
        continue;
      }
      // "a Gluten und Erzeugnisse", "1 Farbstoff" — nur mit Leerzeichen.
      // Der Name MUSS mit einem Buchstaben beginnen, sonst wuerde jede
      // Gerichtszeile mit einer fuehrenden Nummer als Legendeneintrag gelten.
      const mitLeerzeichen = zeile.match(
        /^([0-9a-z]{1,3})\s+([A-Za-zÄÖÜäöü][^0-9]{2,59})$/,
      );
      if (mitLeerzeichen) {
        setze(mitLeerzeichen[1], mitLeerzeichen[2]);
        continue;
      }
      // Eine Zeile ohne erkennbares Muster beendet die Legende nicht sofort —
      // Karten setzen Zwischenüberschriften ("Zusatzstoffe:") mitten hinein.
    }
  }

  return legende;
}

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

  // Wo in dieser Zeile stehen Datumsangaben? Treffer, die darin liegen, sind
  // keine Preise. DATUM ist global — lastIndex vor jeder Nutzung zuruecksetzen,
  // sonst haengt das Ergebnis vom vorherigen Aufruf ab.
  DATUM.lastIndex = 0;
  const datumsSpannen: Array<[number, number]> = [];
  for (const d of line.matchAll(DATUM)) {
    const von = d.index ?? 0;
    datumsSpannen.push([von, von + d[0].length]);
  }
  const imDatum = (start: number, end: number) =>
    datumsSpannen.some(([dv, db]) => start < db && end > dv);

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
    // Datum: "Urlaub vom 02.08.26 bis 14.08.26" enthielt sonst die Preise
    // 2,08 € und 14,08 € — und die Zeile wurde zu zwei Gerichten.
    if ((line[end] ?? "") === "." && /\d/.test(line[end + 1] ?? "")) continue;
    if ((line[start - 1] ?? "") === "." && /\d/.test(line[start - 2] ?? "")) continue;
    if (imDatum(start, end)) continue;
    /*
     * Kuerzelliste statt Preis: "Gulaschsuppe, dazu Brot 4,11,a,f" enthaelt
     * kein Gericht fuer 4,11 EUR — das ist die Kennzeichnung. Erkennbar
     * daran, dass direkt hinter der Zahl ein weiteres Komma mit einem kurzen
     * Kuerzel folgt. Ein Preis steht nie so.
     */
    if (/^\s*,\s*[0-9a-zA-Z]{1,3}(\s|,|$)/.test(line.slice(end))) continue;
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

/**
 * Ein einzelnes Wort am Namensende, das eine Mengen- oder Preisangabe ist:
 * "0,3l", "0,4", "4,10", "cl" – und das nackte "1", zu dem die Texterkennung
 * ein kleines "l" (Liter) regelmäßig verliest.
 */
const TRAILING_MEASURE_TOKEN = /^(?:\d{1,3}[.,]\d{1,2}\s*l?|0[.,]\d|l|cl|ltr|1)$/i;

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

  // Mengen- und Preisreste am Ende abtragen. Getränkezeilen führen mehrere
  // Größen ("Bier vom Fass 0,3l 4,10 0,4l 5,10"), und die Texterkennung
  // verliest das "l" gern als "1" – ohne diese Schleife hieß das Gericht
  // auf der ersten echten Karte "Bier vom Fass 0,31 4,10 0,4 1".
  const words = name.split(/\s+/);
  while (words.length > 1 && TRAILING_MEASURE_TOKEN.test(words[words.length - 1])) {
    words.pop();
  }
  const stripped = words.join(" ");
  // Nur übernehmen, wenn ein brauchbarer Name übrig bleibt.
  if (stripped.length >= 2 && /[A-Za-zÄÖÜäöüß]/.test(stripped)) {
    name = stripped;
  }

  return name.replace(/\s{2,}/g, " ").trim();
}

function isNoise(line: string): boolean {
  return NOISE_PATTERNS.some((rx) => rx.test(line));
}

/**
 * Einleitungswörter, hinter denen das eigentliche Kategorie-Stichwort einer
 * Überschrift stehen darf: "Unsere Suppen", "Warme Getränke", "Vom Grill".
 */
const HEADING_INTRO_WORDS = new Set([
  "unsere", "unser", "warme", "kalte", "heisse", "heiße",
  "alkoholfreie", "hausgemachte", "vom", "von", "der", "die", "das", "&",
]);

/**
 * Erkennt eine Kategorie-Überschrift.
 *
 * Zwei Wege, weil Karten es unterschiedlich halten: entweder ein bekanntes
 * Stichwort ("Vorspeisen"), oder eine kurze Zeile in Großbuchstaben ohne Preis
 * ("UNSERE KLASSIKER"). Zeilen mit Preis sind nie Überschriften.
 *
 * Der Stichwort-Weg ist bewusst STRENG. Die erste Fassung hielt jede Zeile bis
 * 60 Zeichen mit einem Stichwort für eine Überschrift – und im OCR-Text einer
 * mehrseitigen Karte kippte damit jede Beschreibungszeile die laufende
 * Kategorie: "…dazu Salat und Brot" machte aus allem Folgenden "Salate",
 * "…auf Toast" machte "Sandwiches". Auf der ersten echten Karte war danach
 * die halbe Einsortierung falsch (Kabeljau unter Salate, Sauerbraten unter
 * Schnitzel). Deshalb gilt jetzt: höchstens vier Wörter, kein Komma, keine
 * Bindewörter mitten im Satz, und das Stichwort muss – abgesehen von
 * Einleitungswörtern wie "Unsere" – das ERSTE Wort treffen. Eine
 * Beschreibung beginnt praktisch nie mit dem Kategoriewort.
 */
export function detectCategory(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 60) return null;
  if (findPrices(trimmed).length > 0) return null;
  if (isNoise(trimmed)) return null;
  // Eine Rubrik trägt keine Zahl. Ein Gericht schon: "Hüftsteak (ca. 250 g)"
  // enthält "steak" und wurde deshalb zur Überschrift "Vom Grill" — das
  // eigentliche Gericht ging dabei verloren und bekam den Namen seiner
  // Beilagenzeile.
  if (/\d/.test(trimmed)) return null;

  const words = trimmed.split(/\s+/);
  const looksLikeSentence =
    trimmed.includes(",") || / (mit|und|an|auf|im|in|aus|dazu|zu|für) /i.test(` ${trimmed} `);

  if (trimmed.length <= 40 && words.length <= 4 && !looksLikeSentence) {
    // Erstes Wort finden, das kein Einleitungswort ist.
    const core = words.find(
      (w) => !HEADING_INTRO_WORDS.has(w.toLowerCase().replace(/[^a-zäöüß&]/gi, "")),
    );
    if (core) {
      for (const [rx, name] of CATEGORY_PATTERNS) {
        if (rx.test(core)) return name;
      }
    }
  }

  /*
   * Überschrift am Doppelpunkt erkennen: "Vorweg:", "Hauptsache:",
   * "Für unsere kleinen Gäste:", "BEILAGEN:".
   *
   * Karten vergeben ihren Rubriken gern eigene Namen, die weder ein bekanntes
   * Stichwort enthalten noch großgeschrieben sind. Der Landgasthof Reinert
   * nennt seine vier Rubriken so — erkannt wurde keine einzige, und die ganze
   * Karte landete unter dem Auffangwert "Hauptgerichte".
   *
   * Der Doppelpunkt ist dabei ein verlässlicher Marker, weil Zeilen MIT Preis
   * oben schon ausgeschlossen sind: "Menüpreis: 44,00" und
   * "Tagesempfehlung: Rinderroulade 18,90" kommen hier gar nicht an.
   */
  if (
    /:\s*$/.test(trimmed) &&
    words.length <= 6 &&
    trimmed.length <= 50 &&
    !BESCHREIBUNGS_ANFANG.test(trimmed)
  ) {
    const ohneDoppelpunkt = trimmed.replace(/\s*:\s*$/, "").trim();
    if (ohneDoppelpunkt.length >= 3) {
      // Ein bekanntes Stichwort gewinnt weiterhin: "Desserts:" soll die
      // Rubrik "Desserts" ergeben und nicht eine zweite daneben.
      for (const [rx, name] of CATEGORY_PATTERNS) {
        if (rx.test(ohneDoppelpunkt)) return name;
      }
      return ohneDoppelpunkt;
    }
  }

  // Großbuchstaben-Überschrift ohne bekanntes Stichwort: als eigene Kategorie
  // übernehmen, statt sie zu verwerfen – Karten erfinden gern eigene Namen.
  //
  // ABER: Sehr viele Karten sind DURCHGEHEND großgeschrieben. Dann ist jede
  // Beilagenzeile formal eine Überschrift, und die Einsortierung zerfällt. An
  // der Karte "Zur Post" gemessen: 19 Kategorien statt 7, darunter "Mit Pommes
  // Und Beilagensalat", "Dazu Pommes" und "Mit Brot" — allesamt Beschreibungen
  // des Gerichts darüber. Das ist zugleich A1.2: Die Beilagen sollen zum
  // Gericht gehören, nicht zu einer eigenen Rubrik werden.
  //
  // Deshalb hier dieselben Schranken wie beim Stichwort-Weg, plus die
  // Fortsetzungswörter: Eine Rubrik heißt nie "Mit …" oder "Dazu …".
  const letters = trimmed.replace(/[^A-Za-zÄÖÜäöüß]/g, "");
  if (
    letters.length >= 3 &&
    letters === letters.toUpperCase() &&
    words.length <= 5 &&
    !BINDEWORT_IN_DER_MITTE.test(trimmed) &&
    !trimmed.includes(",") &&
    !BESCHREIBUNGS_ANFANG.test(trimmed) &&
    !ARTIKEL_AM_ANFANG.test(trimmed)
  ) {
    return titleCase(trimmed);
  }

  return null;
}

/**
 * Ein Artikel am Zeilenanfang verrät den Rest eines umbrochenen Satzes:
 * "AUS DEM GARTEN DER SAISON" wird beim Umbruch zu "DER SAISON", und das ist
 * keine Rubrik.
 */
const ARTIKEL_AM_ANFANG = /^(der|die|das|dem|den|des)\s/i;

/**
 * Womit eine BESCHREIBUNG beginnt, aber nie eine Rubrik.
 *
 * Bewusst enger als FORTSETZUNGSWORT weiter unten: "aus" fehlt hier, weil
 * "AUS DEM SUPPENTOPF", "AUS DER PFANNE" und "AUS DEM GARTEN" die
 * geläufigsten deutschen Rubriküberschriften überhaupt sind. In der Zeile mit
 * dem Preis ist "aus" dagegen sehr wohl ein Fortsetzungswort — zwei
 * verschiedene Fragen, deshalb zwei Listen.
 */
const BESCHREIBUNGS_ANFANG =
  /^(mit|dazu|und|oder|ohne|sowie|nebst|wahlweise|serviert|gereicht|garniert|gefüllt|überbacken|geschwenkt|verfeinert|abgerundet|begleitet|plus|inkl\.?|incl\.?|je\s+nach|nach\s+wahl|auf\s+wunsch)\b/i;

/**
 * Ein Bindewort MITTEN in der Zeile macht daraus einen Satz. Am Anfang tut es
 * das nicht — sonst fiele "AUS DEM SUPPENTOPF" durch. Deshalb wird hier ohne
 * umgebende Leerzeichen geprüft: Das erste Wort kann so nicht treffen.
 */
const BINDEWORT_IN_DER_MITTE = /\s(mit|und|an|auf|im|in|aus|dazu|zu|für|oder|sowie)\s/i;

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

/**
 * Grobe Einteilung der Kategorien. Sie entscheidet, wann die Nachkorrektur
 * unten eingreifen darf: nur wenn Name und zugewiesene Kategorie in
 * VERSCHIEDENE Gruppen fallen. Innerhalb einer Gruppe hat die Überschrift der
 * Karte das letzte Wort – ein Wiener Schnitzel unter "Hauptgerichte" ist die
 * Entscheidung des Wirts, ein Kaiserschmarrn unter "Weine" ist ein Fehler.
 */
const CATEGORY_GROUPS: Record<string, "essen" | "dessert" | "getraenke"> = {
  Vorspeisen: "essen", Suppen: "essen", Salate: "essen", Pizza: "essen",
  Pasta: "essen", Burger: "essen", Sandwiches: "essen", Schnitzel: "essen",
  "Vom Grill": "essen", Fisch: "essen", Vegetarisch: "essen",
  Beilagen: "essen", Snacks: "essen", "Frühstück": "essen",
  Hauptgerichte: "essen",
  Desserts: "dessert",
  "Heißgetränke": "getraenke", Weine: "getraenke", Biere: "getraenke",
  Cocktails: "getraenke", "Getränke": "getraenke",
};

/**
 * Woran ein Gericht an seinem NAMEN zu erkennen ist. Reihenfolge zählt:
 * "Weinschorle" muss vor "Wein" geprüft werden, sonst landet die Schorle bei
 * den Weinen.
 */
const NAME_CATEGORY_RULES: Array<[RegExp, string]> = [
  [/schorle|eistee|limonade|cola|spezi|saft\b|wasser\b|apfelsaft/i, "Getränke"],
  [/wein\b|riesling|burgunder|merlot|chardonnay|sekt\b|prosecco/i, "Weine"],
  [/bier\b|pils\b|weizen\b|radler|vom fass/i, "Biere"],
  [/kaffee|espresso|cappuccino|latte|kakao|heiße schokolade|tee\b/i, "Heißgetränke"],
  [/cocktail|spritz|mojito|aperol|gin\b|longdrink/i, "Cocktails"],
  [/schmarrn|kuchen|mousse|sorbet|tiramisu|crème|creme brûlée|panna cotta|dessert|eisbecher/i, "Desserts"],
  [/suppe\b|süppchen/i, "Suppen"],
  [/lachs|kabeljau|forelle|zander|scholle|dorade|garnelen|matjes/i, "Fisch"],
];

/**
 * Korrigiert grob falsche Kategorien anhand des Gerichtnamens.
 *
 * Anlass, an der ersten echten Karte gemessen: Die Texterkennung einer
 * mehrseitigen Karte verwürfelt die Abschnitte, und die zeilenbasierte
 * Einsortierung setzte "Kaiserschmarrn" unter Weine, "Pfirsich Eistee" unter
 * Desserts und "Weinschorle" unter Cocktails.
 *
 * Eingegriffen wird NUR quer über die Gruppen (Essen / Dessert / Getränke).
 * Innerhalb einer Gruppe bleibt die Überschrift der Karte maßgeblich – eine
 * Tomatensuppe unter "Vorspeisen" ist die Entscheidung des Wirts. Einzige
 * Ausnahme: Suppen werden auch aus dem AUFFANGWERT "Hauptgerichte" geholt,
 * denn der heißt meist nur "keine Überschrift gesehen".
 */
export function refineCategories(items: ParsedMenuItem[]): ParsedMenuItem[] {
  return items.map((item) => {
    const assigned = item.category ?? "";
    const assignedGroup = CATEGORY_GROUPS[assigned];

    for (const [rx, byName] of NAME_CATEGORY_RULES) {
      if (!rx.test(item.name)) continue;
      const nameGroup = CATEGORY_GROUPS[byName];
      const crossGroup = assignedGroup !== undefined && nameGroup !== assignedGroup;
      const soupFromFallback =
        byName === "Suppen" && assigned === DEFAULT_CATEGORY;
      if (crossGroup || soupFromFallback) {
        return { ...item, category: byName };
      }
      break; // Erste Regel entscheidet; weitere würden nur widersprechen.
    }
    return item;
  });
}

/**
 * Wörter, mit denen eine Zeile die vorherige fortsetzt statt ein neues Gericht
 * zu beginnen. Auf deutschen Karten ist das die Regel, nicht die Ausnahme.
 */
const FORTSETZUNGSWORT =
  /^(dazu|mit|und|oder|an|auf|in|im|aus|sowie|nebst|wahlweise|serviert|gereicht|garniert|gefüllt|überbacken|geschwenkt|verfeinert|abgerundet|begleitet|nach\s+wahl|auf\s+wunsch|plus|inkl\.?|incl\.?|je\s+nach)\b/i;

/**
 * Setzt der Text vor dem Preis den Namen aus der Zeile darüber fort?
 *
 * Der Anlass, an echten Karten gemessen: Sehr viele deutsche Speisekarten
 * schreiben ein Gericht über zwei Zeilen und setzen den Preis ans Ende der
 * zweiten:
 *
 *     Selbstgemachte schwäbische Maultaschen mit Zwiebelschmelze,
 *     dazu Kartoffelsalat - 11,50 €
 *
 * Vorher griff der Rückfall auf die Zeile darüber nur, wenn vor dem Preis GAR
 * NICHTS stand. Hier steht aber "dazu Kartoffelsalat" — und genau das wurde
 * zum Gerichtnamen, während "Maultaschen" verlorenging. Auf einer Karte des
 * Messkorpus (Gasthof Rössle) kostete das 9 von 11 Gerichten und erzeugte
 * zugleich 10 Einträge, die keine Gerichte sind.
 *
 * Drei Anzeichen, jedes für sich ausreichend:
 *   1. Die Zeile darüber endet mit Komma oder Gedankenstrich — ein
 *      Zeilenumbruch mitten im Satz.
 *   2. Die Zeile beginnt mit einem Fortsetzungswort ("dazu", "mit", "und").
 *   3. Die Zeile beginnt kleingeschrieben. Ein Gerichtname tut das nie,
 *      ein fortgesetzter Satz fast immer.
 */
/**
 * Ist diese preislose Zeile der ANFANG eines Gerichtnamens, dessen Preis erst
 * in der nächsten Zeile steht?
 *
 * Erkennungsmerkmal: Sie endet mitten im Satz — mit Komma, Semikolon oder
 * Gedankenstrich. Eine Beschreibung tut das nicht, ein umbrochener Name schon.
 *
 * Warum das nötig ist: Die Regel "die Zeile nach einem Gericht ist dessen
 * Beschreibung" verschluckte sonst den Namen des NÄCHSTEN Gerichts. Auf der
 * Karte des Gasthofs Rössle stand danach in der Web-App neunmal ein Gericht
 * namens "dazu Spätzle" oder "dazu Kartoffelsalat", und neun echte Gerichte
 * fehlten — Name und Beschreibung waren vertauscht.
 */
export function istAngefangenerName(zeile: string): boolean {
  return /[,;\-–—]$/.test(zeile.trim());
}

/**
 * Wie viele Zeilen weit nach dem Preis eines angefangenen Gerichts gesucht wird.
 * Fuenf, weil echte Karten Gerichte ueber vier bis fuenf Zeilen schreiben:
 *   Loewentoast / kleines Schnitzel auf Toast, / mit frischen Champignons, /
 *   Spiegelei und Salat / 14,40
 */
const BLICK_NACH_VORN = 5;

/**
 * Beginnt bei `start` ein neues Gericht — oder ist die Zeile die Beschreibung
 * des Gerichts davor?
 *
 * Die Zeile selbst trägt keinen Preis, das entscheidet also nichts. Den
 * Ausschlag gibt, was DANACH kommt: Folgt innerhalb weniger Zeilen ein Preis,
 * dessen Vortext den Satz fortsetzt, dann gehört die Zeile zu diesem Gericht
 * und nicht zum vorherigen.
 *
 *     Gemüsecremesuppe (a1, j, f) 6,50     <- fertiges Gericht
 *     Hüftsteak (ca. 250 g)                <- start: Name, KEINE Beschreibung
 *     mit frischen Pfifferlingen in Rahm
 *     und eine Beilage nach Wahl 24,80     <- der Preis dazu
 *
 * Vorher reichte der Blick nur EINE Zeile weit. Hier steht der Preis zwei
 * Zeilen weiter, und "Hüftsteak" wurde als Beschreibung der Suppe verschluckt
 * — mitsamt seinem Preis von 24,80 €, der dann an der Zeile "mit frischen
 * Pfifferlingen in Rahm" hing. Auf dieser einen Karte kostete das 23 Gerichte.
 */
export function beginntNeuesGericht(
  lines: string[],
  start: number,
  seitenmoebel?: Set<string>,
): boolean {
  let vorher = lines[start]?.trim() ?? "";
  if (!vorher) return false;
  /** Wie viele ECHTE Zeilen zwischen `start` und dem Preis stehen. */
  let dazwischen = 0;

  for (let k = start + 1; k <= start + BLICK_NACH_VORN && k < lines.length; k++) {
    const zeile = lines[k]?.trim() ?? "";
    // Eine Leerzeile beendet den Zusammenhang: Was danach kommt, gehört nicht
    // mehr zum selben Gericht.
    if (!zeile) return false;
    // Kopf- und Fußzeilen überspringen, ohne sie mitzuzählen. In mehrseitigen
    // PDFs steht der Betriebsname regelmäßig ZWISCHEN Name und Preis; würde er
    // hier als Zwischenzeile zählen, ginge das Gericht verloren.
    if (seitenmoebel?.has(zeile)) continue;
    const preise = findPrices(zeile);
    if (preise.length === 0) {
      vorher = zeile;
      dazwischen++;
      continue;
    }
    const vorPreis = zeile.slice(0, preise[0].start).trim();
    /*
     * Steht in der Zeile NUR ein Preis, gehoert er zur Zeile DIREKT darueber —
     * das ist die zweispaltige Karte, fuer die dieser Parser gebaut wurde.
     * setztFort kann das nicht beantworten: Es bekommt einen leeren Text und
     * gibt darauf per Definition false zurueck. Ohne diesen Zweig griff die
     * Ueberschriftenbremse in zweispaltigen Karten NIE, und jeder Gerichtname
     * mit Rubrik-Stichwort ("Zwiebelsuppe", "Rumpsteak") wurde zur Kategorie.
     *
     * Die Bedingung "keine echte Zeile dazwischen" ist dabei entscheidend: Bei
     * "Hauptgerichte / Gulasch vom Rind / 16,90" gehoert der Preis zu
     * "Gulasch", nicht zur Rubrik zwei Zeilen darueber. Ohne sie wuerde jede
     * echte Ueberschrift zum Gericht.
     */
    if (!vorPreis) return dazwischen === 0;
    return setztFort(vorPreis, vorher);
  }
  return false;
}

export function setztFort(vorPreis: string, offenerName: string): boolean {
  const t = vorPreis.trim();
  if (!t) return false;
  if (/[,;\-–—]$/.test(offenerName.trim())) return true;
  if (FORTSETZUNGSWORT.test(t)) return true;
  if (PREIS_BESCHRIFTUNG.test(t)) return true;
  // \p{Ll} statt [a-zäöüß]: Auf deutschen Karten stehen staendig franzoesische
  // und italienische Begriffe. "à la carte 9,00" begann mit "à" und fiel durch
  // die enge Zeichenklasse — die Zeile wurde damit zum Gerichtnamen, und das
  // echte Gericht darueber ging verloren.
  if (/^\p{Ll}/u.test(t)) return true;
  return false;
}

/**
 * Zeilen, die nur den PREIS beschriften statt ein Gericht zu benennen.
 *
 * Auf Karten mit Menuefolge steht der Preis regelmaessig hinter so einer
 * Beschriftung, waehrend das Gericht ein paar Zeilen darueber steht:
 *
 *     Suppe aus regionalen Edelfischen
 *     mit Kaesekeks und Tomatenkonfituere
 *     a la carte              9,00
 *     Menuepreis:            44,00
 *
 * Ohne diese Liste hiess das Gericht anschliessend "à la carte".
 */
const PREIS_BESCHRIFTUNG =
  /^(à\s*la\s*carte|a\s*la\s*carte|men(ü|ue|u)preis|preis|pro\s+person|p\.?\s*p\.?|je\s+person|im\s+men(ü|ue|u))\b|:\s*$/i;

/**
 * Woran ein Aufpreis oder eine Groesse zu erkennen ist — und nicht ein Gericht.
 *
 * Alle Muster stammen von echten Karten des Messkorpus, nicht aus der
 * Vorstellung:
 *   "Kaese +          1,20"   <- das Pluszeichen ist DER Marker
 *   "dazu einen Salat 4,50"
 *   "klein            7,90"   /  "gross  10,90"
 *   "Tasse            3,50"   /  "Pott    4,50"  /  "Doppio 4,50"
 *   "2 Kugeln         3,80"
 *   "kleine Portion  18,50"
 *   "fuer Profis eine ganze Haxe 24,00"
 */
const VARIANTEN_MUSTER: RegExp[] = [
  /\+\s*$/,
  /^dazu\b/i,
  /^(mit\s+)?extra\b/i,
  /^(klein|kleine|gross|grosse|groß|große)(\s+portion)?$/i,
  /^(kleine|grosse|große)\s+portion\b/i,
  /^(tasse|pott|becher|glas|kaennchen|kännchen|doppio|schoppen)$/i,
  /^\d+\s+kugeln?$/i,
  /^\d+\s*(stk|st(ü|ue)ck|st)\.?$/i,
  /^(halbe|ganze|halber|ganzer)\s/i,
  /^f(ue|ü)r\s+(einsteiger|profis|kinder)\b/i,
  /^(als|zum)\s+(beilage|nachschlag)\b/i,
];

/**
 * Ist diese Zeile ein Aufpreis zum Gericht darueber statt eines eigenen
 * Gerichts?
 *
 * Die Preisgrenze ist Absicht: "dazu gebratene Riesengarnelen 27,00" auf einer
 * gehobenen Karte ist eine echte Aufwertung des Gerichts und bleibt eine
 * Variante — aber ein "gross" fuer 10,90 neben einem Salatteller fuer 7,90
 * ebenso. Was das Muster trifft, ist eine Variante; die Hoehe des Preises
 * entscheidet nicht mit, weil sie je nach Haus voellig verschieden ausfaellt.
 */
export function istVariante(name: string): boolean {
  const t = name.trim();
  if (!t) return false;
  return VARIANTEN_MUSTER.some((rx) => rx.test(t));
}

/** Raeumt das Pluszeichen ab, das die Variante markiert hat. */
export function variantenName(name: string): string {
  return name.replace(/\s*\+\s*$/, "").replace(/[\s,;]+$/, "").trim();
}

/** Wochentage als Ueberschrift eines Mittagstischs. */
const WOCHENTAG =
  /^(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonnabend|sonntag)\s*:?\s*$/i;

/** Zeitangaben — verraten eine Oeffnungszeiten-Tabelle statt eines Mittagstischs. */
const ZEITSPANNE = /\d{1,2}[:.]\d{2}\s*(-|–|bis)\s*\d{1,2}[:.]\d{2}|\bruhetag\b|\bgeschlossen\b/i;

/** Hoechstens so viele Gerichte je Wochentag. */
const MAX_TAGESGERICHTE = 6;

/**
 * Rubriknamen, die fuer sich allein stehen und einen Wochentagsblock beenden.
 * Bewusst als GANZE Zeile geprueft, nicht als Teilwort: "Suppen" beendet den
 * Block, "Gemuesecremesuppe" ist ein Gericht darin.
 */
const ENDE_DES_TAGESBLOCKS =
  /^(vorspeisen|suppen?|salate|hauptgerichte|hauptspeisen|desserts?|nachspeisen|nachtisch|getr(ä|ae)nke|beilagen|pizza|pasta|burger|schnitzel|snacks|fr(ü|ue)hst(ü|ue)ck|kinderkarte|kindergerichte|tageskarte|speisekarte|weine?|biere?|cocktails)\s*$/i;

/**
 * Taugt die Zeile als Gericht eines Mittagstischs — also ohne eigenen Preis?
 *
 * Bewusst streng, weil hier die uebliche Absicherung fehlt: Sonst ist der Preis
 * das Merkmal, an dem ein Gericht ueberhaupt erkannt wird. Unter einem
 * Wochentag ist die Struktur aber eindeutig genug, um darauf zu verzichten.
 */
function taugtAlsTagesgericht(zeile: string): boolean {
  const t = zeile.trim();
  if (t.length < 4 || t.length > MAX_NAME_LENGTH) return false;
  if (isNoise(t) || ZEITSPANNE.test(t)) return false;
  if (findPrices(t).length > 0) return false;
  if (WOCHENTAG.test(t)) return false;
  /*
   * NICHT detectCategory verwenden: Das trifft im Gerichtnamen auf jedes
   * Stichwort — "Gemuesecremesuppe" enthaelt "suppe" und waere damit eine
   * Rubrik statt ein Gericht. Innerhalb eines Wochentagsblocks sagt die
   * Struktur schon, dass hier Gerichte stehen. Abgebrochen wird nur bei
   * etwas, das unverkennbar eine Ueberschrift ist.
   */
  if (ENDE_DES_TAGESBLOCKS.test(t)) return false;
  if (/:\s*$/.test(t)) return false;
  const buchstaben = t.replace(/[^A-Za-zÄÖÜäöüß]/g, "");
  if (buchstaben.length >= 3 && buchstaben === buchstaben.toUpperCase()) return false;
  if (!/[A-Za-zÄÖÜäöüß]/.test(t)) return false;
  // Ein Gerichtname beginnt gross. Eine fortgesetzte Beschreibungszeile nicht.
  return /^[A-ZÄÖÜ]/.test(t);
}

export interface ParseOptions {
  /** Präfix der erzeugten IDs, z.B. "ocr" oder "pdf". */
  idPrefix?: string;
  /**
   * Kürzel-Legende der Karte. Wird sie nicht übergeben, liest parseMenuText sie
   * selbst aus demselben Text — sie steht praktisch immer am Ende der Karte.
   */
  allergenLegend?: Record<string, string>;
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

  /**
   * Zeilen, die auf jeder Seite wiederkehren, sind Kopf- oder Fußzeile — nie
   * eine Rubrik. Bei der Karte "Zur Post" stand auf jeder der vier Seiten
   * "SPEISEKARTE" und "„ZUR POST“ HOTEL – GASTHOF"; beides wurde zur
   * Kategorie, und die Gerichte darunter landeten unter dem Betriebsnamen.
   *
   * Drei Vorkommen als Grenze: Zweimal kann eine echte Rubrik vorkommen (Karte
   * und Getränkekarte), dreimal praktisch nie.
   */
  const haeufigkeit = new Map<string, number>();
  for (const roh of lines) {
    const l = roh.trim();
    // Nur preislose Zeilen. Eine Zeile MIT Preis ist ein Gericht, auch wenn sie
    // mehrfach vorkommt — Karten wiederholen Positionen (Tages- und Hauptteil),
    // und die fängt weiter unten die Dublettenprüfung ab. Ohne diese Schranke
    // verschwanden auf drei HTML-Karten des Korpus zusammen 27 echte Gerichte.
    /*
     * Beschreibungszeilen ausnehmen. Eine Kopf- oder Fusszeile ist nie eine
     * Beschreibung; eine Beilagenzeile immer — und "mit Pommes und Salat"
     * steht auf einer Schnitzelkarte fuenf- bis zehnmal. Ohne diese Schranke
     * galt sie als Seitenmoebel, und in zweispaltigen Karten nahm sie den
     * anstehenden Gerichtnamen mit ins Grab. Eine Karte mit drei gleich
     * beschriebenen Gerichten ergab dann NULL Gerichte.
     */
    if (
      l.length >= 3 &&
      l.length <= 60 &&
      findPrices(l).length === 0 &&
      !looksLikeDescription(l)
    ) {
      haeufigkeit.set(l, (haeufigkeit.get(l) ?? 0) + 1);
    }
  }
  const seitenmoebel = new Set(
    [...haeufigkeit.entries()].filter(([, n]) => n >= 3).map(([l]) => l),
  );

  /**
   * Die Kürzel, die diese Karte in ihrer Legende erklärt. Sie sind der
   * Prüfstein für die ungeklammerte Schreibweise: Ohne sie hielte "…und Ei"
   * das "Ei" für ein Kürzel und behauptete ein Allergen, das dort nicht steht.
   */
  const bekannteKuerzel = new Set(
    Object.keys(options.allergenLegend ?? parseAllergenLegend(text)),
  );

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
    /*
     * Seitenmoebel werden uebersprungen, beenden aber NICHT das Gericht
     * darueber: Eine Kopfzeile mitten zwischen Name und Preis (in
     * mehrseitigen PDFs die Regel) wuerde sonst beides trennen. Deshalb hier
     * kein clearPending() — der Unterschied zu isNoise ist Absicht.
     */
    if (seitenmoebel.has(line)) continue;

    /*
     * Mittagstisch: Ein Wochentag als Überschrift, darunter die Gerichte des
     * Tages — ohne eigenen Preis, weil der einmal für das ganze Menü gilt
     * ("Unser Tagesessen mit Suppe und Hauptgang für 12,00 €").
     *
     * Das ist eine der häufigsten Strukturen auf deutschen Gastro-Seiten und
     * war bisher vollständig unsichtbar: Ein Gericht entsteht sonst nur, wo
     * ein Preis steht. Beim Landgasthof Hölzle waren das 6 von 13 Gerichten.
     *
     * Die Absicherung liegt in der Struktur, nicht im Preis: Nur direkt unter
     * einem Wochentag, höchstens sechs Zeilen weit, jede Zeile
     * großgeschrieben und ohne Zeitangabe — sonst wäre die
     * Öffnungszeiten-Tabelle darunter plötzlich eine Speisekarte.
     */
    if (WOCHENTAG.test(line)) {
      const tag = titleCase(line.replace(/:\s*$/, ""));
      let genommen = 0;
      let k = i + 1;
      // Erste Folgezeile mit Zeitangabe -> das ist die Öffnungszeiten-Tabelle.
      if (ZEITSPANNE.test(lines[k]?.trim() ?? "")) {
        clearPending();
        continue;
      }
      while (k < lines.length && genommen < MAX_TAGESGERICHTE) {
        const kandidat = lines[k].trim();
        if (!kandidat || !taugtAlsTagesgericht(kandidat)) break;
        const gericht = cleanItemName(stripAllergenCodes(kandidat, bekannteKuerzel));
        if (gericht.length >= MIN_NAME_LENGTH) {
          const schluessel = gericht.toLowerCase().replace(/\s+/g, " ");
          if (!seen.has(schluessel)) {
            seen.add(schluessel);
            const eintrag: ParsedMenuItem = {
              id: slugId(prefix, gericht, items.length),
              name: gericht,
              category: tag,
            };
            const kz = extractAllergenCodes(kandidat, bekannteKuerzel);
            if (kz.length) eintrag.allergens = kz;
            const lb = extractLabels(gericht);
            if (lb.length) eintrag.labels = lb;
            items.push(eintrag);
            genommen++;
          }
        }
        k++;
      }
      if (genommen > 0) {
        i = k - 1;
        clearPending();
        continue;
      }
    }

    /*
     * Eine Überschrift ist es nur, wenn NICHT gleich danach ein Preis kommt,
     * der diese Zeile fortsetzt.
     *
     * Der Grund: Sehr viele einwortige Gerichtnamen enthalten ein
     * Rubrik-Stichwort. "Rumpsteak" trifft auf "steak", "Löwentoast" auf
     * "toast", "Zwiebelsuppe" auf "suppe". Ohne diese Bremse verschwand das
     * Gericht als Überschrift, und seine Beschreibungszeile wurde zum Gericht
     * — auf zwei Karten des Messkorpus die häufigste Einzelursache.
     *
     * Eine echte Rubrik besteht diese Prüfung: Auf "VORSPEISEN" folgt
     * "Forelle 12,90", und "Forelle" setzt "VORSPEISEN" nicht fort.
     */
    const heading = detectCategory(line);
    if (heading && !beginntNeuesGericht(lines, i, seitenmoebel)) {
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

      /*
       * Steht schon ein Name an und diese Zeile liest sich wie eine
       * Beschreibung, gehört sie dazu – in zweispaltigen Karten steht sie
       * ZWISCHEN Name und Preis, nicht dahinter.
       *
       * MEHRERE solcher Zeilen werden gesammelt. Vorher nahm der Parser nur
       * die erste; jede weitere ersetzte den NAMEN. Auf Karten, die ein
       * Gericht über vier Zeilen schreiben, hieß das Gericht danach
       * "Spiegelei und Salat" statt "Löwentoast" — auf einer Karte des
       * Messkorpus betraf das jedes zweite Gericht.
       *
       * beginntNeuesGericht bremst das: Eine Zeile, hinter der ein eigener
       * Preis steht, ist der Anfang des NÄCHSTEN Gerichts und darf nicht in
       * die Beschreibung des vorherigen wandern.
       */
      const vorherigeZeile = lines[i - 1]?.trim() ?? "";
      if (
        pendingName &&
        looksLikeDescription(line) &&
        // Die ERSTE Zeile nach dem Namen ist immer eine Beschreibung. Jede
        // weitere nur, wenn sie den Satz auch wirklich fortsetzt — sonst
        // schluckt ein Gericht den Namen des naechsten.
        (!pendingDescription || setztFort(line, vorherigeZeile))
      ) {
        const teil = line.replace(/\s{2,}/g, " ");
        const zusammen = pendingDescription
          ? `${pendingDescription} ${teil}`
          : teil;
        // Nicht unbegrenzt sammeln: Ein Fließtext-Absatz am Ende der Karte
        // würde sonst vollständig im letzten Gericht landen.
        if (zusammen.length <= MAX_DESCRIPTION_LENGTH) {
          pendingDescription = zusammen;
          continue;
        }
      }

      // Sonst beginnt hier ein neuer Name. Der bisherige hatte keinen Preis
      // und war damit kein Gericht.
      pendingName = usable ? candidate : null;
      pendingDescription = null;
      continue;
    }

    const first = prices[0];
    const vorPreis = line.slice(0, first.start);
    // Kennzeichnung einsammeln, BEVOR cleanItemName sie wegwirft. Sie steht
    // mal am Namen, mal an der Beilagenzeile davor — beides gehört zum Gericht.
    const kennzeichnung = [
      ...extractAllergenCodes(pendingName ?? "", bekannteKuerzel),
      ...extractAllergenCodes(pendingDescription ?? "", bekannteKuerzel),
      ...extractAllergenCodes(vorPreis, bekannteKuerzel),
    ].filter((k, i, alle) => alle.indexOf(k) === i);
    let name = cleanItemName(stripAllergenCodes(vorPreis, bekannteKuerzel));
    let description: string | null = null;
    /** Stand der Preis in derselben Zeile wie der Name? */
    let sameLine = true;

    // Preis steht allein in der Zeile -> Name (und ggf. Beschreibung) von oben.
    if (name.length < MIN_NAME_LENGTH && pendingName) {
      name = stripAllergenCodes(pendingName, bekannteKuerzel);
      description = pendingDescription;
      sameLine = false;
    } else if (
      pendingName &&
      // Gegen die ZULETZT gelesene Zeile prüfen, nicht gegen den Namen: Bei
      // einem Gericht über vier Zeilen endet die letzte Beschreibungszeile
      // mitten im Satz, der Name drei Zeilen darüber aber nicht.
      setztFort(vorPreis, pendingDescription ?? pendingName)
    ) {
      // Der Name lief über zwei Zeilen und der Preis steht am Ende der
      // zweiten. Ohne diesen Zweig hieß das Gericht "dazu Kartoffelsalat" und
      // der echte Name ging verloren — siehe setztFort.
      description = [pendingDescription, name].filter(Boolean).join(" ");
      name = stripAllergenCodes(pendingName, bekannteKuerzel);
      sameLine = false;
    }
    clearPending();

    // Zeilenumbruch-Komma gehört nicht in den Namen.
    name = name.replace(/[,;]+$/, "").trim();

    if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) continue;
    // Ein Name, der nur aus Ziffern besteht, ist ein Zahlendreher, kein Gericht.
    if (!/[A-Za-zÄÖÜäöüß]/.test(name)) continue;

    /*
     * Dublettenschluessel ist Name UND Preis. Nur der Name reichte nicht:
     * Karten fuehren dasselbe Gericht in zwei Groessen oder Beilagen —
     *   Kraftbruehe / mit Markkloesschen ... 5,50
     *   Kraftbruehe / mit 1 grossen Leberknoedel ... 6,50
     * Mit dem Namen als alleinigem Schluessel verschwand die zweite Zeile
     * lautlos. Gleicher Name UND gleicher Preis bleibt eine Dublette — das
     * ist der Fall, den die Pruefung urspruenglich abfangen sollte (Karten
     * wiederholen Positionen in Tagesempfehlung und Hauptteil).
     */
    /*
     * A1.2: Aufpreise und Groessen gehoeren AN das Gericht darueber, nicht
     * daneben. Ohne diesen Zweig stand auf der Karte des Landgasthofs zum
     * Loewen ein Gericht namens "Kaese" fuer 1,20 EUR in der Web-App.
     *
     * Nur wenn es ueberhaupt ein Gericht gibt, an das sie gehoeren koennten —
     * sonst ginge die Zeile ganz verloren, und lieber eine unschoene Position
     * als eine verschwundene.
     */
    if (items.length > 0 && istVariante(name)) {
      const ziel = items[items.length - 1];
      const sauber = variantenName(name);
      if (sauber) {
        // Die Kennzeichnung gehoert AN die Variante, nicht ans Grundgericht:
        // Ein "Kaese +" bringt Milch mit, das Schnitzel darunter nicht. Sie
        // hochzureichen hiesse, dem Grundgericht ein Allergen anzudichten.
        const zusatz: { name: string; price?: string; allergens?: string[] } = {
          name: sauber,
          price: first.value,
        };
        if (kennzeichnung.length) zusatz.allergens = kennzeichnung;
        ziel.extras = [...(ziel.extras ?? []), zusatz];
        continue;
      }
    }

    const key = `${name.toLowerCase().replace(/\s+/g, " ")}|${first.value}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Nur im gewöhnlichen Aufbau (Name UND Preis in einer Zeile) darf die
    // Folgezeile die Beschreibung sein. Kam der Name aus der Zeile darüber,
    // ist die Folgezeile mit hoher Wahrscheinlichkeit das NÄCHSTE Gericht –
    // sie als Beschreibung zu schlucken hat dort jedes zweite Gericht gekostet.
    if (sameLine) {
      const next = lines[i + 1]?.trim() ?? "";
      // Gehört die Folgezeile schon zum NÄCHSTEN Gericht? Siehe
      // beginntNeuesGericht — der Preis dazu kann mehrere Zeilen weiter stehen.
      if (
        next &&
        looksLikeDescription(next) &&
        !istAngefangenerName(next) &&
        !beginntNeuesGericht(lines, i + 1, seitenmoebel)
      ) {
        description = next.replace(/\s{2,}/g, " ");
        kennzeichnung.push(
          ...extractAllergenCodes(next, bekannteKuerzel).filter(
            (k) => !kennzeichnung.includes(k),
          ),
        );
        i++;
      }
    }

    const item: ParsedMenuItem = {
      id: slugId(prefix, name, items.length),
      name,
      price: first.value,
      category,
    };
    // Die Kürzel stehen im eigenen Feld — im Fließtext einer Beschreibung
    // liest sie niemand, und der Name soll sie ohnehin nicht tragen.
    if (description) {
      const sauber = stripAllergenCodes(description, bekannteKuerzel);
      if (sauber) item.description = sauber;
    }
    if (kennzeichnung.length) item.allergens = kennzeichnung;

    // Labels aus Name UND Beschreibung: "vegan" steht mal am einen, mal am
    // anderen. Der Kategoriename zählt bewusst NICHT mit — sonst trüge unter
    // der Rubrik "Vegetarisch" jedes Gericht das Label, auch das mit Speck.
    const labels = extractLabels(`${name} ${item.description ?? ""}`);
    if (labels.length) item.labels = labels;

    items.push(item);
  }

  // Grob falsche Zuordnungen am Namen korrigieren – siehe refineCategories.
  return refineCategories(items);
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
