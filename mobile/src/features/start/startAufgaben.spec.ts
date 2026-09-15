/**
 * Aufgaben auf Start (mobile/src/features/start/startAufgaben.ts) -
 * Prüfer-Befunde 18, 25 und 26, 15.09.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { DailyTask } from "@maitr/core";

import { aufgabeErledigt, startAufgaben } from "./startAufgaben";

function aufgabe(id: string, teil: Partial<DailyTask> = {}): DailyTask {
  return {
    id,
    kind: "profile",
    eyebrow: "Profil",
    title: `Titel ${id}`,
    primaryAction: { label: "Ansehen", endpoint: "/profil-check" },
    ...teil,
  } as DailyTask;
}

describe("startAufgaben", () => {
  const briefing = {
    tasks: [
      aufgabe("roi_month", { title: "5 € Provision gespart", impact: "61 € / Jahr" }),
      aufgabe("review_abc", { kind: "review", impact: "+35 % Profilaufrufe" }),
      aufgabe("profile_photos", { impact: "+6 Präsenzpunkte" }),
      aufgabe("noshow_g2", { impact: "Tisch absichern" }),
      aufgabe("occupancy_fill", { impact: "~72 € Auslastung" }),
    ],
  };

  it("echter Betrieb: keine „Provision gespart“, Wirkungszahlen nur, wo gemessen (Befund 18)", () => {
    const echt = startAufgaben(briefing, true);
    expect(echt.map((t) => t.id)).toEqual(["review_abc", "profile_photos", "noshow_g2", "occupancy_fill"]);
    expect(echt.map((t) => t.impact)).toEqual([undefined, "+6 Präsenzpunkte", "Tisch absichern", undefined]);
    expect(echt.find((t) => t.id === "review_abc")).not.toHaveProperty("impact");
    // Das Briefing selbst bleibt unangetastet.
    expect(briefing.tasks[1].impact).toBe("+35 % Profilaufrufe");
  });

  it("Demo und Showcase: die Liste unverändert, als dieselbe Referenz", () => {
    expect(startAufgaben(briefing, false)).toBe(briefing.tasks);
  });

  it("echter Betrieb mit kaputter Liste: keine Karten statt Absturz", () => {
    expect(startAufgaben({ tasks: "x" as unknown as DailyTask[] }, true)).toEqual([]);
  });
});

describe("aufgabeErledigt", () => {
  it("Serveraufgaben: das gespeicherte Häkchen zählt nicht, nur die Freigabe dieser Sitzung (Befund 26)", () => {
    const taskDone = { profile_photos: true };
    expect(aufgabeErledigt("profile_photos", { source: "api", taskDone, sitzungErledigt: {} })).toBe(false);
    expect(
      aufgabeErledigt("profile_photos", { source: "api", taskDone: {}, sitzungErledigt: { profile_photos: true } }),
    ).toBe(true);
  });

  it("Fixture-Aufgaben: wie bisher das gespeicherte Häkchen", () => {
    expect(
      aufgabeErledigt("task_review_marion", { source: "fixture", taskDone: { task_review_marion: true }, sitzungErledigt: {} }),
    ).toBe(true);
    expect(aufgabeErledigt("task_review_marion", { source: "fixture", taskDone: {}, sitzungErledigt: {} })).toBe(false);
  });
});

/*
 * Verdrahtung: Die Entscheidungen oben helfen nur, wenn die Screens sie benutzen.
 * Ohne React-Native-Testaufbau lässt sich das nur am Quelltext prüfen - bewusst
 * schmal gehalten, damit Umformulierungen nicht ständig rot werden.
 */
describe("Verdrahtung auf Start und im Profil", () => {
  const quelle = (datei: string) => readFileSync(resolve(__dirname, datei), "utf8");

  it("Start filtert über startAufgaben und blendet Serverfreigaben nur sitzungslokal aus", () => {
    const start = quelle("StartScreen.tsx");
    expect(start).toContain("startAufgaben(briefing, echterBetrieb)");
    expect(start).toContain("aufgabeErledigt(");
    // Im Serverzweig der Freigabe kein `completeTask` mehr (Befund 26).
    const serverZweig = start.slice(start.indexOf(".approveTask("), start.indexOf(".catch(", start.indexOf(".approveTask(")));
    expect(serverZweig).not.toContain("completeTask(");
  });

  it("Profil speichern stößt das Nachladen des Briefings an, Start reagiert darauf (Befund 25)", () => {
    expect(quelle("../growth/ProfileManagementScreen.tsx")).toContain("bumpBriefing()");
    expect(quelle("StartScreen.tsx")).toContain("briefingVersion");
  });
});
