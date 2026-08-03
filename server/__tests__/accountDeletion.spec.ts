// @vitest-environment node
/**
 * In-App-Kontolöschung (DELETE /api/users/me).
 *
 * Anlass: Apple App Store Review 5.1.1(v) verlangt, dass ein Konto, das in der
 * App angelegt werden kann, dort auch gelöscht werden kann. Es gab bis dahin
 * keinen einzigen Löschpfad – nur den reaktiven Clerk-Webhook.
 *
 * Geprüft wird das, was bei einer unwiderruflichen Löschung schiefgehen kann:
 * dass sie ohne Anmeldung läuft, dass sie einen fremden Datensatz trifft, dass
 * sie einen Betrieb mitreißt, an dem noch jemand anderes hängt, oder dass sie
 * die hochgeladenen Bilder in einem ÖFFENTLICHEN Bucket zurücklässt. Die
 * Datenbank wird dabei nie angefasst – Prisma, Clerk und der Speicher sind
 * gemockt; der zweite Block unten testet die echte Speicher-Funktion gegen ein
 * nachgebautes Supabase.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const { prismaMock, deleteUserMock, deleteUserMediaMock } = vi.hoisted(() => ({
  prismaMock: {
    businessMember: { findMany: vi.fn() },
    configuration: { findMany: vi.fn() },
    scraperJob: { deleteMany: vi.fn() },
    business: { deleteMany: vi.fn() },
    user: { delete: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
  deleteUserMock: vi.fn(),
  deleteUserMediaMock: vi.fn(),
}));

vi.mock("../db/prisma", () => ({ default: prismaMock, prisma: prismaMock }));
vi.mock("@clerk/clerk-sdk-node", () => ({
  clerkClient: {
    users: { deleteUser: deleteUserMock, getUser: vi.fn(), updateUser: vi.fn() },
  },
  verifyToken: vi.fn(),
}));
// Nur für die Routen-Tests. Die echte Funktion wird weiter unten über
// vi.importActual geholt und einzeln geprüft.
vi.mock("../services/supabaseStorage", () => ({
  deleteUserMedia: deleteUserMediaMock,
  storageConfigured: () => true,
  uploadImageToStorage: vi.fn(),
}));

import { usersRouter } from "../routes/users";
import { createServer } from "../index";

const ME = { id: "user-eigen", email: "ich@example.de", clerkId: "user_clerk_eigen" };
/** Die ID, die ein Angreifer im Body unterschieben würde. */
const FREMD = "user-fremd";

/**
 * Mini-App mit fest eingesetztem req.user.
 *
 * requireAuth wird hier bewusst NICHT durchlaufen – sonst bräuchte der Test ein
 * echtes Clerk-Token. Dass die Route in der echten App hinter requireAuth hängt,
 * prüft der 401-Test weiter unten gegen createServer().
 */
function appAlsAngemeldet() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).user = ME;
    next();
  });
  app.use("/api/users", usersRouter);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.businessMember.findMany.mockResolvedValue([]);
  prismaMock.configuration.findMany.mockResolvedValue([]);
  prismaMock.$transaction.mockResolvedValue([]);
  prismaMock.auditLog.create.mockResolvedValue({});
  deleteUserMock.mockResolvedValue({});
  deleteUserMediaMock.mockResolvedValue({ deleted: 0, skipped: false });
});

describe("DELETE /api/users/me", () => {
  it("antwortet ohne Token mit 401 – in der ECHTEN App", async () => {
    const res = await request(createServer()).delete("/api/users/me").send({});

    expect(res.status).toBe(401);
    // Und zwar, ohne vorher irgendetwas gelöscht zu haben.
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it("löscht genau den angemeldeten Nutzer – in der DB und bei Clerk", async () => {
    const res = await request(appAlsAngemeldet()).delete("/api/users/me").send({});

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true });
    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: ME.id } });
    expect(prismaMock.user.delete).toHaveBeenCalledTimes(1);
    expect(deleteUserMock).toHaveBeenCalledWith(ME.clerkId);
    // Die Löschung läuft als eine Transaktion, nicht als Folge von Einzelschritten.
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it("ignoriert eine fremde Nutzer-ID im Body vollständig", async () => {
    const res = await request(appAlsAngemeldet())
      .delete("/api/users/me")
      .send({ userId: FREMD, id: FREMD, clerkId: "user_clerk_fremd" });

    expect(res.status).toBe(200);
    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: ME.id } });
    expect(deleteUserMock).toHaveBeenCalledWith(ME.clerkId);

    // Kein einziger Aufruf – Lesen wie Löschen – darf die fremde ID enthalten.
    const alleAufrufe = [
      ...prismaMock.businessMember.findMany.mock.calls,
      ...prismaMock.configuration.findMany.mock.calls,
      ...prismaMock.scraperJob.deleteMany.mock.calls,
      ...prismaMock.business.deleteMany.mock.calls,
      ...prismaMock.user.delete.mock.calls,
      ...deleteUserMock.mock.calls,
      // Besonders heikel: Das Medien-Präfix ist der EINZIGE Schutz davor,
      // fremde Bilder zu löschen.
      ...deleteUserMediaMock.mock.calls,
    ];
    expect(JSON.stringify(alleAufrufe)).not.toContain("fremd");
  });

  it("löscht nur die Betriebe, an denen sonst niemand mehr hängt", async () => {
    prismaMock.businessMember.findMany
      // 1. Aufruf: die eigenen Mitgliedschaften.
      .mockResolvedValueOnce([{ businessId: "b-allein" }, { businessId: "b-geteilt" }])
      // 2. Aufruf: weitere Mitglieder dieser Betriebe.
      .mockResolvedValueOnce([{ businessId: "b-geteilt" }]);

    await request(appAlsAngemeldet()).delete("/api/users/me").send({});

    expect(prismaMock.business.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["b-allein"] } },
    });
  });

  it("lässt einen Betrieb stehen, auf den eine fremde Konfiguration zeigt", async () => {
    prismaMock.businessMember.findMany
      .mockResolvedValueOnce([{ businessId: "b-allein" }])
      .mockResolvedValueOnce([]);
    prismaMock.configuration.findMany.mockResolvedValueOnce([{ businessId: "b-allein" }]);

    await request(appAlsAngemeldet()).delete("/api/users/me").send({});

    expect(prismaMock.business.deleteMany).not.toHaveBeenCalled();
    // Das eigene Konto verschwindet trotzdem.
    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: ME.id } });
  });

  it("meldet einen Fehlschlag als 500 und hinterlässt einen Audit-Eintrag", async () => {
    prismaMock.$transaction.mockRejectedValueOnce(new Error("DB weg"));

    const res = await request(appAlsAngemeldet()).delete("/api/users/me").send({});

    expect(res.status).toBe(500);
    // Clerk darf dann nicht angefasst werden - sonst stünde der Nutzer ohne
    // Anmeldung, aber mit allen Daten da.
    expect(deleteUserMock).not.toHaveBeenCalled();
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: ME.id,
          resource: "user",
          success: false,
        }),
      }),
    );
  });

  it("meldet 502, wenn nur die Clerk-Löschung scheitert", async () => {
    deleteUserMock.mockRejectedValueOnce(new Error("Clerk down"));

    const res = await request(appAlsAngemeldet()).delete("/api/users/me").send({});

    // Kein 200: sonst meldete die App „gelöscht", der Nutzer könnte sich aber
    // weiter anmelden und bekäme ein leeres Konto.
    expect(res.status).toBe(502);
    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: ME.id } });
  });

  it("löscht die hochgeladenen Bilder – und zwar VOR der Datenbank", async () => {
    deleteUserMediaMock.mockResolvedValueOnce({ deleted: 3, skipped: false });

    const res = await request(appAlsAngemeldet()).delete("/api/users/me").send({});

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, deletedMedia: 3 });
    // Das Präfix im Speicher ist die Nutzer-ID aus dem Token, nichts anderes.
    expect(deleteUserMediaMock).toHaveBeenCalledWith(ME.id);

    // Die Reihenfolge ist der eigentliche Punkt: Nach dem Löschen der
    // Nutzerzeile legt der Lazy Sync beim nächsten Login eine NEUE ID an – das
    // alte Bildpräfix wäre dann von keinem Aufruf mehr erreichbar.
    expect(deleteUserMediaMock.mock.invocationCallOrder[0]).toBeLessThan(
      prismaMock.$transaction.mock.invocationCallOrder[0],
    );
  });

  it("löscht das Konto auch, wenn gar kein Speicher konfiguriert ist", async () => {
    // Ohne SUPABASE_SERVICE_ROLE_KEY konnte nie etwas hochgeladen werden. Das
    // darf die Löschung nicht blockieren – sonst wäre sie in jeder Umgebung
    // ohne Speicher unmöglich, und Apple 5.1.1(v) verlangt sie ausnahmslos.
    deleteUserMediaMock.mockResolvedValueOnce({ deleted: 0, skipped: true });

    const res = await request(appAlsAngemeldet()).delete("/api/users/me").send({});

    expect(res.status).toBe(200);
    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: ME.id } });
    expect(deleteUserMock).toHaveBeenCalledWith(ME.clerkId);
  });

  it("bricht mit 503 ab und löscht NICHTS, wenn die Bilder nicht weggehen", async () => {
    deleteUserMediaMock.mockRejectedValueOnce(new Error("Storage 500"));

    const res = await request(appAlsAngemeldet()).delete("/api/users/me").send({});

    // Begründung des Entwurfs: Ein Teilerfolg wäre hier das schlechteste
    // Ergebnis. Liefe der Vorgang weiter, wäre die Datenbank leer, die Fotos
    // lägen weiter in einem öffentlichen Bucket – und ein zweiter Versuch käme
    // nie wieder an sie heran (neue Nutzer-ID nach dem Lazy Sync). Also lieber
    // gar nicht löschen und ehrlich sagen, dass nichts passiert ist.
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/nichts gelöscht/i);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
    expect(deleteUserMock).not.toHaveBeenCalled();

    // Der Fehlversuch bleibt nachvollziehbar: Der Nutzer existiert noch, der
    // Fremdschlüssel hält, der Audit-Eintrag bleibt stehen.
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: ME.id,
          action: "account_deleted",
          success: false,
          errorMessage: "Storage 500",
        }),
      }),
    );
  });
});

/* ────────────────────────────────────────────────────────────────────────────
 * Die echte Speicher-Funktion gegen ein nachgebautes Supabase.
 *
 * Wichtig genug für eigene Tests, weil zwei Eigenschaften der Supabase-REST-API
 * leicht zu übersehen sind und beide dazu führen, dass Bilder liegen bleiben,
 * obwohl der Aufruf „erfolgreich" meldet:
 *   1. Eine Auflistung liefert höchstens 100 Einträge pro Aufruf.
 *   2. Sie listet je EBENE – Unterordner kommen als Eintrag ohne id zurück,
 *      nicht als Objekt (imageIngest legt unter <userId>/gallery/ ab).
 * ────────────────────────────────────────────────────────────────────────── */

/** Antwort-Attrappe: nur das, was der Code tatsächlich anfasst. */
function antwort(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  };
}

/**
 * Nachgebautes Supabase Storage über einem flachen Bestand von Objektpfaden.
 * Bildet die beiden Eigenschaften von oben nach: Seitenlimit und Ebenen.
 */
function fakeStorage(bestand: string[]) {
  const objekte = new Set(bestand);
  const geloescht: string[][] = [];
  const listAufrufe: Array<{ prefix: string; offset: number }> = [];

  const fetchMock = vi.fn(async (input: unknown, init: any) => {
    const adresse = String(input);
    const rumpf = init?.body ? JSON.parse(init.body) : {};

    if (adresse.endsWith("/storage/v1/object/list/media")) {
      listAufrufe.push({ prefix: rumpf.prefix, offset: rumpf.offset });

      // Direkte Kinder des Präfix: Datei → id gesetzt, Ordner → id null.
      const kinder = new Map<string, boolean>();
      for (const pfad of objekte) {
        if (!pfad.startsWith(`${rumpf.prefix}/`)) continue;
        const rest = pfad.slice(rumpf.prefix.length + 1);
        const schraeg = rest.indexOf("/");
        if (schraeg === -1) kinder.set(rest, false);
        else kinder.set(rest.slice(0, schraeg), true);
      }

      const sortiert = [...kinder.entries()].sort(([a], [b]) => a.localeCompare(b));
      const seite = sortiert
        .slice(rumpf.offset, rumpf.offset + rumpf.limit)
        .map(([name, istOrdner]) => ({ name, id: istOrdner ? null : `id-${name}` }));
      return antwort(200, seite);
    }

    if (adresse.endsWith("/storage/v1/object/media") && init?.method === "DELETE") {
      geloescht.push(rumpf.prefixes);
      for (const pfad of rumpf.prefixes) objekte.delete(pfad);
      return antwort(200, { message: "Successfully deleted" });
    }

    throw new Error(`Unerwarteter Aufruf: ${init?.method ?? "POST"} ${adresse}`);
  });

  return { fetchMock, objekte, geloescht, listAufrufe };
}

/** Die ECHTE Funktion – vi.mock oben gilt hier bewusst nicht. */
async function echteLoeschung() {
  const modul = await vi.importActual<typeof import("../services/supabaseStorage")>(
    "../services/supabaseStorage",
  );
  return modul.deleteUserMedia;
}

describe("deleteUserMedia", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "https://projekt.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("löscht auch Unterordner und mehr als eine Seite voll Objekte", async () => {
    // 150 Direktuploads (media.ts) + 2 übernommene Galeriebilder (imageIngest).
    const eigene = [
      ...Array.from({ length: 150 }, (_, i) =>
        `${ME.id}/${String(i).padStart(4, "0")}.jpg`,
      ),
      `${ME.id}/gallery/aaa.jpg`,
      `${ME.id}/gallery/bbb.webp`,
    ];
    const fremde = [`${FREMD}/0000.jpg`, `${FREMD}/gallery/ccc.jpg`];
    const speicher = fakeStorage([...eigene, ...fremde]);
    vi.stubGlobal("fetch", speicher.fetchMock);

    const deleteUserMedia = await echteLoeschung();
    const ergebnis = await deleteUserMedia(ME.id);

    expect(ergebnis).toEqual({ deleted: 152, skipped: false });
    // Nichts von diesem Nutzer bleibt übrig …
    expect([...speicher.objekte].filter((p) => p.startsWith(`${ME.id}/`))).toEqual([]);
    // … und nichts von irgendwem sonst wird angefasst.
    expect([...speicher.objekte].sort()).toEqual([...fremde].sort());

    // Beweis, dass wirklich geblättert und abgestiegen wurde.
    expect(speicher.listAufrufe).toContainEqual({ prefix: ME.id, offset: 100 });
    expect(speicher.listAufrufe).toContainEqual({
      prefix: `${ME.id}/gallery`,
      offset: 0,
    });
  });

  it("wirft, wenn der Löschaufruf fehlschlägt – kein stiller Fehlschlag", async () => {
    const speicher = fakeStorage([`${ME.id}/0000.jpg`]);
    speicher.fetchMock.mockImplementationOnce(async () =>
      antwort(200, [{ name: "0000.jpg", id: "id-0000.jpg" }]),
    );
    speicher.fetchMock.mockImplementationOnce(async () =>
      antwort(500, "Internal Error"),
    );
    vi.stubGlobal("fetch", speicher.fetchMock);

    const deleteUserMedia = await echteLoeschung();

    // Der Aufrufer MUSS das mitbekommen – er hängt seine Entscheidung daran,
    // ob er die Datenbank überhaupt anfasst.
    await expect(deleteUserMedia(ME.id)).rejects.toThrow(/Löschen fehlgeschlagen: 500/);
  });

  it("meldet skipped statt zu werfen, wenn kein Speicher konfiguriert ist", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const deleteUserMedia = await echteLoeschung();

    await expect(deleteUserMedia(ME.id)).resolves.toEqual({
      deleted: 0,
      skipped: true,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("weist eine leere Nutzer-ID ab, statt den ganzen Bucket zu leeren", async () => {
    const speicher = fakeStorage([`${ME.id}/0000.jpg`, `${FREMD}/0000.jpg`]);
    vi.stubGlobal("fetch", speicher.fetchMock);

    const deleteUserMedia = await echteLoeschung();

    for (const boese of ["", "..", "a/b", "*"]) {
      await expect(deleteUserMedia(boese)).rejects.toThrow(/Ungültige Nutzer-ID/);
    }
    expect(speicher.fetchMock).not.toHaveBeenCalled();
  });
});
