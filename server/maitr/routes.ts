/**
 * Maitr-API-Routen. Halten sich an den Vertrag aus `@maitr/core/api`
 * (venue-scoped, hinter requireAuth + requireVenueAccess; `public` ohne Auth).
 *
 * Kernidee: die Analytik läuft NICHT hier, sondern in `@maitr/core/analytics` -
 * der Server assembliert nur das Dataset und ruft dieselben reinen Funktionen wie
 * die Demo. Kein doppelter Code, kein Auseinanderlaufen.
 */
import { Router, type Request, type RequestHandler, type Response } from "express";
import { z } from "zod";
import { connectors, GOOGLE_OAUTH, META_OAUTH } from "@maitr/core/integrations";
import type { FetchLike, OAuthConfig, ProviderId } from "@maitr/core/integrations";
import type {
  DailyTask,
  OpeningHours,
  Reservation as ApiReservation,
  Venue,
} from "@maitr/core/types";
import { Prisma } from "@prisma/client";
import { nextSubdomainCandidate, suggestSubdomain } from "../../shared/subdomain";
import { prisma } from "../db/prisma";
import {
  sendReservationConfirmation,
  sendReservationDeclined,
} from "../utils/email";
import {
  requireVenueAccess,
  resolveVenue,
  validateBody,
  type VenueRequest,
  type VenueRolle,
} from "./middleware";
// StrictOpeningHoursSchema (server/schemas/configuration.ts) ist die enge Form
// neben dem losen OpeningHoursSchema des Konfigurators - hier wiederverwendet
// statt ein zweites Mal geschrieben (Grundsatz: erweitern, nicht duplizieren).
// Business.openingHours ist die Wahrheit für App und öffentliches Gastprofil;
// die lose Form des Konfigurators wäre hier eine Lücke, kein Feinschliff.
import { StrictOpeningHoursSchema } from "../schemas/configuration";
import {
  computeBriefing,
  computeTasks,
  REOPEN_AFTER_MS,
  toApiState,
  type TaskDecisionRow,
} from "./briefing";
import { createState, encryptToken, verifyState } from "./security";
import { maitrEnv } from "./env";
import { asyncHandler, type AsyncRequestHandler } from "./asyncHandler";
import {
  ganzzahl,
  gastAnonymisieren,
  istFehlendeLoyaltyTabelle,
  istKartenFilter,
  karteAusgeben,
  karteEntwerten,
  kartenDetail,
  kartenEreignisse,
  kartenListe,
  praemieEinloesen,
  programAendern,
  programAnlegen,
  programLesen,
  SEITE_MAX,
  SEITE_VORGABE,
  stempelSetzen,
  uebersicht,
  VERLAUF_MAX,
  VERLAUF_VORGABE,
  type BuchungsErgebnis,
} from "./stempelkarte";
import {
  STAMPCARD_LINK_SECRET,
  gastKartenToken,
} from "../routes/publicStampcards";
import { istExpoPushToken } from "../services/push";
import { passUpdatePushen } from "../wallet/update";

const DAY_MS = 86_400_000;

/**
 * `requireVenueAccess` ist selbst eine async-Middleware mit einer Prisma-Abfrage
 * und hat damit exakt dasselbe Problem wie die Handler: Faellt die Datenbank aus,
 * lehnt ihr Promise ab und Express 4 bekommt davon nichts mit. Sie liegt in
 * `middleware.ts` und wird auch anderswo verwendet — deshalb wird sie hier am
 * Verwendungsort umschlossen statt dort umgeschrieben. Alle Routen unten binden
 * `venueGuard` ein, nie `requireVenueAccess` direkt.
 */
const venueGuard = asyncHandler(requireVenueAccess);

/* ── Betriebe ────────────────────────────────────────────────────────────── */

export const venuesRouter = Router();

/**
 * Nur die Felder, die die API-Form braucht - wie `ReservationRow` weiter unten
 * bewusst strukturell beschrieben statt aus `@prisma/client` importiert (der Client
 * ist hier nicht generiert; siehe `node_modules/.prisma` fehlt).
 */
interface VenueRow {
  id: string;
  name: string;
  tagline: string | null;
  timezone: string;
  tags: string[];
  /**
   * Kommt aus Prisma als `Json` - zur Laufzeit UNBEKANNT getippt, nicht ungeprüft
   * `any`. `geprüfteOeffnungszeiten` unten prüft die Form, bevor sie an den Client
   * geht; eine kaputte oder fremd geformte Zeile darf ihn nicht sprengen.
   */
  openingHours?: unknown;
}

/**
 * Prüft, ob der DB-Wert die Form aus `@maitr/core/types#OpeningHours` hat - DAYS
 * und die Tageseintrag-Union `DayHours` sind dort definiert (Begründung über der
 * Definition in `packages/core/src/types/index.ts`). Das schließt die dort
 * dokumentierte Tagesschlüssel-Regel ein (nur "monday" … "sunday", klein
 * geschrieben): `server/schemas/configuration.ts#StrictOpeningHoursSchema`
 * erzwingt sie über eine Allowlist, nicht nur die Form der Werte. Dieselbe enge
 * Form validiert bereits `PATCH /venues/:venueId` weiter unten - hier
 * wiederverwendet statt ein zweites Mal geschrieben. Fehlt die Spalte, ist sie
 * falsch geformt, oder stammt die Zeile noch aus der Zeit vor dieser Schranke
 * (z. B. `{"Mo": "9-17"}`), liefert die Funktion `undefined` - eine solche
 * Altzeile darf keinen Client erreichen, auch nicht über den unangemeldeten
 * öffentlichen Weg. Ein Fehler darf aber nie still sein: passt die Spalte nicht,
 * obwohl sie einen Wert trägt, warnt die Funktion - sonst sieht der Inhaber nur
 * "keine Öffnungszeiten" ohne jeden Hinweis, warum.
 */
function geprüfteOeffnungszeiten(
  wert: unknown,
  betriebId: string,
): OpeningHours | undefined {
  const ergebnis = StrictOpeningHoursSchema.safeParse(wert);
  if (!ergebnis.success && wert != null) {
    // Ohne den Inhalt der Spalte selbst zu loggen - er kann laut Kommentar oben
    // mehrere hunderttausend Byte groß sein (gemessen: 509 023 Byte in einer Zeile).
    console.warn(
      `[maitr] Öffnungszeiten von Betrieb ${betriebId} verworfen: Spalte entspricht nicht StrictOpeningHoursSchema`,
    );
  }
  // Der Cast korrigiert nur die TYPANGABE: `safeParse` hat die Form zur Laufzeit
  // bereits geprüft, aber die in diesem Repo installierte Zod-Version leitet die
  // Objektfelder von z.object() (unabhängig von dieser Stelle, betrifft jedes
  // z.object() im Baum) als optional statt als Pflichtfelder ab.
  return ergebnis.success ? (ergebnis.data as OpeningHours) : undefined;
}

/**
 * DB-Zeile → `@maitr/core/types#Venue`. An genau einer Stelle, damit die Liste
 * (GET /venues), das öffentliche Profil, das Anlegen und das Ändern dieselbe Form
 * liefern - sonst bekommt der Client je nach Endpunkt ein anderes Objekt für
 * dieselbe Sache.
 *
 * ACHTUNG: Diese Funktion bedient AUCH `GET /venues/:slug/public` - eine Route OHNE
 * Anmeldung (siehe die Warnung bei `Business.postalCode` in `prisma/schema.prisma`).
 * Die Allowlist bleibt deshalb eine Allowlist; `openingHours` kommt bewusst dazu,
 * weil Öffnungszeiten ihrem Wesen nach öffentlich sind - sie stehen bei Google.
 * NICHT bei der veröffentlichten Web-App: Die speist sich aus
 * `Configuration.content.openingHours` (server/routes/subdomains.ts,
 * server/routes/webapps.ts) und wird von `Business.openingHours` überhaupt nicht
 * berührt. `Business.openingHours` ist stattdessen die Wahrheit für die
 * Maitr-Oberflächen - die App und dieses öffentliche Gastprofil. Im Code lesen
 * genau zwei Stellen die rohe Spalte: diese Funktion hier (über
 * `geprüfteOeffnungszeiten`, mit Formprüfung) und `server/routes/admin.ts:256`
 * (`!!business.openingHours`, ein blosses Häkchen im Admin-SEO-Bericht - ob die
 * Spalte gesetzt ist, nicht ob sie gültig ist). Postleitzahl und Koordinaten
 * gehören NICHT hierher.
 */
function toApiVenue(b: VenueRow): Venue {
  return {
    id: b.id,
    name: b.name,
    tagline: b.tagline ?? undefined,
    timezone: b.timezone,
    tags: b.tags,
    openingHours: geprüfteOeffnungszeiten(b.openingHours, b.id),
  };
}

venuesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const memberships = await prisma.businessMember.findMany({
      where: { userId: req.userId! },
      include: { business: true },
    });
    res.json(memberships.map((m) => toApiVenue(m.business)));
  }),
);

/* ── Den ersten eigenen Betrieb anlegen ──────────────────────────────────── */

/**
 * Eingabe des Onboardings. Bewusst schmal gehalten: Pflicht ist nur der Name. Jedes
 * zusätzliche Pflichtfeld ist eine weitere Abbruchstelle in genau dem Schritt, der
 * zwischen "angemeldet" und "nutzbar" liegt - Zeitzone und Beschreibung kann der
 * Betrieb später im Profil nachziehen, einen Betrieb zu haben kann er nicht.
 */
const createVenueSchema = z.object({
  name: z.string().trim().min(2).max(120),
  /**
   * IANA-Zone ("Europe/Berlin"). Wird geprüft, weil sie danach JEDE Tageslogik trägt
   * (Briefing, Servicetag, Auswertung). Ungeprüft landet ein Tippfehler dauerhaft in
   * der Zeile und fällt erst später bei jeder einzelnen Berechnung auf - dann aber
   * an einer Stelle, die mit der Eingabe nichts mehr zu tun hat.
   */
  timezone: z
    .string()
    .min(1)
    .max(64)
    .refine(istBekannteZeitzone, { message: "Unbekannte Zeitzone" })
    .optional(),
  description: z.string().trim().max(2000).optional(),
});

/** `Intl` wirft bei unbekannter Zone einen RangeError - das ist die Prüfung. */
function istBekannteZeitzone(wert: string): boolean {
  try {
    new Intl.DateTimeFormat("de-DE", { timeZone: wert });
    return true;
  } catch {
    return false;
  }
}

/**
 * Der Ausschnitt der Transaktion, den dieser Endpunkt benutzt. Von Hand beschrieben,
 * weil der Prisma-Client in diesem Baum nicht generiert ist - so bleibt trotzdem
 * geprüft, WAS in der Transaktion passieren darf.
 */
interface VenueTx {
  business: {
    create(args: { data: Record<string, unknown> }): Promise<VenueRow>;
  };
  businessMember: {
    findFirst(args: {
      where: { userId: string };
      include: { business: true };
    }): Promise<{ business: VenueRow } | null>;
    create(args: {
      data: { userId: string; businessId: string; role: "OWNER" };
    }): Promise<unknown>;
  };
}

/**
 * Wie oft ein anderer Kandidat für die Adresse probiert wird, bevor aufgegeben wird.
 * Endlich, damit ein häufiger Name ("Zur Post") nicht zu einer unbegrenzten Schleife
 * gegen die Datenbank wird.
 */
const MAX_SLUG_VERSUCHE = 10;

/**
 * Ist das die Unique-Verletzung auf `Business.slug`?
 *
 * Nur dann darf der nächste Adress-Kandidat probiert werden. Jede andere P2002 (etwa
 * auf `(userId, businessId)` in BusinessMember) bedeutet etwas anderes und muss
 * sichtbar scheitern, statt in der Schleife stumm die Adresse zu wechseln.
 *
 * Prisma meldet das Ziel je nach Treiber als Spaltenliste (`["slug"]`) oder als
 * Indexname (`"Business_slug_key"`) - deshalb wird auf das Vorkommen geprüft und
 * nicht auf Gleichheit.
 */
function istSlugKollision(err: unknown): boolean {
  const e = err as { code?: string; meta?: { target?: unknown } };
  if (e?.code !== "P2002") return false;
  const target = e.meta?.target;
  const beschreibung = Array.isArray(target) ? target.join(",") : String(target ?? "");
  return beschreibung.includes("slug");
}

/**
 * Ersten eigenen Betrieb anlegen - der fehlende Schritt zwischen Anmeldung und
 * eigenen Daten. Ohne ihn hat ein frisch angemeldeter Nutzer keine Mitgliedschaft,
 * und JEDE venue-gebundene Route antwortet ihm mit 403.
 *
 * BEWUSST NICHT hinter `venueGuard`: Der Guard verlangt eine Betriebskennung und
 * eine Mitgliedschaft - beides gibt es hier per Definition noch nicht. Die Schranke
 * ist `requireAuth` (in `index.ts` vor diesem Router gemountet); der Betrieb wird
 * ausschliesslich an `req.userId` gehängt, nie an eine Kennung aus der Anfrage.
 *
 * ZWEI DINGE, DIE HIER NICHT SCHIEFGEHEN DÜRFEN:
 *
 * 1) HALBER ZUSTAND. Business und BusinessMember entstehen in EINER Transaktion.
 *    Fiele die Mitgliedschaft aus, bliebe ein Betrieb ohne Mitglied zurück - an den
 *    kommt niemand mehr heran (jede Route prüft BusinessMember), und der Nutzer wird
 *    ihn auch nicht wieder los: es gibt keine Route zum Löschen eines Betriebs, nur
 *    die Kontolöschung räumt verwaiste Betriebe ab (server/routes/users.ts).
 *
 * 2) ZWEIMAL GETIPPT. Der Aufruf ist nicht idempotent - er legt an. Deshalb prüft er
 *    INNERHALB der Transaktion, ob der Nutzer schon Mitglied irgendeines Betriebs
 *    ist, und legt dann nichts an. Beim echten Doppeltipp laufen beide Anfragen mit
 *    DEMSELBEN Namen und damit derselben Adresse: Der Verlierer läuft in die
 *    Unique-Verletzung auf `slug`. Postgres lässt seinen INSERT dabei warten, bis der
 *    Gewinner committet hat - beim nächsten Schleifendurchlauf sieht er also dessen
 *    Mitgliedschaft und antwortet 409 statt einen zweiten Betrieb anzulegen. Offen
 *    bleibt allein der konstruierte Fall, dass derselbe Nutzer zeitgleich zwei
 *    VERSCHIEDENE Namen abschickt; das ist kein Doppeltipp mehr.
 *
 * WARUM KEIN ZWEITER BETRIEB (409 statt Anlegen):
 * Der Client kann heute genau einen. `mobile/src/features/start/StartScreen.tsx`
 * arbeitet auf einer festen Kennung, eine Betriebsauswahl gibt es nirgends. Schlimmer
 * noch: `taskVenueGuard` (unten) leitet die Kennung aus der EINEN Mitgliedschaft ab,
 * weil die App `approveTask`/`updateDraft` ohne Kennung ruft - bei mehr als einer
 * Mitgliedschaft antwortet er 400. Ein zweiter Betrieb würde also still den grünen
 * Knopf des ersten lahmlegen. Ablehnen ist zurücknehmbar (die Regel steht an einer
 * Stelle), ein angelegter Betrieb ist es nicht. Die Antwort trägt den vorhandenen
 * Betrieb mit, damit der Client daraus keine Sackgasse machen muss.
 */
venuesRouter.post(
  "/",
  validateBody(createVenueSchema),
  asyncHandler(async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Nicht angemeldet" });
    const userId = req.userId;
    const { name, timezone, description } = req.body as z.infer<typeof createVenueSchema>;

    // Die Adresse kommt aus den GEMEINSAMEN Regeln (shared/subdomain.ts), die auch
    // der Konfigurator und der Veröffentlichungspfad benutzen. Eine zweite
    // Slug-Logik hier hiesse: zwei Vorstellungen davon, was eine gültige Adresse ist.
    const basis = suggestSubdomain(name);
    if (!basis) {
      // Kein ableitbarer Name (zu kurz, nur Sonderzeichen, oder reserviert wie "demo").
      // Lieber ehrlich nachfragen als eine Adresse erfinden, die der Betrieb nie
      // gewählt hat und später nicht mehr ändern kann.
      return res.status(422).json({
        error:
          "Aus diesem Namen lässt sich keine Adresse ableiten. Bitte einen Namen mit " +
          "mindestens drei Buchstaben oder Ziffern wählen.",
      });
    }

    for (let versuch = 0; versuch < MAX_SLUG_VERSUCHE; versuch++) {
      const slug = nextSubdomainCandidate(basis, versuch);
      try {
        const ergebnis = await (prisma as unknown as {
          $transaction<T>(fn: (tx: VenueTx) => Promise<T>): Promise<T>;
        }).$transaction(async (tx) => {
          const bestehend = await tx.businessMember.findFirst({
            where: { userId },
            include: { business: true },
          });
          if (bestehend) return { venue: toApiVenue(bestehend.business), schonVorhanden: true };

          const business = await tx.business.create({
            data: {
              slug,
              name,
              // Nur setzen, was der Nutzer genannt hat - sonst überschreiben leere
              // Felder die Vorgaben aus dem Schema (timezone: "Europe/Berlin").
              ...(description ? { description } : {}),
              ...(timezone ? { timezone } : {}),
            },
          });
          // OWNER ausdrücklich: Die Vorgabe des Modells ist STAFF. Wer seinen Betrieb
          // anlegt, ist dessen Inhaber - alles andere wäre von Anfang an falsch.
          await tx.businessMember.create({
            data: { userId, businessId: business.id, role: "OWNER" },
          });
          return { venue: toApiVenue(business), schonVorhanden: false };
        });

        if (ergebnis.schonVorhanden) {
          return res.status(409).json({
            error: "Du hast bereits einen Betrieb.",
            venue: ergebnis.venue,
          });
        }
        return res.status(201).json(ergebnis.venue);
      } catch (err) {
        // Adresse vergeben → nächster Kandidat. Alles andere fliegt weiter an den
        // asyncHandler; die Transaktion ist dabei bereits zurückgerollt.
        if (!istSlugKollision(err)) throw err;
      }
    }

    return res.status(409).json({
      error:
        "Unter diesem Namen ist keine freie Adresse mehr zu finden. Bitte den Namen " +
        "leicht abwandeln.",
    });
  }),
);

/* ── Öffentliches Gastprofil (ohne Auth) ─────────────────────────────────── */

export const publicRouter = Router();

publicRouter.get(
  "/venues/:slug/public",
  asyncHandler(async (req, res) => {
    // Wie beim DELETE weiter unten: Express typisiert Pfadparameter nicht als
    // blossen String, deshalb erst festklopfen, bevor der Wert in die Abfrage geht.
    const slug = String(req.params.slug ?? "");
    const business = await prisma.business.findUnique({ where: { slug } });
    if (!business) return res.status(404).json({ error: "Nicht gefunden" });
    // Dieselbe Abbildung wie in GET /venues - siehe toApiVenue.
    return res.json(toApiVenue(business));
  }),
);

/* ── Reservierungen ──────────────────────────────────────────────────────── */

/**
 * Push-Registrierung der Betreiber-App.
 *
 * USER-scoped, bewusst ohne venueGuard: Das Token gehört dem Gerät/Konto,
 * nicht einem Betrieb — welcher Betrieb ein Ereignis auslöst, entscheidet
 * der Versand (server/services/push.ts) zur Sendezeit über die
 * Mitgliedschaften. Upsert über das unique Token: meldet sich auf einem
 * Gerät ein anderes Konto an, wandert das Token mit, statt dass der
 * Vorgänger fremde Pushes bekommt.
 */
const pushTokenSchema = z.object({
  token: z.string().min(1).max(4096),
  platform: z.enum(["ios", "android"]).optional(),
});

export const pushRouter = Router();

pushRouter.post(
  "/register",
  validateBody(pushTokenSchema),
  asyncHandler(async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Nicht angemeldet" });
    const { token, platform } = req.body as z.infer<typeof pushTokenSchema>;
    if (!istExpoPushToken(token)) {
      return res.status(400).json({ error: "Kein gültiges Expo-Push-Token" });
    }
    await prisma.pushToken.upsert({
      where: { token },
      update: { userId, platform: platform ?? "unknown" },
      create: { userId, token, platform: platform ?? "unknown" },
    });
    return res.status(204).end();
  }),
);

pushRouter.post(
  "/unregister",
  validateBody(z.object({ token: z.string().min(1).max(4096) })),
  asyncHandler(async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Nicht angemeldet" });
    // Nur das EIGENE Token löschen — die userId in der WHERE-Klausel ist hier
    // dieselbe Disziplin wie businessId überall sonst in diesem Modul.
    await prisma.pushToken.deleteMany({
      where: { token: (req.body as { token: string }).token, userId },
    });
    return res.status(204).end();
  }),
);

export const reservationsRouter = Router();

reservationsRouter.get(
  "/day",
  venueGuard,
  asyncHandler(async (req, res) => {
    const venueId = (req as typeof req & { venueId?: string }).venueId!;
    const date = String(req.query.date ?? "");
    const start = new Date(date);
    if (Number.isNaN(start.getTime())) return res.status(400).json({ error: "Ungültiges Datum" });
    const end = new Date(start.getTime() + DAY_MS);

    const reservations = await prisma.reservation.findMany({
      where: { businessId: venueId, reservationTime: { gte: start, lt: end } },
      orderBy: { reservationTime: "asc" },
    });
    return res.json({ date, reservations });
  }),
);

const createReservationSchema = z.object({
  venueId: z.string().min(1),
  guestName: z.string().min(1).max(120),
  partySize: z.number().int().min(1).max(50),
  start: z.string().datetime(),
  phone: z.string().max(40).optional(),
});

reservationsRouter.post(
  "/",
  venueGuard,
  validateBody(createReservationSchema),
  asyncHandler(async (req, res) => {
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
    return res.status(201).json(reservation);
  }),
);

const statusSchema = z.object({
  venueId: z.string().min(1),
  status: z.enum(["confirmed", "cancelled"]),
});

/**
 * PATCH /reservations/:id/status — Bestätigen/Ablehnen aus der Maitr-App.
 *
 * Bisher konnte die App Reservierungen nur lesen und anlegen; der Betreiber
 * musste zum Bestätigen ins Web-Dashboard oder in die E-Mail. Gleiche Regeln
 * wie überall in diesem Modul: businessId aus req.venueId in der WHERE-Klausel
 * (Regel 2 aus stempelkarte.ts — die id im Pfad ist kein Geheimnis), und der
 * Gast bekommt dieselben Mails wie auf allen anderen Bestätigungswegen.
 */
reservationsRouter.patch(
  "/:id/status",
  venueGuard,
  validateBody(statusSchema),
  asyncHandler(async (req, res) => {
    const venueId = (req as typeof req & { venueId?: string }).venueId!;
    const id = String(req.params.id ?? "");
    const { status } = req.body as z.infer<typeof statusSchema>;

    const existing = await prisma.reservation.findFirst({
      where: { id, businessId: venueId },
      include: { business: { select: { name: true } } },
    });
    if (!existing) {
      return res.status(404).json({ error: "Reservierung nicht gefunden" });
    }
    if (["COMPLETED", "NO_SHOW"].includes(existing.status)) {
      return res
        .status(400)
        .json({ error: "Diese Reservierung ist bereits abgeschlossen." });
    }

    const zielStatus = status === "confirmed" ? "CONFIRMED" : "CANCELLED";
    const updated = await prisma.reservation.update({
      // where über die eindeutige id — die Zugehörigkeit ist oben bereits
      // venue-gescoped geprüft.
      where: { id },
      data: { status: zielStatus },
    });

    // Gast informieren — nur beim ECHTEN Übergang aus PENDING, nicht bei
    // idempotenten Wiederholungen.
    if (existing.status === "PENDING" && existing.guestEmail) {
      if (zielStatus === "CONFIRMED") {
        await sendReservationConfirmation(
          existing.guestEmail,
          existing.guestName,
          existing.id,
          existing.reservationTime,
          existing.guestCount,
          existing.business?.name ?? "dem Betrieb",
        );
      } else {
        await sendReservationDeclined(
          existing.guestEmail,
          existing.guestName,
          existing.reservationTime,
          existing.business?.name ?? "dem Betrieb",
        );
      }
    }

    return res.json(toApiReservation(updated));
  }),
);

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

reservationsRouter.post(
  "/walk-in",
  venueGuard,
  validateBody(walkInSchema),
  asyncHandler(async (req, res) => {
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
  }),
);

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
reservationsRouter.delete(
  "/:reservationId",
  venueGuard,
  asyncHandler(async (req, res) => {
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
  }),
);

/* ── Tagesbriefing (die drei Entscheidungen) ─────────────────────────────── */

export const briefingRouter = Router();

/** Frische-Fenster des Insights-Caches: darunter wird nicht neu gerechnet. */
const CACHE_TTL_MS = 15 * 60_000;

briefingRouter.get(
  "/today",
  venueGuard,
  asyncHandler(async (req, res) => {
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
  }),
);

/* ── Aufgaben-Entscheidungen (der grüne Knopf) ───────────────────────────── */

/**
 * Venue-Schranke der beiden Aufgaben-Endpunkte.
 *
 * WARUM NICHT EINFACH `venueGuard`
 * Der Client ruft `POST /briefing/tasks/:id/approve` OHNE Betriebskennung auf und
 * `PATCH /briefing/tasks/:id` nur mit `{ draft }` (packages/core/src/api/index.ts,
 * Zeilen 16 und 21). `requireVenueAccess` verlangt eine venueId in Pfad, Query oder
 * Rumpf und antwortete darauf ausnahmslos mit 400 - die Endpunkte wären für den
 * einzigen vorhandenen Aufrufer unbenutzbar, also genau die Attrappe, die hier
 * vermieden werden soll. Den Client-Vertrag zu ändern stand nicht zur Wahl.
 *
 * Deshalb: Nennt die Anfrage eine venueId, gilt UNVERÄNDERT die reguläre Prüfung
 * (inklusive Konflikt-400 und Mitgliedschaft). Nennt sie keine, wird sie NICHT
 * geraten, sondern aus den Mitgliedschaften des angemeldeten Nutzers abgeleitet -
 * und nur dann, wenn sie eindeutig ist. Das erweitert keine Rechte: Der Nutzer
 * bekommt ausschliesslich den Betrieb, in dem er nachweislich Mitglied ist. Bei
 * mehreren Mitgliedschaften wird abgelehnt statt gewählt; dann muss der Aufrufer
 * die Kennung mitschicken (`?venueId=…` funktioniert an beiden Routen).
 *
 * Die Handler unten lesen die Kennung ausschliesslich aus `req.venueId` - nie aus
 * Pfad, Query oder Rumpf.
 */
const taskVenueGuard = asyncHandler(async (req, res, next) => {
  const { venueId, conflict } = resolveVenue(req);
  if (conflict) {
    return res.status(400).json({ error: "Widersprüchliche venueId in Pfad, Query und Rumpf" });
  }
  // Kennung genannt → unveränderte reguläre Prüfung. Das Promise wird hier bewusst
  // zurückgegeben, damit eine Ablehnung (etwa ein Datenbankausfall in der Middleware)
  // im asyncHandler landet und nicht als unbehandelte Ablehnung endet.
  if (venueId) return requireVenueAccess(req, res, next);

  if (!req.userId) return res.status(401).json({ error: "Nicht angemeldet" });
  // `take: 2` genügt: Wir müssen nur "genau eine" von "mehr als eine" unterscheiden.
  const memberships = await prisma.businessMember.findMany({
    where: { userId: req.userId },
    select: { businessId: true },
    take: 2,
  });
  if (memberships.length === 0) return res.status(403).json({ error: "Kein Zugriff auf einen Betrieb" });
  if (memberships.length > 1) return res.status(400).json({ error: "venueId fehlt" });

  (req as typeof req & { venueId?: string }).venueId = memberships[0].businessId;
  return next();
});

/**
 * Form der Aufgabenkennung. Sie kommt aus `buildInsights` und besteht dort aus einem
 * Präfix plus UUID oder Schlüssel (`review_<uuid>`, `profile_photos`, `roi_month`).
 *
 * Die Prüfung ist der billige erste Riegel gegen Müll im Pfad; der eigentliche
 * Riegel ist die Existenzprüfung im Handler. Ohne beides legte jeder erfundene
 * String eine Zeile in `TaskDecision` an - eine Tabelle, die ein Fremder dann nach
 * Belieben füllen könnte.
 */
const TASK_ID_PATTERN = /^[A-Za-z0-9_-]{1,120}$/;

/**
 * Aufgabe aus dem Pfad auflösen. Antwortet mit `null`, wenn die Kennung heute keine
 * Aufgabe dieses Betriebs trägt - der Aufrufer macht daraus einen 404.
 *
 * WICHTIG: gesucht wird in den Aufgaben DES GEPRÜFTEN BETRIEBS. Eine Kennung aus
 * einem fremden Briefing findet hier nichts, selbst wenn sie stimmt. Damit ist auch
 * die Existenz fremder Aufgaben nicht am Antwortverhalten ablesbar.
 */
async function resolveTask(venueId: string, taskId: string, now: Date) {
  const tasks = await computeTasks(venueId, now);
  return tasks.find((t) => t.id === taskId) ?? null;
}

/**
 * Den Insights-Cache dieses Betriebs verwerfen.
 *
 * Ohne das bliebe die Freigabe bis zu 15 Minuten unsichtbar: `GET /briefing/today`
 * liefert innerhalb von `CACHE_TTL_MS` die gespeicherte Antwort aus - mit der
 * gerade freigegebenen Aufgabe darin. Der Betrieb drückt den grünen Knopf, kehrt
 * zum Startbildschirm zurück und sieht dieselbe Karte wieder. `deleteMany` statt
 * `delete`, damit ein fehlender Cache kein Fehler ist.
 */
async function invalidateBriefingCache(venueId: string): Promise<void> {
  await prisma.insightsCache.deleteMany({ where: { businessId: venueId } });
}

/** Aufgabe + Entscheidung → die Form, die `@maitr/core/types#DailyTask` verspricht. */
function withDecision(task: DailyTask, decision: TaskDecisionRow): DailyTask {
  return {
    ...task,
    draft: decision.draft ?? task.draft,
    state: toApiState(decision.state),
    decidedAt: decision.decidedAt?.toISOString(),
  };
}

/**
 * Aufgabe freigeben - die Handlung, um die das Produkt gebaut ist.
 *
 * Gespeichert wird die ENTSCHEIDUNG, nicht die Aufgabe (Begründung im Modell in
 * prisma/schema.prisma und in briefing.ts). Der Upsert auf `(businessId, taskId)`
 * macht den Aufruf idempotent: Zweimal Freigeben ist kein Fehler und erzeugt keine
 * zweite Zeile - was zählt, ist der Zustand danach.
 */
briefingRouter.post(
  "/tasks/:taskId/approve",
  taskVenueGuard,
  asyncHandler(async (req, res) => {
    const venueId = (req as typeof req & { venueId?: string }).venueId!;
    const taskId = String(req.params.taskId ?? "");
    if (!TASK_ID_PATTERN.test(taskId)) return res.status(400).json({ error: "Ungültige Aufgabenkennung" });

    const now = new Date();
    const task = await resolveTask(venueId, taskId, now);
    if (!task) return res.status(404).json({ error: "Aufgabe nicht gefunden" });

    // Wiedervorlage IMMER setzen, solange es keinen Veröffentlichungsweg gibt -
    // ausführlich begründet an REOPEN_AFTER_MS in briefing.ts.
    const reopenAt = new Date(now.getTime() + REOPEN_AFTER_MS);
    const entschieden = {
      state: "APPROVED" as const,
      decidedAt: now,
      decidedByUserId: req.userId!,
      reopenAt,
    };
    const decision: TaskDecisionRow = await prisma.taskDecision.upsert({
      where: { businessId_taskId: { businessId: venueId, taskId } },
      create: { businessId: venueId, taskId, ...entschieden },
      update: entschieden,
    });

    await invalidateBriefingCache(venueId);
    return res.json(withDecision(task, decision));
  }),
);

const draftSchema = z.object({ draft: z.string().min(1).max(4000) });

/**
 * Entwurf vor der Freigabe anpassen.
 *
 * Der Zustand bleibt dabei bewusst UNANGETASTET: Einen Text zu bearbeiten ist keine
 * Freigabe. Die Aufgabe bleibt offen und erscheint im nächsten Briefing weiter -
 * dann aber mit dem bearbeiteten Entwurf statt dem Vorschlag (`applyDecisions`).
 */
briefingRouter.patch(
  "/tasks/:taskId",
  taskVenueGuard,
  validateBody(draftSchema),
  asyncHandler(async (req, res) => {
    const venueId = (req as typeof req & { venueId?: string }).venueId!;
    const taskId = String(req.params.taskId ?? "");
    if (!TASK_ID_PATTERN.test(taskId)) return res.status(400).json({ error: "Ungültige Aufgabenkennung" });

    const { draft } = req.body as z.infer<typeof draftSchema>;
    const now = new Date();
    const task = await resolveTask(venueId, taskId, now);
    if (!task) return res.status(404).json({ error: "Aufgabe nicht gefunden" });

    const decision: TaskDecisionRow = await prisma.taskDecision.upsert({
      where: { businessId_taskId: { businessId: venueId, taskId } },
      create: { businessId: venueId, taskId, draft },
      update: { draft },
    });

    await invalidateBriefingCache(venueId);
    return res.json(withDecision(task, decision));
  }),
);

/* ── Stempelkarte (Einstellungen, Karten, Hauptbuch) ─────────────────────── */

export const loyaltyRouter = Router();

/**
 * Wie `asyncHandler`, plus die eine Antwort, die dieser Bereich zusätzlich braucht.
 *
 * Die Loyalty-Tabellen liegen als Migrationsdatei vor und sind nach heutigem Stand
 * NICHT eingespielt (prisma/migrations/20260805_add_loyalty_wallet_whatsapp, dazu
 * 20260806_add_stampcard_reward_snapshot). Bis ein Mensch das tut, antwortet Postgres
 * mit 42P01. Das ist ein bekannter, vorübergehender Zustand - er gehört als 503 mit
 * einem benennbaren Grund beantwortet, nicht als 500. Ein 500 sähe aus wie ein
 * Absturz, und der Bildschirm könnte den Unterschied nicht machen: er würde einen
 * "Erneut versuchen"-Knopf anbieten, der nie hilft.
 *
 * Nur für diesen Router. Alles andere fliegt unverändert an die Fehler-Middleware.
 */
function loyaltyHandler(handler: AsyncRequestHandler): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    try {
      return await handler(req, res, next);
    } catch (err) {
      if (!istFehlendeLoyaltyTabelle(err)) throw err;
      console.warn(
        `[maitr] Stempelkarte nicht eingerichtet (Migration eingespielt?) bei ` +
          `${req.method} ${req.originalUrl}: ${(err as Error).message}`,
      );
      return res.status(503).json({ error: "loyalty_nicht_eingerichtet" });
    }
  });
}

/** Die geprüfte Betriebskennung. Nie aus Query, Pfad oder Rumpf. */
function venueOf(req: Request): string {
  return (req as VenueRequest).venueId!;
}

/** Die geprüfte Rolle in diesem Betrieb. Kommt aus der Mitgliedschaft, nie aus der Anfrage. */
function rolleOf(req: Request): VenueRolle {
  return (req as VenueRequest).venueRolle ?? "STAFF";
}

/**
 * Nur der Inhaber.
 *
 * Die Rolle wird NICHT in `requireVenueAccess` erzwungen: dort hängen auch alle
 * Lesewege und das Stempeln, und beides muss das Personal können. Erzwungen wird sie
 * an genau den drei Zugriffen, die entweder eine Zusage an den Gast ändern oder
 * unumkehrbar sind.
 *
 * Vorher hing alles am blossen Wahrheitswert „Mitglied ja/nein". `BusinessMember.role`
 * hat den Vorgabewert STAFF, und eine Aushilfe konnte damit die Prämie auf „1x
 * Leitungswasser" setzen, die Ausgabe neuer Karten abschalten, Karten entwerten und
 * Gastdaten löschen - ohne Rollenriegel, ohne Log, ohne dass der Inhaber es erfährt.
 *
 * ADMIN ist mitgemeint: das ist die Plattformrolle, nicht eine Aushilfe.
 */
const ownerGuard: RequestHandler = (req, res, next) => {
  const rolle = rolleOf(req);
  if (rolle !== "OWNER" && rolle !== "ADMIN") {
    return res.status(403).json({ error: "nur_inhaber" });
  }
  return next();
};

/* ── Betriebe: Profil ändern ──────────────────────────────────────────────
 * Hängt an `venuesRouter` (wie GET / und POST / weiter oben), steht aber erst hier
 * im Modul: die Route braucht `ownerGuard`, und der ist ein `const` - eine Referenz
 * VOR seiner Zeile würde beim Laden des Moduls sofort mit "Cannot access
 * 'ownerGuard' before initialization" abstürzen, nicht erst bei der ersten Anfrage.
 */

/**
 * Die vier änderbaren Profilfelder - alle optional, mindestens eines nötig (siehe
 * `.refine` unten). `venueId` muss erlaubt bleiben: `resolveVenue` liest sie aus dem
 * Rumpf, und `validateBody` läuft danach (siehe die Begründung bei `programFelder`
 * unten).
 *
 * `name` und `timezone` übernehmen ihre Prüfung von `createVenueSchema` statt sie
 * ein zweites Mal zu schreiben - dieselbe Regel, die beim Anlegen gilt, soll auch
 * beim Ändern gelten.
 */
const patchVenueSchema = z
  .object({
    venueId: z.string().min(1).optional(),
    name: createVenueSchema.shape.name.optional(),
    /**
     * "" löscht die Tagline (→ null); ausgelassen (undefined) lässt sie unverändert.
     * Das Schema selbst lässt hier bewusst keinen `null`-Wert zu - die Umwandlung
     * geschieht erst im Handler, weil `""` für den Gast dieselbe Aussage trifft wie
     * gar keine Tagline.
     */
    tagline: z.string().trim().max(200).optional(),
    timezone: createVenueSchema.shape.timezone,
    /**
     * `server/schemas/configuration.ts#StrictOpeningHoursSchema` - die enge Form
     * für Business.openingHours (Tagesschlüssel aus `shared/suggestedConfig.ts#DAYS`),
     * NICHT das lose `OpeningHoursSchema` des Konfigurators. `null` löscht die
     * Öffnungszeiten, ausgelassen lässt sie unverändert; ein leeres Objekt `{}`
     * zählt beim Schreiben wie `null` (siehe unten im Handler).
     */
    openingHours: StrictOpeningHoursSchema.nullable().optional(),
  })
  .strict()
  .refine((b) => Object.keys(b).some((k) => k !== "venueId"), {
    message: "Keine Änderung angegeben",
  });

/**
 * PATCH /venues/:venueId - Profilfelder eines Betriebs ändern (nur Inhaber/Admin).
 *
 * Der SLUG wandert bewusst NICHT mit: er ist die veröffentlichte Adresse
 * (`GET /venues/:slug/public`, jede ausgelieferte Web-App verlinkt darauf). Ein
 * stiller Wechsel würde eine bereits veröffentlichte Adresse ins Leere laufen
 * lassen - dafür gibt es hier absichtlich keine Route.
 */
venuesRouter.patch(
  "/:venueId",
  venueGuard,
  // Ändert Angaben, die der Gast ausserhalb der App sieht (Name, Öffnungszeiten) -
  // dieselbe Kategorie wie die Programmänderungen unten: keine Aushilfen-Aufgabe.
  ownerGuard,
  validateBody(patchVenueSchema),
  asyncHandler(async (req, res) => {
    // AUSSCHLIESSLICH die von venueGuard geprüfte Kennung schreiben, niemals eine aus
    // dem Rumpf - siehe die Begründung bei POST /reservations weiter oben: Prüf- und
    // Schreibkennung dürfen nie auseinanderfallen.
    const venueId = venueOf(req);

    const { venueId: _ignoriert, tagline, openingHours, ...rest } =
      req.body as z.infer<typeof patchVenueSchema>;

    // Prisma ignoriert `undefined`-Felder in `data` (kein Schreibzugriff auf die
    // Spalte) - `name` und `timezone` können deshalb unverändert durchgereicht
    // werden. `tagline` und `openingHours` brauchen je eine eigene Zeile.
    const data: Record<string, unknown> = { ...rest };
    // "" löscht die Tagline (→ null); das Schema selbst lässt hier keinen
    // `null`-Wert zu, die Umwandlung geschieht erst hier.
    if (tagline !== undefined) {
      data.tagline = tagline === "" ? null : tagline;
    }
    if (openingHours !== undefined) {
      // Json-Spalten verlangen bei Prisma ein Sentinel statt eines blossen `null` -
      // ein einfaches `null` ist mehrdeutig zwischen SQL NULL und dem JSON-Literal
      // `null` (derselbe Fall wie `Prisma.DbNull` in server/routes/scraper.ts beim
      // Neustart eines Scraper-Jobs). DbNull ist hier richtig: die Spalte soll leer
      // sein, nicht ein JSON-"null" enthalten.
      //
      // `{}` zählt dabei wie `null`: beides sagt "keine Öffnungszeiten hinterlegt".
      // Ohne diese Gleichsetzung landete `openingHours: {}` als leeres JSON-Objekt
      // in der Spalte, während `openingHours: null` als Prisma.DbNull landete -
      // zwei Schreibweisen für dieselbe Aussage, die jeder Leser (App, öffentliches
      // Profil) dann unterscheiden müsste, obwohl keine der beiden Formen mehr
      // aussagt als die andere.
      const istLeer = openingHours === null || Object.keys(openingHours).length === 0;
      data.openingHours = istLeer ? Prisma.DbNull : openingHours;
    }

    const business = await prisma.business.update({ where: { id: venueId }, data });
    return res.json(toApiVenue(business));
  }),
);

/**
 * Die sechs Felder des Programms - und NUR sie.
 *
 * `.strict()` ist hier kein Feinschliff, sondern der Riegel: der geprüfte Rumpf geht
 * als `data`-Block in den Schreibzugriff. Ohne `.strict()` rutschte ein
 * mitgeschicktes `applePassTypeIdentifier` oder `googleClassId` direkt durch - und
 * das sind genau die zwei Werte, die das Schema ausdrücklich vom Betrieb fernhält
 * (falsche Pass Type ID = ein Pass, den keine Wallet kommentarlos öffnet; frei
 * gesetzte googleClassId = geänderte Darstellung auf ausgelieferten Karten FREMDER
 * Betriebe).
 *
 * `venueId` muss erlaubt bleiben: `resolveVenue` liest sie aus dem Rumpf, und
 * `validateBody` läuft danach.
 */
const programFelder = {
  name: z.string().trim().min(1).max(60),
  maxStamps: z.number().int().min(1).max(50),
  /**
   * 60 Zeichen, nicht mehr: der Text steht auf dem Wallet-Pass, und Wallet
   * schneidet Längeres kommentarlos ab - der Gast läse dann eine andere Zusage als
   * der Wirt eingegeben hat.
   */
  rewardText: z.string().trim().min(1).max(60),
  /** 0 = keine Sperre. Der Bildschirm bietet nur 1800/3600/14400/86400/0 an. */
  cooldownSeconds: z.number().int().min(0).max(86_400),
  validityDays: z.number().int().min(1).max(3650).nullable(),
  isActive: z.boolean(),
};

const createProgramSchema = z
  .object({ venueId: z.string().min(1), ...programFelder })
  .strict();

const patchProgramSchema = z
  .object({
    venueId: z.string().min(1).optional(),
    name: programFelder.name.optional(),
    maxStamps: programFelder.maxStamps.optional(),
    rewardText: programFelder.rewardText.optional(),
    cooldownSeconds: programFelder.cooldownSeconds.optional(),
    validityDays: programFelder.validityDays.optional(),
    isActive: programFelder.isActive.optional(),
  })
  .strict()
  .refine((b) => Object.keys(b).some((k) => k !== "venueId"), {
    message: "Keine Änderung angegeben",
  });

loyaltyRouter.get(
  "/program",
  venueGuard,
  loyaltyHandler(async (req, res) => {
    // Die Rolle geht MIT über die Grenze: sonst zeigt der Bildschirm die drei
    // Inhaber-Knöpfe auch der Aushilfe an und macht damit eine Zusage, die der
    // Server danach mit 403 bricht.
    return res.json(await programLesen(venueOf(req), rolleOf(req)));
  }),
);

loyaltyRouter.post(
  "/program",
  venueGuard,
  // Legt die Zusage an den Gast überhaupt erst fest - derselbe Vorgang wie PATCH,
  // nur beim ersten Mal. Wäre er offen, wäre der Rollenriegel am PATCH umgehbar,
  // solange es noch kein Programm gibt.
  ownerGuard,
  validateBody(createProgramSchema),
  loyaltyHandler(async (req, res) => {
    const { name, maxStamps, rewardText, cooldownSeconds, validityDays, isActive } =
      req.body as z.infer<typeof createProgramSchema>;
    const ergebnis = await programAnlegen(venueOf(req), {
      name,
      maxStamps,
      rewardText,
      cooldownSeconds,
      validityDays,
      isActive,
    });
    if (ergebnis.art !== "ok") {
      // Genau EIN Programm je Betrieb: es gibt keinen Scanpfad, der zwischen
      // mehreren wählen könnte. Das vorhandene wird mitgeliefert, damit ein
      // Doppeltipp keine Sackgasse ist.
      return res
        .status(409)
        .json({ error: "programm_existiert_bereits", program: ergebnis.program });
    }
    return res.status(201).json({ program: ergebnis.program });
  }),
);

loyaltyRouter.patch(
  "/program/:programId",
  venueGuard,
  // Ändert die Zusage an den Gast (rewardText) und kann die Ausgabe neuer Karten
  // abschalten. Nicht die Aufgabe einer Aushilfe.
  ownerGuard,
  validateBody(patchProgramSchema),
  loyaltyHandler(async (req, res) => {
    const { venueId: _ignoriert, ...aenderung } = req.body as z.infer<typeof patchProgramSchema>;
    const ergebnis = await programAendern(
      venueOf(req),
      String(req.params.programId ?? ""),
      aenderung,
    );
    if (ergebnis.art === "name_bereits_vergeben") {
      return res.status(409).json({ error: "name_bereits_vergeben" });
    }
    if (ergebnis.art !== "ok") {
      // Fremdes oder unbekanntes Programm - ununterscheidbar, mit Absicht.
      return res.status(404).json({ error: "programm_nicht_gefunden" });
    }
    return res.json({ program: ergebnis.program, wirkung: ergebnis.wirkung });
  }),
);

loyaltyRouter.get(
  "/program/:programId/overview",
  venueGuard,
  loyaltyHandler(async (req, res) => {
    const zahlen = await uebersicht(venueOf(req), String(req.params.programId ?? ""));
    if (!zahlen) return res.status(404).json({ error: "programm_nicht_gefunden" });
    return res.json(zahlen);
  }),
);

loyaltyRouter.get(
  "/program/:programId/cards",
  venueGuard,
  loyaltyHandler(async (req, res) => {
    const roh = req.query.filter;
    const filter = istKartenFilter(roh) ? roh : "alle";
    const seite = await kartenListe(venueOf(req), String(req.params.programId ?? ""), {
      filter,
      versatz: ganzzahl(req.query.cursor, 0, 0, 100_000),
      limit: ganzzahl(req.query.limit, SEITE_VORGABE, 1, SEITE_MAX),
    });
    if (!seite) return res.status(404).json({ error: "programm_nicht_gefunden" });
    return res.json(seite);
  }),
);

/**
 * GET /loyalty/cards/:cardId/gast-link — der teilbare Link fuer den Gast.
 *
 * Venue-gescoped wie alles hier: erst die Zugehoerigkeit der Karte pruefen,
 * dann die signierte URL bilden. Das Secret bleibt Server-seitig; die App
 * bekommt nur die fertige URL (fuer QR-Anzeige oder System-Teilen-Dialog).
 * Ohne Secret: 503 mit klarer Ansage statt eines Links, der nie oeffnet.
 */
loyaltyRouter.get(
  "/cards/:cardId/gast-link",
  venueGuard,
  asyncHandler(async (req, res) => {
    const venueId = (req as typeof req & { venueId?: string }).venueId!;
    const cardId = String(req.params.cardId ?? "");

    if (!STAMPCARD_LINK_SECRET) {
      return res.status(503).json({
        error:
          "Gast-Links sind nicht konfiguriert (STAMPCARD_LINK_SECRET fehlt).",
      });
    }

    const karte = await kartenDetail(venueId, cardId);
    if (!karte) {
      return res.status(404).json({ error: "Karte nicht gefunden" });
    }

    const basis = process.env.PUBLIC_URL || "https://www.maitr.de";
    const token = gastKartenToken(cardId, STAMPCARD_LINK_SECRET);
    return res.json({
      url: `${basis}/karte/${cardId}?t=${token}`,
    });
  }),
);

loyaltyRouter.get(
  "/cards/:cardId",
  venueGuard,
  loyaltyHandler(async (req, res) => {
    const karte = await kartenDetail(venueOf(req), String(req.params.cardId ?? ""));
    if (!karte) return res.status(404).json({ error: "karte_nicht_gefunden" });
    return res.json(karte);
  }),
);

loyaltyRouter.get(
  "/cards/:cardId/events",
  venueGuard,
  loyaltyHandler(async (req, res) => {
    const items = await kartenEreignisse(
      venueOf(req),
      String(req.params.cardId ?? ""),
      ganzzahl(req.query.limit, VERLAUF_VORGABE, 1, VERLAUF_MAX),
    );
    if (!items) return res.status(404).json({ error: "karte_nicht_gefunden" });
    return res.json({ items });
  }),
);

/* ── Stufe 2: damit überhaupt etwas in der Liste steht ───────────────────── */

/**
 * Karte ausgeben - entweder für einen bekannten Gast oder für einen neu erfassten.
 *
 * `guestId` UND `gast` zugleich wäre widersprüchlich und wird abgewiesen, statt sich
 * still für eines zu entscheiden - dasselbe Prinzip wie bei `resolveVenue`.
 */
const createCardSchema = z
  .object({
    venueId: z.string().min(1),
    guestId: z.string().min(1).optional(),
    gast: z
      .object({ name: z.string().trim().min(1).max(120), phone: z.string().trim().max(40).optional() })
      .strict()
      .optional(),
  })
  .strict()
  .refine((b) => Boolean(b.guestId) !== Boolean(b.gast), {
    message: "Entweder guestId oder gast angeben, nicht beides",
  });

const buchungSchema = z
  .object({
    venueId: z.string().min(1),
    /** Vorgangsschlüssel des Geräts. Wiederholung desselben Vorgangs ist Erfolg. */
    idempotencyKey: z.string().trim().min(8).max(120),
    note: z.string().trim().max(280).optional(),
    deviceLabel: z.string().trim().max(80).optional(),
  })
  .strict();

const voidSchema = z
  .object({ venueId: z.string().min(1), grund: z.string().trim().min(3).max(280) })
  .strict();

const venueOnlySchema = z.object({ venueId: z.string().min(1) }).strict();

/** Buchungsergebnis → HTTP. An einer Stelle, damit die drei Pfade nicht auseinanderlaufen. */

/**
 * Wallet-Paesse nach einer erfolgreichen Buchung anstossen — fire-and-forget,
 * NACH der Transaktion: ein APNs-Schluckauf rollt keinen Stempel zurueck.
 * Fachlogik (stempelkarte.ts) bleibt bewusst frei von Sendepfaden.
 */
function walletNachBuchung(ergebnis: { art: string }, cardId: string): void {
  if (ergebnis.art === "ok") {
    void passUpdatePushen(cardId).catch((err) =>
      console.error("[Wallet] Update-Push:", err),
    );
  }
}

function buchungAntwort(res: Response, ergebnis: BuchungsErgebnis): Response {
  switch (ergebnis.art) {
    case "ok":
      // Wiederholung ist ERFOLG, nicht 409: derselbe Vorgang zweimal geschickt
      // heisst, das erste Piepen ging unter. Was zählt, ist der Zustand danach.
      return res
        .status(200)
        .json({ karte: ergebnis.karte, wiederholung: ergebnis.wiederholung });
    case "nicht_gefunden":
      // Fremde oder unbekannte Karte - ununterscheidbar, mit Absicht.
      return res.status(404).json({ error: "karte_nicht_gefunden" });
    case "sperrfrist":
      // "Ein Stempel pro Besuch". `frueheste` sagt dem Bildschirm, ab wann wieder.
      return res.status(409).json({ error: "sperrfrist", frueheste: ergebnis.frueheste });
    case "karte_nicht_aktiv":
      return res.status(409).json({ error: "karte_nicht_aktiv", status: ergebnis.status });
    case "praemie_nicht_erreicht":
      return res.status(409).json({
        error: "praemie_nicht_erreicht",
        stand: ergebnis.stand,
        benoetigt: ergebnis.benoetigt,
      });
    default:
      // karte_abgelaufen | konflikt. Bei `konflikt` darf der Aufrufer denselben
      // Vorgangsschlüssel schlicht wiederholen - die optimistische Sperre hat
      // gegriffen, gebucht wurde nichts.
      return res.status(409).json({ error: ergebnis.art });
  }
}

loyaltyRouter.post(
  "/cards",
  venueGuard,
  validateBody(createCardSchema),
  loyaltyHandler(async (req, res) => {
    const { guestId, gast } = req.body as z.infer<typeof createCardSchema>;
    const ergebnis = await karteAusgeben(venueOf(req), {
      guestId,
      // Zod hat den Namen bereits als Pflichtfeld geprüft; ohne strictNullChecks
      // führt `z.infer` ihn trotzdem als optional. Deshalb hier einmal festklopfen.
      gast: gast ? { name: String(gast.name), phone: gast.phone } : undefined,
    });
    if (ergebnis.art === "gast_nicht_gefunden") {
      return res.status(404).json({ error: "gast_nicht_gefunden" });
    }
    if (ergebnis.art === "karte_laeuft_bereits") {
      // Der Gast sammelt schon. Die laufende Karte kommt mit, damit der Bildschirm
      // sie öffnen kann, statt in einer Fehlermeldung zu enden.
      return res
        .status(409)
        .json({ error: "karte_laeuft_bereits", kartenId: ergebnis.kartenId });
    }
    if (ergebnis.art !== "ok") return res.status(409).json({ error: ergebnis.art });
    return res.status(201).json({ karte: ergebnis.karte });
  }),
);

loyaltyRouter.post(
  "/cards/:cardId/stamps",
  venueGuard,
  validateBody(buchungSchema),
  loyaltyHandler(async (req, res) => {
    const { idempotencyKey, note, deviceLabel } = req.body as z.infer<typeof buchungSchema>;
    const cardId = String(req.params.cardId ?? "");
    const ergebnis = await stempelSetzen(venueOf(req), cardId, {
      idempotencyKey,
      note,
      deviceLabel,
      // Wer gestempelt hat, kommt aus der SITZUNG, nie aus dem Rumpf - sonst wäre
      // die Missbrauchsprüfung, für die das Hauptbuch gebaut ist, wertlos.
      staffUserId: req.userId ?? null,
    });
    walletNachBuchung(ergebnis, cardId);
    return buchungAntwort(res, ergebnis);
  }),
);

loyaltyRouter.post(
  "/cards/:cardId/redeem",
  venueGuard,
  validateBody(buchungSchema),
  loyaltyHandler(async (req, res) => {
    const { idempotencyKey, note, deviceLabel } = req.body as z.infer<typeof buchungSchema>;
    const cardId = String(req.params.cardId ?? "");
    const ergebnis = await praemieEinloesen(venueOf(req), cardId, {
      idempotencyKey,
      note,
      deviceLabel,
      staffUserId: req.userId ?? null,
    });
    walletNachBuchung(ergebnis, cardId);
    return buchungAntwort(res, ergebnis);
  }),
);

loyaltyRouter.post(
  "/cards/:cardId/void",
  venueGuard,
  // UNUMKEHRBAR - nimmt dem Gast seinen gesammelten Stand.
  ownerGuard,
  validateBody(voidSchema),
  loyaltyHandler(async (req, res) => {
    const { grund } = req.body as z.infer<typeof voidSchema>;
    const cardId = String(req.params.cardId ?? "");
    const ergebnis = await karteEntwerten(venueOf(req), cardId, grund, req.userId ?? null);
    walletNachBuchung(ergebnis, cardId);
    return buchungAntwort(res, ergebnis);
  }),
);

/**
 * "Daten dieses Gastes löschen" - als Anonymisierung, nie als DELETE.
 *
 * Weil maitr nur Auftragsverarbeiter ist, muss der BETRIEB die Anfrage seines
 * Gastes selbst beantworten können; die Funktion gehört deshalb in seine Oberfläche
 * und nicht in einen Support-Kanal.
 *
 * `req.userId` wird hier hart verlangt statt mit `?? null` weitergereicht:
 * `AuditLog.userId` ist NOT NULL, und ein Protokolleintrag ohne Urheber wäre für
 * genau den Fall wertlos, für den er geschrieben wird.
 */
loyaltyRouter.post(
  "/guests/:guestId/anonymize",
  venueGuard,
  // Löscht die Kontaktdaten eines Gastes unumkehrbar - und damit den Kontext der
  // Belege, die auf ihn zeigen.
  ownerGuard,
  validateBody(venueOnlySchema),
  loyaltyHandler(async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Nicht angemeldet" });
    const ergebnis = await gastAnonymisieren(
      venueOf(req),
      String(req.params.guestId ?? ""),
      req.userId,
    );
    if (ergebnis.art !== "ok") return res.status(404).json({ error: "gast_nicht_gefunden" });
    return res.status(204).end();
  }),
);

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

integrationsRouter.get(
  "/",
  venueGuard,
  asyncHandler(async (req, res) => {
    const venueId = (req as typeof req & { venueId?: string }).venueId!;
    const connections = await prisma.channelConnection.findMany({
      where: { businessId: venueId },
      // Tokens bewusst NICHT ausliefern.
      select: { provider: true, accountId: true, status: true, expiresAt: true, scopes: true },
    });
    return res.json(connections);
  }),
);

// Synchron und ohne await — hier reicht Express' eigenes try/catch, deshalb kein
// asyncHandler. Nur der venueGuard braucht ihn, weil die Middleware async ist.
integrationsRouter.get("/:provider/connect", venueGuard, (req, res) => {
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
 *
 * DAS try/catch BLEIBT — und wird zusätzlich von `asyncHandler` umschlossen. Begründung:
 *
 * 1) Das try/catch ist keine Notbremse, sondern die fachlich richtige Antwort. Am
 *    anderen Ende hängt ein BROWSER mitten im Anmeldefluss, nicht ein API-Aufrufer.
 *    Ein JSON-500 wäre dort eine Sackgasse; der Nutzer landet stattdessen per
 *    Deep-Link zurück in der App mit `status=error` und kann es erneut versuchen.
 *    Die Fehler-Middleware kann das nicht leisten — sie kennt den Deep-Link nicht
 *    und darf generisch keine Weiterleitung erfinden.
 * 2) Das try/catch ist trotzdem nicht dicht: Der catch-Zweig ruft selbst `maitrEnv()`
 *    auf, und `maitrEnv()` wirft bei fehlenden Variablen (env.ts). Wirft es dort,
 *    fliegt der Fehler AUS dem catch heraus — genau in die unbehandelte Ablehnung,
 *    die den Prozess killt. Der Wrapper fängt diesen zweiten Wurf ab und macht
 *    daraus ein sauberes 500 statt eines toten Servers.
 *
 * Kurz: das try/catch beantwortet den erwarteten Fehler benutzergerecht, der
 * asyncHandler sichert den Fehler im Fehlerpfad ab.
 */
publicRouter.get(
  "/integrations/:provider/callback",
  asyncHandler(async (req, res) => {
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
  }),
);

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
