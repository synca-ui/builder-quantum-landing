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
import type { Reservation as ApiReservation } from "@maitr/core/types";
import { prisma } from "../db/prisma";
import { requireVenueAccess, validateBody } from "./middleware";
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
  const venueId = (req as typeof req & { venueId?: string }).venueId!;
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
  const { guestName, partySize, start, phone } = req.body as z.infer<typeof createReservationSchema>;

  // AUSSCHLIESSLICH die von requireVenueAccess geprüfte Kennung verwenden, niemals
  // die aus dem Rumpf. Genau daran lag die Lücke: Die Middleware prüfte die
  // Mitgliedschaft für die Query-Kennung, geschrieben wurde die Body-Kennung — ein
  // Mitglied von Betrieb A konnte so in den fremden Betrieb B schreiben. Seit
  // resolveVenue widersprüchliche Quellen mit 400 abweist, kann das nicht mehr
  // auseinanderfallen; der Zugriff hier auf req.venueId hält es auch dann dicht,
  // wenn jemand die Auflösung später wieder lockert.
  const venueId = (req as typeof req & { venueId?: string }).venueId!;

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

/**
 * Nur die Felder, die die API-Form braucht. Bewusst strukturell beschrieben statt
 * aus `@prisma/client` importiert, damit der Mapper auch ohne generierten Client
 * (und in Tests mit einfachen Objekten) typprüfbar bleibt.
 */
interface ReservationRow {
  id: string;
  guestName: string;
  guestCount: number;
  guestPhone: string | null;
  reservationTime: Date;
  duration: number;
  status: string;
  source: string;
}

/** Prisma-`ReservationStatus` → Status des API-Vertrags (`@maitr/core/types`). */
const API_STATUS: Record<string, ApiReservation["status"]> = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  ARRIVED: "confirmed",
  COMPLETED: "confirmed",
  CANCELLED: "cancelled",
  NO_SHOW: "cancelled",
};

/**
 * DB-Zeile → die Form, die `@maitr/core/types#Reservation` verspricht.
 *
 * Die beiden Modelle decken sich nicht: Die DB kennt `guestCount` und eine Dauer
 * in Minuten, der Vertrag `partySize` und ein Ende; der Prisma-Enum kennt kein
 * WALK_IN, der Vertrag dafür keinen Sitz-/Abschlusszustand. Diese Übersetzung
 * gehört deshalb an genau eine Stelle - sonst rät jeder Handler neu.
 */
function toApiReservation(r: ReservationRow): ApiReservation {
  // Reihenfolge mit Absicht: Eine Stornierung schlägt die Quelle. Sonst sähe ein
  // stornierter Walk-in im Client weiterhin nach belegtem Tisch aus.
  const status: ApiReservation["status"] =
    r.status === "CANCELLED" || r.status === "NO_SHOW"
      ? "cancelled"
      : r.source === "walk_in"
        ? "walk_in"
        : (API_STATUS[r.status] ?? "confirmed");

  return {
    id: r.id,
    guestName: r.guestName,
    partySize: r.guestCount,
    start: r.reservationTime.toISOString(),
    end: new Date(r.reservationTime.getTime() + r.duration * 60_000).toISOString(),
    status,
    phone: r.guestPhone ?? undefined,
  };
}

const walkInSchema = z.object({
  venueId: z.string().min(1),
  tableId: z.string().min(1),
  partySize: z.number().int().min(1).max(50),
  /** Walk-ins kommen ohne Namen an die Tür; der Client schickt keinen. */
  guestName: z.string().min(1).max(120).optional(),
});

reservationsRouter.post("/walk-in", requireVenueAccess, validateBody(walkInSchema), async (req, res) => {
  const { tableId, partySize, guestName } = req.body as z.infer<typeof walkInSchema>;

  // Wie bei POST / : die geprüfte Kennung, nie die aus dem Rumpf.
  const venueId = (req as typeof req & { venueId?: string }).venueId!;

  // Der Tisch muss DIESEM Betrieb gehören. Ohne die Prüfung könnte ein Mitglied von
  // Betrieb A einen Walk-in an einen Tisch von Betrieb B hängen: Die Zeile trüge
  // zwar businessId A (der Filter oben hält), der Fremdschlüssel zeigte aber in den
  // Tischplan von B - B bekäme eine Belegung, die er weder angelegt hat noch über
  // seine eigenen Routen wieder los wird. Der Filter auf businessId macht fremde
  // Tisch-IDs zugleich ununterscheidbar von nicht existierenden.
  const table = await prisma.table.findFirst({
    where: { id: tableId, businessId: venueId },
    select: { id: true },
  });
  if (!table) return res.status(404).json({ error: "Tisch nicht gefunden" });

  const reservation = await prisma.reservation.create({
    data: {
      businessId: venueId,
      tableId: table.id,
      // Ein Walk-in sitzt bereits: Zeitpunkt ist jetzt, Status ARRIVED (nicht
      // PENDING - es gibt nichts mehr zu bestätigen).
      guestName: guestName ?? "Walk-in",
      guestCount: partySize,
      reservationTime: new Date(),
      status: "ARRIVED",
      // dataset.ts bildet alles ausser "maitr"/"google" auf "walk_in" ab; explizit
      // gesetzt, damit die Auswertung Walk-ins nicht als Online-Buchung zählt.
      source: "walk_in",
    },
  });
  return res.status(201).json(toApiReservation(reservation));
});

/**
 * Stornierung. Antwortet mit 204 (kein Rumpf), wie der Client-Vertrag es erwartet.
 *
 * WICHTIG - zwei bewusste Entscheidungen:
 *
 * 1) Es wird nicht gelöscht, sondern auf CANCELLED gesetzt. Der Client nennt die
 *    Funktion `cancel`, und die Auswertung braucht die Zeile: `dataset.ts` bildet
 *    CANCELLED auf "cancelled" ab, der Insights-Motor rechnet Stornoquote und
 *    No-Shows daraus. Ein echtes DELETE würde diese Zahlen still verfälschen und
 *    wäre nicht rückholbar.
 *
 * 2) Die Zugehörigkeit ist Teil der WHERE-Klausel, nicht ein Schritt davor. Ein
 *    `findUnique` + anschliessendes `update` liesse sich beim nächsten Umbau
 *    trennen; hier kann der Schreibzugriff die Bedingung `businessId = venueId`
 *    gar nicht verlieren. Trifft er nichts, war die ID fremd oder unbekannt -
 *    beides beantwortet 404, damit fremde Reservierungs-IDs nicht bestätigt werden.
 */
reservationsRouter.delete("/:reservationId", requireVenueAccess, async (req, res) => {
  const venueId = (req as typeof req & { venueId?: string }).venueId!;
  // Wie bei `req.query.date` in GET /day: Express typisiert Parameter nicht als
  // blossen String, deshalb erst festklopfen, bevor der Wert in die Abfrage geht.
  const reservationId = String(req.params.reservationId ?? "");

  const { count } = await prisma.reservation.updateMany({
    where: { id: reservationId, businessId: venueId },
    data: { status: "CANCELLED" },
  });
  if (count === 0) return res.status(404).json({ error: "Reservierung nicht gefunden" });
  return res.status(204).end();
});

/* ── Tagesbriefing (die drei Entscheidungen) ─────────────────────────────── */

export const briefingRouter = Router();

/**
 * NICHT vorhanden - und zwar mit Absicht: `POST /briefing/tasks/:id/approve` und
 * `PATCH /briefing/tasks/:id` (beide in `packages/core/src/api/index.ts` aufgerufen).
 *
 * Es gibt nichts, worauf sie schreiben könnten. Aufgaben sind kein gespeicherter
 * Datensatz: `computeBriefing` erzeugt sie bei jedem Aufruf neu aus `buildInsights`,
 * die IDs sind abgeleitete Zeichenketten (`review_<id>`, `profile_<hebel>`) und
 * verschwinden, sobald die zugrunde liegende Bewertung beantwortet ist. In
 * `prisma/schema.prisma` existiert kein Aufgaben-Modell, und `insightToTask` füllt
 * `draft` nicht einmal - es gibt also weder einen Entwurf zum Ändern noch einen
 * Zustand zum Freigeben. Der `InsightsCache` taugt dafür nicht: Er wird nach 15
 * Minuten und von jedem Sync-Lauf überschrieben; eine dort hinterlegte Freigabe
 * wäre beim nächsten Rechnen weg.
 *
 * Ein ehrlicher Bau braucht zuerst (a) ein persistentes Modell für Aufgabe +
 * Entwurf + Freigabezustand und (b) einen Veröffentlichungsweg - `ChannelConnector`
 * kann heute nur `fetchReviews`/`fetchEngagement`, also lesen. Solange beides fehlt,
 * wäre jede Route hier eine Attrappe, die dem Betrieb eine erledigte Freigabe
 * vorspielt, die nie bei Google oder Meta ankommt.
 */

/** Frische-Fenster des Insights-Caches: darunter wird nicht neu gerechnet. */
const CACHE_TTL_MS = 15 * 60_000;

briefingRouter.get("/today", requireVenueAccess, async (req, res) => {
  const venueId = (req as typeof req & { venueId?: string }).venueId!;

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
  const venueId = (req as typeof req & { venueId?: string }).venueId!;
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
  const venueId = (req as typeof req & { venueId?: string }).venueId!;
  const config = oauthConfig(provider);
  const state = createState(venueId, provider, req.userId!);
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

    // Mitgliedschaft ERNEUT prüfen, nicht nur beim Start des Flows. Zwischen
    // /connect und dem Rücksprung liegen bis zu zehn Minuten; wer in dieser Zeit
    // aus dem Betrieb entfernt wurde, darf keine offene Autorisierungs-URL mehr
    // einlösen. Der Rücksprung selbst trägt keinen App-Token — deshalb steht der
    // Auslöser im signierten state und wird hier gegen BusinessMember gehalten.
    const membership = await prisma.businessMember.findUnique({
      where: { userId_businessId: { userId: state.userId, businessId: state.businessId } },
    });
    if (!membership) throw new Error("Auslöser ist nicht (mehr) Mitglied des Betriebs");

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
