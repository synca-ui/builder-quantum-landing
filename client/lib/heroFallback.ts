/**
 * Rückfalltexte für den Hero der Startseite — EINE Quelle für Vorschau
 * (TemplatePreviewContent) und veröffentlichte Seite (Hero/AppRenderer).
 *
 * Anlass (Echtfall krawummel.de, 21.08.2026): Ohne Slogan und Beschreibung
 * stand auf der veröffentlichten Seite „Willkommen“ über „Willkommen in
 * unserem Geschäft!“ — zweimal dasselbe Füllwort, null Information. Dabei
 * sind Name, Betriebsart und Ort praktisch immer vorhanden: Der Name gehört
 * groß in den Hero (so machen es Restaurantseiten selbst), und „Café in
 * Münster“ sagt einem Gast mehr als jede Floskel.
 */

const TYP_LABEL: Record<string, string> = {
  cafe: "Café",
  restaurant: "Restaurant",
  bar: "Bar",
};

/**
 * Zieht den Ortsnamen aus einer Adresszeile.
 *
 * Verlässlichster Anker ist die deutsche Postleitzahl („…, 48143 Münster“).
 * Ohne PLZ gilt das letzte Komma-Segment, wenn es wie ein Ortsname aussieht
 * (beginnt groß, keine Hausnummer) — „Ludgeristraße 62, Münster“ liefert
 * „Münster“, eine reine Straßenangabe liefert nichts.
 */
export function ortAusAdresse(location?: string): string | undefined {
  const adresse = location?.trim();
  if (!adresse) return undefined;

  const plz = adresse.match(/\b\d{5}\s+([A-ZÄÖÜ][\wäöüß.-]*(?:\s+[\wäöüß.-]+){0,2})/);
  if (plz) return plz[1].trim();

  const segment = adresse.split(",").pop()?.trim() ?? "";
  if (/^[A-ZÄÖÜ][\wäöüß.-]*(?:\s+[\wäöüß.-]+){0,2}$/.test(segment) && !/\d/.test(segment)) {
    return segment;
  }
  return undefined;
}

/** Hero-Überschrift: Slogan vor Name vor Floskel. */
export function heroTitel(slogan?: string, businessName?: string): string {
  return slogan?.trim() || businessName?.trim() || "Willkommen";
}

/**
 * Hero-Unterzeile: echte Beschreibung, sonst „Café in Münster“, sonst NICHTS.
 * `null` heißt: die Zeile weglassen — eine leere Fläche liest sich besser als
 * „Wir bieten beste Qualität und eine tolle Atmosphäre.“
 */
export function heroUntertitel(
  description?: string,
  businessType?: string,
  location?: string,
): string | null {
  const echt = description?.trim();
  if (echt) return echt;

  const label = TYP_LABEL[businessType?.trim().toLowerCase() ?? ""];
  const ort = ortAusAdresse(location);
  if (label && ort) return `${label} in ${ort}`;
  return null;
}
