// @vitest-environment node
/**
 * Geteilter Wrapper-Style: Konfigurator-Vorschau und veröffentlichte Seite
 * (AppRenderer) beziehen den Seitenhintergrund aus derselben Funktion.
 * Divergenz hier = Vorschau lügt. Siehe templateWrapperStyle.ts.
 */
import { describe, expect, it } from "vitest";
import { getTemplateWrapperStyle } from "../templateWrapperStyle";

const COLORS = {
  backgroundColor: "#EEF2FF",
  secondaryColor: "#8B5CF6",
  fontColor: "#000000",
};

describe("getTemplateWrapperStyle", () => {
  it("rendert für 'modern' den Verlauf backgroundColor → secondaryColor", () => {
    expect(getTemplateWrapperStyle("modern", COLORS)).toEqual({
      background: "linear-gradient(135deg, #EEF2FF 0%, #8B5CF6 100%)",
      color: "#000000",
    });
  });

  it.each(["minimalist", "unbekannt"])(
    "rendert für '%s' die flache Flächenfarbe",
    (template) => {
      expect(getTemplateWrapperStyle(template, COLORS)).toEqual({
        backgroundColor: "#EEF2FF",
        color: "#000000",
      });
    },
  );

  it("rendert für 'stylish' den Editorial-Schleier über der Flächenfarbe", () => {
    expect(getTemplateWrapperStyle("stylish", COLORS)).toEqual({
      background:
        "linear-gradient(180deg, #8B5CF61A 0%, transparent 220px), #EEF2FF",
      color: "#000000",
    });
  });

  it("rendert für 'cozy' den warmen Lichtschein über der Flächenfarbe", () => {
    expect(getTemplateWrapperStyle("cozy", COLORS)).toEqual({
      background:
        "radial-gradient(1100px 420px at 50% -120px, #8B5CF64D 0%, transparent 70%), #EEF2FF",
      color: "#000000",
    });
  });
});
