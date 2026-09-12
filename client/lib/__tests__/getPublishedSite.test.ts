import { describe, it, expect, vi, afterEach } from "vitest";
import { configurationApi } from "../api";

// GET /api/sites/:subdomain antwortet mit `{ success, data }`. apiRequest
// packte früher nur `configuration`/`configurations`/`site` aus und reichte
// deshalb die ganze Hülle als Konfiguration weiter – /site/bella12 zeigte
// „Your Business“ statt „Bella“ und keine Inhalte. Seitdem packt apiRequest
// die Hülle zentral aus; dieser Test sichert das für getPublishedSite ab.
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

describe("configurationApi.getPublishedSite", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("liefert die innere Konfiguration statt der Antworthülle", async () => {
    const fetchMock = antworteMit({
      success: true,
      data: { businessName: "Bella", template: "modern" },
    });

    const res = await configurationApi.getPublishedSite("bella12");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/sites/bella12",
      expect.anything(),
    );
    expect(res.success).toBe(true);
    expect(res.data).toEqual({ businessName: "Bella", template: "modern" });
  });

  it("meldet 404 weiterhin als Fehlschlag", async () => {
    antworteMit({ success: false, error: "Site not found" }, 404);

    const res = await configurationApi.getPublishedSite("gibtesnicht");

    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error).toBe("Site not found");
  });

  it("gilt ohne Konfiguration in der Antwort nicht als Erfolg", async () => {
    antworteMit({ success: true });

    const res = await configurationApi.getPublishedSite("bella12");

    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
  });
});
