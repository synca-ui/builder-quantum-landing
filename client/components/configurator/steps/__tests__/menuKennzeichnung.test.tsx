/**
 * Kennzeichnung im Menü-Schritt: Labels, Kürzel, Legende.
 *
 * Bis 09/2026 kamen Allergene und Labels ausschließlich aus der
 * automatischen Erkennung — von Hand ließ sich kein Allergen eintragen.
 * Hier steht, dass der Editor beides schreibt und die Legende pflegt, und
 * dass er warnt, wenn an Gerichten Kürzel stehen, die niemand erklärt.
 */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: async () => null }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { MenuProductsStep } from "../MenuProductsStep";
import { useConfiguratorStore } from "@/store/configuratorStore";

function mount() {
  return render(<MenuProductsStep nextStep={() => {}} prevStep={() => {}} />);
}

describe("MenuProductsStep — Kennzeichnung", () => {
  beforeEach(() => {
    useConfiguratorStore.setState(useConfiguratorStore.getInitialState(), true);
  });

  test("neues Gericht mit Labels und Kürzeln landet im Store", async () => {
    mount();
    fireEvent.change(screen.getByPlaceholderText("menu.itemNamePlaceholder"), {
      target: { value: "Gemüse-Gyoza" },
    });
    fireEvent.change(screen.getByPlaceholderText("9.99"), { target: { value: "7" } });
    fireEvent.click(screen.getByRole("button", { name: "vegan", pressed: false }));
    const kuerzel = screen.getByLabelText("Allergene und Zusatzstoffe (Kürzel)");
    fireEvent.change(kuerzel, { target: { value: "A, f" } });
    fireEvent.blur(kuerzel);
    // Der Plus-Knopf neben dem Preis — frei erst, wenn der entprellte Name
    // (400 ms) im Formular angekommen ist.
    const preis = screen.getByPlaceholderText("9.99");
    const plus = preis.parentElement!.querySelector("button")!;
    await waitFor(() => expect(plus).not.toBeDisabled(), { timeout: 2000 });
    fireEvent.click(plus);

    const items = useConfiguratorStore.getState().content.menuItems;
    expect(items).toHaveLength(1);
    expect(items[0].labels).toEqual(["vegan"]);
    expect(items[0].allergens).toEqual(["a", "f"]);
  });

  test("warnt, wenn Kürzel an Gerichten ohne Erklärung stehen — die DEHOGA-Vorlage löst es", () => {
    useConfiguratorStore.setState((s: any) => ({
      content: {
        ...s.content,
        menuItems: [{ id: "1", name: "Schnitzel", price: "18.90", allergens: ["a", "c"] }],
      },
    }));
    mount();
    expect(screen.getByRole("alert").textContent).toContain("A, C");

    fireEvent.click(screen.getByRole("button", { name: "DEHOGA-Vorlage ergänzen" }));
    const legende = useConfiguratorStore.getState().content.allergenLegend!;
    expect(legende.a).toBe("Glutenhaltiges Getreide");
    expect(legende["14"]).toBe("gewachst");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("eigenes Kürzel eintragen und wieder entfernen", () => {
    mount();
    fireEvent.change(screen.getByLabelText("Neues Kürzel"), { target: { value: "X" } });
    fireEvent.change(screen.getByLabelText("Bedeutung des neuen Kürzels"), {
      target: { value: "Hausgemacht" },
    });
    fireEvent.keyDown(screen.getByLabelText("Bedeutung des neuen Kürzels"), { key: "Enter" });
    expect(useConfiguratorStore.getState().content.allergenLegend).toEqual({ x: "Hausgemacht" });

    fireEvent.click(screen.getByLabelText("Kürzel X entfernen"));
    expect(useConfiguratorStore.getState().content.allergenLegend).toEqual({});
  });

  test("Kennzeichnung eines bestehenden Gerichts ändern", () => {
    useConfiguratorStore.setState((s: any) => ({
      content: {
        ...s.content,
        menuItems: [{ id: "7", name: "Karaage", price: "8.50", labels: ["scharf"] }],
      },
    }));
    mount();
    // Zusammengeklappt zeigt die Zeile, was gesetzt ist
    expect(screen.getByText(/Kennzeichnung/).parentElement!.textContent).toContain("scharf");
    // Die ID beginnt mit einer Ziffer — als CSS-Selektor unbrauchbar.
    const kuerzel = document.getElementById("7-allergene") as HTMLInputElement;
    expect(kuerzel).not.toBeNull();
    fireEvent.change(kuerzel, { target: { value: "g" } });
    fireEvent.blur(kuerzel);
    expect(useConfiguratorStore.getState().content.menuItems[0].allergens).toEqual(["g"]);
  });
});
