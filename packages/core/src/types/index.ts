/**
 * Domänen-Typen, die Web und Mobile teilen.
 * Bewusst entkoppelt von Prisma-Modellen: hier steht nur, was über die API geht.
 */

export type Iso8601 = string;

/**
 * Kanonische Wochentagsliste (kleingeschrieben, Englisch: "monday" … "sunday").
 *
 * Hierher verschoben aus shared/suggestedConfig.ts, wo sie vorher stand und von
 * dort exportiert wurde - eine Naht durch eine Datei, die aus ganz anderem
 * Anlass laufend umgebaut wird. Macht sie dort jemand wieder privat, stürzt
 * `z.enum(DAYS)` in server/schemas/configuration.ts beim MODULLADEN ab, nicht
 * erst bei der ersten Anfrage. `packages/core` ist die gemeinsame Sprache von
 * Web, Server und App - hier ist die richtige Stelle für eine Liste, die alle
 * drei brauchen.
 */
export const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type Day = (typeof DAYS)[number];

/**
 * Ein Tageseintrag: entweder geschlossen (keine Uhrzeiten - "sonntags
 * geschlossen" braucht kein erfundenes `open`/`close`) oder geöffnet mit beiden
 * Uhrzeiten. `open`/`close` bleiben einfache Strings, weil ein TypeScript-Typ
 * kein Zeitformat (HH:MM, gültige Stunde/Minute) prüfen kann - das übernimmt
 * zur Laufzeit `strictOpeningTimeSchema` in server/schemas/configuration.ts.
 */
export type DayHours =
  | { closed: true }
  | { closed: false; open: string; close: string };

/**
 * Öffnungszeiten je Wochentag. Tagesschlüssel aus DAYS oben, jeder Tag optional
 * (ein Betrieb mit fünf Öffnungstagen trägt nur fünf Einträge ein).
 *
 * Geprüft wird diese Form zur Laufzeit für `Business.openingHours` durch
 * `server/schemas/configuration.ts#StrictOpeningHoursSchema` (dieselbe Liste
 * DAYS, derselbe closed/open/close-Aufbau als `z.discriminatedUnion("closed",
 * …)`) - NICHT durch das lose `OpeningHoursSchema` desselben Moduls: das gilt
 * für den Konfigurator, der Altbestand in der Datenbank hat, und lässt jeden
 * String als Tagesschlüssel zu (gemessen:
 * `OpeningHoursSchema.safeParse({Montag: …})` → success).
 *
 * Warum der Typ hier eigenständig steht statt aus `shared/` importiert:
 * `packages/core` ist die gemeinsame Sprache von Web und Mobile, aber
 * `mobile/metro.config.js` löst nur das Paket "@maitr/core" auf, nicht
 * "@shared". Ein Import aus `shared/` würde also den Mobile-Build brechen.
 */
export type OpeningHours = Partial<Record<Day, DayHours>>;

export interface Venue {
  id: string;
  name: string;
  /** Kurzbeschreibung, z. B. "Spezialitätenkaffee & hausgemachtes Gebäck". */
  tagline?: string;
  city?: string;
  district?: string;
  street?: string;
  timezone: string;
  tags: string[];
  /** Fehlt, solange kein Wert gesetzt wurde. Änderung über `api.venues.update`. */
  openingHours?: OpeningHours;
}

/**
 * Eingabe für `api.venues.update` - Änderungen an einem bestehenden Betrieb.
 *
 * Alle Felder optional, aber mindestens eines ist Pflicht (der Server lehnt eine
 * leere Anfrage ab). `tagline: ""` löscht die Kurzbeschreibung (Server setzt
 * intern `null`). `openingHours: null` löscht die Öffnungszeiten vollständig.
 *
 * Absichtlich KEIN slug-Feld - wie bei `CreateVenueInput` leitet der Server die
 * Adresse selbst ab, und hier gilt zusätzlich: der Slug ändert sich mit diesem
 * Aufruf NIE. Er ist Teil der veröffentlichten Adresse; ein stiller Wechsel
 * würde eine ausgelieferte Web-App unerreichbar machen.
 */
export interface UpdateVenueInput {
  name?: string;
  tagline?: string;
  /** IANA-Zone wie "Europe/Berlin". */
  timezone?: string;
  openingHours?: OpeningHours | null;
}

/**
 * Eingabe für `api.venues.create` - der erste eigene Betrieb.
 *
 * Nur `name` ist Pflicht: Adresse (slug), Zeitzone und Status setzt der Server.
 * Absichtlich KEIN slug-Feld - die Adresse leitet der Server aus dem Namen ab
 * (`shared/subdomain.ts`), damit Client und Server nicht zwei Vorstellungen davon
 * haben, was eine gültige Adresse ist.
 */
export interface CreateVenueInput {
  name: string;
  /** IANA-Zone wie "Europe/Berlin". Ohne Angabe setzt der Server Europe/Berlin. */
  timezone?: string;
  /** Freitext fürs Profil; taucht in der `Venue`-Antwort (noch) nicht auf. */
  description?: string;
}

export type TaskKind = "review" | "post" | "profile" | "channel" | "reservation";

/**
 * Eine der "drei Entscheidungen" auf dem Start-Screen.
 * `estimatedMinutes` und `impact` steuern die Reihenfolge im Tagesbriefing.
 */
export interface DailyTask {
  id: string;
  kind: TaskKind;
  /** Kleine Großbuchstaben-Zeile über der Karte, z. B. "Bewertung · 2 Min". */
  eyebrow: string;
  title: string;
  /** Optionaler Vorschlagstext (KI-Antwort, Beitragstext). */
  draft?: string;
  /** Wirkungsversprechen, z. B. "+35 % Profilaufrufe". */
  impact?: string;
  estimatedMinutes: number;
  primaryAction: { label: string; endpoint?: string };
  secondaryAction?: { label: string; endpoint?: string };
  /** 1-5 Sterne, nur bei `kind: "review"`. */
  rating?: number;
  /**
   * Zustand der Entscheidung über diese Aufgabe (`TaskDecision` serverseitig).
   *
   * Im Tagesbriefing steht hier immer "open" - erledigte Aufgaben werden gar nicht
   * erst ausgeliefert. "approved"/"dismissed" liefert nur die Antwort von
   * `briefing.approveTask`, damit die Karte den Erfolg zeigen kann, bevor das
   * nächste Briefing geladen ist. Optional, weil ältere Server das Feld nicht kennen.
   */
  state?: "open" | "approved" | "dismissed";
  /** Zeitpunkt der Freigabe/Verwerfung; fehlt, solange die Aufgabe offen ist. */
  decidedAt?: Iso8601;
}

export interface PresenceStats {
  /** Google-Sternebewertung, z. B. 4.6. */
  rating: number;
  /** Maitr-Präsenzscore 0-100. */
  score: number;
  /** Profilaufrufe im laufenden Zeitraum. */
  impressions: number;
}

export interface DailyBriefing {
  venue: Venue;
  /** Serverzeit, damit Client und Betrieb dieselbe Tageslogik verwenden. */
  now: Iso8601;
  /** "morning" | "evening" steuert Hell-/Nachtbar-Darstellung. */
  daypart: "morning" | "day" | "evening";
  greeting: string;
  subline: string;
  stats: PresenceStats;
  tasks: DailyTask[];
}

export interface TableSlot {
  tableId: string;
  tableName: string;
  seats: number;
  reservations: Reservation[];
}

export interface Reservation {
  id: string;
  guestName: string;
  partySize: number;
  start: Iso8601;
  end: Iso8601;
  status: "confirmed" | "pending" | "cancelled" | "walk_in";
  phone?: string;
}

export interface ServiceDay {
  date: string;
  serviceStartHour: number;
  serviceEndHour: number;
  bufferMinutes: number;
  seatsTotal: number;
  seatsReserved: number;
  tables: TableSlot[];
}
