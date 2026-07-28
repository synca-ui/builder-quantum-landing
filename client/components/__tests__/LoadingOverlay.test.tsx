import React from "react";
import { render, screen } from "@testing-library/react";
import LoadingOverlay from "../LoadingOverlay";
import { describe, test, expect } from "vitest";

describe("LoadingOverlay", () => {
  test("renders messages and progress", () => {
    const messages = ["One", "Two", "Three"];
    render(<LoadingOverlay visible={true} messages={messages} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("One")).toBeInTheDocument();
  });

  test("is hidden from assistive technology when not visible", () => {
    // Die Komponente bleibt bewusst IMMER im DOM: Sie blendet über eine
    // CSS-Transition aus, ein `return null` würde die Ausblend-Animation
    // verschlucken.
    //
    // Der ursprüngliche Test erwartete hier einen leeren Container und schlug
    // deshalb immer fehl – er beschrieb eine Absicht, die die Komponente nie
    // umgesetzt hat. Geprüft wird jetzt, worauf es tatsächlich ankommt: im
    // unsichtbaren Zustand darf sie weder angesagt noch anklickbar sein.
    const { container } = render(
      <LoadingOverlay visible={false} messages={["x"]} />,
    );

    // aria-hidden -> für Screenreader nicht mehr auffindbar
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    const backdrop = container.querySelector('[aria-hidden="true"]');
    expect(backdrop).toBeTruthy();
    expect(backdrop).toHaveAttribute("aria-busy", "false");
    expect(backdrop?.className).toContain("pointer-events-none");
  });
});
