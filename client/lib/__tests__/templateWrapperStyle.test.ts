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

  it.each(["minimalist", "stylish", "cozy", "unbekannt"])(
    "rendert für '%s' die flache Flächenfarbe",
    (template) => {
      expect(getTemplateWrapperStyle(template, COLORS)).toEqual({
        backgroundColor: "#EEF2FF",
        color: "#000000",
      });
    },
  );
});
