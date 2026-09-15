/**
 * Welche Aufgaben der Start-Screen zeigt - die reinen Entscheidungen, ohne React.
 *
 * Getrennt von StartScreen.tsx, damit sie sich ohne React-Native-Testaufbau prüfen
 * lassen (startAufgaben.spec.ts) - dieselbe Aufteilung wie growth/kanaele.ts.
 * Demo und Showcase gehen jeweils unverändert durch.
 */
import type { DailyTask } from "@maitr/core";

import { aufgabenAusBriefing, aufgabenWirkung } from "../growth/kanaele";
import type { BriefingSource } from "./useDailyBriefing";

/**
 * Die Aufgaben des Briefings, wie Start sie zeigen darf.
 *
 * Anlass (Prüfer-Befund 18, 15.09.): Wachstum filterte „N € Provision gespart"
 * (`roi_month`) und Wirkungszahlen ohne Grundlage („+35 % Profilaufrufe") heraus,
 * Start zeigte `briefing.tasks` ungefiltert - derselbe echte Betrieb las auf dem
 * einen Screen eine Zahl, die der andere ausdrücklich verschweigt. Für den echten
 * Betrieb deshalb dieselben Helfer wie in InsightsSection: `aufgabenAusBriefing`
 * (Form + Aufgaben ohne Grundlage) und `aufgabenWirkung` (Zahl nur, wo gemessen).
 *
 * Demo/Showcase: die Liste unverändert, als dieselbe Referenz - dort gehören
 * „+35 % Profilaufrufe" und Co. zur Vorführung.
 */
export function startAufgaben(briefing: { tasks: DailyTask[] }, echterBetrieb: boolean): DailyTask[] {
  if (!echterBetrieb) return briefing.tasks;
  return (aufgabenAusBriefing(briefing) ?? []).map((task) => {
    const wirkung = aufgabenWirkung(task);
    if (wirkung === task.impact) return task;
    const { impact: _ohneGrundlage, ...rest } = task;
    return wirkung ? { ...rest, impact: wirkung } : rest;
  });
}

/**
 * Gilt eine Aufgabe auf Start als erledigt?
 *
 * Anlass (Prüfer-Befund 26, 15.09.): Eine vom Server bestätigte Freigabe landete im
 * persistierten `taskDone` - für immer. Der Server legt Daueraufgaben aber nach
 * sieben Tagen wieder vor (`REOPEN_AFTER_MS`), solange ihr Anlass besteht; Start
 * filterte sie trotzdem dauerhaft heraus und zeigte „Alles erledigt". Für
 * Serveraufgaben ist deshalb allein der Server die Wahrheit: Er liefert eine
 * entschiedene Aufgabe bis zur Wiedervorlage nicht mehr aus, bis dahin blendet die
 * Sitzung sie aus (`sitzungErledigt`) - wie beim Ausblenden per Wisch.
 *
 * Fixture-Aufgaben (Demo, Showcase, kein Netz) kennt der Server nicht - dort bleibt
 * es beim gespeicherten Häkchen, genau wie bisher.
 */
export function aufgabeErledigt(
  taskId: string,
  lage: {
    source: BriefingSource;
    taskDone: Record<string, boolean>;
    sitzungErledigt: Record<string, boolean>;
  },
): boolean {
  return lage.source === "api" ? lage.sitzungErledigt[taskId] === true : lage.taskDone[taskId] === true;
}
