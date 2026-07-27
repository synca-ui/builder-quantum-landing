/**
 * `@maitr/core/analytics` - die reine Auswertungsschicht.
 *
 * Alle Funktionen rechnen auf normalisierten Datensätzen (`VenueDataset`) und sind
 * frei von Netzwerk und Zustand. Sie laufen unverändert im Client (Demo-Fixtures)
 * wie serverseitig (echte Google-/Meta-Daten). Rohdaten normalisiert die
 * `../integrations`-Schicht.
 */

export * from "./types";

export { presenceScore } from "./presence";
export { reviewAnalytics, extractThemes } from "./reviews";
export {
  guestInsight,
  guestInsights,
  winBackCandidates,
  churnRisk,
  noShowRisk,
  segmentOf,
} from "./guests";
export { bestPostingSlots } from "./timing";
export { reservationRoi } from "./roi";
export { forecastSeries } from "./forecast";
export { buildInsights } from "./insights";
