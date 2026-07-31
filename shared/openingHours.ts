/**
 * Liest Öffnungszeiten aus schema.org-Angaben.
 *
 * Anlass ist der schwerwiegendste Fehler, den die erste echte Veröffentlichung
 * hatte. Der Kleine Kiepenkerl liefert in seinen strukturierten Daten:
 *
 *   "openingHours": ["Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday 11:30-23:00"]
 *
 * Der Ausdruck im n8n-Knoten erwartete die Form "Mo-Su 11:30-23:00" – also
 * Abkürzungen mit Bindestrich. Ausgeschriebene, kommagetrennte Tage trafen
 * nicht zu, es kamen null Tage heraus, und der nachgelagerte Knoten füllte
 * STANDARDWERTE ein: 12:00 bis 22:00.
 *
 * Veröffentlicht wurde damit eine Gastronomie-Seite mit erfundenen
 * Öffnungszeiten. Ein Gast, der um 11:45 vor der Tür steht, liest auf der
 * Seite "geschlossen", obwohl geöffnet ist – und um 22:30 umgekehrt. Falsche
 * Öffnungszeiten sind schlimmer als gar keine.
 *
 * Deshalb zwei Regeln in dieser Datei:
 *   1. So viele Schreibweisen wie möglich verstehen.
 *   2. Nichts erfinden. Was nicht dasteht, bleibt leer – die Oberfläche kann
 *      "auf Anfrage" anzeigen, aber keine Zeit behaupten.
 */

export interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

export type WeekHours = Record<string, DayHours>;

export const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

/**
 * Alle Schreibweisen, die auf deutschen und englischen Seiten vorkommen.
 * Die Reihenfolge im Objekt ist unerheblich; gesucht wird über die längste
 * passende Entsprechung, damit "Mo" nicht "Monday" zerschneidet.
 */
const DAY_ALIASES: Record<string, string> = {
  monday: "monday", mon: "monday", mo: "monday", montag: "monday",
  tuesday: "tuesday", tue: "tuesday", tues: "tuesday", tu: "tuesday",
  di: "tuesday", dienstag: "tuesday",
  wednesday: "wednesday", wed: "wednesday", we: "wednesday",
  mi: "wednesday", mittwoch: "wednesday",
  thursday: "thursday", thu: "thursday", thur: "thursday", th: "thursday",
  do: "thursday", donnerstag: "thursday",
  friday: "friday", fri: "friday", fr: "friday", freitag: "friday",
  saturday: "saturday", sat: "saturday", sa: "saturday", samstag: "saturday",
  sonnabend: "saturday",
  sunday: "sunday", sun: "sunday", su: "sunday", so: "sunday",
  sonntag: "sunday",
};

/** Erkennt einen einzelnen Tagesnamen in beliebiger Schreibweise. */
export function normalizeDay(token: string): string | null {
  const key = token
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/schema\.org\//, "")
    .replace(/[.,;]+$/, "");
  return DAY_ALIASES[key] ?? null;
}

/** "11:30", "11.30", "1130" → "11:30". Ungültiges → null. */
export function normalizeTime(token: string): string | null {
  const m = token.trim().match(/^(\d{1,2})[:.]?(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

/**
 * Löst eine Tagesangabe zu einzelnen Tagen auf.
 * Versteht Listen ("Mo,Di,Mi"), Bereiche ("Mo-Fr") und Mischungen.
 */
/**
 * Erkennt einen Tag auch mit Vorspann: "Öffnungszeiten: Montag" → monday.
 *
 * Ohne das scheiterte die häufigste Schreibweise auf Gastro-Seiten – die
 * Überschrift steht in derselben Zeile wie die Zeitangabe.
 */
function dayFromToken(token: string): string | null {
  const direct = normalizeDay(token);
  if (direct) return direct;
  const words = token.trim().split(/\s+/);
  for (let i = words.length - 1; i >= 0; i--) {
    const hit = normalizeDay(words[i]);
    if (hit) return hit;
  }
  return null;
}

export function expandDays(spec: string): string[] {
  const out: string[] = [];
  // Trennzeichen: Komma, Schrägstrich, "und", "&"
  for (const part of spec.split(/[,/]|\su(?:nd)?\s|\s&\s/i)) {
    const range = part.split(/\s*(?:-|–|—|bis|to)\s*/i).filter(Boolean);
    if (range.length === 2) {
      const from = dayFromToken(range[0]);
      const to = dayFromToken(range[1]);
      if (from && to) {
        const start = DAYS.indexOf(from as (typeof DAYS)[number]);
        const end = DAYS.indexOf(to as (typeof DAYS)[number]);
        // Über das Wochenende hinweg: "Fr-Mo" umfasst Fr, Sa, So, Mo.
        for (let i = 0; i < 7; i++) {
          const idx = (start + i) % 7;
          out.push(DAYS[idx]);
          if (idx === end) break;
        }
        continue;
      }
    }
    const single = dayFromToken(part);
    if (single) out.push(single);
  }
  return [...new Set(out)];
}

/**
 * Eine Zeile der Form "<Tage> <von>-<bis>".
 * Beispiele, alle aus echten Seiten:
 *   "Monday,Tuesday,…,Sunday 11:30-23:00"
 *   "Mo-Fr 11:00-14:30"
 *   "Samstag und Sonntag 10:00 – 22:00"
 */
export function parseHoursLine(line: string): WeekHours {
  const out: WeekHours = {};
  const times = [...line.matchAll(/(\d{1,2}[:.]\d{2})/g)].map((m) => m[1]);
  if (times.length < 2) return out;

  const open = normalizeTime(times[0]);
  const close = normalizeTime(times[1]);
  if (!open || !close) return out;

  // Alles vor der ersten Zeitangabe ist die Tagesangabe.
  const firstTimeAt = line.indexOf(times[0]);
  const dayPart = line.slice(0, firstTimeAt);
  const days = expandDays(dayPart);

  // Ohne erkennbare Tagesangabe wird NICHTS angenommen. "11:30-23:00" allein
  // könnte für einen Tag oder für die ganze Woche gelten – raten wäre genau
  // der Fehler, den diese Datei verhindern soll.
  for (const day of days) out[day] = { open, close, closed: false };
  return out;
}

/**
 * Wertet schema.org-Öffnungszeiten aus – beide Formen.
 *
 * `openingHours` ist eine Zeichenkette oder eine Liste davon.
 * `openingHoursSpecification` ist eine Liste von Objekten mit dayOfWeek,
 * opens und closes.
 */
export function parseSchemaOpeningHours(node: unknown): WeekHours {
  const out: WeekHours = {};
  if (!node || typeof node !== "object") return out;
  const n = node as Record<string, unknown>;

  const spec = n.openingHoursSpecification;
  for (const entry of Array.isArray(spec) ? spec : spec ? [spec] : []) {
    const e = entry as Record<string, any>;
    const open = normalizeTime(String(e?.opens ?? ""));
    const close = normalizeTime(String(e?.closes ?? ""));
    if (!open || !close) continue;
    const raw = e?.dayOfWeek;
    for (const day of Array.isArray(raw) ? raw : raw ? [raw] : []) {
      const key = normalizeDay(String(day));
      if (key) out[key] = { open, close, closed: false };
    }
  }

  const plain = n.openingHours;
  for (const line of Array.isArray(plain) ? plain : plain ? [plain] : []) {
    // Die Spezifikation gewinnt: Sie ist strukturiert und damit genauer.
    for (const [day, hours] of Object.entries(parseHoursLine(String(line)))) {
      if (!out[day]) out[day] = hours;
    }
  }

  return out;
}

/**
 * Wie vollständig ist das Ergebnis? Entscheidet, ob es sich zu übernehmen
 * lohnt – ein einzelner Tag ist meist ein Fehlgriff, keine Woche.
 */
export function hoursQuality(hours: WeekHours): { days: number; usable: boolean } {
  const days = Object.keys(hours).length;
  return { days, usable: days >= 3 };
}
