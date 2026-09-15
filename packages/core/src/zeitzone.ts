/**
 * Wanduhr ↔ Zeitpunkt in der Zeitzone eines Betriebs - EINE Rechnung für
 * Server, Web-Client und App.
 *
 * ANLASS (15.09.2026): Die Web-App baute Reservierungszeitfenster als
 * `2026-09-20T19:00:00.000Z` - die Wanduhrzeit des Restaurants, aber als UTC
 * gespeichert. Die Mails fielen nicht auf, weil sie in der Zeitzone des
 * Serverprozesses (Railway: UTC) formatierten; Push und App rechnen korrekt in
 * Europe/Berlin und zeigten jede Web-Buchung im Sommer zwei, im Winter eine
 * Stunde zu spät. Ab jetzt ist `reservationTime` ein echter Zeitpunkt, und jede
 * Anzeige formatiert ausdrücklich in der Zone des Betriebs.
 *
 * WARUM in @maitr/core statt nur in server/utils: Der erste Fix rechnete nur in
 * GET /slots um. Das Web-Dashboard, die Vorschau der Formulare und die
 * Gast-Verwaltungsseite bauten weiter Wanduhr-als-UTC (bzw. nahmen das Datum
 * aus `toISOString()`, also in Berlin den Vortag) - dieselbe Reservierung hatte
 * je nach Schreibweg eine andere Bedeutung, Folge: doppelt vergebene
 * Zeitfenster und Mails mit falscher Uhrzeit. Alle Wege teilen sich jetzt diese
 * Datei; `server/utils/zeitzone.ts` reicht sie nur durch.
 *
 * Ohne Bibliothek und ohne Node-Import: Intl kennt die Zonen, der Versatz wird
 * aus der Differenz zwischen Wanduhr und Zeitpunkt abgelesen. Läuft damit in
 * Browser, Server und React Native gleich.
 */

export const STANDARD_ZONE = "Europe/Berlin";

export interface Wanduhr {
  jahr: number;
  monat: number;
  tag: number;
  stunde: number;
  minute: number;
  sekunde: number;
}

function zweistellig(n: number): string {
  return String(n).padStart(2, "0");
}

/** Die Wanduhr in `zone` zum Zeitpunkt `zeitpunkt`. Unbekannte Zone → UTC. */
export function wanduhrIn(zeitpunkt: Date, zone: string): Wanduhr {
  try {
    const teile = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(zeitpunkt)
        .filter((t) => t.type !== "literal")
        .map((t) => [t.type, Number(t.value)]),
    );
    return {
      jahr: teile.year,
      monat: teile.month,
      tag: teile.day,
      stunde: teile.hour,
      minute: teile.minute,
      sekunde: teile.second,
    };
  } catch {
    return {
      jahr: zeitpunkt.getUTCFullYear(),
      monat: zeitpunkt.getUTCMonth() + 1,
      tag: zeitpunkt.getUTCDate(),
      stunde: zeitpunkt.getUTCHours(),
      minute: zeitpunkt.getUTCMinutes(),
      sekunde: zeitpunkt.getUTCSeconds(),
    };
  }
}

function alsUtc(w: Wanduhr): number {
  return Date.UTC(w.jahr, w.monat - 1, w.tag, w.stunde, w.minute, w.sekunde);
}

/**
 * Der Zeitpunkt, zu dem in `zone` die Wanduhr `w` steht.
 *
 * Zwei Runden, weil der Versatz vom gesuchten Zeitpunkt selbst abhängt: Um die
 * Umstellung herum liefert der Versatz der Schätzung den falschen Wert. In der
 * Lücke der Sommerzeit (02:30 gibt es nicht) landet das Ergebnis eine Stunde
 * später - wie ein Uhrzeiger, der vorgestellt wurde.
 */
export function zeitpunktAusWanduhr(w: Omit<Wanduhr, "sekunde"> & { sekunde?: number }, zone: string): Date {
  const ziel = alsUtc({ ...w, sekunde: w.sekunde ?? 0 });
  let schaetzung = ziel;
  for (let runde = 0; runde < 2; runde++) {
    const versatz = alsUtc(wanduhrIn(new Date(schaetzung), zone)) - schaetzung;
    schaetzung = ziel - versatz;
  }
  return new Date(schaetzung);
}

/** "2026-09-20" + "19:00" in `zone` → Zeitpunkt. `null` bei unlesbarer Eingabe. */
export function zeitpunktAusDatumUndUhrzeit(datum: string, uhrzeit: string, zone: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datum);
  const u = /^(\d{1,2}):(\d{2})$/.exec(uhrzeit);
  if (!d || !u) return null;
  return zeitpunktAusWanduhr(
    { jahr: Number(d[1]), monat: Number(d[2]), tag: Number(d[3]), stunde: Number(u[1]), minute: Number(u[2]) },
    zone,
  );
}

/** Tagesbeginn (00:00) des Kalendertags von `zeitpunkt` in `zone`. */
export function tagesbeginnIn(zeitpunkt: Date, zone: string): Date {
  const w = wanduhrIn(zeitpunkt, zone);
  return zeitpunktAusWanduhr({ jahr: w.jahr, monat: w.monat, tag: w.tag, stunde: 0, minute: 0 }, zone);
}

/** "19:00" - die Uhrzeit von `zeitpunkt` in `zone`. */
export function uhrzeitIn(zeitpunkt: Date, zone: string): string {
  const w = wanduhrIn(zeitpunkt, zone);
  return `${zweistellig(w.stunde)}:${zweistellig(w.minute)}`;
}

/** "2026-09-20" - der Kalendertag von `zeitpunkt` in `zone`. */
export function datumIn(zeitpunkt: Date, zone: string): string {
  const w = wanduhrIn(zeitpunkt, zone);
  return `${w.jahr}-${zweistellig(w.monat)}-${zweistellig(w.tag)}`;
}

/**
 * Zeitpunkt als Text in der Wanduhr von `zone`, z. B.
 * `formatiereInZone(t, "Europe/Berlin", { dateStyle: "full", timeStyle: "short" })`
 * → "Sonntag, 20. September 2026 um 19:00".
 *
 * WARUM nicht einfach `toLocaleString(..., { timeZone: zone })`: Eine unbekannte
 * Zone wirft dort einen RangeError und risse die Seite mit. Über `wanduhrIn`
 * gilt dieselbe Rückfallregel (UTC) wie in allen anderen Rechnungen dieser
 * Datei - Anzeige und gespeicherter Zeitpunkt können nicht auseinanderlaufen.
 */
export function formatiereInZone(
  zeitpunkt: Date,
  zone: string,
  optionen: Intl.DateTimeFormatOptions,
  sprache = "de-DE",
): string {
  return new Date(alsUtc(wanduhrIn(zeitpunkt, zone))).toLocaleString(sprache, { ...optionen, timeZone: "UTC" });
}

/**
 * "2026-09-15" - der LOKALE Kalendertag eines Date (Zone des Geräts).
 *
 * ANLASS: Die Formulare nahmen `d.toISOString().split("T")[0]` von einer lokalen
 * Mitternacht. In Berlin ist die lokale Mitternacht am 15.09. aber
 * 2026-09-14T22:00Z - „Morgen“ schickte das Datum von heute, „Heute“ das von
 * gestern. Für Datumsauswahlen (Kalender, Knöpfe „Heute/Morgen“), die der Gast
 * auf SEINER Uhr sieht, ist der lokale Tag gemeint, nicht der in UTC.
 */
export function lokalesDatumISO(datum: Date): string {
  return `${datum.getFullYear()}-${zweistellig(datum.getMonth() + 1)}-${zweistellig(datum.getDate())}`;
}

/**
 * "2026-09-15" → lokale Mitternacht dieses Tages; `null` bei unlesbarer Eingabe.
 *
 * Gegenstück zu `lokalesDatumISO`. `new Date("2026-09-15")` liest das Datum als
 * UTC-Mitternacht - westlich von Greenwich ist das lokal noch der 14.09.
 */
export function lokalesDatumAusISO(iso: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!d) return null;
  const datum = new Date(Number(d[1]), Number(d[2]) - 1, Number(d[3]));
  return Number.isNaN(datum.getTime()) ? null : datum;
}

/**
 * "2026-09-20T19:00" - Wert für ein `<input type="datetime-local">`, das die
 * Wanduhr des Betriebs zeigt (nicht die des Browsers, nicht UTC).
 *
 * ANLASS: Die Gast-Verwaltungsseite belegte das Feld mit
 * `toISOString().slice(0, 16)` - seit echte Zeitpunkte gespeichert werden, stand
 * dort 17:00 statt 19:00.
 */
export function wanduhrFeldIn(zeitpunkt: Date, zone: string): string {
  return `${datumIn(zeitpunkt, zone)}T${uhrzeitIn(zeitpunkt, zone)}`;
}

/**
 * Gegenstück zu `wanduhrFeldIn`: "2026-09-20T19:00" als Wanduhr in `zone` →
 * Zeitpunkt. `null` bei unlesbarer Eingabe.
 *
 * WARUM nicht `new Date(wert)`: Das liest den Wert in der Zone des BROWSERS.
 * Ein Gast in Lissabon, der 19:00 für ein Kölner Restaurant einträgt, meint
 * 19:00 Kölner Zeit.
 */
export function zeitpunktAusWanduhrFeld(wert: string, zone: string): Date | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{1,2}:\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(wert);
  if (!m) return null;
  return zeitpunktAusDatumUndUhrzeit(m[1], m[2], zone);
}
