/**
 * Google Business Profile Connector.
 *
 * Datenquellen:
 *   • Bewertungen  → Business Profile API v4  `accounts/*​/locations/*​/reviews`
 *   • Reichweite   → Business Profile Performance API
 *                    `locations/*:fetchMultiDailyMetricsTimeSeries`
 *
 * Wichtig: der Zugriff auf die Business Profile API muss bei Google gesondert
 * beantragt und freigegeben werden (siehe docs/integrations/GOOGLE_META_API_ACCESS.md).
 * Erst nach Freigabe liefern die Endpunkte echte Daten.
 */

import type { EngagementPoint, ReviewRecord } from "../analytics/types";
import type { ChannelConnector, ConnectionTokens, FetchLike, OAuthConfig } from "./types";

/** Scopes, die das Lesen von Bewertungen und Performance-Daten abdecken. */
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/business.manage",
];

export const GOOGLE_OAUTH: Omit<OAuthConfig, "clientId" | "redirectUri"> = {
  provider: "google",
  scopes: GOOGLE_SCOPES,
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
};

const REVIEWS_BASE = "https://mybusiness.googleapis.com/v4";
const PERFORMANCE_BASE = "https://businessprofileperformance.googleapis.com/v1";

/** Google-Sternewort ("FIVE") → Zahl. */
const STAR_WORD: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

interface GoogleReview {
  reviewId: string;
  starRating: string;
  comment?: string;
  createTime: string;
  reviewReply?: { updateTime: string };
}

export const googleConnector: ChannelConnector = {
  provider: "google",

  buildAuthorizationUrl(config, state) {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: config.scopes.join(" "),
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `${config.authorizationEndpoint}?${params.toString()}`;
  },

  async fetchReviews(tokens, fetchImpl) {
    const account = assertGoogleAccountId(tokens.accountId);
    const res = await fetchImpl(`${REVIEWS_BASE}/${account}/reviews`, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (!res.ok) throw new Error(`Google reviews HTTP ${res.status}`);
    const body = (await res.json()) as { reviews?: GoogleReview[] };
    return (body.reviews ?? []).map(normalizeGoogleReview);
  },

  async fetchEngagement(tokens, fetchImpl) {
    const account = assertGoogleAccountId(tokens.accountId);
    // BUSINESS_IMPRESSIONS_* sind die Aufruf-Metriken der Performance-API.
    const url =
      `${PERFORMANCE_BASE}/${account}:fetchMultiDailyMetricsTimeSeries` +
      `?dailyMetrics=BUSINESS_IMPRESSIONS_DESKTOP_MAPS` +
      `&dailyMetrics=BUSINESS_IMPRESSIONS_MOBILE_MAPS`;
    const res = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (!res.ok) throw new Error(`Google performance HTTP ${res.status}`);
    const body = (await res.json()) as GooglePerformanceResponse;
    return normalizeGoogleEngagement(body);
  },
};

/** Google-Standort-Ressourcenname strikt prüfen (verhindert Path-Injection/SSRF). */
function assertGoogleAccountId(id: string): string {
  if (!/^accounts\/[A-Za-z0-9_-]+\/locations\/[A-Za-z0-9_-]+$/.test(id)) {
    throw new Error("Ungültige Google-Konto-/Standort-ID");
  }
  return id;
}

function normalizeGoogleReview(r: GoogleReview): ReviewRecord {
  return {
    id: r.reviewId,
    source: "google",
    rating: STAR_WORD[r.starRating] ?? 0,
    text: r.comment ?? "",
    createdAt: r.createTime,
    repliedAt: r.reviewReply?.updateTime,
  };
}

interface GooglePerformanceResponse {
  multiDailyMetricTimeSeries?: {
    dailyMetricTimeSeries?: {
      dailyMetric: string;
      timeSeries?: {
        datedValues?: { date: { year: number; month: number; day: number }; value?: string }[];
      };
    }[];
  }[];
}

/** Tages-Zeitreihen (mehrere Metriken) auf stündliche Reichweite-Punkte falten. */
function normalizeGoogleEngagement(body: GooglePerformanceResponse): EngagementPoint[] {
  const byDay = new Map<string, number>();
  for (const multi of body.multiDailyMetricTimeSeries ?? []) {
    for (const series of multi.dailyMetricTimeSeries ?? []) {
      for (const dv of series.timeSeries?.datedValues ?? []) {
        const { year, month, day } = dv.date;
        const iso = new Date(Date.UTC(year, month - 1, day, 12)).toISOString();
        byDay.set(iso, (byDay.get(iso) ?? 0) + Number(dv.value ?? 0));
      }
    }
  }
  return [...byDay.entries()].map(([at, impressions]) => ({
    at,
    source: "google" as const,
    impressions,
    actions: 0,
  }));
}
