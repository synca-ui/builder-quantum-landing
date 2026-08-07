// @vitest-environment node
//
// Anlass: `OpeningHours` in packages/core ist die Form, die Web und App benutzen -
// aber validiert wird serverseitig, in einer ganz anderen Datei. Solange niemand
// beide gegeneinander hält, ist die Übereinstimmung eine Behauptung und driftet
// beim nächsten Umbau lautlos auseinander.
//
// WELCHE Instanz hier massgeblich ist, war schon einmal falsch beantwortet: Die
// erste Fassung dieser Datei prüfte gegen das LOSE `OpeningHoursSchema`. Das ist
// das Schema des Konfigurators (ContentDataSchema) und erzwingt die Tagesregel
// gerade NICHT - `OpeningHoursSchema.safeParse({Montag: …})` ist erfolgreich.
// Der Kern-Typ gilt für `api.venues.update`, und dort entscheidet
// `StrictOpeningHoursSchema`. Gegen das wird hier geprüft. Das lose Schema kommt
// nur noch als ausdrückliche Gegenprobe vor, damit niemand die beiden verwechselt.
//
// Läuft ohne jsdom (siehe shared/suggestedConfig.spec.ts für den Hintergrund) -
// reine Typ-/Schema-Prüfung, kein DOM nötig.
import { describe, expect, it } from "vitest";
import { DAYS, type OpeningHours } from "../types";
import {
  OpeningHoursSchema,
  StrictOpeningHoursSchema,
} from "../../../../server/schemas/configuration";
// Relativ statt über den "@shared"-Alias: Dieser Alias ist nur in vitest.config.ts
// (Wurzel-Testlauf) verdrahtet, nicht in packages/core/tsconfig.json - ein
// isolierter "tsc --noEmit -p packages/core/tsconfig.json" würde ihn sonst nicht
// auflösen können.
import { suggestedConfigToDraft, type SuggestedConfig } from "../../../../shared/suggestedConfig";

/**
 * Bildet zur LAUFZEIT nach, was der Kern-Typ verlangt: Tagesschlüssel aus `DAYS`,
 * und je Tag entweder `{closed: true}` oder `{closed: false, open, close}`.
 *
 * Warum überhaupt eine Laufzeitfunktion: Typen verschwinden beim Übersetzen. Eine
 * blosse Typ-Annotation im Test bewiese nichts über das, was zur Laufzeit durch
 * das Schema geht - und genau die Lücke zwischen beidem soll diese Datei bewachen.
 * Bewusst OHNE Zeitformat-Prüfung: der Typ deklariert `open`/`close` als `string`,
 * eine Regex kann ein TypeScript-Typ nicht ausdrücken. Diese eine Lücke bleibt und
 * ist unten ausdrücklich festgehalten, statt sie wegzubehaupten.
 */
function hatKernForm(wert: unknown): boolean {
  if (typeof wert !== "object" || wert === null || Array.isArray(wert)) return false;
  const eintraege = Object.entries(wert as Record<string, unknown>);
  if (eintraege.length === 0) return false;
  return eintraege.every(([tag, eintrag]) => {
    if (!(DAYS as readonly string[]).includes(tag)) return false;
    if (typeof eintrag !== "object" || eintrag === null) return false;
    const e = eintrag as Record<string, unknown>;
    if (e.closed === true) return true;
    return e.closed === false && typeof e.open === "string" && typeof e.close === "string";
  });
}

describe("OpeningHours-Form: Kern-Typ gegen StrictOpeningHoursSchema", () => {
  it("was der Kern-Typ erlaubt, nimmt das enge Schema an - beide Zweige der Union", () => {
    const wert: OpeningHours = {
      monday: { closed: false, open: "08:00", close: "18:00" },
      // Öffnung über Mitternacht. Steht hier, weil eine frühere Fassung sie mit
      // `open < close` verboten hatte - und damit jede Bar ausgesperrt hätte.
      friday: { closed: false, open: "18:00", close: "01:00" },
      // Ruhetag OHNE erfundene Uhrzeiten. Genau dafür ist es eine Union.
      sunday: { closed: true },
    };

    expect(hatKernForm(wert)).toBe(true);
    expect(() => StrictOpeningHoursSchema.parse(wert)).not.toThrow();
  });

  it.each([
    ["deutscher Tagesschlüssel", { Montag: { closed: false, open: "08:00", close: "18:00" } }],
    ["Tagesschlüssel mit Leerzeichen", { "friday ": { closed: false, open: "08:00", close: "18:00" } }],
    ["geöffneter Tag ohne Uhrzeiten", { monday: { closed: false } }],
    ["fehlendes closed", { monday: { open: "08:00", close: "18:00" } }],
    ["Freitext statt Tagesobjekt", { monday: "9-17" }],
  ])("%s: das enge Schema lehnt ab, und der Kern-Typ deckt es ebenfalls nicht", (_name, wert) => {
    expect(StrictOpeningHoursSchema.safeParse(wert).success).toBe(false);
    expect(hatKernForm(wert)).toBe(false);
  });

  it("ein geschlossener Tag mit übrig gebliebenen Uhrzeiten wird auf die saubere Form zurückgeschnitten", () => {
    // Altbestand aus der Zeit, als open/close auch bei closed:true Pflicht waren.
    // Das enge Schema verwirft ihn nicht, es schneidet ihn zurecht - die Aussage
    // „geschlossen" ist ja eindeutig, nur die Uhrzeiten daneben sind bedeutungslos.
    const alt = { sunday: { closed: true, open: "00:00", close: "00:00" } };

    expect(StrictOpeningHoursSchema.parse(alt)).toEqual({ sunday: { closed: true } });
  });

  it("falsches Zeitformat: das enge Schema lehnt ab - der Kern-Typ kann das strukturell NICHT erkennen", () => {
    // Ehrlicher Befund statt erfundener Übereinstimmung. Die Lücke ist real und
    // lässt sich nicht wegtesten, nur festhalten: wer den Typ benutzt, bekommt für
    // "8:00" einen grünen Typecheck und zur Laufzeit ein 422.
    const falschesFormat = { monday: { closed: false as const, open: "8:00", close: "18:00" } };

    expect(StrictOpeningHoursSchema.safeParse(falschesFormat).success).toBe(false);
    expect(hatKernForm(falschesFormat)).toBe(true);
  });

  it("das LOSE OpeningHoursSchema erzwingt die Tagesregel NICHT - deshalb ist es hier nicht der Massstab", () => {
    // Gegenprobe zum Kopfkommentar. Bliebe dieser Test aus, könnte jemand die
    // Prüfungen oben versehentlich auf das lose Schema zurückdrehen, ohne dass
    // etwas rot würde - und genau das war der Ausgangszustand dieser Datei.
    expect(
      OpeningHoursSchema.safeParse({ Montag: { open: "09:00", close: "17:00", closed: false } })
        .success,
    ).toBe(true);
  });
});

describe("Tagesschlüssel: DAYS in packages/core gegen die Liste in shared/suggestedConfig.ts", () => {
  it("beide führen dieselben sieben Tage in derselben Schreibweise", () => {
    // Die kanonische Liste liegt seit dem Umbau in packages/core. shared/ hat seine
    // eigene, private Liste behalten - bewusst, damit dort keine Naht zu einer
    // Datei entsteht, die aus ganz anderem Anlass umgebaut wird. Der Preis dafür
    // ist genau dieser Test: Ohne ihn könnten die beiden Listen auseinanderlaufen,
    // und der Scrape lieferte Tage, die das enge Schema anschliessend abweist.
    //
    // Die Liste in shared/ ist privat und lässt sich nur über die öffentliche
    // Funktion beobachten, die sie benutzt. Absichtlich mit Ködern gemischt: pro
    // Tag wird exakt der kleingeschriebene englische Name nachgeschlagen, alles
    // andere fällt still weg - es wird NICHT normalisiert.
    const roh: NonNullable<SuggestedConfig["openingHours"]> = {
      monday: { open: "08:00", close: "18:00", closed: false },
      tuesday: { open: "08:00", close: "18:00", closed: false },
      wednesday: { open: "08:00", close: "18:00", closed: false },
      thursday: { open: "08:00", close: "18:00", closed: false },
      friday: { open: "08:00", close: "18:00", closed: false },
      saturday: { open: "10:00", close: "14:00", closed: false },
      sunday: { open: "10:00", close: "14:00", closed: true },
      Montag: { open: "08:00", close: "18:00", closed: false },
      Sunday: { open: "10:00", close: "14:00", closed: false },
    };

    const entwurf = suggestedConfigToDraft({ businessName: "Test-Betrieb", openingHours: roh });
    const ergebnis = entwurf?.content.openingHours;
    expect(ergebnis).toBeDefined();

    expect(Object.keys(ergebnis!).sort()).toEqual([...DAYS].sort());
    expect(ergebnis).not.toHaveProperty("Montag");
    expect(ergebnis).not.toHaveProperty("Sunday");
    // Der Köder "Sunday" (Großschreibung, closed: false) darf den echten
    // "sunday"-Eintrag (closed: true) nicht überschrieben haben.
    expect(ergebnis!.sunday.closed).toBe(true);
  });

  it("was der Scrape erzeugt, nimmt das enge Schema an - der geschlossene Tag zurückgeschnitten", () => {
    // Die beiden Formen sind nicht identisch: shared/ führt open/close auch für
    // geschlossene Tage. Wichtig ist nicht Gleichheit, sondern dass der Weg
    // Scrape → Business.openingHours ohne Datenverlust durchläuft.
    const entwurf = suggestedConfigToDraft({
      businessName: "Test-Betrieb",
      openingHours: {
        monday: { open: "08:00", close: "18:00", closed: false },
        sunday: { open: "10:00", close: "14:00", closed: true },
      },
    });

    const geprueft = StrictOpeningHoursSchema.parse(entwurf?.content.openingHours);

    expect(geprueft).toEqual({
      monday: { closed: false, open: "08:00", close: "18:00" },
      sunday: { closed: true },
    });
  });
});
