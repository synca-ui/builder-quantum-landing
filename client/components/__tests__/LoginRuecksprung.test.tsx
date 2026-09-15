import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import RequireAuth from "../RequireAuth";
import { AuthGateModal } from "../AuthGateModal";

const clerk = vi.hoisted(() => ({
  isSignedIn: false,
  signInProps: {} as Record<string, unknown>,
}));

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: clerk.isSignedIn }),
  SignIn: (props: Record<string, unknown>) => {
    clerk.signInProps = props;
    return <div data-testid="sign-in" />;
  },
}));

describe("Rücksprung nach der Anmeldung (auch nach dem 2FA-Code)", () => {
  it("gibt die geschützte Seite samt Query als redirect_url an /login weiter", () => {
    clerk.isSignedIn = false;
    const router = createMemoryRouter(
      [
        {
          path: "/dashboard/insights",
          element: <RequireAuth><div>geschützt</div></RequireAuth>,
        },
        { path: "/login/*", element: <div>login</div> },
      ],
      { initialEntries: ["/dashboard/insights?tab=woche#oben"] },
    );
    render(<RouterProvider router={router} />);

    expect(router.state.location.pathname).toBe("/login");
    expect(
      new URLSearchParams(router.state.location.search).get("redirect_url"),
    ).toBe("/dashboard/insights?tab=woche#oben");
  });

  it("zwingt das Modal-Ziel für Anmeldung und Registrierung", () => {
    clerk.isSignedIn = false;
    render(
      <AuthGateModal open onClose={() => {}} redirectUrl="/configurator/auto?sourceLink=x" />,
    );

    expect(screen.getByTestId("sign-in")).toBeTruthy();
    expect(clerk.signInProps.forceRedirectUrl).toBe("/configurator/auto?sourceLink=x");
    expect(clerk.signInProps.signUpForceRedirectUrl).toBe("/configurator/auto?sourceLink=x");
  });

  it("schließt das Modal, sobald die Sitzung aktiv ist", () => {
    clerk.isSignedIn = true;
    const onClose = vi.fn();
    render(<AuthGateModal open onClose={onClose} />);

    expect(screen.queryByTestId("sign-in")).toBeNull();
    expect(onClose).toHaveBeenCalled();
  });
});
