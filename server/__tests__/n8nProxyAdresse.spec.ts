import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response } from "express";
import { handleForwardN8n } from "../routes/n8nProxy";

/**
 * `/api/forward-to-n8n` bleibt bewusst ohne Anmeldung erreichbar - alle drei
 * Aufrufer (Landingpage, CheckLanding, ModeSelection) laufen VOR der
 * Registrierung, eine Schranke davor entfernte den Trichter und nicht den
 * Missbrauch. Was den Endpunkt trotzdem tragbar macht, steht hier unter Test:
 *
 *   • `link` wird gegen dieselben Regeln geprueft wie in `safeFetch`, BEVOR er
 *     das Haus verlaesst. Der n8n-Flow macht seine eigenen HTTP-Anfragen ohne
 *     jede dieser Schranken - ohne diese Pruefung ist der SSRF-Schutz nur einen
 *     Rechner weitergeschoben.
 *   • Es geht ausschliesslich weiter, was im Schema steht.
 */

function antwortDoppel() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    send(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: any };
}

const anfrage = (body: unknown) => ({ body }) as Request;

describe("handleForwardN8n", () => {
  const alteUrl = process.env.N8N_WEBHOOK_URL;

  beforeEach(() => {
    process.env.N8N_WEBHOOK_URL = "https://n8n.example.invalid/webhook/entry";
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (alteUrl === undefined) delete process.env.N8N_WEBHOOK_URL;
    else process.env.N8N_WEBHOOK_URL = alteUrl;
  });

  it("weist den Metadaten-Dienst der Cloud ab, ohne ihn abzurufen", async () => {
    const holen = vi.spyOn(globalThis, "fetch");
    const res = antwortDoppel();

    await handleForwardN8n(
      anfrage({ link: "http://169.254.169.254/latest/meta-data/" }),
      res,
    );

    expect(res.statusCode).toBe(400);
    // Entscheidend: Es ging GAR KEINE Anfrage hinaus - weder an n8n noch an
    // die Adresse selbst.
    expect(holen).not.toHaveBeenCalled();
  });

  it("weist das interne Netz ab", async () => {
    const holen = vi.spyOn(globalThis, "fetch");
    for (const link of [
      "http://127.0.0.1:5432/",
      "http://10.0.0.5/",
      "http://192.168.1.1/admin",
      "http://[::1]/",
    ]) {
      const res = antwortDoppel();
      await handleForwardN8n(anfrage({ link }), res);
      expect(res.statusCode, link).toBe(400);
    }
    expect(holen).not.toHaveBeenCalled();
  });

  it("weist fremde Protokolle ab", async () => {
    const holen = vi.spyOn(globalThis, "fetch");
    for (const link of [
      "file:///etc/passwd",
      "gopher://x.de/",
      "data:text/html,<script>",
    ]) {
      const res = antwortDoppel();
      await handleForwardN8n(anfrage({ link }), res);
      expect(res.statusCode, link).toBe(400);
    }
    expect(holen).not.toHaveBeenCalled();
  });

  it("verraet nicht, WORAN die Adresse gescheitert ist", async () => {
    const res = antwortDoppel();
    await handleForwardN8n(anfrage({ link: "http://10.0.0.5/" }), res);
    // "loest auf 10.0.0.5 auf" waere eine Auskunft ueber das interne Netz.
    expect(JSON.stringify(res.body)).not.toContain("10.0.0.5");
  });

  it("weist einen fehlenden oder unbrauchbaren link ab", async () => {
    for (const body of [{}, { link: "" }, { link: "kein-url" }, { link: 42 }]) {
      const res = antwortDoppel();
      await handleForwardN8n(anfrage(body), res);
      expect(res.statusCode, JSON.stringify(body)).toBe(400);
    }
  });

  it("reicht NUR die Felder des Schemas weiter", async () => {
    const holen = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new global.Response("{}", { status: 200 }));
    const res = antwortDoppel();

    await handleForwardN8n(
      anfrage({
        link: "https://example.com/",
        timestamp: "2026-08-14T10:00:00.000Z",
        // Die Besitzkette haengt daran, dass n8n keine userId gesetzt bekommt.
        userId: "fremde-kennung",
        deepScrape: true,
      }),
      res,
    );

    expect(holen).toHaveBeenCalledTimes(1);
    const gesendet = JSON.parse(String(holen.mock.calls[0][1]?.body));
    expect(gesendet).toEqual({
      link: "https://example.com/",
      timestamp: "2026-08-14T10:00:00.000Z",
    });
    expect(gesendet).not.toHaveProperty("userId");
    expect(gesendet).not.toHaveProperty("deepScrape");
  });

  it("gibt die Antwort von n8n im Fehlerfall NICHT nach draussen", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new global.Response(
        'workflow "Entry-Flow" node http://postgres.railway.internal failed',
        { status: 404 },
      ),
    );
    const res = antwortDoppel();

    await handleForwardN8n(anfrage({ link: "https://example.com/" }), res);

    expect(res.statusCode).toBe(502);
    expect(JSON.stringify(res.body)).not.toContain("railway.internal");
    expect(JSON.stringify(res.body)).not.toContain("Entry-Flow");
  });
});
