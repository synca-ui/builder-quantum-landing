/**
 * Sync-Jobs: Kanäle abrufen und das Briefing neu berechnen.
 *
 * Als Scheduled Function (Netlify/cron) aufgerufen. `pullChannel` sorgt zuerst für
 * ein gültiges Access-Token (Refresh mit Single-Flight-Lock), zieht dann Bewertungen
 * + Reichweite über die `@maitr/core/integrations`-Connectors und schreibt sie
 * idempotent. `rebuildInsights` cached danach das vollständige Briefing.
 */
import type { ChannelConnection } from "@prisma/client";
import { connectors, GOOGLE_OAUTH } from "@maitr/core/integrations";
import type { ConnectionTokens, FetchLike } from "@maitr/core/integrations";
import { prisma } from "../db/prisma";
import { computeBriefing } from "./briefing";
import { maitrEnv } from "./env";
import { decryptToken, encryptToken } from "./security";

const fetchLike: FetchLike = async (url, init) => {
  const res = await fetch(url, init);
  return { ok: res.ok, status: res.status, json: () => res.json() };
};

const REFRESH_SKEW_MS = 5 * 60_000;
/** Single-Flight: parallele Pulls derselben Verbindung teilen einen Refresh. */
const refreshLocks = new Map<string, Promise<string>>();

async function refreshGoogle(refreshToken: string): Promise<{ accessToken: string; expiresAt: number }> {
  const env = maitrEnv();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
  });
  const res = await fetchLike(GOOGLE_OAUTH.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Google refresh HTTP ${res.status}`);
  const t = (await res.json()) as { access_token: string; expires_in: number };
  return { accessToken: t.access_token, expiresAt: Date.now() + t.expires_in * 1000 };
}

/** Gültiges Access-Token liefern; bei Bedarf refreshen (Single-Flight je Verbindung). */
async function ensureFreshToken(conn: ChannelConnection): Promise<string> {
  if (conn.expiresAt.getTime() - Date.now() > REFRESH_SKEW_MS) {
    return decryptToken(conn.encAccessToken);
  }
  const existing = refreshLocks.get(conn.id);
  if (existing) return existing;

  const p = (async () => {
    if (conn.provider !== "GOOGLE" || !conn.encRefreshToken) {
      // Meta-Long-Lived-Tokens lassen sich nicht still erneuern → Reconnect nötig.
      await prisma.channelConnection.update({ where: { id: conn.id }, data: { status: "EXPIRED" } });
      throw new Error("Token abgelaufen, Reconnect nötig");
    }
    const refreshed = await refreshGoogle(decryptToken(conn.encRefreshToken));
    await prisma.channelConnection.update({
      where: { id: conn.id },
      data: { encAccessToken: encryptToken(refreshed.accessToken), expiresAt: new Date(refreshed.expiresAt) },
    });
    return refreshed.accessToken;
  })().finally(() => refreshLocks.delete(conn.id));

  refreshLocks.set(conn.id, p);
  return p;
}

export async function pullChannel(connectionId: string): Promise<void> {
  const conn = await prisma.channelConnection.findUniqueOrThrow({ where: { id: connectionId } });
  if (conn.status !== "ACTIVE") return;

  const provider = conn.provider === "GOOGLE" ? "google" : "meta";
  const accessToken = await ensureFreshToken(conn);
  const tokens: ConnectionTokens = {
    provider,
    accessToken,
    refreshToken: conn.encRefreshToken ? decryptToken(conn.encRefreshToken) : undefined,
    expiresAt: conn.expiresAt.toISOString(),
    accountId: conn.accountId,
  };

  const connector = connectors[provider];
  const [reviews, engagement] = await Promise.all([
    connector.fetchReviews(tokens, fetchLike),
    connector.fetchEngagement(tokens, fetchLike),
  ]);

  for (const r of reviews) {
    await prisma.maitrReview.upsert({
      where: {
        businessId_source_externalId: { businessId: conn.businessId, source: r.source, externalId: r.id },
      },
      create: {
        businessId: conn.businessId,
        source: r.source,
        externalId: r.id,
        rating: r.rating,
        text: r.text,
        createdAtSource: new Date(r.createdAt),
        repliedAt: r.repliedAt ? new Date(r.repliedAt) : null,
      },
      update: { rating: r.rating, text: r.text, repliedAt: r.repliedAt ? new Date(r.repliedAt) : null },
    });
  }

  for (const e of engagement) {
    await prisma.maitrEngagementPoint.upsert({
      where: { businessId_source_at: { businessId: conn.businessId, source: e.source, at: new Date(e.at) } },
      create: {
        businessId: conn.businessId,
        source: e.source,
        at: new Date(e.at),
        impressions: e.impressions,
        actions: e.actions,
      },
      update: { impressions: e.impressions, actions: e.actions },
    });
  }
}

/** Volles Briefing berechnen und cachen (dieselbe Quelle wie GET /briefing/today). */
export async function rebuildInsights(businessId: string): Promise<void> {
  const briefing = await computeBriefing(businessId);
  const result = JSON.parse(JSON.stringify(briefing));
  await prisma.insightsCache.upsert({
    where: { businessId },
    create: { businessId, result },
    update: { result, computedAt: new Date() },
  });
}

/** Voller Durchlauf für alle aktiven Verbindungen - der Cron-Einstieg. */
export async function syncAll(): Promise<void> {
  const connections = await prisma.channelConnection.findMany({ where: { status: "ACTIVE" } });
  const touched = new Set<string>();

  for (const c of connections) {
    try {
      await pullChannel(c.id);
      touched.add(c.businessId);
    } catch (e) {
      // Kaputte Verbindung nicht still im Loop lassen: als abgelaufen markieren,
      // damit die App einen Reconnect anbieten kann.
      console.error("[maitr] pull fehlgeschlagen", c.id, (e as Error).message);
      await prisma.channelConnection
        .update({ where: { id: c.id }, data: { status: "EXPIRED" } })
        .catch(() => {});
    }
  }

  for (const businessId of touched) {
    try {
      await rebuildInsights(businessId);
    } catch (e) {
      console.error("[maitr] rebuild fehlgeschlagen", businessId, (e as Error).message);
    }
  }
}
