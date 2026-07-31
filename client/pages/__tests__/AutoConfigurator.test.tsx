import React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  configure,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import AutoConfigurator from "../AutoConfigurator";

/**
 * Wartezeit für waitFor heraufgesetzt.
 *
 * Die Speisekarte läuft seit dem 504 am Netlify-Proxy über Anstoß + Abfrage,
 * und die Website-Angaben kommen als zweiter Aufruf dazu. Einzeln ist diese
 * Datei grün; unter Volllast der gesamten Suite reichte die Vorgabe von einer
 * Sekunde nicht. Das war ein Zeitproblem des Tests, kein Produktfehler –
 * deshalb hier eine Zeile statt zwanzig Einzeländerungen.
 */
configure({ asyncUtilTimeout: 8000 });

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

/**
 * Was der Deep-Scrape-Flow für den echten Testbetrieb liefert.
 *
 * Beachte: KEINE menuItems. Genau so sah das Ergebnis in Ausführung 632 aus –
 * der Menü-Zweig des Flows lieferte durch den Binärfehler nie etwas. Deshalb
 * muss die Speisekarte hier nachgezogen werden.
 */
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

const MENU_URL = "https://kleiner-kiepenkerl.de/speisekarte.pdf";

/**
 * Was der Scrape NICHT liefert und aus dem HTML nachgezogen wird.
 * Gegen Ausführung 632 gemessen: address = '' und gar kein Logo.
 */
const SITE_DETAILS = {
  logoUrl: "https://kleiner-kiepenkerl.de/logo.png",
  address: "Spiekerhof 45, 48143 Münster",
  slogan: "Westfälisch seit 1900",
};

/** Antwort von POST /api/menu/extract mit erkannten Gerichten. */
const MENU_OK = {
  success: true,
  status: "done",
  count: 3,
  source: "pdf_ocr",
  diagnostics: ["Texterkennung: 4210 Zeichen, daraus 3 Gerichte"],
  items: [
    { id: "pdfocr-0-toettchen", name: "Töttchen", price: "14.50", category: "Hauptgerichte" },
    { id: "pdfocr-1-wiener-schnitzel", name: "Wiener Schnitzel", price: "18.90", category: "Hauptgerichte" },
    { id: "pdfocr-2-pannfisch", name: "Pannfisch", price: "21.00", category: "Fisch" },
  ],
};

interface FetchCall {
  url: string;
  method: string;
  body: any;
}

let calls: FetchCall[] = [];

interface StubOptions {
  /** Antworten auf POST /publish, der Reihe nach (409 nachstellen usw.). */
  publish?: Array<{ status: number; body: any }>;
  /** Antwort auf POST /api/menu/extract. */
  menu?: { status: number; body: any };
  /** Was suggestedConfig enthält – z.B. mit bereits vorhandener Karte. */
  suggested?: Record<string, unknown>;
  /** menuUrl im Job. null = der Scrape fand keine Karte. */
  menuUrl?: string | null;
  /** Was /api/site/details liefert. */
  site?: Record<string, unknown>;
}

function stubFetch(
  publishResponsesOrOptions: Array<{ status: number; body: any }> | StubOptions = [],
) {
  const options: StubOptions = Array.isArray(publishResponsesOrOptions)
    ? { publish: publishResponsesOrOptions }
    : publishResponsesOrOptions;
  const publishResponses = options.publish ?? [];
  const suggested = options.suggested ?? SUGGESTED_CONFIG;
  const menuUrl = options.menuUrl === undefined ? MENU_URL : options.menuUrl;
  const menuResponse = options.menu ?? { status: 200, body: MENU_OK };
  const siteDetails = options.site ?? SITE_DETAILS;
  let publishIndex = 0;

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      // FormData (Datei-Upload) lässt sich nicht als JSON lesen – dann merken
      // wir uns die Feldnamen, damit der Test den Upload-Weg nachweisen kann.
      let body: any;
      if (init?.body instanceof FormData) {
        body = { __form: [...init.body.keys()] };
      } else if (init?.body) {
        try {
          body = JSON.parse(String(init.body));
        } catch {
          body = String(init.body);
        }
      }
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
            menuUrl,
            suggestedConfig: suggested,
          },
        });
      }

      // Logo, Adresse und soziale Netze aus der Website
      if (url === "/api/site/details") {
        return json(200, { success: true, details: siteDetails });
      }

      // Speisekarten-Erkennung: anstoßen …
      if (url === "/api/menu/extract" && method === "POST") {
        return json(202, { success: true, jobId: "menujob_1", status: "running" });
      }
      // … und abfragen. Der Test antwortet sofort fertig; der Client pollt
      // trotzdem, sodass genau der Weg geprüft wird, der HTTP 504 vermeidet.
      if (url.startsWith("/api/menu/extract/")) {
        return json(menuResponse.status, menuResponse.body);
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
const menuCalls = () =>
  calls.filter((c) => c.url === "/api/menu/extract" && c.method === "POST");
const menuPolls = () => calls.filter((c) => c.url.startsWith("/api/menu/extract/"));

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

  test("holt die Speisekarte nach, wenn der Scrape keine geliefert hat", async () => {
    // Der Regelfall: Der n8n-Menü-Zweig lieferte durch den Binärfehler nie
    // Gerichte, wohl aber die Adresse der Karte.
    stubFetch({});
    renderPage();
    await runAnalysis();

    await waitFor(() => expect(menuCalls()).toHaveLength(1));
    expect(menuCalls()[0].method).toBe("POST");
    expect(menuCalls()[0].body.url).toBe(MENU_URL);

    await waitFor(() =>
      expect(screen.getByText(/3 Gerichte erkannt/i)).toBeInTheDocument(),
    );
  });

  test("stößt die Erkennung an und fragt sie ab, statt zu warten", async () => {
    // Synchron lief das in HTTP 504: Der Netlify-Proxy vor Railway bricht nach
    // 26 Sekunden ab, die Erkennung eines Bild-PDFs braucht 40 bis 90.
    stubFetch({});
    renderPage();
    await runAnalysis();

    await waitFor(() => expect(menuPolls().length).toBeGreaterThan(0));
    // Genau ein Anstoß, danach nur noch Abfragen.
    expect(menuCalls()).toHaveLength(1);
    expect(menuPolls()[0].url).toBe("/api/menu/extract/menujob_1");
    expect(menuPolls()[0].method).toBe("GET");
  });

  test("meldet einen abgelaufenen Auftrag, statt ewig zu fragen", async () => {
    stubFetch({ menu: { status: 404, body: { success: false, error: "Auftrag nicht gefunden" } } });
    renderPage();
    await runAnalysis();

    await waitFor(() =>
      expect(screen.getByText(/nicht mehr auffindbar/i)).toBeInTheDocument(),
    );
    // Und dann ist Schluss – kein Dauerfeuer gegen den Server.
    const nachher = menuPolls().length;
    await new Promise((r) => setTimeout(r, 60));
    expect(menuPolls().length).toBe(nachher);
  });

  test("nimmt die erkannten Gerichte mit ins Veröffentlichen", async () => {
    stubFetch({
      publish: [{ status: 200, body: { success: true, publishedUrl: "https://x.maitr.de" } }],
    });
    renderPage();
    await runAnalysis();
    await waitFor(() => expect(screen.getByText(/3 Gerichte erkannt/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Jetzt veröffentlichen/i }));
    await waitFor(() => expect(publishCalls()).toHaveLength(1));

    const menuItems = publishCalls()[0].body.config.content.menuItems;
    expect(menuItems).toHaveLength(3);
    expect(menuItems.map((m: { name: string }) => m.name)).toContain("Töttchen");
  });

  test("fragt nicht nach, wenn der Scrape eine brauchbare Karte hatte", async () => {
    stubFetch({
      suggested: {
        ...SUGGESTED_CONFIG,
        menuItems: [
          { name: "Töttchen", price: "14.50" },
          { name: "Wiener Schnitzel", price: "18.90" },
          { name: "Pannfisch", price: "21.00" },
        ],
      },
    });
    renderPage();
    await runAnalysis();
    // Kurz warten, damit ein versehentlicher Aufruf Zeit hätte aufzutauchen.
    await new Promise((r) => setTimeout(r, 50));
    expect(menuCalls()).toHaveLength(0);
  });

  test("liest neu, wenn der Scrape nur ein einzelnes Gericht fand", async () => {
    // Ein Treffer aus einer mehrseitigen Karte heißt: Erkennung gescheitert.
    // Würde das als "Karte vorhanden" gelten, bliebe unser geprüfter Parser
    // ungenutzt und der Nutzer bekäme eine Karte mit einer Position.
    stubFetch({
      suggested: { ...SUGGESTED_CONFIG, menuItems: [{ name: "Töttchen", price: "14.50" }] },
    });
    renderPage();
    await runAnalysis();

    await waitFor(() => expect(menuCalls()).toHaveLength(1));
    await waitFor(() =>
      expect(screen.getByText(/3 Gerichte erkannt/i)).toBeInTheDocument(),
    );
  });

  test("fragt nicht nach, wenn es gar keine Menü-Adresse gibt", async () => {
    stubFetch({ menuUrl: null });
    renderPage();
    await runAnalysis();
    await new Promise((r) => setTimeout(r, 50));
    expect(menuCalls()).toHaveLength(0);
    expect(screen.getByText(/Speisekarte hochladen/i)).toBeInTheDocument();
  });

  test("bietet das Hochladen an, wenn die Erkennung nichts fand – und sagt warum", async () => {
    stubFetch({
      menu: {
        status: 200,
        body: {
          success: true,
          status: "done",
          items: [],
          count: 0,
          source: "none",
          diagnostics: ["Texterkennung übersprungen: GEMINI_API_KEY ist nicht gesetzt"],
        },
      },
    });
    renderPage();
    await runAnalysis();

    await waitFor(() =>
      expect(screen.getByText(/GEMINI_API_KEY/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/Speisekarte hochladen/i)).toBeInTheDocument();
  });

  test("liest eine hochgeladene Speisekarte aus", async () => {
    // Der ausdrücklich gewünschte Weg: einfach ein Bild der Karte hochladen.
    stubFetch({ menuUrl: null });
    const { container } = renderPage();
    await runAnalysis();

    const input = container.querySelector(
      'input[type="file"][accept=".pdf,image/*"]',
    ) as HTMLInputElement;
    expect(input).toBeTruthy();

    const file = new File(["%PDF-1.7"], "speisekarte.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(menuCalls()).toHaveLength(1));
    // Als multipart, nicht als JSON – sonst nimmt der Server die Datei nicht an.
    expect(menuCalls()[0].body.__form).toEqual(["file"]);

    await waitFor(() =>
      expect(screen.getByText(/3 Gerichte erkannt/i)).toBeInTheDocument(),
    );
  });

  test("veröffentlicht auch ohne Speisekarte weiter", async () => {
    // Ohne Karte ist die Web-App schwächer, aber nicht wertlos. Ein Fehlschlag
    // hier darf den ganzen Durchlauf nicht verwerfen.
    stubFetch({
      menuUrl: null,
      publish: [{ status: 200, body: { success: true, publishedUrl: "https://x.maitr.de" } }],
    });
    renderPage();
    await runAnalysis();

    expect(
      screen.getByRole("button", { name: /Jetzt veröffentlichen/i }),
    ).not.toBeDisabled();
  });

  test("zieht Adresse und Logo nach, die der Scrape leer lässt", async () => {
    // Ausführung 632 lieferte address = '' und kein Logo – ohne Adresse weiß
    // niemand, wo der Betrieb liegt, ohne Logo sieht jede Seite gleich aus.
    stubFetch({
      publish: [{ status: 200, body: { success: true, publishedUrl: "https://x.maitr.de" } }],
    });
    renderPage();
    await runAnalysis();

    await waitFor(() =>
      expect(calls.some((c) => c.url === "/api/site/details")).toBe(true),
    );

    fireEvent.click(screen.getByRole("button", { name: /Jetzt veröffentlichen/i }));
    await waitFor(() => expect(publishCalls()).toHaveLength(1));

    const business = publishCalls()[0].body.config.business;
    expect(business.location).toBe("Spiekerhof 45, 48143 Münster");
    expect(business.logo?.url).toBe("https://kleiner-kiepenkerl.de/logo.png");
    expect(business.slogan).toBe("Westfälisch seit 1900");
  });

  test("überschreibt nicht, was der Scrape schon geliefert hat", async () => {
    stubFetch({
      suggested: { ...SUGGESTED_CONFIG, location: "Echte Adresse 1", slogan: "Echter Slogan" },
      site: { address: "Falsche Adresse 9", slogan: "Falscher Slogan" },
      publish: [{ status: 200, body: { success: true, publishedUrl: "https://x.maitr.de" } }],
    });
    renderPage();
    await runAnalysis();
    await waitFor(() =>
      expect(calls.some((c) => c.url === "/api/site/details")).toBe(true),
    );

    fireEvent.click(screen.getByRole("button", { name: /Jetzt veröffentlichen/i }));
    await waitFor(() => expect(publishCalls()).toHaveLength(1));

    const business = publishCalls()[0].body.config.business;
    expect(business.location).toBe("Echte Adresse 1");
    expect(business.slogan).toBe("Echter Slogan");
  });

  test("läuft weiter, wenn die Website-Angaben nichts hergeben", async () => {
    // Sie sind eine Ergänzung und dürfen den Ablauf nicht aufhalten.
    stubFetch({ site: {} });
    renderPage();
    await runAnalysis();
    expect(
      screen.getByRole("button", { name: /Jetzt veröffentlichen/i }),
    ).not.toBeDisabled();
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
