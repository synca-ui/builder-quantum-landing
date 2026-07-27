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

/**
 * Englische Fassung desselben Briefings für den DE/EN-Umschalter. Die `id`s sind
 * absichtlich identisch mit der deutschen Fixture - der Store schlüsselt Aufgaben-Status
 * darüber (`taskDone[id]`, `reviewAnswered[id]`), also darf sich nur der Anzeigetext
 * ändern, nicht die IDs. Nicht-Anzeige-Felder (now, daypart, stats, ids) bleiben gleich.
 */
export const briefingFixtureEn: DailyBriefing = {
  venue: {
    id: "venue_goldstueck",
    name: "Café Goldstück",
    tagline: "Specialty coffee & house-made pastries",
    city: "Cologne",
    district: "Ehrenfeld",
    street: "Körnerstr. 27",
    timezone: "Europe/Berlin",
    tags: ["Outdoor seating", "Vegan", "Wi-Fi"],
  },
  now: "2025-07-16T09:41:00+02:00",
  daypart: "morning",
  greeting: "Good morning,",
  subline: "Three decisions, 6 minutes, then Maitr takes over.",
  stats: { rating: 4.8, score: 64, impressions: 4812 },
  tasks: [
    {
      id: "task_review_marion",
      kind: "review",
      eyebrow: "Review · 2 min",
      title: "Marion is raving about the flat white — your reply is ready.",
      draft:
        "“Dear Marion, thank you so much! On Saturdays we bake an extra batch of cinnamon rolls …”",
      impact: "+35% profile views",
      estimatedMinutes: 2,
      rating: 5,
      primaryAction: { label: "Approve" },
      secondaryAction: { label: "Edit" },
    },
    {
      id: "task_post_zimtschnecken",
      kind: "post",
      eyebrow: "Post · 1 min",
      title: "“Cinnamon rolls” · Thu 9:00",
      impact: "Thu 9–11 am: +41% reach",
      estimatedMinutes: 1,
      primaryAction: { label: "Schedule" },
    },
    {
      id: "task_profile_menu",
      kind: "profile",
      eyebrow: "Profile · +12 pts",
      title: "Add your menu",
      estimatedMinutes: 3,
      primaryAction: { label: "Open" },
    },
  ],
};
