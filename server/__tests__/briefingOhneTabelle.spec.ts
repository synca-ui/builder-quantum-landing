/**
 * Der Startbildschirm muss die fehlende TaskDecision-Tabelle überleben.
 *
 * Anlass ist ein Befund der Gegenprobe: `computeBriefing` fragte die neue Tabelle
 * bedingungslos ab. Der Code landet über main automatisch auf Railway, die
 * Migration spielt ein Mensch von Hand ein — dazwischen liegt ein Fenster, in dem
 * die Tabelle fehlt. Ohne Auffangen hätte das nicht die neuen Routen, sondern
 * GET /briefing/today mitgerissen: den Hauptbildschirm der App, der vorher lief.
 *
 * Zum Aufbau: Die Antwort wird über eine schlichte Variable gesteuert, nicht über
 * `vi.fn().mockRejectedValue(...)`. Letzteres legt die abgelehnte Zusage bereits
 * beim Einrichten an; vitest zählt sie dort als unbehandelt und lässt den Test
 * scheitern, obwohl der Code sie einwandfrei fängt. Hier entsteht sie erst im
 * Aufruf und wird sofort erwartet.
 */
import { describe, it, expect, vi } from "vitest";

let antwort: () => Promise<unknown[]> = async () => [];

vi.mock("../db/prisma", () => ({
  prisma: { taskDecision: { findMany: () => antwort() } },
}));

import { loadDecisions } from "../maitr/briefing";

describe("loadDecisions ohne Tabelle", () => {
  it("liefert eine leere Karte statt zu werfen, wenn die Tabelle fehlt", async () => {
    antwort = async () => {
      throw new Error("The table `public.TaskDecision` does not exist in the current database.");
    };
    const karte = await loadDecisions("betrieb-a");
    expect(karte.size).toBe(0);
  });

  it("wirft auch bei einem Initialisierungsfehler nicht durch", async () => {
    // Bewusst ein ANDERER Fehler: Ein zu enger Filter auf den Prisma-Code P2021
    // liesse genau diesen Fall durch.
    antwort = async () => {
      throw new Error("Can't reach database server");
    };
    await expect(loadDecisions("betrieb-a")).resolves.toBeInstanceOf(Map);
  });

  it("liefert im Normalfall die Entscheidungen", async () => {
    antwort = async () => [
      { taskId: "review_1", state: "APPROVED", draft: null, decidedAt: new Date(), reopenAt: null },
    ];
    const karte = await loadDecisions("betrieb-a");
    expect(karte.get("review_1")?.state).toBe("APPROVED");
  });
});
