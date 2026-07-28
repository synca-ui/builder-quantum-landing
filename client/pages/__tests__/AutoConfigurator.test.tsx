import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import AutoConfigurator from "../AutoConfigurator";

/**
 * Der vollautomatische Weg von Ende zu Ende: URL eintragen, Analyse abwarten,
 * veröffentlichen – ohne den manuellen Konfigurator.
 *
 * Warum als Komponententest und nicht im Browser: /configurator/auto liegt
 * hinter <RequireAuth>, und Clerk lehnt seine Produktionsschlüssel auf
 * localhost ab ("Production Keys are only allowed for domain maitr.de"). Die
 * Seite bleibt dort dauerhaft im Ladezustand. Hier läuft sie wirklich – und
 * zwar bei jedem Testlauf, nicht nur einmal von Hand.
 *
 * Geprüft wird das, was gegen echte Server-Verträge läuft: der Pfad des
 * Publish-Endpunkts, die Form des Rumpfs und die Kollisionsbehandlung. Genau
 * daran ist Veröffentlichen schon einmal unbemerkt zerbrochen (siehe
 * client/lib/apiPaths.ts).
 */

// Angemeldet – die globale Vorgabe in test/setupTests.ts ist abgemeldet, und
// ohne Token bricht der Ablauf schon vor dem ersten Aufruf ab.
vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
    userId: "user_test",
    getToken: async () => "test-token",
  }),
  useUser: () => ({ isLoaded: true, isSignedIn: true, user: null }),
  ClerkProvider: ({ children }: { children?: unknown }) => children,
  UserButton: () => null,
}));

/** Was der Deep-Scrape-Flow für den echten Testbetrieb liefert. */
const SUGGESTED_CONFIG = {
  businessName: "Kleiner Kiepenkerl",
  primaryColor: "#660c21",
  secondaryColor: "#b8860a",
  phone: "0251 43416",
  gallery: ["https://kleiner-kiepenkerl.de/bild-1.jpg"],
  openingHours: {
    monday: { open: "11:00", close: "23:00", closed: false },
  },
};

interface FetchCall {
  url: string;
  method: string;
  body: any;
}

let calls: FetchCall[] = [];

/**
 * @param publishResponses Antworten auf POST /publish, der Reihe nach. So lässt
 * sich eine belegte Subdomain nachstellen, ohne echte Nebenwirkungen.
 */
function stubFetch(publishResponses: Array<{ status: number; body: any }>) {
  let publishIndex = 0;

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ url, method, body });

      const json = (status: number, payload: any) =>
        ({
          ok: status >= 200 && status < 300,
          status,
          json: async () => payload,
        }) as Response;

      // Analyse anstoßen
      if (url === "/api/scraper" && method === "POST") {
        return json(201, { jobId: "job_1" });
      }

      // Ergebnis abfragen – sofort vollständig, damit kein Timer nötig ist
      if (url.startsWith("/api/scraper/job_1")) {
        return json(200, {
          data: {
            id: "job_1",
            status: "completed",
            businessName: "Kleiner Kiepenkerl",
            suggestedConfig: SUGGESTED_CONFIG,
          },
        });
      }

      // Veröffentlichen
      if (url.includes("/publish")) {
        const next = publishResponses[publishIndex] ?? {
          status: 500,
          body: { success: false, error: "keine Antwort hinterlegt" },
        };
        publishIndex++;
        return json(next.status, next.body);
      }

      return json(404, { error: "unerwarteter Aufruf: " + url });
    }),
  );
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AutoConfigurator />
    </MemoryRouter>,
  );
}

/** Analyse anstoßen und warten, bis der Entwurf steht. */
async function runAnalysis() {
  fireEvent.change(screen.getByPlaceholderText("https://kleiner-kiepenkerl.de"), {
    target: { value: "https://kleiner-kiepenkerl.de" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Automatisch generieren/i }));
  await waitFor(() =>
    expect(screen.getByText(/Analyse abgeschlossen/i)).toBeInTheDocument(),
  );
}

const publishCalls = () => calls.filter((c) => c.url.includes("/publish"));

beforeEach(() => {
  calls = [];
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AutoConfigurator: URL rein, Web-App raus", () => {
  test("schlägt die Subdomain aus dem gefundenen Namen vor", async () => {
    stubFetch([]);
    renderPage();
    await runAnalysis();

    const feld = screen.getByLabelText(/Adresse deiner Web-App/i);
    expect(feld).toHaveValue("kleiner-kiepenkerl");
  });

  test("veröffentlicht auf dem Pfad, den der Server wirklich bedient", async () => {
    stubFetch([
      {
        status: 200,
        body: {
          success: true,
          publishedUrl: "https://kleiner-kiepenkerl.maitr.de",
        },
      },
    ]);
    renderPage();
    await runAnalysis();

    fireEvent.click(screen.getByRole("button", { name: /Jetzt veröffentlichen/i }));

    await waitFor(() => expect(publishCalls()).toHaveLength(1));
    const call = publishCalls()[0];

    // Der frühere Fehlpfad /api/apps/publish antwortete mit 404 – das blieb
    // unbemerkt, weil nichts ihn prüfte.
    expect(call.url).toBe("/api/webapps/apps/publish");
    expect(call.method).toBe("POST");
    expect(call.body.subdomain).toBe("kleiner-kiepenkerl");
  });

  test("schickt die drei Felder mit, ohne die der Server ablehnt", async () => {
    stubFetch([{ status: 200, body: { success: true, publishedUrl: "https://x.maitr.de" } }]);
    renderPage();
    await runAnalysis();
    fireEvent.click(screen.getByRole("button", { name: /Jetzt veröffentlichen/i }));

    await waitFor(() => expect(publishCalls()).toHaveLength(1));
    const config = publishCalls()[0].body.config;

    // validatePublishData in server/routes/webapps.ts verlangt genau diese drei.
    expect(config.business.name).toBe("Kleiner Kiepenkerl");
    expect(config.business.type).toBeTruthy();
    expect(config.design.template).toBeTruthy();
    // Und der Rest des Scrapes darf dabei nicht verloren gehen.
    expect(config.design.primaryColor).toBe("#660c21");
    expect(config.contact.phone).toBe("0251 43416");
    expect(config.content.openingHours.monday.open).toBe("11:00");
  });

  test("zeigt die Adresse an, sobald die Web-App live ist", async () => {
    stubFetch([
      {
        status: 200,
        body: { success: true, publishedUrl: "https://kleiner-kiepenkerl.maitr.de" },
      },
    ]);
    renderPage();
    await runAnalysis();
    fireEvent.click(screen.getByRole("button", { name: /Jetzt veröffentlichen/i }));

    await waitFor(() =>
      expect(screen.getByText(/Deine Web-App ist live/i)).toBeInTheDocument(),
    );
    const link = screen.getByRole("link", { name: /kleiner-kiepenkerl\.maitr\.de/i });
    expect(link).toHaveAttribute("href", "https://kleiner-kiepenkerl.maitr.de");
  });

  test("nummeriert weiter, wenn die Subdomain jemand anderem gehört", async () => {
    stubFetch([
      { status: 409, body: { success: false, error: "bereits vergeben" } },
      {
        status: 200,
        body: { success: true, publishedUrl: "https://kleiner-kiepenkerl-2.maitr.de" },
      },
    ]);
    renderPage();
    await runAnalysis();
    fireEvent.click(screen.getByRole("button", { name: /Jetzt veröffentlichen/i }));

    await waitFor(() => expect(publishCalls()).toHaveLength(2));
    expect(publishCalls()[0].body.subdomain).toBe("kleiner-kiepenkerl");
    expect(publishCalls()[1].body.subdomain).toBe("kleiner-kiepenkerl-2");

    await waitFor(() =>
      expect(screen.getByText(/Deine Web-App ist live/i)).toBeInTheDocument(),
    );
  });

  test("nennt die einzelnen Validierungsgründe statt einer Pauschalmeldung", async () => {
    stubFetch([
      {
        status: 400,
        body: {
          success: false,
          error: "Validierung fehlgeschlagen",
          errors: ["Geschäftstyp ist erforderlich", "Template muss ausgewählt werden"],
        },
      },
    ]);
    renderPage();
    await runAnalysis();
    fireEvent.click(screen.getByRole("button", { name: /Jetzt veröffentlichen/i }));

    await waitFor(() =>
      expect(screen.getByText(/Geschäftstyp ist erforderlich/i)).toBeInTheDocument(),
    );
  });

  test("sagt, dass die Bilder noch auf fremdem Hosting liegen", async () => {
    // Sonst veröffentlicht jemand eine Seite, deren Bilder verschwinden,
    // sobald die analysierte Website sie austauscht.
    stubFetch([]);
    renderPage();
    await runAnalysis();
    expect(screen.getByText(/auf dem Server der analysierten Website/i)).toBeInTheDocument();
  });

  test("benennt, was nicht gefunden und deshalb angenommen wurde", async () => {
    stubFetch([]);
    renderPage();
    await runAnalysis();
    // Der Scrape liefert weder businessType noch template.
    expect(screen.getByText(/Nicht gefunden — wir haben angenommen/i)).toBeInTheDocument();
    expect(screen.getByText(/Geschäftstyp/i)).toBeInTheDocument();
  });

  test("veröffentlicht nicht, solange die Subdomain unbrauchbar ist", async () => {
    stubFetch([]);
    renderPage();
    await runAnalysis();

    fireEvent.change(screen.getByLabelText(/Adresse deiner Web-App/i), {
      target: { value: "ab" },
    });
    expect(screen.getByRole("button", { name: /Jetzt veröffentlichen/i })).toBeDisabled();
    expect(publishCalls()).toHaveLength(0);
  });
});
