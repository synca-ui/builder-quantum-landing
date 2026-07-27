/**
 * Domänen-Typen, die Web und Mobile teilen.
 * Bewusst entkoppelt von Prisma-Modellen: hier steht nur, was über die API geht.
 */

export type Iso8601 = string;

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
