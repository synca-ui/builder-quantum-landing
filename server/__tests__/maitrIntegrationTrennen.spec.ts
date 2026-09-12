// @vitest-environment node
/**
 * DELETE /integrations/:provider - „Verbindung trennen", serverseitig.
 *
 * ANLASS: Der Knopf in der App gab es, sein Gegenstück nicht (AUFGABEN.md C6).
 * „Trennen" löschte nur den Zustand des Geräts; die Token blieben ACTIVE, der
 * Scheduler zog weiter. Google fragt im OAuth-Antrag ausdrücklich, wie Nutzer den
 * Zugriff widerrufen - diese Frage war damit nicht wahrheitsgemäß zu beantworten.
 *
 * Was hier belegt wird, ohne Google und ohne Meta (Doppelgänger wie in
 * maitrOAuthWeg.spec.ts):
 *
 *  • Der Widerruf geht an den RICHTIGEN Endpunkt, mit dem Token im Rumpf bzw.
 *    im Authorization-Header - nie in der URL.
 *  • Der Widerruf passiert VOR dem Löschen. Danach wäre das Token weg und ein
 *    Widerruf unmöglich; die Reihenfolge ist gemessen, nicht behauptet.
 *  • Gelöscht wird IMMER - auch wenn der Anbieter ablehnt oder nicht erreichbar
 *    ist. Der Wille des Betriebs hängt nicht an der Verfügbarkeit von Google.
 *    Die Antwort trägt `providerRevoked`, damit die App den Unterschied zeigen kann.
 *  • Nur der Inhaber. Eine Aushilfe bekommt 403, und es wird weder beim Anbieter
 *    angeklopft noch gelöscht.
 *  • In der Antwort steht kein Token - weder Klartext noch Chiffrat.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

vi.hoisted(() => {
  const hex = (bytes: number) =>
    Array.from(globalThis.crypto.getRandomValues(new Uint8Array(bytes)), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
  Object.assign(process.env, {
    MAITR_ENCRYPTION_KEY: hex(32),
    MAITR_OAUTH_STATE_SECRET: hex(24),
    MAITR_API_BASE_URL: "https://api.maitr.test/api",
    MAITR_APP_DEEP_LINK: "maitr://connected",
    META_WEBHOOK_VERIFY_TOKEN: hex(16),
    GOOGLE_CLIENT_ID: "PLATZHALTER-google-client-id",
    GOOGLE_CLIENT_SECRET: "PLATZHALTER-google-client-secret",
    META_APP_ID: "PLATZHALTER-meta-app-id",
    META_APP_SECRET: "PLATZHALTER-meta-app-secret",
  });
});

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    businessMember: { findUnique: vi.fn() },
    channelConnection: { findUnique: vi.fn(), delete: vi.fn() },
  },
}));
vi.mock("../db/prisma", () => ({ default: prismaMock, prisma: prismaMock }));

import { maitrErrorHandler } from "../maitr/index";
import { integrationsRouter } from "../maitr/routes";
import { encryptToken } from "../maitr/security";

const WIRT = "user-wirt";
const BETRIEB = "biz-goldstueck";

let rolle: "OWNER" | "STAFF" = "OWNER";

function api() {
  const maitr = express.Router();
  maitr.use((req, _res, next) => {
    req.userId = WIRT;
    next();
  });
  maitr.use("/integrations", integrationsRouter);
  maitr.use(maitrErrorHandler);
  const app = express();
  app.use(express.json());
  app.use("/api/maitr", maitr);
  return app;
}

/* ── Der Doppelgänger für den Anbieter ─────────────────────────────────────
 * Zeichnet jeden Aufruf auf UND merkt sich die Reihenfolge gegenüber dem
 * Löschen - dafür schreibt auch der delete-Mock in dieselbe Liste. */
interface Aufruf {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}
let ablauf: string[] = [];
let aufrufe: Aufruf[] = [];

function doppelgaenger(antwort: (url: string) => { status?: number; body?: unknown } | never) {
  vi.stubGlobal(
    "fetch",
    async (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => {
      aufrufe.push({ url, method: init?.method, headers: init?.headers, body: init?.body });
      ablauf.push("anbieter");
      const a = antwort(url);
      const status = a.status ?? 200;
      return { ok: status >= 200 && status < 300, status, json: async () => a.body };
    },
  );
}

function keinNetz() {
  doppelgaenger((url) => {
    throw new Error(`Es hätte kein Anbieter-Aufruf passieren dürfen: ${url}`);
  });
}

const ZUGRIFF = "klartext-zugriff-token";
const ERNEUERUNG = "klartext-refresh-token";

function verbindung(provider: "GOOGLE" | "META", mitRefresh = true) {
  return {
    id: `conn-${provider.toLowerCase()}`,
    businessId: BETRIEB,
    provider,
    accountId: provider === "GOOGLE" ? "accounts/1/locations/2" : "123456",
    status: "ACTIVE",
    expiresAt: new Date(Date.now() + 3_600_000),
    scopes: [],
    encAccessToken: encryptToken(ZUGRIFF),
    encRefreshToken: mitRefresh ? encryptToken(ERNEUERUNG) : null,
  };
}

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  ablauf = [];
  aufrufe = [];
  rolle = "OWNER";
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  prismaMock.businessMember.findUnique.mockImplementation(
    async ({ where }: { where: { userId_businessId: { userId: string; businessId: string } } }) =>
      where.userId_businessId.userId === WIRT && where.userId_businessId.businessId === BETRIEB
        ? { role: rolle }
        : null,
  );
  prismaMock.channelConnection.delete.mockImplementation(async (args: unknown) => {
    ablauf.push("loeschen");
    return args;
  });
});

afterEach(() => {
  warnSpy.mockRestore();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function trennen(provider: string) {
  return request(api()).delete(`/api/maitr/integrations/${provider}`).query({ venueId: BETRIEB });
}

describe("DELETE /integrations/:provider - Google", () => {
  it("widerruft mit dem Refresh-Token im Rumpf, löscht danach die Zeile und liefert kein Token aus", async () => {
    prismaMock.channelConnection.findUnique.mockResolvedValue(verbindung("GOOGLE"));
    doppelgaenger(() => ({ status: 200, body: {} }));

    const res = await trennen("google");

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body).toEqual({ provider: "GOOGLE", providerRevoked: true });

    // Genau ein Anbieter-Aufruf, an den Widerrufs-Endpunkt, per POST.
    expect(aufrufe).toHaveLength(1);
    const [a] = aufrufe;
    expect(a.url).toBe("https://oauth2.googleapis.com/revoke");
    expect(a.method).toBe("POST");
    // Das REFRESH-Token - es widerruft den ganzen Grant. Im Rumpf, nicht in der URL.
    expect(new URLSearchParams(a.body).get("token")).toBe(ERNEUERUNG);
    expect(a.url).not.toContain(ERNEUERUNG);
    expect(a.url).not.toContain(ZUGRIFF);

    // Reihenfolge: erst widerrufen, dann löschen. Andersherum wäre das Token weg,
    // bevor es beim Anbieter ankommt.
    expect(ablauf).toEqual(["anbieter", "loeschen"]);
    expect(prismaMock.channelConnection.delete).toHaveBeenCalledWith({ where: { id: "conn-google" } });

    // Nichts Geheimes in der Antwort.
    const roh = JSON.stringify(res.body);
    expect(roh).not.toContain(ZUGRIFF);
    expect(roh).not.toContain(ERNEUERUNG);
    expect(roh).not.toContain("enc");
  });

  it("ohne Refresh-Token fällt der Widerruf auf das Access-Token zurück", async () => {
    prismaMock.channelConnection.findUnique.mockResolvedValue(verbindung("GOOGLE", false));
    doppelgaenger(() => ({ status: 200, body: {} }));

    const res = await trennen("google");

    expect(res.status).toBe(200);
    expect(new URLSearchParams(aufrufe[0].body).get("token")).toBe(ZUGRIFF);
  });

  it("Anbieter lehnt ab (400): trotzdem gelöscht, aber providerRevoked=false", async () => {
    prismaMock.channelConnection.findUnique.mockResolvedValue(verbindung("GOOGLE"));
    doppelgaenger(() => ({ status: 400, body: { error: "invalid_token" } }));

    const res = await trennen("google");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ provider: "GOOGLE", providerRevoked: false });
    expect(prismaMock.channelConnection.delete).toHaveBeenCalledTimes(1);
  });

  it("Anbieter nicht erreichbar: trotzdem gelöscht, providerRevoked=false, kein 500", async () => {
    prismaMock.channelConnection.findUnique.mockResolvedValue(verbindung("GOOGLE"));
    vi.stubGlobal("fetch", async () => {
      ablauf.push("anbieter");
      throw new Error("ECONNRESET");
    });

    const res = await trennen("google");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ provider: "GOOGLE", providerRevoked: false });
    expect(ablauf).toEqual(["anbieter", "loeschen"]);
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe("DELETE /integrations/:provider - Meta", () => {
  it("entzieht alle Berechtigungen per DELETE /me/permissions, Token im Header, nicht in der URL", async () => {
    prismaMock.channelConnection.findUnique.mockResolvedValue(verbindung("META", false));
    doppelgaenger(() => ({ status: 200, body: { success: true } }));

    const res = await trennen("meta");

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body).toEqual({ provider: "META", providerRevoked: true });

    const [a] = aufrufe;
    expect(a.url).toBe("https://graph.facebook.com/v21.0/me/permissions");
    expect(a.method).toBe("DELETE");
    expect(a.headers?.Authorization).toBe(`Bearer ${ZUGRIFF}`);
    expect(a.url).not.toContain(ZUGRIFF);
    expect(ablauf).toEqual(["anbieter", "loeschen"]);
  });

  it("`success: false` vom Graph zählt nicht als Widerruf", async () => {
    prismaMock.channelConnection.findUnique.mockResolvedValue(verbindung("META", false));
    doppelgaenger(() => ({ status: 200, body: { success: false } }));

    const res = await trennen("meta");

    expect(res.body).toEqual({ provider: "META", providerRevoked: false });
    expect(prismaMock.channelConnection.delete).toHaveBeenCalledTimes(1);
  });
});

describe("DELETE /integrations/:provider - Schranken", () => {
  it("Aushilfe: 403 nur_inhaber, kein Anbieter-Aufruf, nichts gelöscht, nicht einmal nachgesehen", async () => {
    rolle = "STAFF";
    prismaMock.channelConnection.findUnique.mockResolvedValue(verbindung("GOOGLE"));
    keinNetz();

    const res = await trennen("google");

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "nur_inhaber" });
    expect(prismaMock.channelConnection.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.channelConnection.delete).not.toHaveBeenCalled();
    expect(ablauf).toEqual([]);
  });

  it("nicht verbunden: 404 nicht_verbunden, kein Anbieter-Aufruf", async () => {
    prismaMock.channelConnection.findUnique.mockResolvedValue(null);
    keinNetz();

    const res = await trennen("google");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "nicht_verbunden" });
    expect(prismaMock.channelConnection.delete).not.toHaveBeenCalled();
  });

  it("sucht ausschließlich im geprüften Betrieb und beim genannten Anbieter", async () => {
    prismaMock.channelConnection.findUnique.mockResolvedValue(null);
    keinNetz();

    await trennen("meta");

    expect(prismaMock.channelConnection.findUnique.mock.calls[0][0].where).toEqual({
      businessId_provider: { businessId: BETRIEB, provider: "META" },
    });
  });

  it("unbekannter Anbieter (auch WhatsApp - dafür gibt es keinen OAuth-Grant): 400", async () => {
    keinNetz();

    for (const p of ["whatsapp", "yelp", "GOOGLE"]) {
      const res = await trennen(p);
      expect(res.status, p).toBe(400);
    }
    expect(prismaMock.channelConnection.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.channelConnection.delete).not.toHaveBeenCalled();
  });
});
