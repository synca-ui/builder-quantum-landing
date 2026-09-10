/**
 * Template-Picker mit einer Konfiguration, deren Template nicht mehr
 * angeboten wird (riviera, verde, stylish …).
 *
 * Vorher hing die Fußleiste mit dem Weiter-Knopf daran, dass das gewählte
 * Template im Picker-Array steht. Wer eine bestehende Riviera-Konfiguration
 * öffnete, sah keine markierte Karte und kam nur weiter, indem er ein anderes
 * Template wählte — was seine Palette überschrieb. Jetzt bleibt der Knopf da.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import { TemplateStep } from "../TemplateStep";
import { useConfiguratorStore } from "@/store/configuratorStore";

describe("TemplateStep — Altbestand", () => {
  beforeEach(() => {
    useConfiguratorStore.getState().resetConfig();
  });

  test("Riviera steht nicht mehr zur Wahl, die Papier-Templates schon", () => {
    render(<TemplateStep nextStep={() => {}} prevStep={() => {}} />);
    // Ohne initialisiertes i18n liefert t() den Key — reicht für die Struktur.
    expect(screen.queryByText("templates.riviera")).toBeNull();
    expect(screen.queryByText("templates.verde")).toBeNull();
    for (const id of [
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
    ]) {
      expect(screen.getByText(`templates.${id}`)).toBeInTheDocument();
    }
  });

  test("gespeicherte Riviera-Konfiguration behält den Weiter-Knopf", () => {
    useConfiguratorStore.setState((s: any) => ({
      design: { ...s.design, template: "riviera" },
    }));
    render(<TemplateStep nextStep={() => {}} prevStep={() => {}} />);
    expect(screen.getByText("templates.useThis")).toBeInTheDocument();
    // Der Name kommt aus dem i18n-Key des Alt-Bestands
    expect(screen.getByText("templates.riviera")).toBeInTheDocument();
  });
});
