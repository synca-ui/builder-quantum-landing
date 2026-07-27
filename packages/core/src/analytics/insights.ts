/**
 * Der Insights-Motor - die Klammer über allen Auswertungen.
 *
 * Er nimmt den gesamten Datensatz und erzeugt eine *rangierte* Liste von
 * Erkenntnissen: was ist heute wichtig, warum, und was kann man dagegen tun.
 * Genau das speist die "drei Entscheidungen" auf dem Start-Screen - statt einer
 * fest verdrahteten Liste entscheidet die Priorität (Wirkung × Dringlichkeit),
 * was oben steht. Reine Funktion: kein Netzwerk, kein Zustand.
 */

import { guestInsight, guestInsights, winBackCandidates } from "./guests";
import { presenceScore } from "./presence";
import { reviewAnalytics } from "./reviews";
import { reservationRoi } from "./roi";
import { bestPostingSlots } from "./timing";
import { daysBetween, round } from "./math";
import type { Insight, VenueDataset } from "./types";

/** Euro hübsch: "312 €", "1.240 €". */
function euro(value: number): string {
  return `${Math.round(value).toLocaleString("de-DE")} €`;
}

export function buildInsights(data: VenueDataset): Insight[] {
  const insights: Insight[] = [];

  /* Unbeantwortete Bewertungen - je frischer und schlechter, desto dringender. */
  const unanswered = data.reviews
    .filter((r) => !r.repliedAt)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  for (const r of unanswered.slice(0, 3)) {
    const age = daysBetween(data.now, r.createdAt);
    const negative = r.rating <= 3;
    insights.push({
      id: `review_${r.id}`,
      kind: "review",
      severity: negative ? "achtung" : "chance",
      title: negative
        ? `Kritische ${r.rating}★-Bewertung wartet auf Antwort`
        : `${r.rating}★-Bewertung - eine warme Antwort liegt bereit`,
      detail: r.text.slice(0, 120),
      impact: negative ? "Schaden begrenzen" : "+35 % Profilaufrufe",
      // Negativ + frisch = ganz oben; jeder Tag Verzug kostet Priorität-Punkte in die andere Richtung.
      priority: round((negative ? 90 : 62) - Math.min(age, 7) * (negative ? 1 : 3)),
      action: { label: "Antwort freigeben", route: "/bewertungen" },
    });
  }

  /* Größter Profil-Hebel aus dem Präsenzscore. */
  const presence = presenceScore(data);
  if (presence.biggestLever && presence.biggestLever.openPoints >= 4) {
    const lever = presence.biggestLever;
    insights.push({
      id: `profile_${lever.key}`,
      kind: "profile",
      severity: "hinweis",
      title: `${lever.label} anheben`,
      detail: lever.hint,
      impact: `+${lever.openPoints} Präsenzpunkte`,
      priority: round(40 + lever.openPoints),
      action: { label: "Profil-Check öffnen", route: "/profil-check" },
    });
  }

  /* Bester Beitrags-Slot - treibt den Beitragsvorschlag. */
  const [topSlot] = bestPostingSlots(data.engagement, 1);
  if (topSlot && topSlot.upliftPercent >= 15) {
    insights.push({
      id: `timing_${topSlot.weekday}_${topSlot.fromHour}`,
      kind: "timing",
      severity: "chance",
      title: `${topSlot.weekdayLabel} ${topSlot.fromHour}-${topSlot.toHour} Uhr ist deine stärkste Stunde`,
      detail: "Ein Beitrag in diesem Fenster erreicht die meisten Gäste.",
      impact: `+${topSlot.upliftPercent} % Reichweite`,
      priority: round(45 + Math.min(topSlot.upliftPercent, 40) / 2),
      action: { label: "Beitrag einplanen", route: "/beitraege" },
    });
  }

  /* Rückhol-Chance - wertvollster gefährdeter Gast. */
  const [topWinBack] = winBackCandidates(data);
  if (topWinBack) {
    insights.push({
      id: `guest_${topWinBack.id}`,
      kind: "guest",
      severity: topWinBack.segment === "verloren" ? "achtung" : "hinweis",
      title: `${topWinBack.name} war ${topWinBack.daysSinceLastVisit} Tage nicht da`,
      detail: `${topWinBack.visits} Besuche · ca. ${euro(topWinBack.lifetimeValue)} Wert. Eine Einladung holt Stammgäste zurück.`,
      impact: `${euro(topWinBack.lifetimeValue)} Beziehung`,
      priority: round(50 + topWinBack.churnRisk * 30),
      action: { label: "Gast zurückholen", route: "/gaeste" },
    });
  }

  /* No-Show-Risiko bei heutigen Reservierungen. */
  const risky = data.reservations
    .filter((r) => r.status === "confirmed" && daysBetween(r.start, data.now) === 0 && r.guestId)
    .map((r) => ({ r, g: data.guests.find((g) => g.id === r.guestId) }))
    .filter((x) => x.g && guestInsight(x.g, data).noShowRisk >= 0.4)
    .sort((a, b) => guestInsight(b.g!, data).noShowRisk - guestInsight(a.g!, data).noShowRisk);
  if (risky.length > 0) {
    const { g } = risky[0];
    const gi = guestInsight(g!, data);
    insights.push({
      id: `noshow_${g!.id}`,
      kind: "reservation",
      severity: "achtung",
      title: `Erhöhtes No-Show-Risiko: ${g!.name}`,
      detail: `${Math.round(gi.noShowRisk * 100)} % No-Show-Quote. Eine kurze Bestätigungs-SMS senkt das Risiko spürbar.`,
      impact: "Tisch absichern",
      priority: round(55 + gi.noShowRisk * 20),
      action: { label: "Tische öffnen", route: "/tische" },
    });
  }

  /* Auslastungs-Autopilot: ruhige Zeiten aus dem Gäste-Graph füllen (Nachfrage
     erzeugen statt abwarten). Nur sinnvoll ab genug adressierbaren Stammgästen. */
  const regulars = guestInsights(data).filter(
    (g) => g.segment === "stammgast" || g.segment === "vip",
  );
  if (regulars.length >= 2) {
    // Grobe Schätzung: je eingeladenem Stammgast ein Besuch à ~2 Gedecke.
    const potentialRevenue = regulars.length * 2 * data.averageCheck;
    insights.push({
      id: "occupancy_fill",
      kind: "reservation",
      severity: "chance",
      title: "Ruhige Stunden gezielt füllen",
      detail: `${regulars.length} Stammgäste kommen gern unter der Woche. Eine Einladung bringt ca. ${euro(potentialRevenue)} Umsatz.`,
      impact: `~${euro(potentialRevenue)} Auslastung`,
      priority: round(64 + Math.min(regulars.length, 6)),
      action: { label: "Kampagne starten", route: "/kampagne" },
    });
  }

  /* ROI als positive Verstärkung - was Maitr diesen Monat gebracht hat. */
  const roi = reservationRoi(data.reservations, data.averageCheck);
  if (roi.savedCommission > 0) {
    insights.push({
      id: "roi_month",
      kind: "roi",
      severity: "chance",
      title: `${euro(roi.savedCommission)} Provision gespart`,
      detail: `${roi.reservations} provisionsfreie Reservierungen · ${roi.covers} Gäste · ${euro(roi.revenue)} vermittelt.`,
      impact: `${euro(roi.savedCommissionAnnualized)} / Jahr`,
      priority: 30,
      action: { label: "Wachstum ansehen", route: "/wachstum" },
    });
  }

  return insights.sort((a, b) => b.priority - a.priority);
}
