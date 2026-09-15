/**
 * Auswertung eines Briefing-Abrufs (useDailyBriefing.ts, `ladeBriefing`) -
 * Prüfer-Befund 27, 15.09.
 */
import { describe, expect, it, vi } from "vitest";

import { ladeBriefing } from "./useDailyBriefing";

function melder() {
  return { erfolg: vi.fn(), fehler: vi.fn(), fertig: vi.fn() };
}

describe("ladeBriefing", () => {
  it("meldet Erfolg und danach fertig", async () => {
    const melde = melder();
    await ladeBriefing(Promise.resolve({ tasks: [] }), new AbortController().signal, melde);
    expect(melde.erfolg).toHaveBeenCalledWith({ tasks: [] });
    expect(melde.fehler).not.toHaveBeenCalled();
    expect(melde.fertig).toHaveBeenCalledTimes(1);
  });

  it("eine 200 ohne Briefing-Form ist ein Fehler", async () => {
    const melde = melder();
    await ladeBriefing(Promise.resolve("<html>"), new AbortController().signal, melde);
    expect(melde.erfolg).not.toHaveBeenCalled();
    expect(melde.fehler).toHaveBeenCalledTimes(1);
    expect(melde.fertig).toHaveBeenCalledTimes(1);
  });

  it("ein abgebrochener Abruf meldet NICHT fertig - der neu gestellte läuft noch", async () => {
    const controller = new AbortController();
    const melde = melder();
    let ablehnen: (err: Error) => void = () => {};
    const abruf = new Promise((_, reject) => {
      ablehnen = reject;
    });
    const laeuft = ladeBriefing(abruf, controller.signal, melde);
    controller.abort();
    ablehnen(new Error("AbortError"));
    await laeuft;
    expect(melde.fertig).not.toHaveBeenCalled();
    expect(melde.fehler).not.toHaveBeenCalled();
  });

  it("eine späte Antwort des abgebrochenen Abrufs zählt nicht", async () => {
    const controller = new AbortController();
    const melde = melder();
    let aufloesen: (wert: unknown) => void = () => {};
    const abruf = new Promise((resolve) => {
      aufloesen = resolve;
    });
    const laeuft = ladeBriefing(abruf, controller.signal, melde);
    controller.abort();
    aufloesen({ tasks: [{ id: "vom_vorigen_betrieb" }] });
    await laeuft;
    expect(melde.erfolg).not.toHaveBeenCalled();
    expect(melde.fertig).not.toHaveBeenCalled();
  });
});
