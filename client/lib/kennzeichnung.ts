/**
 * Kennzeichnung auf der Karte: Allergene, Zusatzstoffe, Ernährungs-Labels.
 * EINE Quelle für die Gerichte-Zeilen (DishCard), die Legende (DishList),
 * das Modal und den Editor (MenuProductsStep).
 *
 * Rechtlicher Rahmen (Stand 09/2026, Deutschland):
 *  - LMIV (EU) 1169/2011 Art. 44 + LMIDV § 2: Für lose Ware — also alles,
 *    was ein Restaurant serviert — müssen die 14 Hauptallergene angegeben
 *    werden. Schriftlich in der Karte ist erlaubt, auch elektronisch, wenn
 *    die Information vor der Kaufentscheidung zugänglich ist und der Betrieb
 *    sie schriftlich dokumentiert hat.
 *  - Kürzel (Buchstaben, Ziffern, Fußnoten) sind zulässig, wenn ihre
 *    Bedeutung „an gut sichtbarer Stelle, deutlich und gut lesbar“ in
 *    derselben Karte erklärt wird — deshalb steht die Legende unten auf der
 *    Speisekarte selbst, nicht nur im Modal.
 *  - Zusatzstoffe (ZZulV § 9) werden getrennt gekennzeichnet; Allergene und
 *    Zusatzstoffe müssen unterscheidbar bleiben. Verbreitete Praxis (DEHOGA):
 *    Buchstaben für Allergene, Ziffern für Zusatzstoffe. Das Gesetz schreibt
 *    kein System vor, verlangt aber Konsistenz innerhalb einer Karte.
 *  - „vegan“ und „vegetarisch“ sind freiwillige Angaben ohne gesetzliche
 *    Definition; „glutenfrei“ ist eine geregelte Angabe (VO (EU) 828/2014,
 *    höchstens 20 mg/kg) — sie steht in der Verantwortung des Betriebs.
 *
 * Was wir NICHT tun: Kürzel raten. Welches Kürzel was bedeutet, legt jede
 * Karte selbst fest (shared/menuParser.ts liest die Legende der erkannten
 * Karte). Die DEHOGA-Vorlage unten ist ein Angebot für den Editor, kein
 * stiller Rückfall — eine falsche Allergenangabe ist schlimmer als eine
 * unaufgelöste.
 */

/** Ernährungs-Labels, die der Editor als Schalter anbietet. */
export const STANDARD_LABELS = [
  "vegan",
  "vegetarisch",
  "glutenfrei",
  "laktosefrei",
  "scharf",
] as const;

/**
 * Buchstaben-Schema der DEHOGA für die 14 Hauptallergene (LMIV Anhang II).
 * Die Lücken (I, J, K, Q) sind Absicht — so steht es auf den meisten
 * deutschen Karten, und Gäste kennen die Reihe.
 */
export const DEHOGA_ALLERGENE: Record<string, string> = {
  a: "Glutenhaltiges Getreide",
  b: "Krebstiere",
  c: "Eier",
  d: "Fisch",
  e: "Erdnüsse",
  f: "Sojabohnen",
  g: "Milch (einschließlich Laktose)",
  h: "Schalenfrüchte (Nüsse)",
  l: "Sellerie",
  m: "Senf",
  n: "Sesamsamen",
  o: "Schwefeldioxid und Sulfite",
  p: "Lupinen",
  r: "Weichtiere",
};

/** Ziffern-Schema der DEHOGA für kennzeichnungspflichtige Zusatzstoffe (ZZulV § 9). */
export const DEHOGA_ZUSATZSTOFFE: Record<string, string> = {
  "1": "mit Konservierungsstoff",
  "2": "mit Farbstoff",
  "3": "mit Antioxidationsmittel",
  "4": "mit Süßungsmittel Saccharin",
  "5": "mit Süßungsmittel Cyclamat",
  "6": "mit Süßungsmittel Aspartam, enthält eine Phenylalaninquelle",
  "7": "mit Süßungsmittel Acesulfam",
  "8": "mit Phosphat",
  "9": "geschwefelt",
  "10": "chininhaltig",
  "11": "koffeinhaltig",
  "12": "mit Geschmacksverstärker",
  "13": "geschwärzt",
  "14": "gewachst",
};

/** Kürzel, wie sie gespeichert werden: kleingeschrieben, ohne Rand. */
export function kuerzelSchluessel(code: string): string {
  return String(code ?? "").trim().toLowerCase();
}

/**
 * Kürzel, wie der Gast es liest: Buchstaben groß („a1“ → „A1“), Ziffern
 * unverändert. Deutsche Karten schreiben Allergen-Buchstaben groß.
 */
export function kuerzelAnzeige(code: string): string {
  return kuerzelSchluessel(code).toUpperCase();
}

/** „A, c ,g; 2“ → ["a", "c", "g", "2"] — ohne Dubletten, ohne Leeres. */
export function parseKuerzel(text: string): string[] {
  const gesehen = new Set<string>();
  for (const teil of String(text ?? "").split(/[,;\s]+/)) {
    const k = kuerzelSchluessel(teil);
    if (k) gesehen.add(k);
  }
  return [...gesehen];
}

/** Label, wie der Gast es liest: kleingeschrieben gespeichert, so auch gezeigt. */
export function labelText(label: string): string {
  return String(label ?? "").trim().toLowerCase();
}

/**
 * Sortierung für Legende und Anzeige: Buchstaben-Kürzel zuerst
 * (alphabetisch, dann nach Ziffer: a, a1, a2, b …), Ziffern danach numerisch.
 */
export function sortiereKuerzel(codes: string[]): string[] {
  const buchstabe = (k: string) => /^[a-z]/.test(k);
  const zahl = (k: string) => Number(k.replace(/\D/g, "") || 0);
  return [...codes].sort((x, y) => {
    const bx = buchstabe(x);
    const by = buchstabe(y);
    if (bx !== by) return bx ? -1 : 1;
    if (bx) {
      const px = x.replace(/\d+$/, "");
      const py = y.replace(/\d+$/, "");
      if (px !== py) return px.localeCompare(py);
      return zahl(x) - zahl(y);
    }
    return zahl(x) - zahl(y) || x.localeCompare(y);
  });
}

/** Alle Kürzel, die an Gerichten stehen — kleingeschrieben, eindeutig. */
export function verwendeteKuerzel(
  items: ReadonlyArray<{ allergens?: string[] }>,
): string[] {
  const gesehen = new Set<string>();
  for (const it of items) {
    for (const code of it.allergens ?? []) {
      const k = kuerzelSchluessel(code);
      if (k) gesehen.add(k);
    }
  }
  return sortiereKuerzel([...gesehen]);
}

/**
 * Zeilen der Legende für die Karte: nur Kürzel, die an einem Gericht stehen
 * UND in der Legende erklärt sind. Eine Legende mit 28 Einträgen, von denen
 * die Karte drei nutzt, hilft niemandem; ein Kürzel ohne Erklärung darf
 * nicht so aussehen, als wäre es erklärt.
 */
export function legendeZeilen(
  legend: Record<string, string> | null | undefined,
  items: ReadonlyArray<{ allergens?: string[] }>,
): Array<[code: string, text: string]> {
  if (!legend) return [];
  const norm: Record<string, string> = {};
  for (const [k, v] of Object.entries(legend)) {
    const key = kuerzelSchluessel(k);
    const text = String(v ?? "").trim();
    if (key && text) norm[key] = text;
  }
  return verwendeteKuerzel(items)
    .filter((k) => norm[k])
    .map((k) => [k, norm[k]]);
}

/** Kürzel, die an Gerichten stehen, aber in der Legende fehlen — für die Warnung im Editor. */
export function fehlendeKuerzel(
  legend: Record<string, string> | null | undefined,
  items: ReadonlyArray<{ allergens?: string[] }>,
): string[] {
  const erklaert = new Set(
    Object.entries(legend ?? {})
      .filter(([, v]) => String(v ?? "").trim())
      .map(([k]) => kuerzelSchluessel(k)),
  );
  return verwendeteKuerzel(items).filter((k) => !erklaert.has(k));
}

/**
 * DEHOGA-Vorlage in eine bestehende Legende einfügen — nur fehlende Kürzel.
 * Was der Betrieb selbst festgelegt hat, bleibt stehen.
 */
export function ergaenzeDehogaLegende(
  legend: Record<string, string> | null | undefined,
): Record<string, string> {
  const ergebnis: Record<string, string> = {};
  for (const [k, v] of Object.entries(legend ?? {})) {
    const key = kuerzelSchluessel(k);
    if (key && String(v ?? "").trim()) ergebnis[key] = String(v).trim();
  }
  for (const quelle of [DEHOGA_ALLERGENE, DEHOGA_ZUSATZSTOFFE]) {
    for (const [k, v] of Object.entries(quelle)) {
      if (!ergebnis[k]) ergebnis[k] = v;
    }
  }
  return ergebnis;
}
