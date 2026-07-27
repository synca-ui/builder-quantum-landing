/**
 * Leichtgewichtige Textauswertung für Bewertungen - ohne ML-Abhängigkeit.
 *
 * Kein echtes NLP: ein deutscher Tokenizer plus themenbezogene Schlagwortlisten.
 * Das genügt, um wiederkehrende Themen ("Kaffee", "Wartezeit", "Service") aus
 * Freitext-Reviews zu ziehen und sie mit der Sternebewertung zu verknüpfen. Wenn
 * später ein echtes Sentiment-Modell dazukommt, ersetzt es nur diese Datei.
 */

/** Häufige deutsche Füllwörter, die nie ein Thema sind. */
const STOPWORDS = new Set([
  "und", "oder", "aber", "der", "die", "das", "ein", "eine", "einen", "einem",
  "ist", "sind", "war", "wir", "ich", "man", "mit", "für", "auf", "aus", "bei",
  "sehr", "auch", "noch", "schon", "hier", "sich", "nur", "kommt", "komme",
  "wieder", "immer", "mal", "beim", "im", "in", "am", "an", "zu", "zum", "zur",
  "es", "sie", "er", "den", "dem", "des", "nicht", "kein", "wie", "als", "so",
]);

/** Themen-Buckets mit ihren Auslöser-Stämmen (kleingeschrieben, ohne Endung). */
const TOPICS: { topic: string; stems: string[] }[] = [
  { topic: "Kaffee", stems: ["kaffee", "flat white", "espresso", "cappuccino", "latte", "röst", "bohne"] },
  { topic: "Gebäck", stems: ["gebäck", "kuchen", "zimtschnecke", "croissant", "torte", "frühstück"] },
  { topic: "Service", stems: ["service", "personal", "freundlich", "team", "bedienung", "nett"] },
  { topic: "Wartezeit", stems: ["warte", "voll", "lang", "dauer", "gedauert", "schlange"] },
  { topic: "Atmosphäre", stems: ["atmosphär", "gemütlich", "ambiente", "musik", "einrichtung", "schön"] },
  { topic: "Preis", stems: ["preis", "teuer", "günstig", "wert", "euro"] },
  { topic: "Terrasse", stems: ["terrasse", "außen", "draußen", "garten", "sonne"] },
];

/** Zerlegt Text in kleingeschriebene Tokens ohne Satzzeichen und Stoppwörter. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-zäöüß\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** Trifft ein Review ein Thema? (Substring-Treffer auf dem Rohtext, tolerant.) */
export function matchesTopic(text: string, stems: string[]): boolean {
  const lower = text.toLowerCase();
  return stems.some((stem) => lower.includes(stem));
}

export { TOPICS };
