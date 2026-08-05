/**
 * Tests für den Maitr-Zeitgeber.
 *
 * Der wichtigste Fall ist der, in dem NICHTS passieren darf: Ohne
 * MAITR_SYNC_INTERVAL_MINUTES ist der Zeitgeber aus. Zum Zeitpunkt dieser Tests
 * ist im Betrieb weder die Migration eingespielt noch sind die
 * MAITR_*-Variablen gesetzt — ein Zeitgeber, der trotzdem anspringt, liefe
 * gegen fehlende Tabellen und schickte später ungefragt Anfragen an Google und
 * Meta.
 *
 * Zweitwichtigster Fall: Ein Fehler im Lauf darf den Prozess nicht mitreissen.
 * Die übrige API hängt an demselben Prozess.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const syncAll = vi.fn();
vi.mock("../maitr/sync", () => ({ syncAll: () => syncAll() }));

import { startMaitrScheduler, stopMaitrScheduler } from "../maitr/scheduler";

const VAR = "MAITR_SYNC_INTERVAL_MINUTES";

describe("Maitr-Zeitgeber", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    syncAll.mockReset().mockResolvedValue(undefined);
    delete process.env[VAR];
  });

  afterEach(() => {
    stopMaitrScheduler();
    vi.useRealTimers();
    delete process.env[VAR];
  });

  it("bleibt ohne die Variable aus", () => {
    expect(startMaitrScheduler()).toBeNull();
    vi.advanceTimersByTime(60 * 60_000);
    expect(syncAll).not.toHaveBeenCalled();
  });

  it("lehnt eine Taktung unter fünf Minuten ab, statt sie stillschweigend anzuheben", () => {
    process.env[VAR] = "1";
    expect(startMaitrScheduler()).toBeNull();
    vi.advanceTimersByTime(60 * 60_000);
    expect(syncAll).not.toHaveBeenCalled();
  });

  it("lehnt unlesbare Werte ab", () => {
    process.env[VAR] = "bald";
    expect(startMaitrScheduler()).toBeNull();
    vi.advanceTimersByTime(60 * 60_000);
    expect(syncAll).not.toHaveBeenCalled();
  });

  it("läuft nicht sofort los, sondern erst mit dem ersten Tick", () => {
    process.env[VAR] = "15";
    expect(startMaitrScheduler()).toBe(15);
    expect(syncAll).not.toHaveBeenCalled();

    vi.advanceTimersByTime(15 * 60_000);
    expect(syncAll).toHaveBeenCalledTimes(1);
  });

  // advanceTimersByTimeAsync, nicht die synchrone Variante: tick() ist async und
  // gibt die Sperre erst frei, wenn die Zusage aufgeloest ist. Ohne das Leeren
  // der Microtask-Warteschlange bliebe running=true und jeder weitere Tick
  // entfiele — der Test schluege fehl, obwohl der Zeitgeber richtig arbeitet.
  it("tickt weiter", async () => {
    process.env[VAR] = "5";
    startMaitrScheduler();
    await vi.advanceTimersByTimeAsync(3 * 5 * 60_000);
    expect(syncAll).toHaveBeenCalledTimes(3);
  });

  it("überholt einen noch laufenden Sync nicht", async () => {
    process.env[VAR] = "5";
    let entriegeln!: () => void;
    syncAll.mockImplementation(() => new Promise<void>((res) => (entriegeln = res)));
    startMaitrScheduler();

    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(syncAll).toHaveBeenCalledTimes(1);

    // Zweiter Tick, während der erste noch hängt: darf nicht erneut starten.
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(syncAll).toHaveBeenCalledTimes(1);

    entriegeln();
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(syncAll).toHaveBeenCalledTimes(2);
  });

  it("überlebt einen fehlgeschlagenen Lauf und tickt danach weiter", async () => {
    process.env[VAR] = "5";
    syncAll.mockRejectedValueOnce(new Error("relation \"ChannelConnection\" does not exist"));
    startMaitrScheduler();

    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(syncAll).toHaveBeenCalledTimes(1);

    // Entscheidend: Der Zeitgeber ist nach dem Fehler nicht blockiert.
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(syncAll).toHaveBeenCalledTimes(2);
  });

  it("hört nach dem Stoppen auf", () => {
    process.env[VAR] = "5";
    startMaitrScheduler();
    stopMaitrScheduler();
    vi.advanceTimersByTime(60 * 60_000);
    expect(syncAll).not.toHaveBeenCalled();
  });
});
