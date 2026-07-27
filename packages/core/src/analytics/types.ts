/**
 * Analytics-Eingabe- und Ausgabemodell.
 *
 * Bewusst plattform- und quellenneutral: die Rohdaten kommen später aus Google
 * Business Profile, der Instagram-/Facebook-Graph-API und unserem eigenen
 * Reservierungssystem, werden aber vor der Auswertung auf diese Typen normalisiert
 * (siehe `../integrations`). So rechnen dieselben Funktionen auf Demo-Fixtures wie
 * auf echten API-Daten.
 *
 * Alle Funktionen sind rein: kein Netzwerk, kein globaler Zustand, `now` wird
 * hereingereicht statt `Date.now()` zu lesen - damit sie server- wie clientseitig
 * deterministisch laufen und testbar bleiben.
 */

import type { Iso8601 } from "../types";

export type ReviewSource = "google" | "instagram" | "facebook" | "yelp";
export type ChannelSource = "google" | "instagram" | "facebook";
export type ReservationSource = "maitr" | "google" | "walk_in";

/** Eine einzelne Bewertung, quellenübergreifend normalisiert. */
export interface ReviewRecord {
  id: string;
  source: ReviewSource;
  /** 1-5. */
  rating: number;
  text: string;
  createdAt: Iso8601;
  /** Zeitpunkt der Betreiber-Antwort, falls beantwortet. */
  repliedAt?: Iso8601;
}

/** Ein stündlicher Reichweite-/Interaktionspunkt aus den Insights-APIs. */
export interface EngagementPoint {
  at: Iso8601;
  source: ChannelSource;
  /** Profil-/Beitragsaufrufe. */
  impressions: number;
  /** Profilaktionen: Anruf, Routenanfrage, Website-Klick, Reservierungsstart. */
  actions: number;
}

export type ReservationStatus =
  | "confirmed"
  | "seated"
  | "no_show"
  | "cancelled"
  | "walk_in";

export interface ReservationRecord {
  id: string;
  guestId?: string;
  partySize: number;
  start: Iso8601;
  status: ReservationStatus;
  source: ReservationSource;
}

/** Ein Gast - die dem Betrieb gehörende Beziehung (der verteidigbare Kern). */
export interface GuestRecord {
  id: string;
  name: string;
  firstVisit: Iso8601;
  lastVisit: Iso8601;
  visits: number;
  noShows: number;
  tags: string[];
}

/** Vollständigkeitssignale des öffentlichen Profils. */
export interface ProfileSignals {
  hasMenu: boolean;
  hasHolidayHours: boolean;
  hasOutdoorAttribute: boolean;
  photoCount: number;
  hasBio: boolean;
}

/** Gebündelte Rohdaten eines Betriebs für einen Auswertungslauf. */
export interface VenueDataset {
  now: Iso8601;
  timezone: string;
  reviews: ReviewRecord[];
  engagement: EngagementPoint[];
  reservations: ReservationRecord[];
  guests: GuestRecord[];
  profile: ProfileSignals;
  /** Durchschnittlicher Umsatz je Gedeck in Euro - Basis der ROI-Rechnung. */
  averageCheck: number;
}

/* ── Ausgaben ─────────────────────────────────────────────────────────────── */

export interface ScoreFactor {
  key: string;
  label: string;
  /** Erreichter Anteil 0-1. */
  achieved: number;
  /** Gewicht im Gesamtscore 0-1 (Summe aller Gewichte = 1). */
  weight: number;
  /** Punkte, die dieser Faktor noch beitragen kann (gerundet). */
  openPoints: number;
  hint: string;
}

export interface PresenceScoreResult {
  /** 0-100. */
  score: number;
  factors: ScoreFactor[];
  /** Der Faktor mit dem größten offenen Hebel - treibt die Top-Empfehlung. */
  biggestLever: ScoreFactor | null;
}

export type GuestSegment = "neu" | "stammgast" | "vip" | "gefährdet" | "verloren";

export interface GuestInsight {
  id: string;
  name: string;
  segment: GuestSegment;
  visits: number;
  /** 0-1, Wahrscheinlichkeit dass der Gast abwandert. */
  churnRisk: number;
  /** 0-1, geglättete No-Show-Quote. */
  noShowRisk: number;
  /** Geschätzter bisheriger Wert in Euro (visits × Ø-Umsatz). */
  lifetimeValue: number;
  /** Tage seit dem letzten Besuch. */
  daysSinceLastVisit: number;
}

export interface ReviewTheme {
  topic: string;
  mentions: number;
  /** Durchschnittsbewertung der Reviews, die dieses Thema erwähnen. */
  averageRating: number;
  sentiment: "positiv" | "gemischt" | "negativ";
}

export interface ReviewAnalytics {
  total: number;
  averageRating: number;
  /** Veränderung des Schnitts gegenüber der Vorperiode (Sterne). */
  ratingTrend: number;
  responseRate: number;
  medianResponseHours: number | null;
  unanswered: number;
  themes: ReviewTheme[];
}

export interface TimingSlot {
  /** 0 = Montag … 6 = Sonntag. */
  weekday: number;
  weekdayLabel: string;
  fromHour: number;
  toHour: number;
  /** Prozentuale Reichweite über dem Tagesdurchschnitt, z. B. 41 = "+41 %". */
  upliftPercent: number;
}

export interface RoiResult {
  /** Provisionsfreie Reservierungen im Zeitraum. */
  reservations: number;
  /** Gedeckte Gäste. */
  covers: number;
  /** Vermittelter Umsatz in Euro. */
  revenue: number;
  /** Gegenüber Plattformen gesparte Provision in Euro (Zeitraum). */
  savedCommission: number;
  /** Auf 12 Monate hochgerechnet. */
  savedCommissionAnnualized: number;
  /** Angesetzter Provisionssatz, z. B. 0.025. */
  commissionRate: number;
}

export interface ForecastResult {
  /** Prognostizierter nächster Wert. */
  next: number;
  /** Änderung Vorperiode → aktuell in Prozent. */
  periodChangePercent: number;
  /** Durchschnittliches Wachstum je Periode in Prozent. */
  averageGrowthPercent: number;
  trend: "up" | "flat" | "down";
}

export type InsightKind =
  | "review"
  | "guest"
  | "profile"
  | "timing"
  | "roi"
  | "reservation";

export type InsightSeverity = "chance" | "hinweis" | "achtung";

/** Eine ausgewertete Erkenntnis - die Währung des Tagesbriefings. */
export interface Insight {
  id: string;
  kind: InsightKind;
  severity: InsightSeverity;
  title: string;
  detail: string;
  /** Wirkungsversprechen, z. B. "+41 % Reichweite" oder "312 € / Monat". */
  impact?: string;
  /** 0-100, treibt die Reihenfolge (Wirkung × Dringlichkeit). */
  priority: number;
  /** Vorschlag für die Handlung; `route` ist ein App-Pfad. */
  action?: { label: string; route?: string };
}
