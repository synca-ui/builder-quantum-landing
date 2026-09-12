import { describe, it, expect, vi, afterEach } from "vitest";
import { configurationApi, sessionApi } from "../api";

// Alle Routen in server/routes/configurations.ts antworten mit
// `{ success, data, message }`. apiRequest reichte diese Hülle früher als
// `data` durch: Im Konfigurator war `saved.id` deshalb immer undefined, die
// ID wurde nie gemerkt, und saveConfiguration legte bei jedem Speichern eine
// neue Konfiguration an, statt die bestehende zu aktualisieren.
function antworteMit(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function gesendeterBody(fetchMock: ReturnType<typeof vi.fn>) {
  const [, init] = fetchMock.mock.calls[0];
  return JSON.parse(init.body);
}

describe("configurationApi.save", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("liefert beim Anlegen die neue Konfiguration samt id", async () => {
    const fetchMock = antworteMit(
      {
        success: true,
        data: { id: "cfg_1", businessName: "Bella", status: "draft" },
        message: "Configuration created successfully",
      },
      201,
    );

    const res = await configurationApi.save({ businessName: "Bella" }, "tok");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/configurations");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(res.success).toBe(true);
    expect(res.data?.id).toBe("cfg_1");
    expect(res.data).toEqual({
      id: "cfg_1",
      businessName: "Bella",
      status: "draft",
    });
    expect(res.message).toBe("Configuration created successfully");
  });

  it("schickt beim Aktualisieren die id mit und packt die Antwort aus", async () => {
    const fetchMock = antworteMit({
      success: true,
      data: { id: "cfg_1", businessName: "Bella Neu" },
      message: "Configuration updated successfully",
    });

    const res = await configurationApi.save(
      { id: "cfg_1", businessName: "Bella Neu" },
      "tok",
    );

    expect(gesendeterBody(fetchMock).id).toBe("cfg_1");
    expect(res.success).toBe(true);
    expect(res.data).toEqual({ id: "cfg_1", businessName: "Bella Neu" });
  });

  it("meldet abgelehnte Validierung als Fehlschlag", async () => {
    antworteMit(
      { error: "Invalid configuration data", details: [] },
      400,
    );

    const res = await configurationApi.save({ businessName: "" }, "tok");

    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error).toBe("Invalid configuration data");
  });

  it("gilt ohne Konfiguration in der Antwort nicht als gespeichert", async () => {
    antworteMit({ success: true, message: "ok" });

    const res = await configurationApi.save({ businessName: "Bella" }, "tok");

    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
  });
});

describe("übrige Aufrufer der Antworthülle", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("delete gilt ohne data als Erfolg – die Route liefert keine", async () => {
    antworteMit({ success: true, message: "Configuration deleted successfully" });

    const res = await configurationApi.delete("cfg_1", "tok");

    expect(res.success).toBe(true);
    expect(res.data).toBeUndefined();
  });

  it("getAll liefert die Liste und getLatestConfiguration die neueste", async () => {
    const liste = [
      { id: "alt", updatedAt: "2026-09-01T10:00:00.000Z" },
      { id: "neu", updatedAt: "2026-09-10T10:00:00.000Z" },
    ];
    antworteMit({ success: true, data: liste });

    const alle = await configurationApi.getAll("tok");
    expect(alle.success).toBe(true);
    expect(alle.data).toEqual(liste);

    antworteMit({ success: true, data: liste });
    const neueste = await sessionApi.getLatestConfiguration("tok");
    expect(neueste?.id).toBe("neu");
  });
});
