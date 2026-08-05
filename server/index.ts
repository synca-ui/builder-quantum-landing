import express from "express";
import type { NextFunction, Request, Response } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
// Bewusst WIEDERVERWENDET statt danebengebaut: server/maitr/asyncHandler.ts loest
// dasselbe Problem bereits und hat keine eigenen Abhaengigkeiten (nur `import type`),
// zieht also weder Prisma noch sonst etwas mit.
import { asyncHandler, type AsyncRequestHandler } from "./maitr/asyncHandler";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { globalLimiter, strictLimiter } from "./middleware/rateLimit";
import { requireAuth } from "./middleware/auth";
import { apiRouter } from "./routes";
import { scraperJobRouter } from "./routes/scraperJob";
import scraperJobsRoute from "./routes/scraperJobsRoute";
import { handleSubdomainRequest } from "./routes/subdomains";
import { getPublishedSite, setPreviewConfig } from "./routes/configurations";
import { handleForwardN8n } from "./routes/n8nProxy";
import { handleGenerateSchema, handleValidateSchema } from "./routes/schema";
import { handleAutogen } from "./routes/autogen";
import { usersRouter } from "./routes/users";
import { handleClerkWebhook } from "./webhooks/clerk";
import { handleStripeWebhook } from "./webhooks/stripe";
import { registerMaitrWebhooks } from "./maitr";
import {
  handleCreateOrder,
  handleGetRecentOrders,
  handleGetMenuStats,
  handleClearOldOrders,
} from "./routes/orders";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Rate-Limiter speziell für den öffentlichen Site-Endpoint
// Verhindert Enumerations-Angriffe (a.maitr.de, b.maitr.de, ...)
const siteRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  // Der Schluessel muss ueber ipKeyGenerator laufen, nicht ueber eine eigene
  // Normalisierung. Das Update auf express-rate-limit 8.6.2 schliesst nur den
  // EINGEBAUTEN Schluessel (GHSA-46wh-pxpv-q5gq); ein eigener keyGenerator
  // umgeht diesen Fix vollstaendig und blieb hier offen.
  // Die vermiedene Falle: das blosse Strippen der eckigen Klammern liess
  // "::ffff:1.2.3.4" stehen, waehrend derselbe Klient ueber IPv4 als "1.2.3.4"
  // zaehlte - auf einem Dual-Stack-Host (Railway) also zwei getrennte Zaehler
  // und damit die doppelte Rate. ipKeyGenerator faltet die IPv4-abgebildete
  // Form auf die IPv4-Adresse zurueck und fasst echtes IPv6 zum /56-Praefix
  // zusammen, sodass ein Angreifer sich nicht ueber sein eigenes Praefix
  // beliebig viele Zaehler ausstellen kann.
  keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? "")}-${req.params.subdomain ?? ""}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Zu viele Anfragen für diese Seite." },
});

// Rate-Limiter für öffentliche Reservierungen (Anti-Spam)
const reservationLimiter = rateLimit({
  windowMs: 5 * 60_000, // 5 Minuten
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Zu viele Reservierungsanfragen. Bitte warte einen Moment." },
});

/** Allowed CORS origins: maitr.de + all subdomains, and localhost in dev */
const allowedOrigin = (
  origin: string | undefined,
  cb: (err: Error | null, allow?: boolean) => void,
) => {
  if (
    !origin ||
    /^https?:\/\/(.*\.)?maitr\.de$/.test(origin) ||
    /^https?:\/\/localhost(:\d+)?$/.test(origin)
  ) {
    cb(null, true);
  } else {
    cb(new Error(`CORS policy: origin ${origin} is not allowed`));
  }
};

/* ── Globale Fehlerbehandlung fuer den REST der API ─────────────────────────
 *
 * WARUM EINE FEHLER-MIDDLEWARE ALLEIN NICHTS BEWIRKT
 *
 * Eine Fehler-Middleware sieht ausschliesslich, was per `next(err)` bei ihr
 * ankommt. Express 4 ruft `next(err)` nur aus seinem eigenen try/catch heraus
 * (lib/router/layer.js, `handle_request`) — und das faengt nur SYNCHRONE Wuerfe.
 * Eine `async`-Funktion kehrt sofort mit einem Promise zurueck; lehnt es spaeter
 * ab, ist das try/catch laengst verlassen, niemand ruft `next(err)`, und die
 * Middleware wird NIE erreicht. Node beendet den Prozess mit Code 1.
 *
 * Gemessen an einem Kindprozess gegen express@4.22.1 / Node 22.21.1, ein
 * async-Handler mit `throw`, Fehler-Middleware vorhanden:
 *   ohne Umhuellung → Exitcode 1, KEINE Antwort an den Client;
 *   mit Umhuellung  → HTTP 500, Prozess lebt weiter, Exitcode 0.
 * Die Negativkontrolle in der Testdatei haelt genau das fest.
 *
 * Unter server/routes/ tragen 85 von 87 async-Handlern zwar ein try/catch, aber
 * 9 davon rufen im CATCH-Block ein `await audit(...)` auf — also genau dort, wo
 * die Datenbank gerade weggebrochen ist. Lehnt dieses zweite Promise ab, faengt
 * es niemand mehr. Das try/catch schuetzt also nicht so weit, wie es aussieht.
 *
 * DER WEG OHNE AENDERUNG AN DEN ROUTENDATEIEN
 *
 * `wrapAsyncLayers` laeuft nach dem Registrieren die fertige Routentabelle ab und
 * ersetzt jede Handler-Funktion durch ihre `asyncHandler`-Fassung. Damit ist
 * keine einzige Datei unter server/routes/ zu aendern — die ueber hundert Routen
 * bleiben unangetastet, und neue Routen sind automatisch mit abgedeckt, weil die
 * Umhuellung am Stapel haengt und nicht an einzelnen Aufrufstellen.
 */

/** Traeger einer Schichtliste: sowohl ein Router als auch eine Route hat `stack`. */
interface StapelTraeger {
  stack?: ExpressLayer[];
}

/**
 * Die Handler-Funktion einer Schicht. Ein eingehaengter Unterrouter ist selbst
 * eine Funktion und traegt zusaetzlich `stack` — daran erkennt man ihn.
 */
type LayerHandle = ((...args: never[]) => unknown) & {
  stack?: ExpressLayer[];
  /** Marker gegen doppelte Umhuellung, falls die Umhuellung zweimal laeuft. */
  __asyncGesichert?: boolean;
};

/**
 * Eine Schicht aus Express' Routentabelle. Diese Felder sind nicht Teil der
 * oeffentlichen Typen, aber gegen das installierte express@4.22.1 nachgesehen
 * (lib/router/layer.js, lib/router/route.js). server/__tests__/apiContract.spec.ts
 * laeuft denselben Stapel bereits ab — die Technik ist im Haus nicht neu.
 */
interface ExpressLayer {
  route?: StapelTraeger | null;
  handle?: LayerHandle;
}

/**
 * Umhuellt jeden Handler der Routentabelle mit `asyncHandler`, rekursiv durch
 * eingehaengte Unterrouter hindurch. Gibt zurueck, wie viele Handler umhuellt
 * wurden — die Zahl ist im Test der Beleg, dass ueberhaupt etwas passiert ist.
 */
export function wrapAsyncLayers(traeger: StapelTraeger | undefined): number {
  let umhuellt = 0;

  for (const layer of traeger?.stack ?? []) {
    // Eine Route buendelt ihre Handler in `route.stack`; `layer.handle` ist hier
    // nur Express' `dispatch`. Umhuellte man das, laege der eigentliche Handler
    // weiterhin frei — also hinein statt daran vorbei.
    if (layer.route) {
      umhuellt += wrapAsyncLayers(layer.route);
      continue;
    }

    const handle = layer.handle;
    if (typeof handle !== "function") continue;

    // Ein eingehaengter Unterrouter (apiRouter, usersRouter, maitrRouter …).
    // Hier NICHT umhuellen, sondern absteigen: Die oeffentliche `stack`-Eigenschaft
    // muss erhalten bleiben, sonst findet apiContract.spec.ts die Routen nicht mehr.
    if (Array.isArray(handle.stack)) {
      umhuellt += wrapAsyncLayers(handle as StapelTraeger);
      continue;
    }

    // Fehler-Middleware hat vier Parameter. Express unterscheidet die beiden
    // Sorten AUSSCHLIESSLICH an der Parameterzahl (`fn.length !== 4` in
    // `handle_error`, `fn.length > 3` in `handle_request`). Eine Umhuellung hat
    // drei Parameter — sie wuerde eine Fehler-Middleware zu einer normalen
    // machen, die im Fehlerfall nie mehr aufgerufen wird. Also unangetastet
    // lassen; das schuetzt insbesondere den maitrErrorHandler.
    if (handle.length === 4) continue;
    if (handle.__asyncGesichert) continue;

    const gesichert = asyncHandler(
      handle as unknown as AsyncRequestHandler,
    ) as LayerHandle;
    gesichert.__asyncGesichert = true;
    layer.handle = gesichert;
    umhuellt++;
  }

  return umhuellt;
}

/**
 * Letzte Instanz fuer alles, was per `next(err)` ankommt. Vier Parameter, sonst
 * erkennt Express sie nicht als Fehler-Middleware — `next` wird nicht benutzt,
 * muss aber dastehen.
 */
export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Serverseitig MIT Zusammenhang protokollieren: ein Stacktrace ohne Methode und
  // Pfad ist beim Nachforschen wertlos. Das ist die einzige Stelle, an der die
  // Einzelheiten auftauchen duerfen.
  console.error(
    `[api] Unbehandelter Fehler bei ${req.method} ${req.originalUrl}:`,
    err instanceof Error ? err.stack : err,
  );

  // Laeuft die Antwort schon, sind die Header raus — ein zweites res.status()
  // wuerde nur "Cannot set headers after they are sent" werfen, mitten in der
  // Fehlerbehandlung. Weiterreichen: Express' finalhandler zerstoert dann den
  // Socket, damit der Client nicht ewig auf den Rest eines halben Bodys wartet.
  if (res.headersSent) {
    next(err);
    return;
  }

  // Einen vorhandenen 4xx-Status BEIBEHALTEN. Gegen die echte App gemessen
  // liefert sie heute 400 bei kaputtem JSON und 413 bei zu grossem Body (beides
  // aus body-parser, das den Status an den Fehler haengt). Ein blindes 500 waere
  // hier ein Rueckschritt: Es sagt dem Client "mein Fehler", obwohl seine Anfrage
  // das Problem ist, und nimmt ihm die Chance, sie zu korrigieren. Alles andere —
  // kein Status, oder ein 5xx — bedeutet "innen ist etwas gebrochen" → 500.
  const roh = (err as { status?: unknown; statusCode?: unknown } | null)?.status ??
    (err as { statusCode?: unknown } | null)?.statusCode;
  const status =
    typeof roh === "number" && roh >= 400 && roh <= 499 ? roh : 500;

  // Dem Client bewusst NICHTSSAGEND antworten. Kein Stacktrace, keine
  // Datenbankmeldung, keine Dateipfade: Prisma-Fehler nennen Tabellen-, Spalten-
  // und Constraint-Namen samt Hostname, Stacktraces nennen die Verzeichnisstruktur
  // des Servers. Genau das gab Express' finalhandler bisher heraus — gegen die
  // echte App gemessen kam bei kaputtem JSON eine HTML-Seite mit der
  // Ausnahmemeldung zurueck. Auch in Entwicklung nicht anders, sonst weicht der
  // Pfad ab, der in Produktion zaehlt.
  res.status(status).json({
    error: status === 500 ? "Interner Serverfehler" : "Ungültige Anfrage",
  });
}

export function createServer() {
  const app = express();

  // Security Headers (Helmet)
  // CSP disabled per default to prevent breaking extensive client functionalities
  // (Clerk, Stripe, Images, etc.) without strict manual config.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Global Rate Limiting
  app.use(globalLimiter);

  // CORS – restricted to maitr.de and localhost (dev)
  app.use(cors({ origin: allowedOrigin, credentials: true }));

  // Clerk Webhook – MUST stay above express.json(): svix verifies the signature over
  // the raw body. Registered after the JSON parser, body-parser would already have
  // consumed the stream (req._body = true), express.raw() would be skipped, and
  // handleClerkWebhook's req.body.toString() would yield "[object Object]" – every
  // signature check would fail and no user would ever be synced.
  app.post("/api/webhooks/clerk", express.raw({ type: "*/*" }), handleClerkWebhook);

  // Stripe Webhook – same principle: stripe.webhooks.constructEvent needs the
  // raw body to verify the signature. Must be registered before express.json().
  app.post("/api/webhooks/stripe", express.raw({ type: "*/*" }), handleStripeWebhook);

  // Meta-Webhook des Maitr-Backends – aus demselben Grund oberhalb von
  // express.json(): verifyMetaSignature prüft eine HMAC über den Rohbody. Käme der
  // JSON-Parser zuerst, bekäme die Prüfung ein Objekt statt des Buffers und würde
  // ausnahmslos fehlschlagen. Registriert werden nur die beiden /webhooks/meta-
  // Routen; der übrige Maitr-Router hängt regulär unter /api/maitr.
  registerMaitrWebhooks(app);

  // Parse JSON request bodies with size limits
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true, limit: "5mb" }));

  // n8n Proxy – strict rate limit, before apiRouter
  app.post("/api/forward-to-n8n", strictLimiter, handleForwardN8n);

  // Scraper Job Routers
  app.use("/api/scraper-job", scraperJobRouter);
  app.use("/api/scraper-jobs", scraperJobsRoute);

  // Aggregated API router (configurations, webapps, templates, scraper,
  // subscriptions, subdomains, dashboard, demo, instagram, n8n, etc.)
  // Public reservations get their own rate-limiter here before the router handles them
  app.use("/api/public/reservations", reservationLimiter);
  app.use("/api", apiRouter);

  // Public site serving – rate-limited against enumeration attacks
  app.get("/api/sites/:subdomain", siteRateLimiter, getPublishedSite);

  // Users profile (protected)
  app.use("/api/users", requireAuth, usersRouter);

  // Preview config injection.
  // Der Kommentar hier lautete "session-scoped, no auth needed" — es gab aber
  // nie ein Session-Scoping im Handler: der Parameter hieß :session, gelesen
  // wurde req.params.id, also undefined. Zusammen mit dem fehlenden requireAuth
  // gab die Route jedem Anfragenden eine fremde Konfiguration heraus.
  // Jetzt :id (passend zum Handler) und authentifiziert.
  app.post("/api/preview/:id", requireAuth, setPreviewConfig);

  // Auto-generation endpoint (rate-limited to prevent abuse)
  app.post("/api/autogen", strictLimiter, handleAutogen);

  // Schema.org generation & validation (rate-limited to prevent abuse)
  app.post("/api/schema/generate", strictLimiter, handleGenerateSchema);
  app.post("/api/schema/validate", strictLimiter, handleValidateSchema);

  // Orders API (create requires auth to prevent social-proof manipulation)
  app.post("/api/orders/create", requireAuth, strictLimiter, handleCreateOrder);
  app.get("/api/orders/:webAppId/recent", handleGetRecentOrders);
  app.get("/api/orders/:webAppId/menu-stats", handleGetMenuStats);
  app.post("/api/orders/:webAppId/clear-old", requireAuth, handleClearOldOrders);

  // --- SUBDOMAIN ROUTING (must be last) ---
  // Only reached if no API route matched — prevents API call timeouts.
  app.use(handleSubdomainRequest);

  // Erst JETZT, wo alle Routen haengen, die fertige Routentabelle absichern.
  // Vorher waere sie unvollstaendig: Was danach registriert wird, faende die
  // Umhuellung nicht mehr vor. Deshalb steht das hier unten und nicht oben.
  //
  // `app._router` statt `app.router`: Letzteres ist in Express 4 ein Getter, der
  // WIRFT ("'app.router' is deprecated"). Ein `app._router ?? app.router` als
  // vermeintliche Absicherung legte den Serverstart um — beim Bauen passiert.
  const routentabelle = (app as unknown as { _router?: StapelTraeger })._router;
  wrapAsyncLayers(routentabelle);

  // Ganz zum Schluss, NACH allen Routen und nach der Umhuellung: Diese Middleware
  // ist das Ziel, in das die Umhuellung ihre Fehler schickt. Ohne sie landete
  // alles bei Express' finalhandler und damit im Informationsabfluss.
  app.use(globalErrorHandler);

  return app;
}
