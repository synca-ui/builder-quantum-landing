/**
 * Server-seitiger VenueDataset-Assembler.
 *
 * Liest die Maitr-Tabellen eines Betriebs und bringt sie auf das plattformneutrale
 * Format, das `@maitr/core/analytics` erwartet — dieselben Typen wie in der Demo,
 * nur aus der DB statt aus Fixtures. So läuft die Auswertung „write once" im Client
 * (Demo) wie serverseitig (echte Google-/Meta-Daten) über exakt dieselben Funktionen.
 *
 * ZWEI DATENLAGEN (seit dem Präsenz-Workflow, server/maitr/praesenz/):
 *
 *  - MIT synchronisierten Google-Bewertungen: Bewertungen samt Antwortstatus
 *    kommen aus MaitrReview (nur source "google"), Reichweite aus
 *    MaitrEngagementPoint; Schnitt und Anzahl aus Googles Gesamtzahl im Snapshot,
 *    soweit vorhanden.
 *  - SONST (auch mit aktiver, aber noch nicht synchronisierter Google-Verbindung):
 *    Bewertungsschnitt, Anzahl, die fünf öffentlichen Bewertungen,
 *    Fotos, Öffnungszeiten, Telefon und Website kommen aus dem gespeicherten
 *    Google-Places-Eintrag (PresenceSnapshot). Antwortquote und Reichweite gibt es
 *    so nicht - sie gehen als UNBEKANNT in den Score statt als Null, und
 *    `buildInsights` erzeugt keine "Bewertung wartet auf Antwort"-Aufgaben aus
 *    Bewertungen, deren Antwortstatus niemand kennt.
 *
 * Die Profilsignale (Speisekarte, Beschreibung) leiten sich in beiden Fällen aus
 * dem ab, was Maitr tatsächlich über den Betrieb weiß. Vorher las diese Datei nur
 * `Business.profileSignals` - eine Spalte, die keine Zeile Code je beschreibt. Jeder
 * echte Betrieb galt damit als "ohne Speisekarte", auch wenn die Web-App eine hatte.
 * Gesetzte Werte in `profileSignals` gewinnen weiterhin (händische Korrektur).
 */
import {
  datasetAusPraesenz,
  type EngagementPoint,
  type GuestRecord,
  type ProfileSignals,
  type ReservationRecord,
  type ReservationStatus,
  type ReviewRecord,
  type VenueDataset,
} from "@maitr/core/analytics";
import { prisma } from "../db/prisma";
import type { GoogleAbrufStatus, GoogleEintrag, WebsitePruefung } from "@maitr/core/analytics";
import { gespeichertePraesenz, maitrProfilAus } from "./praesenz/profil";

/**
 * Präsenzstand, den der Aufrufer schon in der Hand hat. Der Präsenz-Workflow
 * reicht ihn herein, damit der Score mit genau dem Stand rechnet, den er gerade
 * geholt hat - auch wenn das Speichern scheiterte (Tabelle fehlt).
 */
export interface PraesenzUebergabe {
  google: GoogleEintrag | null;
  website: WebsitePruefung | null;
  status: GoogleAbrufStatus;
}

/**
 * Prisma-`ReservationStatus` → neutrales Analytics-Status.
 *
 * PENDING fehlt mit Absicht: Das ist eine unbeantwortete Anfrage über die
 * Web-App (server/routes/publicReservations.ts legt sie so an), bestätigt erst
 * per Mail-Link oder in der App. Früher galt sie hier als "confirmed". Solange
 * "website" auf "walk_in" fiel, war das für die ROI-Aufgabe folgenlos - seit
 * "website" als Maitr-Buchung zählt, stand eine nie bestätigte Anfrage von
 * gestern in "… € Provision gespart" samt Jahreshochrechnung. Das Analytics-
 * Modell kennt keinen offenen Status, also kommen offene Anfragen gar nicht erst
 * ins Dataset (Abfrage unten), und ein unbekannter Status wird übersprungen statt
 * als bestätigt gezählt.
 */
const STATUS_MAP: Record<string, ReservationStatus> = {
  CONFIRMED: "confirmed",
  ARRIVED: "seated",
  COMPLETED: "seated",
  CANCELLED: "cancelled",
  NO_SHOW: "no_show",
};

/**
 * Reservation.source → neutrale Quelle.
 *
 * "website" sind Buchungen über die veröffentlichte Maitr-Web-App
 * (server/routes/publicReservations.ts) - der Gast bucht selbst, provisionsfrei
 * über Maitr vermittelt, also "maitr". Vorher fielen sie in den Rückfall
 * "walk_in", und `reservationRoi` zählt nur "maitr": Die ROI-Aufgabe blieb für
 * jeden echten Betrieb stumm, obwohl genau diese Buchungen die Provision sparen
 * (Integrationsprüfung, Punkt 11).
 *
 * "maitr" dagegen trägt der BETRIEB selbst in der App ein (POST /reservations):
 * die telefonische Buchung, der Stammgast - oder ein Probelauf in der
 * Gastbuchungs-Vorschau. Das hat keine Plattform vermittelt und keine Provision
 * gespart. ANLASS (Prüfbefund): Seit diese Einträge sofort CONFIRMED sind, standen
 * sie in "… € Provision gespart" samt Jahreshochrechnung. Sie zählen deshalb wie
 * ein Walk-in.
 */
export function mapSource(source: string): ReservationRecord["source"] {
  if (source === "website") return "maitr";
  if (source === "google") return "google";
  return "walk_in";
}

/**
 * Wie weit das Dataset Reservierungen zurückreicht.
 *
 * Der einzige Verbraucher auf dem Server ist die ROI-Aufgabe ("… Provision
 * gespart", `buildInsights`), und die meint die letzten 30 Tage BIS JETZT. Ohne
 * Grenze zählte sie alles aus der Tabelle seit Beginn - auch Buchungen für
 * nächste Woche, die noch nichts gespart haben. `reservationRoi` filtert selbst
 * nicht, solange ihm niemand `now` übergibt (die Demo rechnet bewusst ohne), also
 * zieht der Server die Grenze beim Laden. Nebenbei lädt das Briefing nicht mehr
 * die ganze Reservierungshistorie.
 *
 * ACHTUNG beim Ausbau: Die No-Show-Aufgabe in `buildInsights` sieht dadurch die
 * noch kommenden Reservierungen von heute nicht. Heute ist das folgenlos, weil sie
 * eine `guestId` verlangt und Reservation keine trägt. Bekommt Reservation eine
 * Gastverknüpfung, gehört die obere Grenze hier weg und `{ now }` an den
 * `reservationRoi`-Aufruf in insights.ts.
 */
export const RESERVIERUNGEN_ZEITRAUM_MS = 30 * 86_400_000;

/** Nur gesetzte Wahrheitswerte aus `profileSignals` - "nicht gesetzt" bleibt offen. */
function gesetzteSignale(roh: unknown): Partial<ProfileSignals> {
  const s = roh && typeof roh === "object" ? (roh as Record<string, unknown>) : {};
  const out: Partial<ProfileSignals> = {};
  for (const key of [
    "hasMenu",
    "hasHolidayHours",
    "hasOutdoorAttribute",
    "hasBio",
    "hasOpeningHours",
    "hasWebsite",
    "hasPhone",
    "hasInstagram",
    "hasReservation",
  ] as const) {
    if (typeof s[key] === "boolean") (out as Record<string, boolean>)[key] = s[key] as boolean;
  }
  if (typeof s.photoCount === "number" && Number.isFinite(s.photoCount)) out.photoCount = s.photoCount;
  return out;
}

export async function assembleVenueDataset(
  businessId: string,
  now: Date = new Date(),
  optionen: { praesenz?: PraesenzUebergabe | null } = {},
): Promise<VenueDataset> {
  const [business, reviews, engagement, guests, reservations, gerichte] =
    await Promise.all([
      prisma.business.findUniqueOrThrow({ where: { id: businessId } }),
      prisma.maitrReview.findMany({ where: { businessId } }),
      prisma.maitrEngagementPoint.findMany({ where: { businessId } }),
      prisma.maitrGuest.findMany({ where: { businessId } }),
      prisma.reservation.findMany({
        where: {
          businessId,
          reservationTime: { gt: new Date(now.getTime() - RESERVIERUNGEN_ZEITRAUM_MS), lte: now },
          // Offene Web-Anfragen sind keine vermittelten Buchungen (STATUS_MAP).
          status: { not: "PENDING" },
        },
      }),
      prisma.menuItem.count({ where: { category: { businessId } } }),
    ]);

  const maitr = maitrProfilAus(business as any, gerichte);
  const gesetzt = gesetzteSignale(business.profileSignals);

  const engagementPoints = engagement.map<EngagementPoint>((e) => ({
    at: e.at.toISOString(),
    source: e.source as EngagementPoint["source"],
    impressions: e.impressions,
    actions: e.actions,
  }));

  const basis = {
    now: now.toISOString(),
    timezone: business.timezone,
    engagement: engagementPoints,
    reservations: reservations.flatMap<ReservationRecord>((r) => {
      const status = STATUS_MAP[r.status];
      if (!status) return [];
      return [
        {
          id: r.id,
          partySize: r.guestCount,
          start: r.reservationTime.toISOString(),
          status,
          source: mapSource(r.source),
        },
      ];
    }),
    guests: guests.map<GuestRecord>((g) => ({
      id: g.id,
      name: g.name,
      firstVisit: g.firstVisit.toISOString(),
      lastVisit: g.lastVisit.toISOString(),
      visits: g.visits,
      noShows: g.noShows,
      tags: g.tags,
    })),
    averageCheck: business.averageCheck,
  };

  // Der Präsenzstand zählt in BEIDEN Datenlagen: Fotos, Öffnungszeiten, Telefon
  // und Website bei Google hängen nicht an der Freigabe.
  const praesenz =
    optionen.praesenz !== undefined ? optionen.praesenz : await gespeichertePraesenz(businessId, now);
  const oeffentlich = datasetAusPraesenz({
    now: basis.now,
    google: praesenz?.google ?? null,
    googleStatus: praesenz?.status ?? "ausstehend",
    website: praesenz?.website ?? null,
    maitr,
  });

  // Die freigegebene Datenlage hängt an synchronisierten GOOGLE-Bewertungen - nicht
  // an irgendwelchen MaitrReview-Zeilen und nicht an der bloßen Verbindung.
  //
  //  - Facebook: Der Meta-Sync schreibt Empfehlungen nach MaitrReview (positiv 5★,
  //    negativ 1★, nie mit Antwortzeitpunkt). Früher verdrängten sie bei reiner
  //    Meta-Verbindung den Google-Eintrag, und bei Google PLUS Meta flossen sie in
  //    Schnitt, Antwortquote und "Bewertung wartet auf Antwort"-Aufgaben ein,
  //    obwohl niemand ihren Antwortstatus kennt (Prüfbefund). Deshalb zählen hier
  //    nur Zeilen mit source "google".
  //  - Verbunden, aber noch nicht gezogen: Der OAuth-Callback setzt die Verbindung
  //    sofort auf ACTIVE, gezogen wird erst beim nächsten Sync - ohne
  //    MAITR_SYNC_INTERVAL_MINUTES nie. Diese Datenlage wertete leere Bewertungen
  //    als gemessen: Bewertung 0, Antwortquote 0, Reichweite 0, und ein 4,6★-Betrieb
  //    fiel beim Verbinden von Score 66 auf 19 (Prüfbefund). Bis zur ersten
  //    Google-Bewertung gilt deshalb die öffentliche Datenlage unten.
  const googleBewertungen = reviews.filter((r) => r.source === "google");
  if (googleBewertungen.length > 0) {
    return {
      ...basis,
      reviews: googleBewertungen.map<ReviewRecord>((r) => ({
        id: r.id,
        source: "google",
        rating: r.rating,
        text: r.text,
        createdAt: r.createdAtSource.toISOString(),
        repliedAt: r.repliedAt?.toISOString(),
      })),
      profile: { ...oeffentlich.profile, ...gesetzt },
      // Der Sync holt nur die erste Seite (≤ 50 neueste). Googles Gesamtzahl aus dem
      // Snapshot ist der richtigere Schnitt - und derselbe, den der Profil-Check zeigt.
      ...(oeffentlich.reviewSummary ? { reviewSummary: oeffentlich.reviewSummary } : {}),
    };
  }

  // Reichweite ist nur dann unbekannt, wenn auch keine Meta-Punkte vorliegen.
  const unbekannt = (oeffentlich.coverage?.unknown ?? []).filter(
    (k) => k !== "reach" || engagementPoints.length === 0,
  );

  return {
    ...basis,
    reviews: oeffentlich.reviews,
    profile: { ...oeffentlich.profile, ...gesetzt },
    ...(oeffentlich.reviewSummary ? { reviewSummary: oeffentlich.reviewSummary } : {}),
    coverage: { unknown: unbekannt, estimated: oeffentlich.coverage?.estimated ?? [] },
  };
}
