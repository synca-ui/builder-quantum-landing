/**
 * Bewertungs-Auswertung: Schnitt, Trend, Antwortverhalten und Themen.
 *
 * Das Themen-Extract ist der interessante Teil: aus dem Freitext wird gezogen,
 * *worüber* Gäste reden (Kaffee, Wartezeit, Service …) und ob das positiv oder
 * negativ besetzt ist. So wird aus "4,8 Sterne" ein Hebel: "Wartezeit wird 3×
 * kritisch erwähnt - hier liegt dein nächster Stern".
 */

import { daysBetween, hoursBetween, mean, median, round } from "./math";
import { TOPICS, matchesTopic } from "./text";
import type { ReviewAnalytics, ReviewRecord, ReviewTheme } from "./types";

/** Themen aus den Freitexten ziehen, nach Häufigkeit sortiert. */
export function extractThemes(reviews: ReviewRecord[]): ReviewTheme[] {
  const themes: ReviewTheme[] = [];

  for (const { topic, stems } of TOPICS) {
    const hits = reviews.filter((r) => matchesTopic(r.text, stems));
    if (hits.length === 0) continue;

    const averageRating = round(mean(hits.map((r) => r.rating)), 1);
    const sentiment: ReviewTheme["sentiment"] =
      averageRating >= 4.3 ? "positiv" : averageRating >= 3.5 ? "gemischt" : "negativ";

    themes.push({ topic, mentions: hits.length, averageRating, sentiment });
  }

  return themes.sort((a, b) => b.mentions - a.mentions);
}

export function reviewAnalytics(reviews: ReviewRecord[], now: string): ReviewAnalytics {
  const total = reviews.length;
  if (total === 0) {
    return {
      total: 0,
      averageRating: 0,
      ratingTrend: 0,
      responseRate: 0,
      medianResponseHours: null,
      unanswered: 0,
      themes: [],
    };
  }

  const averageRating = round(mean(reviews.map((r) => r.rating)), 2);

  // Trend: Schnitt der letzten 30 Tage gegen die 30 Tage davor.
  const recent = reviews.filter((r) => daysBetween(now, r.createdAt) <= 30);
  const prior = reviews.filter((r) => {
    const d = daysBetween(now, r.createdAt);
    return d > 30 && d <= 60;
  });
  const ratingTrend =
    recent.length && prior.length
      ? round(mean(recent.map((r) => r.rating)) - mean(prior.map((r) => r.rating)), 2)
      : 0;

  const answered = reviews.filter((r) => r.repliedAt);
  const responseRate = round(answered.length / total, 2);
  const unanswered = total - answered.length;

  const responseHours = answered
    .map((r) => hoursBetween(r.repliedAt!, r.createdAt))
    .filter((h) => h >= 0);
  const medianResponseHours = responseHours.length ? round(median(responseHours)!, 1) : null;

  return {
    total,
    averageRating,
    ratingTrend,
    responseRate,
    medianResponseHours,
    unanswered,
    themes: extractThemes(reviews),
  };
}
