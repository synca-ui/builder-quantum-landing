/**
 * Meta Connector - Instagram Graph API + Facebook Pages.
 *
 * Ein Instagram-Professional-Konto hängt immer an einer Facebook-Seite; über den
 * Graph-Zugang der Seite lesen wir beides. Datenquellen:
 *   • Reichweite → `/{ig-user-id}/insights?metric=impressions,reach,profile_views`
 *   • "Bewertungen": Instagram kennt keine Sternebewertungen. Facebook-Seiten-
 *     Empfehlungen (Recommendations) kommen über `/{page-id}/ratings`. Wir mappen
 *     eine Empfehlung (recommendation_type) auf 5★ (positiv) bzw. 1★ (negativ),
 *     damit sie in dieselbe Bewertungs-Auswertung fließen.
 *
 * Die genutzten Permissions erfordern App Review und Business-Verifizierung bei
 * Meta (siehe docs/integrations/GOOGLE_META_API_ACCESS.md).
 */

import type { EngagementPoint, ReviewRecord } from "../analytics/types";
import type { ChannelConnector, ConnectionTokens, FetchLike, OAuthConfig } from "./types";

/**
 * Angefragte Berechtigungen - genau so viele, wie die drei Aufrufe tragen, die
 * es wirklich gibt. Jede Zeile nennt den Aufruf, der sie braucht; das ist
 * zugleich die Vorlage für die Begründung im Meta-App-Review, denn dort ist
 * jede Berechtigung einzeln mit Screencast zu rechtfertigen.
 *
 * Die Regel dahinter: Wer eine Berechtigung ergänzt, muss den Aufruf daneben
 * schreiben können. Geht das nicht, gehört sie nicht in die Liste - eine
 * Berechtigung ohne Aufruf verzögert nur den Review und vergrößert im selben
 * Zug den Schaden, den ein abhandengekommenes Token anrichten kann.
 */
export const META_SCOPES = [
  // Grundzugang zum Instagram-Profikonto; ohne sie beantwortet der Graph den
  // Insights-Aufruf in fetchEngagement gar nicht erst.
  "instagram_basic",
  // Trägt `/{ig-user-id}/insights?metric=impressions,reach,profile_views`
  // in fetchEngagement (unten).
  "instagram_manage_insights",
  // Trägt `GET /me/accounts` in resolveAccountId (server/maitr/routes.ts) - der
  // Aufruf, der die Page-ID liefert, auf der beide Connector-Aufrufe aufsetzen.
  "pages_show_list",
  // Trägt den Seitenzugriff für `/{page-id}/ratings` in fetchReviews (unten).
  "pages_read_engagement",
  // Empfehlungen sind von Nutzern geschriebene Inhalte, und genau die deckt
  // pages_read_engagement NICHT ab: sie trägt nur die seiteneigenen Daten.
  // Ohne diese zweite Berechtigung antwortet `/{page-id}/ratings` in
  // fetchReviews mit 403. Sie fällt also erst weg, wenn der /ratings-Aufruf
  // fällt - nicht vorher, sonst bricht der Bewertungs-Sync still im Betrieb,
  // wo keine Testattrappe ihn mehr auffängt.
  "pages_read_user_content",
  // Entfernt: "business_management". Sie öffnet den gesamten Bestand des
  // Business Managers (Konten, Seiten, Werbekonten), obwohl kein einziger
  // Aufruf im Repo die Business-Manager-API anfasst - /me/accounts, /ratings
  // und /insights kommen ohne sie aus. Sie war die breiteste der sechs und die
  // einzige ohne Aufruf dahinter.
];

export const META_OAUTH: Omit<OAuthConfig, "clientId" | "redirectUri"> = {
  provider: "meta",
  scopes: META_SCOPES,
  authorizationEndpoint: "https://www.facebook.com/v21.0/dialog/oauth",
  tokenEndpoint: "https://graph.facebook.com/v21.0/oauth/access_token",
};

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

export const metaConnector: ChannelConnector = {
  provider: "meta",

  buildAuthorizationUrl(config, state) {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: config.scopes.join(","),
      state,
    });
    return `${config.authorizationEndpoint}?${params.toString()}`;
  },

  async fetchReviews(tokens, fetchImpl) {
    // accountId ist hier die Facebook-Page-ID. Vor der Interpolation in die URL
    // validieren (nur Ziffern) - verhindert Path-Injection/SSRF über einen
    // manipulierten accountId.
    const pageId = assertMetaId(tokens.accountId);
    const url = `${GRAPH_BASE}/${pageId}/ratings?fields=created_time,recommendation_type,review_text`;
    // Token gehört in den Authorization-Header, NIE in die Query - sonst landet es
    // in Access-Logs, Proxys und Referern.
    const res = await fetchImpl(url, { headers: bearer(tokens.accessToken) });
    if (!res.ok) throw new Error(`Meta ratings HTTP ${res.status}`);
    const body = (await res.json()) as { data?: MetaRating[] };
    return (body.data ?? []).map(normalizeMetaRating);
  },

  async fetchEngagement(tokens, fetchImpl) {
    const igId = assertMetaId(tokens.accountId);
    const url = `${GRAPH_BASE}/${igId}/insights?metric=impressions,reach,profile_views&period=day`;
    const res = await fetchImpl(url, { headers: bearer(tokens.accessToken) });
    if (!res.ok) throw new Error(`Meta insights HTTP ${res.status}`);
    const body = (await res.json()) as MetaInsightsResponse;
    return normalizeMetaEngagement(body);
  },
};

/** Meta-Konto-/Seiten-IDs sind numerisch. Alles andere ist ein Manipulationsversuch. */
function assertMetaId(id: string): string {
  if (!/^\d{1,32}$/.test(id)) throw new Error("Ungültige Meta-Konto-ID");
  return id;
}

function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

interface MetaRating {
  created_time: string;
  recommendation_type?: "positive" | "negative";
  review_text?: string;
}

function normalizeMetaRating(r: MetaRating): ReviewRecord {
  return {
    id: `fb_${r.created_time}`,
    source: "facebook",
    rating: r.recommendation_type === "negative" ? 1 : 5,
    text: r.review_text ?? "",
    createdAt: r.created_time,
  };
}

interface MetaInsightsResponse {
  data?: {
    name: string;
    values?: { value: number; end_time: string }[];
  }[];
}

/** "impressions"-Serie in Reichweite-Punkte übersetzen; profile_views → actions. */
function normalizeMetaEngagement(body: MetaInsightsResponse): EngagementPoint[] {
  const impressions = body.data?.find((d) => d.name === "impressions")?.values ?? [];
  const views = body.data?.find((d) => d.name === "profile_views")?.values ?? [];
  const actionsByTime = new Map(views.map((v) => [v.end_time, v.value]));

  return impressions.map((v) => ({
    at: v.end_time,
    source: "instagram" as const,
    impressions: v.value,
    actions: actionsByTime.get(v.end_time) ?? 0,
  }));
}
