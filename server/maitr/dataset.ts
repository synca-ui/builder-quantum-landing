/**
 * Server-seitiger VenueDataset-Assembler.
 *
 * Liest die Maitr-Tabellen eines Betriebs und bringt sie auf das plattformneutrale
 * Format, das `@maitr/core/analytics` erwartet — dieselben Typen wie in der Demo,
 * nur aus der DB statt aus Fixtures. So läuft die Auswertung „write once" im Client
 * (Demo) wie serverseitig (echte Google-/Meta-Daten) über exakt dieselben Funktionen.
 */
import type {
  EngagementPoint,
  GuestRecord,
  ReservationRecord,
  ReservationStatus,
  ReviewRecord,
  VenueDataset,
} from "@maitr/core/analytics";
import { prisma } from "../db/prisma";

/** Prisma-`ReservationStatus` → neutrales Analytics-Status. */
const STATUS_MAP: Record<string, ReservationStatus> = {
  PENDING: "confirmed",
  CONFIRMED: "confirmed",
  ARRIVED: "seated",
  COMPLETED: "seated",
  CANCELLED: "cancelled",
  NO_SHOW: "no_show",
};

function mapSource(source: string): ReservationRecord["source"] {
  if (source === "maitr") return "maitr";
  if (source === "google") return "google";
  return "walk_in";
}

export async function assembleVenueDataset(
  businessId: string,
  now: Date = new Date(),
): Promise<VenueDataset> {
  const [business, reviews, engagement, guests, reservations] = await Promise.all([
    prisma.business.findUniqueOrThrow({ where: { id: businessId } }),
    prisma.maitrReview.findMany({ where: { businessId } }),
    prisma.maitrEngagementPoint.findMany({ where: { businessId } }),
    prisma.maitrGuest.findMany({ where: { businessId } }),
    prisma.reservation.findMany({ where: { businessId } }),
  ]);

  const signals = (business.profileSignals as Record<string, unknown> | null) ?? {};

  return {
    now: now.toISOString(),
    timezone: business.timezone,
    reviews: reviews.map<ReviewRecord>((r) => ({
      id: r.id,
      source: r.source as ReviewRecord["source"],
      rating: r.rating,
      text: r.text,
      createdAt: r.createdAtSource.toISOString(),
      repliedAt: r.repliedAt?.toISOString(),
    })),
    engagement: engagement.map<EngagementPoint>((e) => ({
      at: e.at.toISOString(),
      source: e.source as EngagementPoint["source"],
      impressions: e.impressions,
      actions: e.actions,
    })),
    reservations: reservations.map<ReservationRecord>((r) => ({
      id: r.id,
      partySize: r.guestCount,
      start: r.reservationTime.toISOString(),
      status: STATUS_MAP[r.status] ?? "confirmed",
      source: mapSource(r.source),
    })),
    guests: guests.map<GuestRecord>((g) => ({
      id: g.id,
      name: g.name,
      firstVisit: g.firstVisit.toISOString(),
      lastVisit: g.lastVisit.toISOString(),
      visits: g.visits,
      noShows: g.noShows,
      tags: g.tags,
    })),
    profile: {
      hasMenu: Boolean(signals.hasMenu),
      hasHolidayHours: Boolean(signals.hasHolidayHours),
      hasOutdoorAttribute: Boolean(signals.hasOutdoorAttribute),
      photoCount: Number(signals.photoCount ?? 0),
      hasBio: Boolean(signals.hasBio),
    },
    averageCheck: business.averageCheck,
  };
}
