import { act, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AppAreaShell from "../AppAreaShell";
import Login from "@/pages/Login";

const clerk = vi.hoisted(() => ({
  navigation: {} as {
    routerPush?: (to: string) => void;
    routerReplace?: (to: string) => void;
  },
}));

vi.mock("@clerk/clerk-react", () => ({
  ClerkProvider: ({ children, ...props }) => {
    clerk.navigation = props;
    return children;
  },
  SignIn: () => <div data-testid="sign-in" />,
}));
vi.mock("@/i18n", () => ({ default: {} }));
vi.mock("react-i18next", () => ({
  I18nextProvider: ({ children }) => children,
}));

function renderLogin(initialEntries = ["/login"]) {
  const router = createMemoryRouter(
    [{ element: <AppAreaShell />, children: [
      { path: "/login/*", element: <Login /> },
    ] }],
    { initialEntries },
  );
  const view = render(<RouterProvider router={router} />);
  return { router, ...view };
}

describe("Clerk navigation in the app shell", () => {
  it("keeps the login form and video mounted when moving to password and back", async () => {
    const { router, container } = renderLogin();
    const video = container.querySelector("video");
    const form = screen.getByTestId("sign-in");

    expect(video).not.toBeNull();
    expect(clerk.navigation.routerPush).toBeTypeOf("function");
    await act(async () => clerk.navigation.routerPush!("/login/factor-one"));

    expect(router.state.location.pathname).toBe("/login/factor-one");
    expect(router.state.historyAction).toBe("PUSH");
    expect(container.querySelector("video")).toBe(video);
    expect(screen.getByTestId("sign-in")).toBe(form);

    await act(async () => { await router.navigate(-1); });
    expect(router.state.location.pathname).toBe("/login");
    expect(container.querySelector("video")).toBe(video);
    expect(screen.getByTestId("sign-in")).toBe(form);
  });

  it("replaces a login step without adding an extra browser history entry", async () => {
    const { router } = renderLogin(["/login", "/login/factor-one"]);

    expect(clerk.navigation.routerReplace).toBeTypeOf("function");
    await act(async () => clerk.navigation.routerReplace!("/login/factor-two?redirect_url=%2Fdashboard"));

    expect(router.state.location.pathname).toBe("/login/factor-two");
    expect(router.state.location.search).toBe("?redirect_url=%2Fdashboard");
    expect(router.state.historyAction).toBe("REPLACE");

    await act(async () => { await router.navigate(-1); });
    expect(router.state.location.pathname).toBe("/login");
  });
});
