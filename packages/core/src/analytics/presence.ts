/**
 * Präsenzscore - der eine 0-100-Wert, der zeigt, wie sichtbar und gepflegt ein
 * Betrieb online ist. Anders als die frühere feste "64" ist das hier eine echte
 * gewichtete Rechnung über fünf Faktoren. Jeder Faktor liefert seinen erreichten
 * Anteil und den offenen Hebel zurück, damit die UI sagen kann, *was* den Score
 * hebt - nicht nur, dass er niedrig ist.
 */

import { clamp01, daysBetween, round } from "./math";
import { reviewAnalytics } from "./reviews";
import type { PresenceScoreResult, ScoreFactor, VenueDataset } from "./types";

interface FactorSpec {
  key: string;
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
      const r = reviewAnalytics(d.reviews, d.now).averageRating;
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
    hint: "Speisekarte, Feiertagszeiten, Außenplätze, Bio und ≥5 Fotos.",
    achieved: (d) => {
      const p = d.profile;
      const flags = [
        p.hasMenu,
        p.hasHolidayHours,
        p.hasOutdoorAttribute,
        p.hasBio,
        p.photoCount >= 5,
      ];
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
  const factors: ScoreFactor[] = FACTORS.map((f) => {
    const achieved = clamp01(f.achieved(data));
    return {
      key: f.key,
      label: f.label,
      achieved,
      weight: f.weight,
      openPoints: round((1 - achieved) * f.weight * 100),
      hint: f.hint,
    };
  });

  const score = round(factors.reduce((sum, f) => sum + f.achieved * f.weight * 100, 0));

  const biggestLever =
    factors
      .filter((f) => f.openPoints > 0)
      .sort((a, b) => b.openPoints - a.openPoints)[0] ?? null;

  return { score, factors, biggestLever };
}
