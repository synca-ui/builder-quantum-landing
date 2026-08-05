// @vitest-environment node
/**
 * DER OAUTH-WEG, GEPRUEFT OHNE GOOGLE UND OHNE META.
 *
 * Von den neun Maitr-Variablen lassen sich fuenf selbst erzeugen
 * (MAITR_ENCRYPTION_KEY, MAITR_OAUTH_STATE_SECRET, MAITR_API_BASE_URL,
 * MAITR_APP_DEEP_LINK, META_WEBHOOK_VERIFY_TOKEN). Vier kommen nur vom Anbieter
 * (GOOGLE_CLIENT_ID/SECRET, META_APP_ID/SECRET). Dieser Test setzt die fuenf echt
 * (frisch erzeugt bei jedem Lauf) und die vier als erkennbare Platzhalter - und
 * misst, wie weit der Weg damit traegt.
 *
 * Der Weg hat sechs Stationen:
 *   1. GET /integrations/:provider/connect  -> Autorisierungs-URL bauen
 *   2. Ruecksprung des Anbieters auf /integrations/:provider/callback
 *   3. verifyState: Signatur, Ablauf, Einmaligkeit, Anbieter, Mitgliedschaft
 *   4. exchangeCode: Code gegen Tokens  <- hier sitzt der einzige echte Anbieter
 *   5. Tokens AES-256-GCM-verschluesselt in ChannelConnection
 *   6. sync.ts: Access-Token erneuern (Single-Flight)
 *
 *
 * ══ WAS DAMIT BELEGT IST (40 Faelle, alle hier gemessen) ═══════════════════
 *
 * Stationen 1, 2, 3, 5 und 6 laufen VOLLSTAENDIG mit selbst erzeugten Werten:
 *
 *  • Die Autorisierungs-URL ist komplett und korrekt zusammengesetzt - Endpunkt,
 *    client_id, redirect_uri, scope (Google mit Leerzeichen, Meta mit Komma),
 *    response_type, access_type=offline + prompt=consent (ohne die gaebe Google
 *    beim zweiten Mal kein refresh_token mehr). Kein Secret steht in der URL.
 *  • Der state ist signiert: die Signatur wurde im Test mit HMAC-SHA256 ueber
 *    denselben Rumpf NACHGERECHNET und stimmt ueberein. Er traegt Betrieb,
 *    Anbieter, Ausloeser, 16 Byte Zufall und laeuft nach zehn Minuten ab.
 *  • Abgewiesen werden: ein Zeichen im Rumpf gekippt, ein Zeichen in der
 *    Signatur gekippt, mit fremdem Secret nachsigniert, Pflichtfelder fehlend,
 *    abgelaufen, zweite Einloesung (Replay), Google-state am Meta-Callback,
 *    Ausloeser nicht mehr Mitglied, fehlender code, Formloses.
 *  • Bei jeder dieser Ablehnungen wurde NULL mal beim Anbieter angeklopft und
 *    NULL mal gespeichert - das ist mitgemessen, nicht nur behauptet. Besonders
 *    die Mitgliedspruefung greift nachweislich VOR dem Token-Tausch.
 *  • Verschluesselung: hin und zurueck ergibt den Klartext; 100 Verschluesselungen
 *    desselben Tokens ergeben 100 verschiedene IVs (bei GCM waere ein
 *    wiederverwendeter IV ein Totalschaden); ein gekipptes Bit im Chiffretext
 *    laesst sich nicht mehr oeffnen. Im gespeicherten Datensatz und im Deep-Link
 *    zurueck in die App taucht kein Klartext-Token auf.
 *  • Refresh: zwei gleichzeitige Pulls derselben Verbindung loesen GENAU EINEN
 *    Refresh aus, beide arbeiten danach mit dem frischen Token, und das neue
 *    Token wird genau einmal verschluesselt zurueckgeschrieben. Gegenprobe
 *    dabei: nacheinander sind es zwei Refreshes - gemessen wird also wirklich
 *    die Gleichzeitigkeit und nicht ein Zufall.
 *
 * Station 4 laeuft mit einem DOPPELGAENGER durch: der Test gibt sich als Google
 * bzw. Meta aus und antwortet auf Token-Endpunkt, Konten-/Standort- bzw.
 * Seiten-Abfrage. Damit ist belegt, dass die Anfrage RICHTIG GEBAUT ist -
 * POST, grant_type, code, client_id, client_secret und redirect_uri im Rumpf und
 * nicht in der Query (sonst stuenden die Geheimnisse in jedem Zugriffslog), bei
 * Meta zusaetzlich der zweite Schritt kurzlebig -> langlebig.
 *
 *
 * ══ WO DIE GRENZE VERLAEUFT ═══════════════════════════════════════════════
 *
 * Nur mit echten Zugangsdaten pruefbar - und zwar erst nach der Freigabe:
 *
 *  1. OB DER ANBIETER DIE ANFRAGE ANNIMMT. Der Doppelgaenger sagt "ja" zu allem.
 *     Ob Google die redirect_uri kennt, ob der Consent-Screen die Scopes
 *     ausliefert, ob das App-Review sie ueberhaupt freigegeben hat - das
 *     entscheidet allein der Anbieter.
 *  2. DIE FORM DER ECHTEN ANTWORTEN. Die Antworten hier sind nach Doku gebaut.
 *     Weicht das Feld ab (fehlendes refresh_token, anderes expires_in, andere
 *     Konten-Struktur), faellt das erst am echten Endpunkt auf.
 *  3. resolveAccountId. Dass der erste Standort bzw. die erste Facebook-Seite die
 *     RICHTIGE ist, kann nur ein echtes Konto zeigen. Bei mehreren Standorten
 *     nimmt der Code stumm den ersten.
 *  4. DER REFRESH GEGEN GOOGLE. Dass genau ein Refresh ausgeloest wird, ist
 *     belegt. Dass Google ihn akzeptiert, nicht.
 *  5. DIE LEBENSDAUER. Meta-Langzeit-Token (~60 Tage) und der Reconnect-Pfad
 *     danach lassen sich nur in echter Zeit beobachten.
 *
 * Kurz: die gesamte EIGENE Mechanik ist geprueft. Offen bleibt ausschliesslich
 * das, was der Anbieter selbst beitraegt. Der Meta-Webhook-Handshake war bereits
 * vorher vollstaendig mit selbst erzeugten Werten belegt - er braucht kein
 * App-Review, nur den selbst gewaehlten Verify-Token.
 *
 *
 * ══ ZWEI BEFUNDE, DIE BEIM MESSEN AUFGEFALLEN SIND ════════════════════════
 *
 * (A) PRUEFBARKEIT, ZWEIGETEILT. packages/core/src/integrations/types.ts reicht
 *     ein `FetchLike` in die Connectors - dort ist der Anbieter sauber
 *     austauschbar (unten gemessen: mit vermintem globalen fetch laeuft der
 *     Connector trotzdem). Der Server macht es NICHT so: routes.ts:811 und
 *     sync.ts:17 bauen sich je ein modul-privates `fetchLike` um das globale
 *     `fetch`, und `exchangeCode` / `refreshGoogle` nehmen keinen Parameter
 *     dafuer. Ein Doppelgaenger geht dort nur ueber vi.stubGlobal("fetch") -
 *     also nur mit der groben Kelle, die JEDEN Netzzugriff des Prozesses
 *     abfaengt statt gezielt den einen Aufruf. Pruefbar ist es damit; sauber
 *     waere ein `FetchLike`-Parameter mit dem echten fetch als Vorgabe.
 *
 * (B) DIE redirect_uri HAENGT AN EINER FALLE. Sie wird als
 *     `${MAITR_API_BASE_URL}/maitr/integrations/:provider/callback` gebaut
 *     (routes.ts:698), die Route liegt aber real unter /api/maitr/... - der
 *     Router haengt in server/routes/index.ts:195 an apiRouter und der in
 *     server/index.ts:283 an "/api". MAITR_API_BASE_URL MUSS also auf "/api"
 *     enden. server/maitr/.env.example sagt das ("z. B. https://maitr.de/api"),
 *     docs/APP_VOLLSTAENDIGKEIT.md:629 sagt nur "die oeffentliche HTTPS-Adresse
 *     der API" - wer sich danach richtet, traegt bei Google eine redirect_uri
 *     ein, die ins Leere zeigt, und merkt es erst beim ersten echten Verbinden.
 *     Der Test unten schliesst diesen Kreis: er nimmt die redirect_uri aus der
 *     Autorisierungs-URL und ruft genau ihren Pfad auf der gemounteten App auf.
 *
 * Kein Produktivcode wurde geaendert - beides sind Beobachtungen, keine Defekte.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createHmac } from "node:crypto";

/* ── 1) Umgebung: fuenf Werte selbst erzeugt, vier nur Platzhalter ───────────
 *
 * Das MUSS in vi.hoisted passieren, also VOR jedem Import. `maitrEnv()` liest
 * process.env beim ersten Aufruf und merkt sich das Ergebnis fuer immer - wer
 * spaeter setzt, hat verloren. Ausserdem werden dadurch etwaige echte Werte aus
 * der Shell zuverlaessig ueberschrieben: dieser Test darf niemals versehentlich
 * mit Produktivzugangsdaten laufen.
 *
 * Erzeugt wird mit der Web-Crypto des Prozesses (globalThis.crypto), damit hier
 * kein einziger Schluessel als Literal im Repo steht - jeder Lauf hat neue.
 */
vi.hoisted(() => {
  const hex = (bytes: number) =>
    Array.from(globalThis.crypto.getRandomValues(new Uint8Array(bytes)), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");

  Object.assign(process.env, {
    // ── selbst erzeugbar (das kann der Nutzer heute) ──
    MAITR_ENCRYPTION_KEY: hex(32), // 64 Hex-Zeichen = 32 Byte, wie env.ts verlangt
    MAITR_OAUTH_STATE_SECRET: hex(24), // 48 Zeichen, ueber der Mindestlaenge 32
    MAITR_API_BASE_URL: "https://api.maitr.test/api",
    MAITR_APP_DEEP_LINK: "maitr://connected",
    META_WEBHOOK_VERIFY_TOKEN: hex(16),
    // ── nur vom Anbieter zu bekommen (darauf wartet er) ──
    // Bewusst als erkennbare Platzhalter: sie muessen fuer die Zod-Pruefung nur
    // nicht leer sein. Genau das ist die Erkenntnis - der halbe Weg laeuft damit.
    GOOGLE_CLIENT_ID: "PLATZHALTER-google-client-id",
    GOOGLE_CLIENT_SECRET: "PLATZHALTER-google-client-secret",
    META_APP_ID: "PLATZHALTER-meta-app-id",
    META_APP_SECRET: "PLATZHALTER-meta-app-secret",
  });
});

/* ── 2) Prisma: gemockt, es geht keine Verbindung nach draussen ──────────── */
const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    businessMember: { findUnique: vi.fn() },
    channelConnection: { upsert: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
    maitrReview: { upsert: vi.fn() },
    maitrEngagementPoint: { upsert: vi.fn() },
  },
}));
vi.mock("../db/prisma", () => ({ default: prismaMock, prisma: prismaMock }));

import { connectors } from "@maitr/core/integrations";
import { maitrErrorHandler } from "../maitr/index";
import { integrationsRouter, publicRouter } from "../maitr/routes";
import { createState, decryptToken, encryptToken, verifyState } from "../maitr/security";
import { pullChannel } from "../maitr/sync";

const WIRT = "user-wirt";
const BETRIEB = "biz-goldstueck";

/* ── 3) Die App, so gemountet wie in Produktion ──────────────────────────────
 *
 * server/routes/index.ts: apiRouter.use("/maitr", maitrRouter), und server/index.ts
 * haengt apiRouter unter "/api". Der Callback liegt also real unter
 * /api/maitr/integrations/:provider/callback. Diese Pfadtiefe wird hier
 * nachgebaut, weil genau sie in der redirect_uri steht - ein Test unter "/" wuerde
 * einen Konfigurationsfehler in der Basis-URL nicht bemerken.
 *
 * Statt `requireAuth` (Clerk) setzt eine Zeile req.userId - der OAuth-Weg selbst
 * ist das Pruefobjekt, nicht die Token-Pruefung von Clerk.
 */
let angemeldetAls: string | undefined = WIRT;

function api() {
  const maitr = express.Router();
  maitr.use(publicRouter); // oeffentlich: der Provider-Ruecksprung traegt keinen App-Token
  maitr.use((req, _res, next) => {
    req.userId = angemeldetAls;
    next();
  });
  maitr.use("/integrations", integrationsRouter);
  maitr.use(maitrErrorHandler);

  const app = express();
  app.use(express.json());
  app.use("/api/maitr", maitr);
  return app;
}

/* ── 4) Der Doppelgaenger fuer den Anbieter ──────────────────────────────────
 *
 * WICHTIG, und der erste Befund: der Kern (packages/core/src/integrations)
 * nimmt laut types.ts ein `FetchLike` entgegen - dort ist der Anbieter
 * austauschbar. Der SERVER dagegen (server/maitr/routes.ts:811 und
 * server/maitr/sync.ts:17) baut sich je ein modul-privates `fetchLike` um das
 * globale `fetch`, und `exchangeCode` / `refreshGoogle` nehmen keinen Parameter
 * dafuer. Von aussen einsetzen laesst sich ein Doppelgaenger dort also NUR ueber
 * das globale fetch. Das geht (siehe unten, es wird gemessen) - aber es ist die
 * grobe Kelle: es faengt jeden Netzzugriff des Prozesses ab, nicht gezielt den
 * einen Aufruf.
 */
interface Init {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}
interface Aufruf {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}
interface Antwort {
  status?: number;
  body?: unknown;
}

function doppelgaenger(regeln: (url: string, init: Init) => Antwort | Promise<Antwort>) {
  const aufrufe: Aufruf[] = [];
  const fake = async (url: string, init?: Init) => {
    aufrufe.push({ url, method: init?.method, headers: init?.headers, body: init?.body });
    const a = await regeln(url, init ?? {});
    const status = a.status ?? 200;
    return { ok: status >= 200 && status < 300, status, json: async () => a.body };
  };
  vi.stubGlobal("fetch", fake);
  return aufrufe;
}

/** Kein Netz - jeder Zugriff faellt auf. Fuer "hier darf gar nicht getauscht werden". */
function keinNetz() {
  return doppelgaenger((url) => {
    throw new Error(`Es haette gar kein Anbieter-Aufruf passieren duerfen: ${url}`);
  });
}

/* ── 5) Hilfen ───────────────────────────────────────────────────────────── */

const GEHEIM = () => process.env.MAITR_OAUTH_STATE_SECRET!;

function signatur(rumpf: string, geheim = GEHEIM()) {
  return createHmac("sha256", geheim).update(rumpf).digest("base64url");
}

function stateInhalt(state: string) {
  return JSON.parse(Buffer.from(state.split(".")[0], "base64url").toString("utf8"));
}

/** State so bauen, als haette ihn der Server ausgegeben - fuer Manipulationsproben. */
function eigenerState(inhalt: Record<string, unknown>, geheim = GEHEIM()) {
  const rumpf = Buffer.from(JSON.stringify(inhalt)).toString("base64url");
  return `${rumpf}.${signatur(rumpf, geheim)}`;
}

function nonce() {
  return globalThis.crypto.randomUUID();
}

/**
 * Genau EIN Zeichen am Ende kippen - bleibt gueltiges base64url, aendert aber den
 * Inhalt. (Ohne `String.prototype.at`, das die lib-Einstellung dieses Projekts
 * noch nicht kennt.)
 */
function einZeichenKippen(s: string) {
  const letztes = s.slice(-1);
  return s.slice(0, -1) + (letztes === "A" ? "B" : "A");
}

/** Autorisierungs-URL ueber die echte Route holen. */
async function verbindeAuffordern(provider: "google" | "meta") {
  const res = await request(api())
    .get(`/api/maitr/integrations/${provider}/connect`)
    .query({ venueId: BETRIEB });
  expect(res.status).toBe(200);
  return new URL(res.body.url as string);
}

let logSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  angemeldetAls = WIRT;
  // Der Callback protokolliert seine Ablehnungen absichtlich laut. Ohne das hier
  // waere die Testausgabe voller erwarteter Fehler.
  logSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  prismaMock.businessMember.findUnique.mockImplementation(
    async ({ where }: { where: { userId_businessId: { userId: string; businessId: string } } }) =>
      where.userId_businessId.userId === WIRT && where.userId_businessId.businessId === BETRIEB
        ? { userId: WIRT, businessId: BETRIEB }
        : null,
  );
  prismaMock.channelConnection.upsert.mockResolvedValue({ id: "conn-neu" });
});

afterEach(() => {
  logSpy.mockRestore();
  vi.unstubAllGlobals(); // globales fetch zurueckgeben
  vi.restoreAllMocks();
});

/* ═══ Schritt 1: Die Autorisierungs-URL ═══════════════════════════════════ */

describe("Schritt 1 - GET /integrations/:provider/connect baut die Autorisierungs-URL", () => {
  it("Google: alle Bestandteile stehen drin und stammen aus der Konfiguration", async () => {
    const url = await verbindeAuffordern("google");

    expect(`${url.origin}${url.pathname}`).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("PLATZHALTER-google-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://api.maitr.test/api/maitr/integrations/google/callback",
    );
    expect(url.searchParams.get("scope")).toBe("https://www.googleapis.com/auth/business.manage");
    expect(url.searchParams.get("response_type")).toBe("code");
    // Ohne diese beiden liefert Google beim zweiten Mal KEIN refresh_token mehr -
    // dann liesse sich der Sync nie ohne Nutzer erneuern.
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("state")).toBeTruthy();
  });

  it("Meta: eigener Endpunkt, Scopes mit Komma statt Leerzeichen", async () => {
    const url = await verbindeAuffordern("meta");

    expect(`${url.origin}${url.pathname}`).toBe("https://www.facebook.com/v21.0/dialog/oauth");
    expect(url.searchParams.get("client_id")).toBe("PLATZHALTER-meta-app-id");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://api.maitr.test/api/maitr/integrations/meta/callback",
    );
    // Meta trennt Scopes mit Komma, Google mit Leerzeichen. Verwechselt man das,
    // lehnt der Dialog die Anfrage ab - deshalb hier festgenagelt.
    // Welche Berechtigungen hier stehen duerfen und warum, nagelt
    // metaBerechtigungen.spec.ts fest - hier zaehlt nur, dass die Liste aus
    // META_SCOPES unveraendert in der URL landet.
    expect(url.searchParams.get("scope")).toBe(
      "instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement,pages_read_user_content",
    );
  });

  it("kein Geheimnis in der URL - client_secret bleibt auf dem Server", async () => {
    for (const p of ["google", "meta"] as const) {
      const url = await verbindeAuffordern(p);
      expect(url.toString()).not.toContain("PLATZHALTER-google-client-secret");
      expect(url.toString()).not.toContain("PLATZHALTER-meta-app-secret");
      expect(url.toString()).not.toContain(GEHEIM());
      expect(url.toString()).not.toContain(process.env.MAITR_ENCRYPTION_KEY!);
    }
  });

  it("die redirect_uri trifft die Route, die wirklich gemountet ist", async () => {
    // Der Kreis muss sich schliessen: was hier in der redirect_uri steht, traegt der
    // Nutzer bei Google/Meta ein - und genau dorthin schickt der Anbieter spaeter.
    // Passt der Pfad nicht zum Mount, laeuft der Rueckweg in ein 404, und zwar erst
    // beim ersten echten Verbinden.
    const url = await verbindeAuffordern("google");
    const pfad = new URL(url.searchParams.get("redirect_uri")!).pathname;

    expect(pfad).toBe("/api/maitr/integrations/google/callback");

    const res = await request(api()).get(pfad); // ohne code/state -> Ablehnung, aber ERREICHT
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("maitr://connected");
  });

  it("der state ist signiert und traegt Betrieb, Anbieter und Ausloeser", async () => {
    const url = await verbindeAuffordern("google");
    const state = url.searchParams.get("state")!;

    const [rumpf, sig] = state.split(".");
    expect(state.split(".")).toHaveLength(2);
    // Selbst nachgerechnet, mit demselben Verfahren (HMAC-SHA256, base64url):
    expect(sig).toBe(signatur(rumpf));

    const inhalt = stateInhalt(state);
    expect(inhalt.businessId).toBe(BETRIEB);
    expect(inhalt.provider).toBe("google");
    expect(inhalt.userId).toBe(WIRT);
    expect(inhalt.nonce).toMatch(/^[0-9a-f]{32}$/); // 16 Byte Zufall
    // Kurzlebig: zehn Minuten laut security.ts.
    expect(inhalt.exp - Date.now()).toBeGreaterThan(9 * 60_000);
    expect(inhalt.exp - Date.now()).toBeLessThanOrEqual(10 * 60_000);
  });

  it("zwei Aufrufe ergeben zwei verschiedene state-Werte (keine Wiederverwendung)", async () => {
    const a = (await verbindeAuffordern("google")).searchParams.get("state");
    const b = (await verbindeAuffordern("google")).searchParams.get("state");
    expect(a).not.toBe(b);
  });

  it("wer nicht Mitglied des Betriebs ist, bekommt gar keine URL", async () => {
    angemeldetAls = "user-fremd";
    const res = await request(api())
      .get("/api/maitr/integrations/google/connect")
      .query({ venueId: BETRIEB });
    expect(res.status).toBe(403);
  });

  it("unbekannter Anbieter wird abgewiesen, bevor irgendetwas gebaut wird", async () => {
    const res = await request(api())
      .get("/api/maitr/integrations/tiktok/connect")
      .query({ venueId: BETRIEB });
    expect(res.status).toBe(400);
  });
});

/* ═══ Schritt 3: verifyState ══════════════════════════════════════════════ */

describe("Schritt 3 - verifyState: Signatur, Ablauf, Einmaligkeit, Form", () => {
  it("ein unveraenderter state geht durch", () => {
    const state = createState(BETRIEB, "google", WIRT);
    const p = verifyState(state);
    expect(p).toMatchObject({ businessId: BETRIEB, provider: "google", userId: WIRT });
  });

  it("EIN geaendertes Zeichen im Rumpf reicht zur Ablehnung", () => {
    const state = createState(BETRIEB, "google", WIRT);
    const [rumpf, sig] = state.split(".");
    const gekippt = einZeichenKippen(rumpf);
    expect(gekippt).not.toBe(rumpf);

    expect(() => verifyState(`${gekippt}.${sig}`)).toThrow(/Signatur/);
  });

  it("EIN geaendertes Zeichen in der Signatur reicht zur Ablehnung", () => {
    const state = createState(BETRIEB, "google", WIRT);
    const [rumpf, sig] = state.split(".");
    const gekippt = einZeichenKippen(sig);

    expect(() => verifyState(`${rumpf}.${gekippt}`)).toThrow(/Signatur/);
  });

  it("wer den Betrieb umschreiben will, muesste neu signieren - ohne das Secret geht das nicht", () => {
    // Der eigentliche Angriff: nicht Zeichen kippen, sondern den Inhalt austauschen.
    const echt = stateInhalt(createState(BETRIEB, "google", WIRT));
    const gefaelscht = eigenerState(
      { ...echt, businessId: "biz-fremd" },
      "das-ist-nicht-das-echte-state-secret-xxxxx",
    );

    expect(() => verifyState(gefaelscht)).toThrow(/Signatur/);
  });

  it("mit dem ECHTEN Secret signiert, aber unvollstaendige Form -> abgelehnt", () => {
    // Belegt, dass nach der Signatur noch die Form geprueft wird und nicht blind
    // gecastet - sonst waere `state.userId` undefined und die Mitgliedspruefung
    // liefe gegen undefined.
    const ohneUserId = eigenerState({
      businessId: BETRIEB,
      provider: "google",
      nonce: nonce(),
      exp: Date.now() + 60_000,
    });

    expect(() => verifyState(ohneUserId)).toThrow(/Payload/);
  });

  it("ein abgelaufener state wird abgewiesen", () => {
    const jetzt = Date.now();
    const uhr = vi.spyOn(Date, "now").mockReturnValue(jetzt - 11 * 60_000);
    const alt = createState(BETRIEB, "google", WIRT); // exp = vor einer Minute
    uhr.mockRestore();

    expect(stateInhalt(alt).exp).toBeLessThan(Date.now());
    expect(() => verifyState(alt)).toThrow(/abgelaufen/);
  });

  it("derselbe state ein zweites Mal wird abgewiesen (Replay)", () => {
    const state = createState(BETRIEB, "google", WIRT);

    expect(verifyState(state).businessId).toBe(BETRIEB); // erstes Einloesen: gut
    expect(() => verifyState(state)).toThrow(/bereits verwendet/); // zweites: Replay
  });

  it("Formloses wird abgewiesen, nicht in einen Absturz gelassen", () => {
    for (const muell of ["", "kein-punkt", ".", "a.b", "..", "x.y.z"]) {
      expect(() => verifyState(muell)).toThrow();
    }
  });
});

/* ═══ Schritte 2+4+5: Der Callback ════════════════════════════════════════ */

const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_KONTEN = "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";
const META_TOKEN = "https://graph.facebook.com/v21.0/oauth/access_token";
const META_SEITEN = "https://graph.facebook.com/v21.0/me/accounts";

/** Anbieter-Doppelgaenger fuer den vollstaendigen Google-Ruecksprung. */
function googleAntwortet(access = "google-access-AAA", refresh = "google-refresh-BBB") {
  return doppelgaenger((url) => {
    if (url === GOOGLE_TOKEN)
      return { body: { access_token: access, refresh_token: refresh, expires_in: 3600 } };
    if (url === GOOGLE_KONTEN) return { body: { accounts: [{ name: "accounts/111" }] } };
    if (url.startsWith("https://mybusinessbusinessinformation.googleapis.com/v1/accounts/111/locations"))
      return { body: { locations: [{ name: "locations/222" }] } };
    throw new Error(`Unerwarteter Aufruf: ${url}`);
  });
}

async function rueckSprung(provider: string, query: Record<string, string>) {
  return request(api()).get(`/api/maitr/integrations/${provider}/callback`).query(query);
}

describe("Schritte 2+4+5 - der Ruecksprung mit einem Anbieter-Doppelgaenger", () => {
  it("Google, vollstaendiger Durchlauf: Code -> Tokens -> verschluesselt gespeichert", async () => {
    const aufrufe = googleAntwortet();
    const state = (await verbindeAuffordern("google")).searchParams.get("state")!;

    const res = await rueckSprung("google", { code: "code-vom-anbieter", state });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("maitr://connected?provider=google&status=connected");

    // (a) Der Token-Tausch ging als POST an den Token-Endpunkt ...
    const tausch = aufrufe.find((a) => a.url === GOOGLE_TOKEN)!;
    expect(tausch.method).toBe("POST");
    // ... mit den Geheimnissen im RUMPF, nicht in der Query (sonst stehen sie in
    // jedem Zugriffslog und Proxy dazwischen).
    expect(tausch.url).not.toContain("client_secret");
    const feld = new URLSearchParams(tausch.body!);
    expect(feld.get("grant_type")).toBe("authorization_code");
    expect(feld.get("code")).toBe("code-vom-anbieter");
    expect(feld.get("client_id")).toBe("PLATZHALTER-google-client-id");
    expect(feld.get("client_secret")).toBe("PLATZHALTER-google-client-secret");
    // Google prueft die redirect_uri gegen die des Autorisierungsschritts.
    expect(feld.get("redirect_uri")).toBe(
      "https://api.maitr.test/api/maitr/integrations/google/callback",
    );

    // (b) Gespeichert wurde verschluesselt - im Klartext taucht nichts auf.
    expect(prismaMock.channelConnection.upsert).toHaveBeenCalledTimes(1);
    const arg = prismaMock.channelConnection.upsert.mock.calls[0][0];
    expect(arg.where).toEqual({ businessId_provider: { businessId: BETRIEB, provider: "GOOGLE" } });
    expect(arg.create.accountId).toBe("accounts/111/locations/222");
    expect(arg.create.scopes).toEqual(["https://www.googleapis.com/auth/business.manage"]);
    expect(JSON.stringify(arg)).not.toContain("google-access-AAA");
    expect(JSON.stringify(arg)).not.toContain("google-refresh-BBB");

    // (c) ... und laesst sich mit dem selbst erzeugten Schluessel wieder oeffnen.
    expect(decryptToken(arg.create.encAccessToken)).toBe("google-access-AAA");
    expect(decryptToken(arg.create.encRefreshToken)).toBe("google-refresh-BBB");
    expect(arg.create.expiresAt.getTime() - Date.now()).toBeGreaterThan(59 * 60_000);
  });

  it("Meta, vollstaendiger Durchlauf: kurzlebig -> langlebig, kein Refresh-Token", async () => {
    const aufrufe = doppelgaenger((url, init) => {
      if (url === META_TOKEN) {
        const f = new URLSearchParams(init.body ?? "");
        if (f.get("grant_type") === "fb_exchange_token")
          return { body: { access_token: "meta-langlebig", expires_in: 5_184_000 } };
        return { body: { access_token: "meta-kurzlebig" } };
      }
      if (url === META_SEITEN) return { body: { data: [{ id: "1234567890" }] } };
      throw new Error(`Unerwarteter Aufruf: ${url}`);
    });
    const state = (await verbindeAuffordern("meta")).searchParams.get("state")!;

    const res = await rueckSprung("meta", { code: "code-vom-anbieter", state });

    expect(res.headers.location).toBe("maitr://connected?provider=meta&status=connected");

    const taeusche = aufrufe.filter((a) => a.url === META_TOKEN);
    expect(taeusche).toHaveLength(2); // erst Code einloesen, dann verlaengern
    expect(new URLSearchParams(taeusche[1].body!).get("fb_exchange_token")).toBe("meta-kurzlebig");

    const arg = prismaMock.channelConnection.upsert.mock.calls[0][0];
    expect(arg.create.provider).toBe("META");
    expect(arg.create.accountId).toBe("1234567890"); // numerisch, wie assertMetaId verlangt
    expect(decryptToken(arg.create.encAccessToken)).toBe("meta-langlebig");
    // Meta gibt kein Refresh-Token - der Sync muss darauf vorbereitet sein.
    expect(arg.create.encRefreshToken).toBeNull();
  });

  it("manipulierter state: kein Tausch, kein Speichern, Rueckweg mit status=error", async () => {
    const aufrufe = keinNetz();
    const state = (await verbindeAuffordern("google")).searchParams.get("state")!;
    const [rumpf, sig] = state.split(".");
    const gekippt = `${einZeichenKippen(rumpf)}.${sig}`;

    const res = await rueckSprung("google", { code: "code-vom-anbieter", state: gekippt });

    expect(res.headers.location).toBe("maitr://connected?provider=google&status=error");
    expect(aufrufe).toHaveLength(0); // der Code wurde nie eingeloest
    expect(prismaMock.channelConnection.upsert).not.toHaveBeenCalled();
  });

  it("abgelaufener state am Callback: kein Tausch", async () => {
    const aufrufe = keinNetz();
    const uhr = vi.spyOn(Date, "now").mockReturnValue(Date.now() - 11 * 60_000);
    const alt = createState(BETRIEB, "google", WIRT);
    uhr.mockRestore();

    const res = await rueckSprung("google", { code: "code-vom-anbieter", state: alt });

    expect(res.headers.location).toContain("status=error");
    expect(aufrufe).toHaveLength(0);
    expect(prismaMock.channelConnection.upsert).not.toHaveBeenCalled();
  });

  it("derselbe Ruecksprung zweimal: der zweite wird abgewiesen (Replay am echten Endpunkt)", async () => {
    const aufrufe = googleAntwortet();
    const state = (await verbindeAuffordern("google")).searchParams.get("state")!;

    const erst = await rueckSprung("google", { code: "code-vom-anbieter", state });
    const zweit = await rueckSprung("google", { code: "code-vom-anbieter", state });

    expect(erst.headers.location).toContain("status=connected");
    expect(zweit.headers.location).toContain("status=error");
    expect(prismaMock.channelConnection.upsert).toHaveBeenCalledTimes(1);
    // Beim zweiten Mal gab es keinen einzigen weiteren Anbieter-Aufruf.
    expect(aufrufe.filter((a) => a.url === GOOGLE_TOKEN)).toHaveLength(1);
  });

  it("state fuer Google am Callback von Meta: abgewiesen", async () => {
    const aufrufe = keinNetz();
    const state = (await verbindeAuffordern("google")).searchParams.get("state")!;

    const res = await rueckSprung("meta", { code: "code-vom-anbieter", state });

    // Ohne diese Pruefung wuerde ein Google-Code am Meta-Endpunkt getauscht -
    // und die Verbindung landete unter dem falschen Anbieter im selben Betrieb.
    expect(res.headers.location).toBe("maitr://connected?provider=meta&status=error");
    expect(aufrufe).toHaveLength(0);
    expect(prismaMock.channelConnection.upsert).not.toHaveBeenCalled();
  });

  it("Nebenbefund, gemessen: der falsche Callback verbraucht den state trotzdem", async () => {
    // verifyState loescht die Nonce, BEVOR routes.ts den Anbieter vergleicht. Wer
    // einen Google-state am Meta-Callback abliefert, macht ihn damit fuer den
    // richtigen Callback unbrauchbar. Kein Loch (der state ist ohnehin nur einmal
    // gueltig, und wer ihn hat, koennte ihn auch direkt einloesen) - aber der Nutzer
    // sieht dann "status=error" und muss den Verbinden-Knopf erneut druecken.
    keinNetz();
    const state = (await verbindeAuffordern("google")).searchParams.get("state")!;

    await rueckSprung("meta", { code: "c", state }); // falscher Callback zuerst
    const richtig = await rueckSprung("google", { code: "c", state });

    expect(richtig.headers.location).toContain("status=error");
    expect(prismaMock.channelConnection.upsert).not.toHaveBeenCalled();
  });

  it("Ausloeser ist kein Mitglied mehr: abgewiesen, und zwar VOR dem Token-Tausch", async () => {
    const aufrufe = keinNetz();
    const state = (await verbindeAuffordern("google")).searchParams.get("state")!;
    // Zwischen /connect und Ruecksprung liegen bis zu zehn Minuten. Hier wird der
    // Ausloeser in dieser Zeit aus dem Betrieb entfernt.
    prismaMock.businessMember.findUnique.mockResolvedValue(null);

    const res = await rueckSprung("google", { code: "code-vom-anbieter", state });

    expect(res.headers.location).toContain("status=error");
    // Dass hier NULL Aufrufe stehen, ist die eigentliche Aussage: die Mitgliedschaft
    // wird geprueft, bevor ueberhaupt ein Token beschafft wird.
    expect(aufrufe).toHaveLength(0);
    expect(prismaMock.channelConnection.upsert).not.toHaveBeenCalled();
  });

  it("fehlender code: abgewiesen", async () => {
    const aufrufe = keinNetz();
    const state = (await verbindeAuffordern("google")).searchParams.get("state")!;

    const res = await rueckSprung("google", { state });

    expect(res.headers.location).toContain("status=error");
    expect(aufrufe).toHaveLength(0);
  });

  it("der Anbieter antwortet mit einem Fehler: kein halbfertiger Datensatz", async () => {
    doppelgaenger(() => ({ status: 400, body: { error: "invalid_grant" } }));
    const state = (await verbindeAuffordern("google")).searchParams.get("state")!;

    const res = await rueckSprung("google", { code: "abgelaufener-code", state });

    expect(res.headers.location).toContain("status=error");
    expect(prismaMock.channelConnection.upsert).not.toHaveBeenCalled();
  });

  it("kein Token landet im Rueckweg zur App", async () => {
    googleAntwortet();
    const state = (await verbindeAuffordern("google")).searchParams.get("state")!;

    const res = await rueckSprung("google", { code: "code-vom-anbieter", state });

    // Der Deep-Link geht durch den Browser und landet in dessen Verlauf.
    expect(res.headers.location).not.toContain("google-access-AAA");
    expect(res.headers.location).not.toContain("google-refresh-BBB");
    expect(res.headers.location).not.toContain("code-vom-anbieter");
  });
});

/* ═══ Schritt 5: Verschluesselung ═════════════════════════════════════════ */

describe("Schritt 5 - AES-256-GCM: Hin und zurueck, und nie zweimal gleich", () => {
  it("verschluesseln und entschluesseln ergibt wieder den Klartext", () => {
    const klartext = "ya29.a0AfB_beispielhaftes-langes-google-token";
    expect(decryptToken(encryptToken(klartext))).toBe(klartext);
  });

  it("zweimal dasselbe Token sieht verschieden aus - der IV wird nicht wiederverwendet", () => {
    const klartext = "immer-dasselbe-token";
    const a = encryptToken(klartext);
    const b = encryptToken(klartext);

    expect(a).not.toBe(b);
    // Genauer: es liegt am IV, nicht an irgendetwas anderem. Bei GCM waere ein
    // wiederverwendeter IV mit demselben Schluessel ein Totalschaden (der
    // Schluesselstrom wiederholt sich, XOR zweier Chiffrate legt den Klartext frei).
    const [ivA, ctA] = a.split(".");
    const [ivB, ctB] = b.split(".");
    expect(ivA).not.toBe(ivB);
    expect(ctA).not.toBe(ctB);
    // Beide oeffnen trotzdem denselben Klartext.
    expect(decryptToken(a)).toBe(klartext);
    expect(decryptToken(b)).toBe(klartext);
  });

  it("100 Verschluesselungen ergeben 100 verschiedene IVs", () => {
    const ivs = new Set(Array.from({ length: 100 }, () => encryptToken("t").split(".")[0]));
    expect(ivs.size).toBe(100);
  });

  it("Format ist iv.ciphertext.tag, jeweils base64url", () => {
    const teile = encryptToken("token").split(".");
    expect(teile).toHaveLength(3);
    for (const t of teile) expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(Buffer.from(teile[0], "base64url")).toHaveLength(12); // 96-Bit-IV, GCM-Standard
    expect(Buffer.from(teile[2], "base64url")).toHaveLength(16); // 128-Bit-Auth-Tag
  });

  it("ein veraenderter Chiffretext laesst sich nicht mehr oeffnen (Auth-Tag)", () => {
    const [iv, ct, tag] = encryptToken("token").split(".");
    const roh = Buffer.from(ct, "base64url");
    roh[0] ^= 0x01; // ein Bit kippen
    expect(() => decryptToken(`${iv}.${roh.toString("base64url")}.${tag}`)).toThrow();
  });

  it("Bruchstuecke werden abgewiesen statt zu einem Absturz zu fuehren", () => {
    for (const muell of ["", "a", "a.b", "..."]) expect(() => decryptToken(muell)).toThrow();
  });
});

/* ═══ Schritt 6: Refresh mit Single-Flight ════════════════════════════════ */

/** Eine ChannelConnection, wie sie aus der Datenbank kaeme. */
function verbindung(opts: { id: string; abgelaufenIn: number; provider?: "GOOGLE" | "META" }) {
  return {
    id: opts.id,
    businessId: BETRIEB,
    provider: opts.provider ?? "GOOGLE",
    accountId: "accounts/111/locations/222",
    encAccessToken: encryptToken("altes-access-token"),
    encRefreshToken: opts.provider === "META" ? null : encryptToken("das-refresh-token"),
    expiresAt: new Date(Date.now() + opts.abgelaufenIn),
    status: "ACTIVE",
  };
}

const GOOGLE_REVIEWS = "https://mybusiness.googleapis.com/v4/accounts/111/locations/222/reviews";

/**
 * VOLLSTAENDIG, nicht nur der Host. Vorher stand hier ein startsWith auf
 * "https://businessprofileperformance.googleapis.com/" - damit war jeder Pfad
 * recht, und der falsche (mit accounts-Praefix, den es dort gar nicht gibt)
 * konnte jahrelang gruen durchlaufen. Wer den Pfad im Connector aendert, faellt
 * jetzt in den "Unerwarteter Aufruf"-Zweig des Doppelgaengers.
 */
const GOOGLE_PERFORMANCE =
  "https://businessprofileperformance.googleapis.com/v1" +
  "/locations/222:fetchMultiDailyMetricsTimeSeries" +
  "?dailyMetrics=BUSINESS_IMPRESSIONS_DESKTOP_MAPS" +
  "&dailyMetrics=BUSINESS_IMPRESSIONS_MOBILE_MAPS";

/**
 * Doppelgaenger fuer den Sync: haelt den Refresh an, bis freigeben() gerufen wird.
 * Nur so ueberlappen zwei Abfragen nachweislich - sonst waere ein einzelner
 * Refresh auch dann zu sehen, wenn sie schlicht nacheinander liefen.
 */
function syncDoppelgaenger() {
  let freigeben!: () => void;
  const halt = new Promise<void>((r) => {
    freigeben = r;
  });
  let neuesToken = "frisches-access-token";

  const aufrufe = doppelgaenger(async (url, init) => {
    if (url === GOOGLE_TOKEN) {
      await halt; // Refresh haengt, bis der Test loslaesst
      return { body: { access_token: neuesToken, expires_in: 3600 } };
    }
    if (url === GOOGLE_REVIEWS)
      return {
        body: {
          reviews: [
            { reviewId: "r1", starRating: "FIVE", comment: "top", createTime: "2026-08-01T10:00:00Z" },
          ],
        },
      };
    if (url === GOOGLE_PERFORMANCE) return { body: {} };
    throw new Error(`Unerwarteter Aufruf: ${url}`);
  });

  return {
    aufrufe,
    freigeben: () => freigeben(),
    setzeNeuesToken: (t: string) => {
      neuesToken = t;
    },
    refreshes: () => aufrufe.filter((a) => a.url === GOOGLE_TOKEN),
    reviewAufrufe: () => aufrufe.filter((a) => a.url === GOOGLE_REVIEWS),
    reichweiteAufrufe: () => aufrufe.filter((a) => a.url === GOOGLE_PERFORMANCE),
  };
}

/** Ein paar Runden Ereignisschleife, damit beide Abfragen sicher in der Luft sind. */
const durchatmen = () => new Promise((r) => setTimeout(r, 10));

describe("Schritt 6 - abgelaufenes Access-Token: genau EIN Refresh trotz zwei Abfragen", () => {
  it("zwei gleichzeitige Pulls teilen sich einen Refresh", async () => {
    const conn = verbindung({ id: "conn-parallel", abgelaufenIn: 60_000 }); // < 5 min Skew
    prismaMock.channelConnection.findUniqueOrThrow.mockResolvedValue(conn);
    prismaMock.channelConnection.update.mockResolvedValue(conn);
    const d = syncDoppelgaenger();

    const a = pullChannel("conn-parallel");
    const b = pullChannel("conn-parallel");
    await durchatmen(); // beide haengen jetzt am selben Refresh
    d.freigeben();
    await Promise.all([a, b]);

    // DAS ist die Messung: zwei Pulls, ein Refresh.
    expect(d.refreshes()).toHaveLength(1);
    expect(d.reviewAufrufe()).toHaveLength(2); // beide Pulls haben trotzdem gearbeitet

    // Der Refresh ging mit dem entschluesselten Refresh-Token raus, im Rumpf.
    const f = new URLSearchParams(d.refreshes()[0].body!);
    expect(f.get("grant_type")).toBe("refresh_token");
    expect(f.get("refresh_token")).toBe("das-refresh-token");
    expect(f.get("client_secret")).toBe("PLATZHALTER-google-client-secret");

    // Beide Pulls haben mit dem FRISCHEN Token gearbeitet, nicht mit dem alten.
    for (const r of d.reviewAufrufe()) {
      expect(r.headers?.Authorization).toBe("Bearer frisches-access-token");
    }

    // Und das neue Token wurde genau einmal verschluesselt zurueckgeschrieben.
    expect(prismaMock.channelConnection.update).toHaveBeenCalledTimes(1);
    const gespeichert = prismaMock.channelConnection.update.mock.calls[0][0];
    expect(decryptToken(gespeichert.data.encAccessToken)).toBe("frisches-access-token");
    expect(JSON.stringify(gespeichert)).not.toContain("frisches-access-token");
  });

  it("Gegenprobe: nacheinander sind es zwei Refreshes - gemessen wird also wirklich die Gleichzeitigkeit", async () => {
    // Ohne diese Gegenprobe koennte "ein Refresh" auch daher kommen, dass ueberhaupt
    // nur einmal refresht wird. Der Lock gilt pro laufendem Flug, nicht als Cache.
    const conn = verbindung({ id: "conn-nacheinander", abgelaufenIn: 60_000 });
    prismaMock.channelConnection.findUniqueOrThrow.mockResolvedValue(conn);
    prismaMock.channelConnection.update.mockResolvedValue(conn);
    const d = syncDoppelgaenger();
    d.freigeben(); // kein Anhalten - die Pulls laufen hintereinander durch

    await pullChannel("conn-nacheinander");
    await pullChannel("conn-nacheinander");

    expect(d.refreshes()).toHaveLength(2);
  });

  it("ist das Token noch lange gueltig, wird gar nicht refresht", async () => {
    const conn = verbindung({ id: "conn-frisch", abgelaufenIn: 60 * 60_000 });
    prismaMock.channelConnection.findUniqueOrThrow.mockResolvedValue(conn);
    const d = syncDoppelgaenger();
    d.freigeben();

    await pullChannel("conn-frisch");

    expect(d.refreshes()).toHaveLength(0);
    expect(d.reviewAufrufe()[0].headers?.Authorization).toBe("Bearer altes-access-token");
  });

  it("Meta laeuft ab, ohne erneuerbar zu sein -> Verbindung wird auf EXPIRED gesetzt", async () => {
    const conn = verbindung({ id: "conn-meta", abgelaufenIn: 60_000, provider: "META" });
    prismaMock.channelConnection.findUniqueOrThrow.mockResolvedValue(conn);
    prismaMock.channelConnection.update.mockResolvedValue(conn);
    const aufrufe = doppelgaenger((url) => {
      throw new Error(`Es haette kein Refresh versucht werden duerfen: ${url}`);
    });

    await expect(pullChannel("conn-meta")).rejects.toThrow(/Reconnect/);

    expect(aufrufe).toHaveLength(0);
    expect(prismaMock.channelConnection.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "EXPIRED" } }),
    );
  });

  it("die gelesenen Bewertungen kommen normalisiert in der Datenbank an", async () => {
    const conn = verbindung({ id: "conn-daten", abgelaufenIn: 60 * 60_000 });
    prismaMock.channelConnection.findUniqueOrThrow.mockResolvedValue(conn);
    const d = syncDoppelgaenger();
    d.freigeben();

    await pullChannel("conn-daten");

    expect(prismaMock.maitrReview.upsert).toHaveBeenCalledTimes(1);
    const arg = prismaMock.maitrReview.upsert.mock.calls[0][0];
    expect(arg.create).toMatchObject({ businessId: BETRIEB, source: "google", externalId: "r1", rating: 5 });

    // Der Pull holt BEIDES: Bewertungen und Reichweite - jeweils unter dem
    // vollstaendigen, oben festgeschriebenen Pfad.
    expect(d.reviewAufrufe()).toHaveLength(1);
    expect(d.reichweiteAufrufe()).toHaveLength(1);
  });
});

/* ═══ Befund zur Pruefbarkeit ═════════════════════════════════════════════ */

describe("Wo der Doppelgaenger eingesetzt werden kann - und wo nicht", () => {
  it("Kern: der Connector nimmt ein FetchLike entgegen, ganz ohne globales fetch", async () => {
    // Hier ist die Naht sauber: das globale fetch ist vermint, trotzdem laeuft es -
    // weil der Doppelgaenger als Parameter hereingereicht wird.
    vi.stubGlobal("fetch", () => {
      throw new Error("globales fetch darf hier nicht benutzt werden");
    });

    const reviews = await connectors.google.fetchReviews(
      {
        provider: "google",
        accessToken: "t",
        expiresAt: new Date().toISOString(),
        accountId: "accounts/111/locations/222",
      },
      async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          reviews: [{ reviewId: "r9", starRating: "FOUR", createTime: "2026-08-01T10:00:00Z" }],
        }),
      }),
    );

    expect(reviews[0]).toMatchObject({ id: "r9", source: "google", rating: 4 });
  });

  it("Server: der Token-Tausch haengt am globalen fetch - andere Naht gibt es nicht", async () => {
    // Belegt die Kehrseite: `exchangeCode` in routes.ts nimmt kein FetchLike. Wird
    // das globale fetch entfernt, bricht der Tausch - und nur darueber laesst er
    // sich von aussen ueberhaupt beobachten.
    vi.stubGlobal("fetch", () => {
      throw new Error("kein Netz");
    });
    const state = (await verbindeAuffordern("google")).searchParams.get("state")!;

    const res = await rueckSprung("google", { code: "code-vom-anbieter", state });

    expect(res.headers.location).toContain("status=error");
  });
});

/* ═══ Die zwei Google-Formen: gemessen, nicht geglaubt ════════════════════ */

/**
 * Google fuehrt EINE gespeicherte Kennung ("accounts/111/locations/222"), aber
 * ZWEI Pfadformen - und die Verwechslung faellt im Betrieb nicht auf, weil beide
 * APIs unter einem plausiblen Host liegen und der Fehler nur als "HTTP 404"
 * ankommt, also aussieht wie ein noch nicht freigegebener Zugang.
 *
 * Per curl gemessen, ohne Token:
 *   .../v1/locations/222:fetchMultiDailyMetricsTimeSeries              -> 401
 *   .../v1/accounts/111/locations/222:fetch...                         -> 404
 * 401 = Route existiert, nur nicht angemeldet. 404 = Route gibt es nicht.
 *
 * Die Tests hier pruefen deshalb den VOLLSTAENDIGEN Pfad, nicht den Host. Genau
 * daran ist es vorher durchgerutscht: der Doppelgaenger oben liess per
 * startsWith jeden Pfad auf dem Performance-Host als richtig durchgehen.
 */
describe("Google: Bewertungen brauchen die volle Form, Reichweite die kurze", () => {
  const tokens = {
    provider: "google" as const,
    accessToken: "t",
    expiresAt: new Date().toISOString(),
    accountId: "accounts/111/locations/222",
  };

  /** Merkt sich die aufgerufene URL und antwortet leer. Kein globales fetch noetig. */
  function urlMitschrieb() {
    const urls: string[] = [];
    const fetchLike = async (url: string) => {
      urls.push(url);
      return { ok: true, status: 200, json: async () => ({}) };
    };
    return { urls, fetchLike };
  }

  it("fetchReviews ruft mybusiness v4 MIT accounts-Praefix auf", async () => {
    const m = urlMitschrieb();

    await connectors.google.fetchReviews(tokens, m.fetchLike);

    expect(m.urls).toEqual([
      "https://mybusiness.googleapis.com/v4/accounts/111/locations/222/reviews",
    ]);
  });

  it("fetchEngagement ruft die Performance-API OHNE accounts-Praefix auf", async () => {
    const m = urlMitschrieb();

    await connectors.google.fetchEngagement(tokens, m.fetchLike);

    expect(m.urls).toEqual([GOOGLE_PERFORMANCE]);
    // Doppelt gesichert gegen ein Zurueckdrehen: die 404-Form darf nirgends stehen.
    expect(m.urls[0]).not.toContain("/v1/accounts/");
  });

  it("beide Formen stammen aus DERSELBEN gespeicherten Kennung - keine zweite Konfiguration", async () => {
    // Waere die kurze Form ein eigenes Feld, koennte sie von der langen abdriften.
    // Sie wird abgeleitet, also kann genau das nicht passieren.
    const r = urlMitschrieb();
    const e = urlMitschrieb();
    const andere = { ...tokens, accountId: "accounts/999/locations/888" };

    await connectors.google.fetchReviews(andere, r.fetchLike);
    await connectors.google.fetchEngagement(andere, e.fetchLike);

    expect(r.urls[0]).toContain("/v4/accounts/999/locations/888/reviews");
    expect(e.urls[0]).toContain("/v1/locations/888:fetchMultiDailyMetricsTimeSeries");
    expect(e.urls[0]).not.toContain("999");
  });

  it("Muell in der Kennung wird auf BEIDEN Wegen abgewiesen, bevor irgendetwas rausgeht", async () => {
    // Die Zerlegung ist zugleich die Pruefung - sie darf beim Umbau nicht
    // versehentlich nur noch an einem der beiden Aufrufe haengen.
    for (const kaputt of ["locations/222", "accounts/111", "../../etc", "accounts/1/locations/2/x"]) {
      const m = urlMitschrieb();
      await expect(connectors.google.fetchReviews({ ...tokens, accountId: kaputt }, m.fetchLike)).rejects.toThrow(
        /Ungültige Google/,
      );
      await expect(
        connectors.google.fetchEngagement({ ...tokens, accountId: kaputt }, m.fetchLike),
      ).rejects.toThrow(/Ungültige Google/);
      expect(m.urls).toEqual([]);
    }
  });
});
