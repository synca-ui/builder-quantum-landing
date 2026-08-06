/**
 * Telefonnummern normalisieren — eine Quelle für Server und Client.
 *
 * WARUM DAS HIER LIEGT UND NICHT IM SCHREIBPFAD DER STEMPELKARTE
 * Das Schema führt zwei Spalten (`MaitrGuest.phone` roh, `phoneE164` normalisiert)
 * und einen Unique-Index `[businessId, phoneE164]`. Der Schemakommentar sagt dazu
 * ausdrücklich: „Die Normalisierung gehoert an die Schreibgrenze, nicht in den
 * Index." Es gab sie bisher nirgends — `grep -rn "toE164\|normalizePhone"` fand
 * keine Zeile. Folge: `phoneE164` blieb NULL, Postgres lässt beliebig viele NULL
 * nebeneinander zu, und derselbe Gast entstand bei jedem Besuch ein zweites Mal.
 * Seine spätere Löschanfrage hätte dann nur eine der Zeilen getroffen.
 *
 * Bewusst ohne Abhängigkeit (kein libphonenumber): das Modul wird sowohl vom
 * Express-Server als auch vom React-Native-Bundle geladen, und die Fälle, die am
 * Tresen wirklich getippt werden, sind deutsche Nummern in drei Schreibweisen.
 *
 * OHNE führendes Plus — genau die Form, in der WhatsApp `wa_id` liefert. Wer das
 * ändert, macht aus dem Indextreffer wieder eine Laufzeit-Heuristik.
 */

/**
 * Land, dessen Nummern ohne Vorwahl getippt werden dürfen ("0151 …").
 * Als Konstante und nicht als Parameter: ein zweites Land hieße, dass der
 * Aufrufer es kennen muss — und der Aufrufer ist ein Tresenformular.
 */
export const STANDARD_LANDESVORWAHL = "49";

/** Kürzeste/längste Nummer nach E.164 (ohne Plus). */
const MIN_ZIFFERN = 8;
const MAX_ZIFFERN = 15;

/**
 * Rohe Eingabe → E.164 ohne Plus, oder `null`.
 *
 * `null` heißt „daraus lässt sich keine Nummer machen" und ist ein gültiges
 * Ergebnis: dann wird `phoneE164` nicht gesetzt und der Rohwert bleibt trotzdem
 * stehen. Lieber keine Kennung als eine erfundene — eine falsch geratene Nummer
 * führte zwei fremde Gäste zusammen, und das ist schlimmer als ein Doppeleintrag.
 */
export function zuE164(roh: string | null | undefined): string | null {
  if (typeof roh !== "string") return null;
  const geputzt = roh.trim();
  if (geputzt.length === 0) return null;

  // Alles, was am Tresen als Gliederung getippt wird, fliegt raus. Buchstaben
  // NICHT: "0151-KAFFEE" ist keine Nummer, sondern ein Tippfehler, und ihn still
  // zu einer Nummer zu verkürzen wäre geraten.
  if (/[A-Za-z]/.test(geputzt)) return null;
  const kompakt = geputzt.replace(/[\s./()\-–—]/g, "");

  let ziffern: string;
  if (kompakt.startsWith("+")) {
    ziffern = kompakt.slice(1);
  } else if (kompakt.startsWith("00")) {
    ziffern = kompakt.slice(2);
  } else if (kompakt.startsWith("0")) {
    // Nationale Schreibweise: die führende 0 ist die Verkehrsausscheidungsziffer
    // und gehört NICHT in die internationale Form.
    ziffern = STANDARD_LANDESVORWAHL + kompakt.slice(1);
  } else {
    // Weder + noch 00 noch führende 0. Das ist mehrdeutig (Durchwahl? Nummer ohne
    // Vorwahl? bereits internationale Form?) - und Raten führt zwei Personen
    // zusammen. Deshalb: keine Kennung.
    return null;
  }

  if (!/^[0-9]+$/.test(ziffern)) return null;
  if (ziffern.length < MIN_ZIFFERN || ziffern.length > MAX_ZIFFERN) return null;
  return ziffern;
}
