/**
 * Brücke zwischen Demo-Store und der reinen Auswertungsschicht `@maitr/core/analytics`.
 *
 * Die Analytics-Funktionen rechnen auf einem normalisierten `VenueDataset` - genau
 * dem Format, das später aus Google-/Meta-Daten entsteht. Hier bauen wir dieses
 * Dataset aus dem Demo-Zustand: live, wo der Store etwas weiß (Gäste, Speisekarte,
 * beantwortete Bewertungen), und aus datierten Fixtures, wo die Demo keine echten
 * Zeitreihen hat (stündliche Reichweite, Bewertungstexte mit Datum).
 *
 * Dadurch reagieren Score, Erkenntnisse und ROI sofort auf Aktionen im Store -
 * Gericht anlegen hebt den Präsenzscore, Gast zurückholen ändert die Rückhol-Liste.
 */

import { useMemo } from "react";
import type {
  EngagementPoint,
  GuestRecord,
  ReservationRecord,
  ReviewRecord,
  VenueDataset,
} from "@maitr/core/analytics";

import { useStore } from "./store";
import type { Guest } from "./store";

/** Demo-„Jetzt" - deckungsgleich mit dem Tagesbriefing (Mittwoch, 16. Juli 2025). */
export const DEMO_NOW = "2025-07-16T09:41:00+02:00";
const NOW_MS = Date.parse(DEMO_NOW);
const DAY_MS = 86_400_000;

/** Ein ISO-Zeitpunkt `days` Tage vor „Jetzt", zur lokalen Stunde `hour`. */
function ago(days: number, hour = 12): string {
  const d = new Date(NOW_MS - days * DAY_MS);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

/** Café-Durchschnittsumsatz je Gedeck in Euro - Basis der ROI-Rechnung. */
const AVERAGE_CHECK = 9;

/* ── Bewertungen (datiert, für Trend + Themen) ───────────────────────────── */

interface SeedReview {
  id: string;
  rating: number;
  text: string;
  daysAgo: number;
  /** Tage nach Erstellung beantwortet; undefiniert = offen. */
  repliedAfter?: number;
}

const REVIEW_SEED: SeedReview[] = [
  { id: "rev_marion", rating: 5, text: "Bester Flat White in Ehrenfeld, das Personal merkt sich sogar meinen Namen.", daysAgo: 0 },
  { id: "rev_tobias", rating: 4, text: "Sehr lecker, nur mittags etwas voll und man wartet kurz. Kommt aber wieder.", daysAgo: 1, repliedAfter: 0.5 },
  { id: "rev_lena", rating: 5, text: "Gemütliche Atmosphäre, toller Kaffee und die Zimtschnecken sind ein Traum.", daysAgo: 8, repliedAfter: 0.2 },
  { id: "rev_jonas", rating: 3, text: "Kaffee gut, aber Samstag war es sehr voll und wir haben lange auf Gebäck gewartet.", daysAgo: 15, repliedAfter: 1 },
  { id: "rev_amira", rating: 5, text: "Super freundlicher Service, schöne Terrasse in der Sonne. Sehr zu empfehlen.", daysAgo: 24, repliedAfter: 0.3 },
  { id: "rev_paul", rating: 4, text: "Guter Espresso, Preise okay. Wird schnell voll zur Mittagszeit.", daysAgo: 38, repliedAfter: 2 },
  { id: "rev_nina", rating: 5, text: "Bestes Frühstück im Viertel, das Team ist herzlich und der Kaffee erstklassig.", daysAgo: 47, repliedAfter: 0.4 },
  { id: "rev_kai", rating: 2, text: "Lange Wartezeit und der Kaffee war lauwarm. Schade, sonst schön.", daysAgo: 52, repliedAfter: 3 },
];

function buildReviews(reviewAnswered: Record<string, boolean>): ReviewRecord[] {
  return REVIEW_SEED.map((r) => {
    // rev_marion/rev_tobias spiegeln den Live-Antwortstatus aus dem Store,
    // der Rest trägt seinen eigenen Fixture-Status.
    const answeredLive = reviewAnswered[r.id];
    const replied =
      r.id === "rev_marion" || r.id === "rev_tobias"
        ? answeredLive
        : r.repliedAfter !== undefined;
    const repliedAfter = r.repliedAfter ?? 0.5;
    return {
      id: r.id,
      source: "google" as const,
      rating: r.rating,
      text: r.text,
      createdAt: ago(r.daysAgo),
      repliedAt: replied ? ago(Math.max(0, r.daysAgo - repliedAfter)) : undefined,
    };
  });
}

/* ── Reichweite (Wochentag×Stunde-Heatmap, Do-Vormittag betont) ──────────── */

function reachWeight(weekday: number, hour: number): number {
  let w = 18;
  if (hour >= 8 && hour <= 11) w += 8; // Vormittagskaffee
  // Donnerstag-Vormittag als stärkstes Fenster - moderat gehalten, damit der
  // errechnete Uplift glaubwürdig bei ~+40 % landet (statt unrealistisch hoch).
  if (weekday === 3 && hour >= 9 && hour <= 11) w += 6;
  if ((weekday === 4 || weekday === 5) && hour >= 13 && hour <= 19) w += 10; // Fr/Sa nachmittags
  if (weekday === 6) w -= 6; // Sonntag ruhiger
  return Math.max(4, w);
}

function buildEngagement(): EngagementPoint[] {
  const points: EngagementPoint[] = [];
  const hours = [8, 10, 13, 16, 19];
  for (let day = 0; day < 56; day++) {
    const at0 = new Date(NOW_MS - day * DAY_MS);
    const weekday = (at0.getDay() + 6) % 7;
    for (const hour of hours) {
      // Deterministische, kleine Streuung statt Zufall (stabiler Demo-Zustand).
      const jitter = ((day * 7 + hour) % 5) - 2;
      const impressions = reachWeight(weekday, hour) + jitter;
      points.push({ at: ago(day, hour), source: "google", impressions, actions: Math.round(impressions * 0.12) });
    }
  }
  return points;
}

/* ── Reservierungen (Monat provisionsfrei über Maitr + heutige) ──────────── */

function buildReservations(): ReservationRecord[] {
  const out: ReservationRecord[] = [];
  // 61 provisionsfreie Reservierungen im Monat - deckungsgleich mit der Kennzahl.
  for (let i = 0; i < 61; i++) {
    const partySize = 2 + (i % 3); // 2-4 Gedecke
    out.push({
      id: `res_hist_${i}`,
      partySize,
      start: ago(1 + (i % 30), 12 + (i % 8)),
      status: i % 12 === 0 ? "seated" : "confirmed",
      source: "maitr",
    });
  }
  // Heutige Reservierung für einen wiederkehrenden Gast (No-Show-Signal).
  out.push({ id: "res_today_weber", guestId: "g_weber", partySize: 2, start: ago(0, 19), status: "confirmed", source: "maitr" });
  return out;
}

/* ── Gäste (Store-Zahlen live + datierte Besuchsverläufe) ────────────────── */

/** Fixture-Zeitverlauf je Store-Gast (Tage seit erstem/letztem Besuch). */
const GUEST_DATES: Record<string, { firstAgo: number; lastAgo: number }> = {
  g_marion: { firstAgo: 420, lastAgo: 3 },
  g_weber: { firstAgo: 120, lastAgo: 0 },
  g_yilmaz: { firstAgo: 60, lastAgo: 7 },
  g_okafor: { firstAgo: 40, lastAgo: 14 },
  g_sommer: { firstAgo: 240, lastAgo: 62 },
};

function toGuestRecord(g: Guest): GuestRecord {
  const dates = GUEST_DATES[g.id] ?? { firstAgo: Math.max(30, g.visits * 12), lastAgo: 20 };
  // Zurückgeholte Gäste haben „gerade" wieder Kontakt - lastVisit rückt nach vorn.
  const lastAgo = g.lastVisit === "Rückholung gesendet" || g.lastVisit === "gerade reserviert" ? 0 : dates.lastAgo;
  return {
    id: g.id,
    name: g.name,
    firstVisit: ago(dates.firstAgo),
    lastVisit: ago(lastAgo),
    visits: g.visits,
    noShows: g.noShows,
    tags: g.tags,
  };
}

/**
 * Baut das normalisierte Dataset aus dem aktuellen Store-Zustand.
 * Memoisiert auf die Slices, die das Ergebnis wirklich beeinflussen.
 */
export function useVenueDataset(): VenueDataset {
  const { guests, reviewAnswered, profileDone, menu, venueProfile } = useStore();

  return useMemo<VenueDataset>(
    () => ({
      now: DEMO_NOW,
      timezone: "Europe/Berlin",
      reviews: buildReviews(reviewAnswered),
      engagement: buildEngagement(),
      reservations: buildReservations(),
      guests: guests.map(toGuestRecord),
      profile: {
        hasMenu: menu.length > 0,
        hasHolidayHours: Boolean(profileDone.holidays),
        hasOutdoorAttribute: Boolean(profileDone.outdoor) || venueProfile.tags.includes("Außenplätze"),
        photoCount: profileDone.photos ? 6 : 2,
        hasBio: venueProfile.bio.trim().length > 0,
      },
      averageCheck: AVERAGE_CHECK,
    }),
    [guests, reviewAnswered, profileDone, menu, venueProfile],
  );
}
