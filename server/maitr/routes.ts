/**
 * Maitr-API-Routen. Halten sich an den Vertrag aus `@maitr/core/api`
 * (venue-scoped, hinter requireAuth + requireVenueAccess; `public` ohne Auth).
 *
 * Kernidee: die Analytik läuft NICHT hier, sondern in `@maitr/core/analytics` -
 * der Server assembliert nur das Dataset und ruft dieselben reinen Funktionen wie
 * die Demo. Kein doppelter Code, kein Auseinanderlaufen.
 */
import { Router } from "express";
import { z } from "zod";
import { connectors, GOOGLE_OAUTH, META_OAUTH } from "@maitr/core/integrations";
import type { FetchLike, OAuthConfig, ProviderId } from "@maitr/core/integrations";
import { prisma } from "../db/prisma";
import { requireVenueAccess, resolveVenueId, validateBody } from "./middleware";
import { computeBriefing } from "./briefing";
import { createState, encryptToken, verifyState } from "./security";
import { maitrEnv } from "./env";

const DAY_MS = 86_400_000;

/* ── Betriebe ────────────────────────────────────────────────────────────── */

export const venuesRouter = Router();

venuesRouter.get("/", async (req, res) => {
  const memberships = await prisma.businessMember.findMany({
    where: { userId: req.userId! },
    include: { business: true },
  });
  res.json(
    memberships.map((m) => ({
      id: m.business.id,
      name: m.business.name,
      tagline: m.business.tagline ?? undefined,
      timezone: m.business.timezone,
      tags: m.business.tags,
    })),
  );
});

/* ── Öffentliches Gastprofil (ohne Auth) ─────────────────────────────────── */

export const publicRouter = Router();

publicRouter.get("/venues/:slug/public", async (req, res) => {
  const business = await prisma.business.findUnique({ where: { slug: req.params.slug } });
  if (!business) return res.status(404).json({ error: "Nicht gefunden" });
  return res.json({
    id: business.id,
    name: business.name,
    tagline: business.tagline ?? undefined,
    timezone: business.timezone,
    tags: business.tags,
  });
});

/* ── Reservierungen ──────────────────────────────────────────────────────── */

export const reservationsRouter = Router();

reservationsRouter.get("/day", requireVenueAccess, async (req, res) => {
  const venueId = resolveVenueId(req)!;
  const date = String(req.query.date ?? "");
  const start = new Date(date);
  if (Number.isNaN(start.getTime())) return res.status(400).json({ error: "Ungültiges Datum" });
  const end = new Date(start.getTime() + DAY_MS);

  const reservations = await prisma.reservation.findMany({
    where: { businessId: venueId, reservationTime: { gte: start, lt: end } },
    orderBy: { reservationTime: "asc" },
  });
  res.json({ date, reservations });
});

const createReservationSchema = z.object({
  venueId: z.string().min(1),
  guestName: z.string().min(1).max(120),
  partySize: z.number().int().min(1).max(50),
  start: z.string().datetime(),
  phone: z.string().max(40).optional(),
});

reservationsRouter.post("/", requireVenueAccess, validateBody(createReservationSchema), async (req, res) => {
  const { venueId, guestName, partySize, start, phone } = req.body as z.infer<typeof createReservationSchema>;
  const reservation = await prisma.reservation.create({
    data: {
      businessId: venueId,
      guestName,
      guestCount: partySize,
      guestPhone: phone,
      reservationTime: new Date(start),
      source: "maitr",
    },
  });
  res.status(201).json(reservation);
});

/* ── Tagesbriefing (die drei Entscheidungen) ─────────────────────────────── */

export const briefingRouter = Router();

/** Frische-Fenster des Insights-Caches: darunter wird nicht neu gerechnet. */
const CACHE_TTL_MS = 15 * 60_000;

briefingRouter.get("/today", requireVenueAccess, async (req, res) => {
  const venueId = resolveVenueId(req)!;

  // Cache wirklich nutzen: frisch → direkt ausliefern, sonst rechnen + schreiben.
  const cache = await prisma.insightsCache.findUnique({ where: { businessId: venueId } });
  if (cache && Date.now() - cache.computedAt.getTime() < CACHE_TTL_MS) {
    return res.json(cache.result);
  }

  const briefing = await computeBriefing(venueId);
  const result = JSON.parse(JSON.stringify(briefing));
  await prisma.insightsCache.upsert({
    where: { businessId: venueId },
    create: { businessId: venueId, result },
    update: { result, computedAt: new Date() },
  });
  return res.json(briefing);
});

/* ── Integrationen (Kanäle verbinden) ────────────────────────────────────── */

export const integrationsRouter = Router();

function oauthConfig(provider: ProviderId): OAuthConfig {
  const env = maitrEnv();
  const redirectUri = `${env.MAITR_API_BASE_URL}/maitr/integrations/${provider}/callback`;
  if (provider === "google") {
    return { ...GOOGLE_OAUTH, clientId: env.GOOGLE_CLIENT_ID, redirectUri };
  }
  return { ...META_OAUTH, clientId: env.META_APP_ID, redirectUri };
}

integrationsRouter.get("/", requireVenueAccess, async (req, res) => {
  const venueId = resolveVenueId(req)!;
  const connections = await prisma.channelConnection.findMany({
    where: { businessId: venueId },
    // Tokens bewusst NICHT ausliefern.
    select: { provider: true, accountId: true, status: true, expiresAt: true, scopes: true },
  });
  res.json(connections);
});

integrationsRouter.get("/:provider/connect", requireVenueAccess, (req, res) => {
  const provider = req.params.provider as ProviderId;
  if (provider !== "google" && provider !== "meta") return res.status(400).json({ error: "Unbekannter Anbieter" });
  const venueId = resolveVenueId(req)!;
  const config = oauthConfig(provider);
  const state = createState(venueId, provider);
  res.json({ url: connectors[provider].buildAuthorizationUrl(config, state) });
});

/**
 * OAuth-Rücksprung: state prüfen (CSRF), Code→Token serverseitig, verschlüsselt speichern.
 * Bewusst am `publicRouter` (ohne requireAuth) - der Provider-Redirect trägt keinen
 * App-Token; die Absicherung leistet der signierte `state`.
 */
publicRouter.get("/integrations/:provider/callback", async (req, res) => {
  const provider = req.params.provider as ProviderId;
  const code = String(req.query.code ?? "");
  const stateRaw = String(req.query.state ?? "");
  try {
    const state = verifyState(stateRaw);
    if (state.provider !== provider) throw new Error("Provider passt nicht zum state");
    if (!code) throw new Error("Kein code");

    const tokens = await exchangeCode(provider, code);
    await prisma.channelConnection.upsert({
      where: { businessId_provider: { businessId: state.businessId, provider: provider === "google" ? "GOOGLE" : "META" } },
      create: {
        businessId: state.businessId,
        provider: provider === "google" ? "GOOGLE" : "META",
        accountId: tokens.accountId,
        encAccessToken: encryptToken(tokens.accessToken),
        encRefreshToken: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
        expiresAt: new Date(tokens.expiresAt),
        scopes: tokens.scopes,
      },
      update: {
        accountId: tokens.accountId,
        encAccessToken: encryptToken(tokens.accessToken),
        encRefreshToken: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
        expiresAt: new Date(tokens.expiresAt),
        scopes: tokens.scopes,
        status: "ACTIVE",
      },
    });
    // Zurück in die App (Deep-Link), Tokens tauchen nie im Redirect auf.
    return res.redirect(`${maitrEnv().MAITR_APP_DEEP_LINK}?provider=${provider}&status=connected`);
  } catch (err) {
    console.error("[maitr] OAuth-Callback fehlgeschlagen:", (err as Error).message);
    return res.redirect(`${maitrEnv().MAITR_APP_DEEP_LINK}?provider=${provider}&status=error`);
  }
});

interface ExchangedTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  accountId: string;
  scopes: string[];
}

const fetchLike: FetchLike = async (url, init) => {
  const res = await fetch(url, init);
  return { ok: res.ok, status: res.status, json: () => res.json() };
};

/** Confidential-Client-Token-Tausch (client_secret serverseitig, nie im Client). */
async function exchangeCode(provider: ProviderId, code: string): Promise<ExchangedTokens> {
  const env = maitrEnv();
  const config = oauthConfig(provider);
  if (provider === "google") {
    const body = new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    });
    const res = await fetchLike(config.tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) throw new Error(`Google Token HTTP ${res.status}`);
    const t = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };
    return {
      accessToken: t.access_token,
      refreshToken: t.refresh_token,
      expiresAt: Date.now() + t.expires_in * 1000,
      accountId: await resolveAccountId("google", t.access_token),
      scopes: config.scopes,
    };
  }

  // Meta: kurzlebiges User-Token holen, dann gegen ein langlebiges (~60 Tage) tauschen.
  // Secrets/Code gehören in den POST-Body, NIE in die Query (sonst in Access-/Proxy-Logs).
  const form = { "Content-Type": "application/x-www-form-urlencoded" };
  const shortRes = await fetchLike(config.tokenEndpoint, {
    method: "POST",
    headers: form,
    body: new URLSearchParams({
      client_id: env.META_APP_ID,
      client_secret: env.META_APP_SECRET,
      redirect_uri: config.redirectUri,
      code,
    }).toString(),
  });
  if (!shortRes.ok) throw new Error(`Meta Token HTTP ${shortRes.status}`);
  const shortTok = (await shortRes.json()) as { access_token: string };

  const longRes = await fetchLike(config.tokenEndpoint, {
    method: "POST",
    headers: form,
    body: new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: env.META_APP_ID,
      client_secret: env.META_APP_SECRET,
      fb_exchange_token: shortTok.access_token,
    }).toString(),
  });
  if (!longRes.ok) throw new Error(`Meta Long-Lived HTTP ${longRes.status}`);
  const longTok = (await longRes.json()) as { access_token: string; expires_in?: number };

  return {
    accessToken: longTok.access_token,
    expiresAt: Date.now() + (longTok.expires_in ?? 60 * 24 * 3600) * 1000,
    accountId: await resolveAccountId("meta", longTok.access_token),
    scopes: config.scopes,
  };
}

/**
 * Löst die anbieterspezifische Konto-/Standortkennung auf - ohne sie ist kein Sync
 * möglich (die Connectors bauen ihre URLs damit). Token stets im Header, nie in der
 * Query.
 */
async function resolveAccountId(provider: ProviderId, accessToken: string): Promise<string> {
  const auth = { Authorization: `Bearer ${accessToken}` };
  if (provider === "google") {
    // 1) erstes Business-Konto, 2) erster Standort → "accounts/…/locations/…"
    const accRes = await fetchLike("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", { headers: auth });
    if (!accRes.ok) throw new Error(`Google accounts HTTP ${accRes.status}`);
    const account = ((await accRes.json()) as { accounts?: { name: string }[] }).accounts?.[0]?.name;
    if (!account) throw new Error("Kein Google-Business-Konto gefunden");
    const locRes = await fetchLike(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${account}/locations?readMask=name`,
      { headers: auth },
    );
    if (!locRes.ok) throw new Error(`Google locations HTTP ${locRes.status}`);
    const location = ((await locRes.json()) as { locations?: { name: string }[] }).locations?.[0]?.name;
    if (!location) throw new Error("Kein Standort gefunden");
    return `${account}/${location}`;
  }
  // Meta: erste verwaltete Facebook-Seite → numerische Page-ID (passt zu assertMetaId).
  const pagesRes = await fetchLike("https://graph.facebook.com/v21.0/me/accounts", { headers: auth });
  if (!pagesRes.ok) throw new Error(`Meta pages HTTP ${pagesRes.status}`);
  const pageId = ((await pagesRes.json()) as { data?: { id: string }[] }).data?.[0]?.id;
  if (!pageId) throw new Error("Keine Facebook-Seite gefunden");
  return pageId;
}
