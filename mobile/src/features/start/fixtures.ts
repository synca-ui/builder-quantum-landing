import type { DailyBriefing } from "@maitr/core";

/**
 * Beispieldaten aus "Maitr App-Screens.dc.html", Screen 04.
 *
 * Sie halten den Screen lauffähig, solange `/api/briefing/today` noch nicht steht.
 * `useDailyBriefing` greift nur darauf zurück, wenn die API nicht erreichbar ist.
 */
export const briefingFixture: DailyBriefing = {
  venue: {
    id: "venue_goldstueck",
    name: "Café Goldstück",
    tagline: "Spezialitätenkaffee & hausgemachtes Gebäck",
    city: "Köln",
    district: "Ehrenfeld",
    street: "Körnerstr. 27",
    timezone: "Europe/Berlin",
    tags: ["Außenplätze", "Vegan", "WLAN"],
  },
  // Der Wochentag wird aus diesem Zeitstempel berechnet. 16. Juli fällt nur 2025 auf
  // einen Mittwoch - so steht im Screen dasselbe wie im Design ("Mittwoch, 16. Juli").
  now: "2025-07-16T09:41:00+02:00",
  daypart: "morning",
  greeting: "Guten Morgen,",
  subline: "Drei Entscheidungen, 6 Minuten, dann übernimmt Maitr.",
  // Bewertung deckt sich mit dem Bewertungen-Screen und dem öffentlichen Profil (4,8).
  stats: { rating: 4.8, score: 64, impressions: 4812 },
  tasks: [
    {
      id: "task_review_marion",
      kind: "review",
      eyebrow: "Bewertung · 2 Min",
      title: "Marion schwärmt vom Flat White, Antwort liegt bereit.",
      draft:
        "„Liebe Marion, tausend Dank! Samstags backen wir extra eine Ladung Zimtschnecken mehr …\"",
      impact: "+35 % Profilaufrufe",
      estimatedMinutes: 2,
      rating: 5,
      primaryAction: { label: "Freigeben" },
      secondaryAction: { label: "Bearbeiten" },
    },
    {
      id: "task_post_zimtschnecken",
      kind: "post",
      eyebrow: "Beitrag · 1 Min",
      title: "„Zimtschnecken\" · Do 9:00",
      impact: "Do 9–11 Uhr: +41 % Reichweite",
      estimatedMinutes: 1,
      primaryAction: { label: "Einplanen" },
    },
    {
      id: "task_profile_menu",
      kind: "profile",
      eyebrow: "Profil · +12 P.",
      title: "Speisekarte hinterlegen",
      estimatedMinutes: 3,
      primaryAction: { label: "Öffnen" },
    },
  ],
};
