import React from "react";
import { render, screen } from "@testing-library/react";
import ModeSelection from "../ModeSelection";
import { MemoryRouter } from "react-router-dom";
import { describe, test, expect, vi } from "vitest";

// Mock the analysis store to avoid global subscriptions during tests
vi.mock("@/data/analysisStore", () => ({
  useAnalysis: () => ({ isLoading: false, n8nData: null }),
  setIsLoading: () => {},
  setN8nData: () => {},
  setSourceLink: () => {},
}));

describe("ModeSelection", () => {
  test("renders selection options", () => {
    render(
      <MemoryRouter>
        <ModeSelection />
      </MemoryRouter>,
    );

    // Die Zusagen standen auf Englisch ("How would you like Maitr to help?",
    // "Guided (Manual)", "Automatic (Zero-Input)"). Die Seite ist längst
    // deutsch – der Test prüfte also Text, den es seit einer Weile nicht mehr
    // gibt. Er konnte das nur nicht melden, weil die Suite insgesamt nicht lief.
    expect(screen.getByText(/Manuelle Konfiguration/i)).toBeInTheDocument();
    expect(screen.getByText(/Automatisch \(Zero-Input\)/i)).toBeInTheDocument();
  });
});
