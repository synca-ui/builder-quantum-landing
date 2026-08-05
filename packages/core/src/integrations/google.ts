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
    // v4 will die VOLLE Form: ohne accounts-Präfix kennt diese API den Standort nicht.
    const { voll } = googleRessourcenNamen(tokens.accountId);
    const res = await fetchImpl(`${REVIEWS_BASE}/${voll}/reviews`, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (!res.ok) throw new Error(`Google reviews HTTP ${res.status}`);
    const body = (await res.json()) as { reviews?: GoogleReview[] };
    return (body.reviews ?? []).map(normalizeGoogleReview);
  },

  async fetchEngagement(tokens, fetchImpl) {
    // NUR die kurze Form "locations/Y" - die Performance-API kennt keine Konten
    // in ihrem Pfad. Siehe die Messung bei googleRessourcenNamen(): mit
    // accounts-Präfix antwortet Google 404, ohne 401. Das ist der Unterschied
    // zwischen "diese Route gibt es nicht" und "diese Route gibt es, ich bin
    // hier nur nicht angemeldet" - und damit der Beleg, welche Form stimmt.
    const { standort } = googleRessourcenNamen(tokens.accountId);
    // BUSINESS_IMPRESSIONS_* sind die Aufruf-Metriken der Performance-API.
    const url =
      `${PERFORMANCE_BASE}/${standort}:fetchMultiDailyMetricsTimeSeries` +
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

/**
 * Zerlegt die gespeicherte Kennung in die ZWEI Formen, die Google verlangt - und
 * prüft sie dabei strikt (verhindert Path-Injection/SSRF).
 *
 * Gespeichert wird genau ein Wert: "accounts/X/locations/Y" (resolveAccountId in
 * server/maitr/routes.ts baut ihn so). Die beiden APIs wollen davon aber
 * Unterschiedliches, und das war hier lange falsch verdrahtet:
 *
 *   • `voll`     = "accounts/X/locations/Y"  → Business Profile API v4 (Bewertungen)
 *   • `standort` = "locations/Y"             → Performance API (Reichweite)
 *
 * MESSUNG, damit das niemand "zurückkorrigiert" (per curl, ohne Token):
 *   .../v1/locations/222:fetchMultiDailyMetricsTimeSeries              → 401
 *   .../v1/accounts/111/locations/222:fetchMultiDailyMetricsTimeSeries → 404
 * 401 heißt: die Route existiert, es fehlt nur die Anmeldung - also die richtige
 * Form. 404 heißt: diese Route gibt es nicht. Die Performance-API führt Konten
 * schlicht nicht im Pfad. Mit der 404-Form lief der Reichweite-Pull ins Leere,
 * ohne dass es je auffiel - `fetchEngagement` warf nur "HTTP 404", und das sah
 * aus wie ein noch nicht freigegebener Zugang.
 *
 * Deshalb wird hier abgeleitet statt konfiguriert: eine zweite gespeicherte
 * Kennung könnte von der ersten abdriften, diese kann es nicht.
 */
function googleRessourcenNamen(id: string): { voll: string; standort: string } {
  const treffer = /^accounts\/[A-Za-z0-9_-]+\/(locations\/[A-Za-z0-9_-]+)$/.exec(id);
  if (!treffer) {
    throw new Error("Ungültige Google-Konto-/Standort-ID");
  }
  return { voll: id, standort: treffer[1] };
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
