/**
 * Integrationsschicht - wie ein Betrieb seine Kanäle verbindet und wie wir daraus
 * normalisierte Daten für die Analytics ziehen.
 *
 * Der Ablauf ist bei beiden Anbietern gleich:
 *   1. Nutzer startet OAuth (Consent-Screen bei Google bzw. Meta).
 *   2. Wir tauschen den Code gegen ein Access-/Refresh-Token (serverseitig).
 *   3. Mit dem Token lesen wir Bewertungen und Insights.
 *   4. Ein `normalize*`-Schritt bringt die anbieterspezifische Antwort auf unsere
 *      neutralen `ReviewRecord` / `EngagementPoint` (siehe ../analytics/types).
 *
 * Die Connectors sind absichtlich transport-agnostisch: sie bekommen eine
 * `fetch`-artige Funktion herein. So laufen sie serverseitig gegen die echten
 * APIs und im Test/Demo gegen einen Fake - ohne Netzwerk im Kern zu verdrahten.
 */

import type { EngagementPoint, ReviewRecord } from "../analytics/types";

export type ProviderId = "google" | "meta";

/** OAuth-Konfiguration je Anbieter - die App-Zugangsdaten stehen serverseitig. */
export interface OAuthConfig {
  provider: ProviderId;
  clientId: string;
  redirectUri: string;
  /** Angefragte Scopes - genau die, die das App-Review abdeckt. */
  scopes: string[];
  /** Basis der Autorisierungs-URL (Consent-Screen). */
  authorizationEndpoint: string;
  tokenEndpoint: string;
}

/** Ergebnis eines abgeschlossenen OAuth-Flows, serverseitig gespeichert. */
export interface ConnectionTokens {
  provider: ProviderId;
  accessToken: string;
  refreshToken?: string;
  /** Ablaufzeitpunkt (ISO), damit wir rechtzeitig refreshen. */
  expiresAt: string;
  /** Anbieterspezifische Konto-/Standortkennung (Location bzw. IG-User-ID). */
  accountId: string;
}

/** Minimaler `fetch`-Vertrag, damit der Kern nicht an eine Laufzeit gebunden ist. */
export type FetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

/** Was jeder Connector kann. Rückgaben sind bereits normalisiert. */
export interface ChannelConnector {
  provider: ProviderId;
  /** Baut die URL, auf die der Nutzer zum Verbinden geschickt wird. */
  buildAuthorizationUrl(config: OAuthConfig, state: string): string;
  /** Bewertungen laden und normalisieren. */
  fetchReviews(tokens: ConnectionTokens, fetchImpl: FetchLike): Promise<ReviewRecord[]>;
  /** Reichweite-/Interaktions-Insights laden und normalisieren. */
  fetchEngagement(tokens: ConnectionTokens, fetchImpl: FetchLike): Promise<EngagementPoint[]>;
}
