import { describe, it, expect, vi } from "vitest";
import {
  konfigurationSpeichern,
  KONFIGURATION_NICHT_GEFUNDEN,
} from "../konfigurationSpeichern";
import type { ApiResponse, Configuration } from "../api";

// Die gemerkte Konfigurations-id liegt in localStorage. Nach einem Kontowechsel
// im selben Browser (oder wenn die Konfiguration gelöscht wurde) antwortet der
// Server bei jedem Speichern mit 404 – ohne Selbstheilung wäre der Konfigurator
// für dieses Konto dauerhaft unspeicherbar.

const ok = (data: Partial<Configuration>): ApiResponse<Configuration> => ({
  success: true,
  data: data as Configuration,
});
const nichtGefunden: ApiResponse<Configuration> = {
  success: false,
  error: KONFIGURATION_NICHT_GEFUNDEN,
};

describe("konfigurationSpeichern", () => {
  it("schickt die gemerkte id mit und behält sie bei Erfolg", async () => {
    const save = vi.fn().mockResolvedValue(ok({ id: "cfg_1" }));

    const erg = await konfigurationSpeichern(
      { businessName: "Bella" },
      "cfg_1",
      "tok",
      { save },
    );

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(
      { businessName: "Bella", id: "cfg_1" },
      "tok",
    );
    expect(erg.idVerworfen).toBe(false);
    expect(erg.res.data?.id).toBe("cfg_1");
  });

  it("legt ohne id an und meldet nichts verworfen", async () => {
    const save = vi.fn().mockResolvedValue(ok({ id: "cfg_neu" }));

    const erg = await konfigurationSpeichern(
      { businessName: "Bella" },
      null,
      "tok",
      { save },
    );

    expect(save).toHaveBeenCalledWith({ businessName: "Bella" }, "tok");
    expect(erg.idVerworfen).toBe(false);
    expect(erg.res.data?.id).toBe("cfg_neu");
  });

  it("verwirft eine id, die der Server nicht kennt, und legt einmal neu an", async () => {
    const save = vi
      .fn()
      .mockResolvedValueOnce(nichtGefunden)
      .mockResolvedValueOnce(ok({ id: "cfg_neu" }));

    const erg = await konfigurationSpeichern(
      { businessName: "Bella", id: "cfg_fremd" },
      "cfg_fremd",
      "tok",
      { save },
    );

    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1][0]).toEqual({ businessName: "Bella" });
    expect(erg.idVerworfen).toBe(true);
    expect(erg.res.success).toBe(true);
    expect(erg.res.data?.id).toBe("cfg_neu");
  });

  it("versucht es nur einmal – bleibt auch das Neuanlegen erfolglos, ist es ein Fehler", async () => {
    const save = vi
      .fn()
      .mockResolvedValueOnce(nichtGefunden)
      .mockResolvedValueOnce({
        success: false,
        error: "Invalid configuration data",
      });

    const erg = await konfigurationSpeichern({}, "cfg_fremd", "tok", { save });

    expect(save).toHaveBeenCalledTimes(2);
    expect(erg.idVerworfen).toBe(true);
    expect(erg.res.success).toBe(false);
    expect(erg.res.error).toBe("Invalid configuration data");
  });

  it("heilt NICHT bei anderen Fehlern – 403 oder Validierung bleiben Fehler", async () => {
    for (const error of ["Forbidden", "Invalid configuration data"]) {
      const save = vi.fn().mockResolvedValue({ success: false, error });

      const erg = await konfigurationSpeichern({}, "cfg_1", "tok", { save });

      expect(save).toHaveBeenCalledTimes(1);
      expect(erg.idVerworfen).toBe(false);
      expect(erg.res.error).toBe(error);
    }
  });
});
