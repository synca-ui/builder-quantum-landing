// @vitest-environment node
/**
 * Kontrast-Wächter für die Template-Paletten.
 *
 * Ein Template ist ein Design-Versprechen an Leute ohne Design-Ausbildung —
 * es darf von Haus aus keine unlesbaren Kombinationen mitbringen. Diese
 * Tests rechnen die WCAG-Kontraste jeder im Picker angebotenen Palette nach:
 *   – Fließtext auf Seitenhintergrund ≥ 4,5:1 (AA)
 *   – Header-Schrift auf Header-Hintergrund ≥ 4,5:1
 *   – Preisfarbe auf Seitenhintergrund ≥ 3:1 (Preise sind groß/fett)
 * Wer eine Palette ändert, ändert diese Zusicherung mit — bewusst.
 */
import { describe, expect, it } from "vitest";
import { getTemplateDesignDefaults } from "../templateTokens";

/** Templates, die der Picker anbietet (TemplateStep.tsx). */
const PICKER_TEMPLATES = ["minimalist", "modern", "riviera", "verde"];

function luminance(hex: string): number {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) throw new Error(`Keine 6-stellige Hexfarbe: ${hex}`);
  const [r, g, b] = [m[1], m[2], m[3]].map((c) => {
    const v = parseInt(c, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

describe.each(PICKER_TEMPLATES)("Palette '%s'", (id) => {
  const d = getTemplateDesignDefaults(id);

  it("Fließtext auf Hintergrund erreicht WCAG AA (≥ 4,5:1)", () => {
    expect(contrast(d.fontColor, d.backgroundColor)).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it("Header-Schrift auf Header-Hintergrund erreicht WCAG AA", () => {
    expect(
      contrast(d.headerFontColor, d.headerBackgroundColor),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("Preisfarbe bleibt auf dem Hintergrund lesbar (≥ 3:1)", () => {
    expect(contrast(d.priceColor, d.backgroundColor)).toBeGreaterThanOrEqual(3);
  });

  it("verwendet nur 6-stellige Hexfarben (Alpha-Suffixe der Wrapper brauchen das)", () => {
    for (const value of Object.values(d)) {
      if (typeof value === "string" && value.startsWith("#")) {
        expect(value).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    }
  });
});
