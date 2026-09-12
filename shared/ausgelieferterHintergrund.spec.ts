import { describe, expect, it } from "vitest";
import {
  ausgelieferterHintergrund,
  deriveCohesiveColors,
  softenBackground,
} from "./autoPublish";

// Prüfung Runde 8, M2: Die Farbvorschau im Auto-Konfigurator zeigte nur den
// entschärften Hintergrund, der Publish setzte ihn zusätzlich von der
// Primärfarbe ab. Bei monochromen Quellseiten (Haus Töller: dreimal #0a1b2e)
// sah der Wirt einen anderen Ton als den, der live ging.
describe("ausgelieferterHintergrund", () => {
  it("ist genau der Hintergrund, den deriveCohesiveColors ausliefert", () => {
    const faelle = [
      { backgroundColor: "#0a1b2e", primaryColor: "#0a1b2e" },
      { backgroundColor: "#F3F9E2", primaryColor: "#0F2CCF" },
      { backgroundColor: "#ffffff", primaryColor: "#111111" },
      { backgroundColor: "#111111", primaryColor: "#f5f5f5" },
    ];
    for (const design of faelle) {
      expect(ausgelieferterHintergrund(design)).toBe(
        deriveCohesiveColors(design).backgroundColor,
      );
    }
  });

  it("setzt einen monochromen Entwurf vom Primärton ab – Entschärfen allein reicht nicht", () => {
    const design = { backgroundColor: "#0a1b2e", primaryColor: "#0a1b2e" };
    const nurWeich = softenBackground(design.backgroundColor);
    const ausgeliefert = ausgelieferterHintergrund(design);
    expect(ausgeliefert).toBeDefined();
    expect(ausgeliefert).not.toBe(nurWeich);
  });

  it("gibt ohne Hintergrund nichts zurück", () => {
    expect(
      ausgelieferterHintergrund({ primaryColor: "#123456" }),
    ).toBeUndefined();
  });
});
