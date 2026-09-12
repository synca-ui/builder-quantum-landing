/**
 * Template-Picker seit 12.09.2026: Stilprobe je Karte, Filter nach
 * Betriebsart, Weiter-Leiste klebt unten.
 *
 * Ohne initialisiertes i18n liefert t() den Key — reicht für die Struktur.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import { TemplateStep } from "../TemplateStep";
import { useConfiguratorStore } from "@/store/configuratorStore";
import { PICKER_TEMPLATES } from "@shared/templateCatalog";

describe("TemplateStep — Stilprobe und Filter", () => {
  beforeEach(() => {
    useConfiguratorStore.getState().resetConfig();
  });

  test("jede angebotene Vorlage trägt eine Stilprobe mit echten Gerichtzeilen", () => {
    render(<TemplateStep nextStep={() => {}} prevStep={() => {}} />);
    for (const { id } of PICKER_TEMPLATES) {
      const probe = screen.getByTestId(`stilprobe-${id}`);
      expect(probe).toBeInTheDocument();
      expect(probe.textContent).toContain("Tagessuppe");
      expect(probe.textContent).toContain("Hausgemachte Pasta");
    }
  });

  test("Filter 'Bar' zeigt nur Vorlagen für Bars, 'Alle' wieder alle", () => {
    render(<TemplateStep nextStep={() => {}} prevStep={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "business.types.bar" }));

    const fuerBars = PICKER_TEMPLATES.filter((t) =>
      t.businessTypes.includes("bar"),
    );
    const nichtFuerBars = PICKER_TEMPLATES.filter(
      (t) => !t.businessTypes.includes("bar"),
    );
    expect(fuerBars.length).toBeGreaterThan(0);
    expect(nichtFuerBars.length).toBeGreaterThan(0);
    // Karten über ihre Stilprobe zählen: Der Name der gewählten Vorlage steht
    // zusätzlich in der Leiste unten, getByText wäre mehrdeutig.
    for (const { id } of fuerBars) {
      expect(screen.getByTestId(`stilprobe-${id}`)).toBeInTheDocument();
    }
    for (const { id } of nichtFuerBars) {
      expect(screen.queryByTestId(`stilprobe-${id}`)).toBeNull();
    }

    fireEvent.click(
      screen.getByRole("button", { name: "templates.filterAll" }),
    );
    for (const { id } of PICKER_TEMPLATES) {
      expect(screen.getByTestId(`stilprobe-${id}`)).toBeInTheDocument();
    }
  });

  test("Filter ist mit der Betriebsart vorbelegt, wenn sie schon feststeht", () => {
    useConfiguratorStore.setState((s: any) => ({
      business: { ...s.business, type: "cafe" },
    }));
    render(<TemplateStep nextStep={() => {}} prevStep={() => {}} />);
    expect(
      screen.getByRole("button", { name: "business.types.cafe" }),
    ).toHaveAttribute("aria-pressed", "true");
    // Eine reine Bar-Vorlage ist dann nicht zu sehen
    const nurBar = PICKER_TEMPLATES.find(
      (t) => !t.businessTypes.includes("cafe"),
    );
    expect(nurBar).toBeDefined();
    expect(screen.queryByTestId(`stilprobe-${nurBar!.id}`)).toBeNull();
  });

  test("Auswahl bleibt in der Leiste, auch wenn der Filter sie ausblendet", () => {
    render(<TemplateStep nextStep={() => {}} prevStep={() => {}} />);
    // "ramen" (Purist) ist nur für Restaurants gedacht
    fireEvent.click(screen.getByText("templates.ramen"));
    fireEvent.click(screen.getByRole("button", { name: "business.types.bar" }));
    expect(screen.queryByTestId("stilprobe-ramen")).toBeNull();
    expect(screen.getByText("templates.useThis")).toBeInTheDocument();
    expect(screen.getByText("templates.ramen")).toBeInTheDocument();
  });
});
