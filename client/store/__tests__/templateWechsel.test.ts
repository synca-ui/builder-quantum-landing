/**
 * Template-Wechsel im Design-Store.
 *
 * Zwei Zusicherungen:
 *  1. Ein Template bringt seine Palette mit — vorher schrieb updateTemplate
 *     nur design.template, und alle vier Templates sahen gleich aus.
 *  2. Eigene Farbentscheidungen überleben den Wechsel — überschrieben wird
 *     nur, was noch auf einem Default stand (globaler Default oder Default
 *     des bisherigen Templates).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { useConfiguratorStore } from "../configuratorStore";
import { getTemplateDesignDefaults } from "@/lib/templateTokens";

describe("updateTemplate", () => {
  beforeEach(() => {
    useConfiguratorStore.getState().resetConfig();
  });

  it("übernimmt die Palette des gewählten Templates", () => {
    useConfiguratorStore.getState().updateTemplate("cozy");
    const d = useConfiguratorStore.getState().design;
    const cozy = getTemplateDesignDefaults("cozy");

    expect(d.template).toBe("cozy");
    expect(d.primaryColor).toBe(cozy.primaryColor);
    expect(d.backgroundColor).toBe(cozy.backgroundColor);
    expect(d.fontFamily).toBe(cozy.fontFamily);
    expect(d.priceColor).toBe(cozy.priceColor);
  });

  it("lässt selbst gewählte Farben beim Wechsel stehen", () => {
    useConfiguratorStore.getState().updateTemplate("stylish");
    // Nutzer legt eine eigene Primärfarbe fest …
    useConfiguratorStore.getState().updatePrimaryColor("#123456");
    // … und wechselt danach das Template.
    useConfiguratorStore.getState().updateTemplate("cozy");

    const d = useConfiguratorStore.getState().design;
    const cozy = getTemplateDesignDefaults("cozy");

    expect(d.primaryColor).toBe("#123456"); // bleibt erhalten
    expect(d.backgroundColor).toBe(cozy.backgroundColor); // folgt dem Template
  });

  it("'modern' entspricht exakt dem Ausgangszustand des Konfigurators", () => {
    const before = { ...useConfiguratorStore.getState().design };
    useConfiguratorStore.getState().updateTemplate("modern");
    const after = useConfiguratorStore.getState().design;

    expect(after.primaryColor).toBe(before.primaryColor);
    expect(after.secondaryColor).toBe(before.secondaryColor);
    expect(after.priceColor).toBe(before.priceColor);
    expect(after.fontFamily).toBe(before.fontFamily);
  });
});
