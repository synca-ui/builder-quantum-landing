import { describe, it, expect, beforeEach } from "vitest";
import {
  startMenuJob,
  getMenuJob,
  runningCount,
  TooManyJobsError,
  __resetMenuJobs,
  MAX_RUNNING_PER_USER,
} from "../services/menuJobs";
import type { MenuExtractionResult } from "../services/menuExtraction";

/**
 * Die Aufträge sind die Antwort auf einen echten Ausfall: Der Endpunkt lief
 * synchron und lieferte HTTP 504, weil der Netlify-Proxy vor Railway nach 26
 * Sekunden abbricht – die Erkennung eines 21-MB-Bild-PDFs braucht 40 bis 90.
 *
 * Geprüft wird hier das, woran ein Auftragsspeicher üblicherweise scheitert:
 * Besitz, Gleichzeitigkeit und das Verhalten bei Fehlern im Hintergrund.
 */

const result = (n: number): MenuExtractionResult => ({
  items: Array.from({ length: n }, (_, i) => ({ id: `x${i}`, name: `Gericht ${i}` })),
  source: "pdf_ocr",
  diagnostics: [],
});

/** Wartet, bis der Hintergrundlauf durch ist. */
const settle = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  __resetMenuJobs();
});

describe("Speisekarten-Aufträge", () => {
  it("liefert sofort einen laufenden Auftrag zurück", () => {
    // Genau das vermeidet den 504: Die Antwort geht raus, bevor gearbeitet wird.
    const job = startMenuJob("user_1", () => new Promise(() => {}));
    expect(job.status).toBe("running");
    expect(job.id).toBeTruthy();
  });

  it("hält das Ergebnis fest, sobald die Arbeit durch ist", async () => {
    const job = startMenuJob("user_1", async () => result(3));
    await settle();

    const found = getMenuJob(job.id, "user_1");
    expect(found?.status).toBe("done");
    expect(found?.result?.items).toHaveLength(3);
  });

  it("hält einen Fehler fest, statt den Prozess mitzureißen", async () => {
    // Ein unbehandeltes Promise im Hintergrund würde Node beenden.
    const job = startMenuJob("user_1", async () => {
      throw new Error("Gemini kaputt");
    });
    await settle();

    const found = getMenuJob(job.id, "user_1");
    expect(found?.status).toBe("failed");
    expect(found?.error).toBe("Gemini kaputt");
  });

  it("gibt einen Auftrag nicht an ein fremdes Konto heraus", async () => {
    const job = startMenuJob("user_1", async () => result(1));
    await settle();

    expect(getMenuJob(job.id, "user_1")).not.toBeNull();
    // Gleiche Antwort wie "gibt es nicht" – sonst ließe sich über den
    // Statuscode abfragen, welche Aufträge existieren.
    expect(getMenuJob(job.id, "user_2")).toBeNull();
  });

  it("kennt einen erfundenen Auftrag nicht", () => {
    expect(getMenuJob("gibt-es-nicht", "user_1")).toBeNull();
  });

  it("begrenzt gleichzeitige Läufe je Konto", () => {
    // Jede Erkennung kostet Geld und belegt bis zu anderthalb Minuten.
    for (let i = 0; i < MAX_RUNNING_PER_USER; i++) {
      startMenuJob("user_1", () => new Promise(() => {}));
    }
    expect(runningCount("user_1")).toBe(MAX_RUNNING_PER_USER);
    expect(() => startMenuJob("user_1", async () => result(1))).toThrow(
      TooManyJobsError,
    );
  });

  it("zählt die Grenze je Konto, nicht global", () => {
    for (let i = 0; i < MAX_RUNNING_PER_USER; i++) {
      startMenuJob("user_1", () => new Promise(() => {}));
    }
    // Ein anderer Nutzer darf weiterhin starten.
    expect(() => startMenuJob("user_2", () => new Promise(() => {}))).not.toThrow();
  });

  it("gibt einen Platz frei, sobald ein Auftrag fertig ist", async () => {
    for (let i = 0; i < MAX_RUNNING_PER_USER; i++) {
      startMenuJob("user_1", async () => result(1));
    }
    await settle();

    expect(runningCount("user_1")).toBe(0);
    expect(() => startMenuJob("user_1", async () => result(1))).not.toThrow();
  });

  it("vergibt für jeden Auftrag eine eigene Kennung", () => {
    const a = startMenuJob("user_1", () => new Promise(() => {}));
    const b = startMenuJob("user_1", () => new Promise(() => {}));
    expect(a.id).not.toBe(b.id);
  });
});
