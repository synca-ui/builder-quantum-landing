/**
 * Gemeinsame Form aller Texterkennungs-Anbieter.
 *
 * Anlass: Die Erkennung hing zuerst allein an Gemini, und der erste echte Lauf
 * scheiterte nicht an der Technik, sondern am Freikontingent:
 *
 *   HTTP 429 – "You exceeded your current quota"
 *
 * Die Speisekarte ist der wichtigste Einzelposten des automatischen Modus. Sie
 * an einem einzelnen Anbieter hängen zu lassen, dessen Kontingent jederzeit
 * erschöpft sein kann, ist die falsche Bauweise – deshalb eine Kette: Fällt
 * einer wegen Kontingent oder Störung aus, übernimmt der nächste.
 */

/** Warum ein Anbieter nicht liefern konnte. Entscheidet über den Weiterschalt. */
export type OcrFailureKind =
  /** Nicht eingerichtet (Schlüssel fehlt) – überspringen, kein Fehler. */
  | "not_configured"
  /** Kontingent oder Ratenbegrenzung – nächster Anbieter. */
  | "quota"
  /** Datei zu groß für diesen Anbieter – nächster Anbieter kann es evtl. */
  | "too_large"
  /** Alles Übrige (Netz, Serverfehler, unerwartete Antwort). */
  | "error";

export class OcrError extends Error {
  constructor(
    message: string,
    readonly kind: OcrFailureKind,
    readonly provider: string,
  ) {
    super(message);
    this.name = "OcrError";
  }
}

/**
 * Erkennt einen OcrError an seiner Form statt über instanceof.
 *
 * instanceof scheitert, sobald das Modul zweimal geladen wird – beim Bündeln,
 * über Re-Exporte oder in Tests mit zurückgesetzter Modul-Registry. Dann fiele
 * die Kette auf String(err) zurück und verlöre genau die Angabe, an der sie
 * entscheidet, ob weitergeschaltet wird. Die Formprüfung überlebt das.
 */
export function isOcrError(err: unknown): err is OcrError {
  return (
    err instanceof OcrError ||
    (typeof err === "object" &&
      err !== null &&
      (err as { name?: unknown }).name === "OcrError" &&
      typeof (err as { kind?: unknown }).kind === "string")
  );
}

export interface OcrProvider {
  /** Kurzname für Protokoll und Diagnose, z.B. "gemini". */
  readonly name: string;
  /** Ist der Anbieter einsatzbereit (Schlüssel gesetzt)? */
  isConfigured(): boolean;
  /** Verträgt der Anbieter diese Größe? Verhindert aussichtslose Versuche. */
  supportsSize(bytes: number): boolean;
  /** Liest das Dokument als reinen Text aus. Wirft OcrError. */
  transcribe(data: Buffer, mimeType: string, timeoutMs: number): Promise<string>;
}

/**
 * Der Auftrag an jeden Anbieter. Wortgleich gehalten, damit die Ergebnisse
 * vergleichbar bleiben und der Parser dahinter für alle derselbe sein kann.
 */
export const TRANSCRIBE_PROMPT = [
  "Transkribiere diese Speisekarte vollstaendig als reinen Text.",
  "Behalte Zeilenumbrueche, Kategorie-Ueberschriften und Preise exakt bei.",
  "Schreibe jedes Gericht mit seinem Preis in dieselbe Zeile.",
  "Gib NUR den Text aus, keine Erklaerungen, keine Formatierung, kein Markdown.",
].join(" ");
