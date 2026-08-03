/**
 * `@maitr/core/integrations` - Kanäle verbinden und Rohdaten normalisieren.
 *
 * Ein Connector je Anbieter, beide erfüllen denselben `ChannelConnector`-Vertrag.
 * Nach dem Laden liegen die Daten als neutrale `ReviewRecord` / `EngagementPoint`
 * vor und fließen direkt in `@maitr/core/analytics`.
 */

export * from "./types";
export { googleConnector, GOOGLE_OAUTH, GOOGLE_SCOPES } from "./google";
export { metaConnector, META_OAUTH, META_SCOPES } from "./meta";

import { googleConnector } from "./google";
import { metaConnector } from "./meta";
import type { ChannelConnector, ProviderId } from "./types";

/** Connector-Registry - Auflösung nach Anbieter-Id. */
export const connectors: Record<ProviderId, ChannelConnector> = {
  google: googleConnector,
  meta: metaConnector,
};
