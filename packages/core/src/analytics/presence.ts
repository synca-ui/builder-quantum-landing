/**
 * Präsenzscore - der eine 0-100-Wert, der zeigt, wie sichtbar und gepflegt ein
 * Betrieb online ist. Anders als die frühere feste "64" ist das hier eine echte
 * gewichtete Rechnung über fünf Faktoren. Jeder Faktor liefert seinen erreichten
 * Anteil und den offenen Hebel zurück, damit die UI sagen kann, *was* den Score
 * hebt - nicht nur, dass er niedrig ist.
 *
 * DECKUNG (seit der öffentlichen Präsenzprüfung): Nicht jede Datenlage kennt
 * alle fünf Faktoren. Ohne Google-Freigabe gibt es keine Antwortquote und keine
 * Reichweite - `data.coverage.unknown` nennt sie. Solche Faktoren tragen dann
 * NICHT als Null bei (das wäre ein Abzug für etwas, das nie gemessen wurde),
 * sondern fallen aus der Rechnung; die übrigen Gewichte werden auf 1 normiert.
 * Der Score sagt über `coverage.measuredWeight`, worauf er beruht, und die
 * Oberfläche sagt es dem Wirt weiter ("beruht auf 3 von 5 Faktoren").
 */

import { clamp01, daysBetween, round } from "./math";
import { reviewAnalytics } from "./reviews";
import type {
  PresenceScoreResult,
  ScoreFactor,
  ScoreFactorKey,
  ScoreFactorStatus,
  VenueDataset,
} from "./types";

interface FactorSpec {
  key: ScoreFactorKey;
  label: string;
  weight: number;
  hint: string;
  achieved: (data: VenueDataset) => number;
}

/** Fünf Faktoren, Gewichte summieren zu 1. Reihenfolge = fachliche Priorität. */
const FACTORS: FactorSpec[] = [
  {
    key: "rating",
    label: "Bewertungsschnitt",
    weight: 0.3,
    hint: "Sterne-Schnitt über alle Kanäle - der stärkste Vertrauensfaktor.",
    achieved: (d) => {
      // Googles eigener Schnitt über alle Bewertungen schlägt die Stichprobe
      // aus `reviews` (ohne Freigabe sind das nur fünf).
      const r = d.reviewSummary?.averageRating ?? reviewAnalytics(d.reviews, d.now).averageRating;
      // 3,0★ gilt als Boden, 5,0★ als Voll - darunter trägt der Faktor nichts.
      return clamp01((r - 3) / 2);
    },
  },
  {
    key: "responsiveness",
    label: "Antwortquote",
    weight: 0.2,
    hint: "Beantwortete Bewertungen. Antworten heben Ranking und Wiederkehr.",
    achieved: (d) => reviewAnalytics(d.reviews, d.now).responseRate,
  },
  {
    key: "completeness",
    label: "Profil-Vollständigkeit",
    weight: 0.25,
    hint: "Speisekarte, Fotos, Öffnungszeiten, Website, Telefon, Bio - alles, was Gäste vorab suchen.",
    achieved: (d) => {
      const p = d.profile;
      // Nur Flags, die die Quelle wirklich gemessen hat (siehe ProfileSignals).
      const flags = [
        p.hasMenu,
        p.hasHolidayHours,
        p.hasOutdoorAttribute,
        p.hasBio,
        typeof p.photoCount === "number" ? p.photoCount >= 5 : undefined,
        p.hasOpeningHours,
        p.hasWebsite,
        p.hasPhone,
        p.hasInstagram,
        p.hasReservation,
      ].filter((f): f is boolean => typeof f === "boolean");
      if (flags.length === 0) return 0;
      return flags.filter(Boolean).length / flags.length;
    },
  },
  {
    key: "activity",
    label: "Aktivität",
    weight: 0.15,
    hint: "Frische Bewertungen und Reichweite in den letzten 30 Tagen.",
    achieved: (d) => {
      const recentReviews = d.reviews.filter((r) => daysBetween(d.now, r.createdAt) <= 30).length;
      // 4+ frische Bewertungen/Monat = voll.
      return clamp01(recentReviews / 4);
    },
  },
  {
    key: "reach",
    label: "Reichweite",
    weight: 0.1,
    hint: "Profilaufrufe im Monat - je sichtbarer, desto höher.",
    achieved: (d) => {
      const impressions = d.engagement
        .filter((e) => daysBetween(d.now, e.at) <= 30)
        .reduce((s, e) => s + e.impressions, 0);
      // 5.000 Aufrufe/Monat gelten als starke Reichweite.
      return clamp01(impressions / 5000);
    },
  },
];

export function presenceScore(data: VenueDataset): PresenceScoreResult {
  const unknown = new Set<ScoreFactorKey>(data.coverage?.unknown ?? []);
  const estimated = new Set<ScoreFactorKey>(data.coverage?.estimated ?? []);

  // Erst die Deckung bestimmen, dann rechnen: Die offenen Punkte je Faktor
  // hängen davon ab, wie viel Gewicht überhaupt in der Rechnung ist.
  const statusVon = (key: ScoreFactorKey): ScoreFactorStatus =>
    unknown.has(key) ? "unbekannt" : estimated.has(key) ? "geschaetzt" : "gemessen";
  const measuredWeight = round(
    FACTORS.filter((f) => statusVon(f.key) !== "unbekannt").reduce((s, f) => s + f.weight, 0),
    4,
  );

  const factors: ScoreFactor[] = FACTORS.map((f) => {
    const status = statusVon(f.key);
    const achieved = status === "unbekannt" ? 0 : clamp01(f.achieved(data));
    // Auf das gemessene Gewicht normiert: Fehlen Faktoren, teilen sich die
    // übrigen die 100 Punkte, damit Score + offene Punkte weiter 100 ergeben.
    const anteil = measuredWeight > 0 ? f.weight / measuredWeight : 0;
    return {
      key: f.key,
      label: f.label,
      achieved,
      weight: f.weight,
      openPoints: status === "unbekannt" ? 0 : round((1 - achieved) * anteil * 100),
      hint: f.hint,
      status,
    };
  });

  const score =
    measuredWeight > 0
      ? round(
          factors
            .filter((f) => f.status !== "unbekannt")
            .reduce((sum, f) => sum + (f.achieved * f.weight) / measuredWeight, 0) * 100,
        )
      : 0;

  const biggestLever =
    factors
      .filter((f) => f.status !== "unbekannt" && f.openPoints > 0)
      .sort((a, b) => b.openPoints - a.openPoints)[0] ?? null;

  return {
    score,
    factors,
    biggestLever,
    coverage: {
      measuredWeight,
      unknown: factors.filter((f) => f.status === "unbekannt").map((f) => f.key),
      estimated: factors.filter((f) => f.status === "geschaetzt").map((f) => f.key),
    },
  };
}
