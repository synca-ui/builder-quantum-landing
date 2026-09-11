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
import { PICKER_TEMPLATES as KATALOG_PICKER } from "../../../shared/templateCatalog";
import { getTemplateDesignDefaults, getTemplateTokens } from "../templateTokens";
import { textAufFarbe } from "../templateLayout";

/**
 * Templates, die der Picker anbietet — aus shared/templateCatalog.ts, der
 * einen Liste, aus der auch Picker, Seed und API lesen. Ein Template, das
 * dort imPicker steht, aber hier fehlte, wäre ungeprüft.
 */
const PICKER_TEMPLATES = KATALOG_PICKER.map((e) => e.id);

describe("Picker-Liste", () => {
  it("umfasst die sechs bisherigen und die zehn neuen Templates", () => {
    expect(PICKER_TEMPLATES).toEqual([
      "minimalist",
      "modern",
      "presse",
      "kiosk",
      "izakaya",
      "morgen",
      "vitrine",
      "gelato",
      "brauhaus",
      "ramen",
      "imbiss",
      "konditorei",
      "roesterei",
      "markt",
      "aperitivo",
      "hofladen",
    ]);
  });
});

/**
 * Ohne diese Prüfung wäre der Wächter falsch grün: Fehlt einem Template der
 * Eintrag in TEMPLATE_TOKENS, liefert getTemplateDesignDefaults still die
 * Minimalist-Palette — und die besteht jeden Kontrasttest.
 */
describe("Picker-Templates haben eine eigene Palette", () => {
  const rueckfall = getTemplateTokens("__gibt_es_nicht__");
  it.each(PICKER_TEMPLATES.filter((id) => id !== "minimalist"))(
    "'%s' fällt nicht auf Minimalist zurück",
    (id) => {
      expect(getTemplateTokens(id)).not.toBe(rueckfall);
    },
  );
});

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

  it("Knopfschrift auf der Primärfarbe erreicht WCAG AA — Reservieren, Bestellen, Pillen", () => {
    // Der Store wählt die Knopfschrift nach Luminanz (configuratorStore.
    // updateTemplate), die Komponenten nach textAufFarbe — beide müssen auf
    // der Vorgabe-Primärfarbe dieselbe Farbe wählen UND die muss lesen.
    const schrift = textAufFarbe(d.primaryColor);
    expect(contrast(schrift, d.primaryColor)).toBeGreaterThanOrEqual(4.5);
  });

  it("bleibt hell — dunkel stellt sich der Betrieb selbst ein", () => {
    expect(luminance(d.backgroundColor)).toBeGreaterThan(0.6);
  });

  it("verwendet nur 6-stellige Hexfarben (Alpha-Suffixe der Wrapper brauchen das)", () => {
    for (const value of Object.values(d)) {
      if (typeof value === "string" && value.startsWith("#")) {
        expect(value).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    }
  });
});
