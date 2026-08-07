// @vitest-environment node
/**
 * Vertragstest zwischen Client und Server.
 *
 * Anlass: Die Clients riefen /api/apps/publish auf, die Route lag aber unter
 * /api/webapps/apps/publish. Gegen Produktion gemessen: 404 gegen 401. Damit war
 * das Veröffentlichen vollständig kaputt – auch im manuellen Konfigurator, dessen
 * PublishStep genau diesen Pfad benutzt. Weder Typecheck noch Build noch die
 * Testsuite konnten das bemerken, weil Pfade schlicht Strings sind.
 *
 * Dieser Test läuft gegen die ECHTE Express-Routing-Tabelle: Er baut die App,
 * flacht ihren Router-Stack ab und prüft, dass jeder Pfad aus
 * client/lib/apiPaths.ts dort auch wirklich existiert. Keine Quelltext-Analyse,
 * keine Netzwerkaufrufe, keine Datenbank.
 */
import { describe, expect, it } from "vitest";
import { createServer } from "../index";
import { API_PATHS } from "../../client/lib/apiPaths";
import { BETRIEB_PFADE, LOYALTY_PFADE } from "../../packages/core/src/api";

/** Wandelt die Regex eines gemounteten Routers zurück in sein Pfad-Präfix. */
function prefixFromLayer(layer: any): string {
  if (layer?.path) return layer.path;
  const source: string | undefined = layer?.regexp?.source;
  if (!source) return "";
  if (source === "^\\/?(?=\\/|$)") return ""; // an der Wurzel gemountet
  return source
    .replace("^\\/", "/")
    .replace("\\/?(?=\\/|$)", "")
    .replace(/\\\//g, "/")
    .replace(/\$$/, "");
}

/**
 * Sammelt alle konkreten Routen der App mitsamt ihren HTTP-Methoden.
 *
 * Die Methode wird mitgelesen, weil der Pfadvergleich allein blind dafür ist: Aus
 * `venuesRouter.patch` ein `.put` zu machen, liess diesen Test unverändert grün -
 * der Client rief anschliessend PATCH auf eine Route, die es nur als PUT gab, und
 * das fiele erst im Betrieb als 404 auf. Genau der Fehlertyp, gegen den diese Datei
 * überhaupt geschrieben wurde, nur eine Ebene tiefer.
 */
function collectRouteEntries(
  stack: any[],
  prefix = "",
): Array<{ path: string; methods: string[] }> {
  const found: Array<{ path: string; methods: string[] }> = [];
  for (const layer of stack ?? []) {
    if (layer.route) {
      found.push({
        path: `${prefix}${layer.route.path}`.replace(/\/{2,}/g, "/"),
        methods: Object.keys(layer.route.methods ?? {}).filter((m) => layer.route.methods[m]),
      });
    } else if (layer.handle?.stack) {
      found.push(...collectRouteEntries(layer.handle.stack, prefix + prefixFromLayer(layer)));
    }
  }
  return found;
}

/** Nur die Pfade - für die Prüfungen, deren Konstanten keine Methode führen. */
function collectRoutes(stack: any[], prefix = ""): string[] {
  return collectRouteEntries(stack, prefix).map((e) => e.path);
}

const app: any = createServer();
const routeEintraege = collectRouteEntries(app._router?.stack ?? app.router?.stack);
const routes = routeEintraege.map((e) => e.path);

/**
 * Mit welcher HTTP-Methode ruft der Client jeden `BETRIEB_PFADE`-Eintrag wirklich?
 *
 * Steht hier und nicht in der Konstante selbst: `BETRIEB_PFADE` ist eine reine
 * Pfadsammlung und soll es bleiben - sie wird auch vom Client benutzt, der die
 * Methode ohnehin an der Aufrufstelle nennt. Die Zuordnung ist deshalb Wissen des
 * Vertragstests. Kommt ein Pfad dazu, ohne hier einzutragen, wird der Test rot -
 * absichtlich: ein ungeprüfter Pfad soll nicht stillschweigend durchrutschen.
 */
const ERWARTETE_METHODEN: Record<keyof typeof BETRIEB_PFADE, string[]> = {
  betriebe: ["get", "post"], // mine() und create()
  betrieb: ["patch"], // update()
  oeffentlich: ["get"], // publicProfile()
  integrationen: ["get"], // integrations.list()
  integrationVerbinden: ["get"], // integrations.connectUrl()
};

describe("API-Vertrag zwischen Client und Server", () => {
  it("die Routing-Tabelle lässt sich überhaupt auslesen", () => {
    // Schlägt das fehl, prüft der Rest nichts mehr – dann ist die
    // Express-Version umgestellt und prefixFromLayer muss nachgezogen werden.
    expect(routes.length).toBeGreaterThan(10);
  });

  it.each(
    Object.entries(API_PATHS).map(([name, value]) => {
      // Parametrisierte Pfade sind Funktionen (z.B. appById). Mit einem Marker
      // aufrufen, der encodeURIComponent unverändert übersteht, und ihn aufs
      // Express-Muster ":id" abbilden – so bleibt der Vergleich ein
      // String-Vergleich gegen die echte Routing-Tabelle.
      const clientPath =
        typeof value === "function"
          ? value("__id__").replace("__id__", ":id")
          : value;
      return [name, clientPath] as const;
    }),
  )(
    "%s (%s) existiert serverseitig",
    (_name, clientPath) => {
      // Die Clients rufen mit /api-Präfix auf, die App mountet den Router darunter.
      const candidates = [clientPath, clientPath.replace(/^\/api/, "")];
      const exists = routes.some((r) => candidates.includes(r));

      expect(
        exists,
        `Pfad "${clientPath}" aus client/lib/apiPaths.ts ist serverseitig nicht registriert.\n` +
          `Bekannte Routen:\n  ${routes.sort().join("\n  ")}`,
      ).toBe(true);
    },
  );

  /**
   * Die Stempelkarte lief bisher an diesem Test vorbei.
   *
   * Geprüft wurde ausschliesslich `client/lib/apiPaths.ts` (Web). Mobile und
   * `packages/core` hatten ihre zwölf Loyalty-Pfade roh im Funktionsrumpf stehen -
   * ein Tippfehler darin wäre erst im Betrieb aufgefallen, und zwar am Tresen.
   * Seit sie in `LOYALTY_PFADE` liegen, sind sie hier prüfbar.
   */
  it.each(
    Object.entries(LOYALTY_PFADE).map(([name, wert]) => {
      const pfad =
        typeof wert === "function" ? wert("__id__").replace("__id__", ":id") : (wert as string);
      return [name, pfad] as const;
    }),
  )("loyalty.%s (%s) existiert serverseitig", (_name, pfad) => {
    // Der Loyalty-Router hängt unter /api/maitr; die Kennung heisst dort je nach
    // Route :programId, :cardId oder :guestId.
    const kandidaten = [":programId", ":cardId", ":guestId"].map(
      (param) => `/api/maitr${pfad.replace(":id", param)}`,
    );
    const vorhanden = routes.some((r) => kandidaten.includes(r));

    expect(
      vorhanden,
      `Pfad "${pfad}" aus packages/core/src/api ist serverseitig nicht registriert.\n` +
        `Bekannte Routen:\n  ${routes.sort().join("\n  ")}`,
    ).toBe(true);
  });

  /**
   * `BETRIEB_PFADE` (Betriebe + Integrationen) lief bisher an diesem Test vorbei -
   * derselbe Anlass wie bei `LOYALTY_PFADE` oben: Die fünf Pfade standen roh im
   * Funktionsrumpf von `venues.*` und `integrations.*`, ein Tippfehler darin wäre
   * erst im Betrieb aufgefallen. Seit sie in `BETRIEB_PFADE` liegen, sind sie hier
   * prüfbar.
   *
   * ZWEI Besonderheiten gegenüber `LOYALTY_PFADE`, beide gegen die ECHTE
   * Routing-Tabelle geprüft (siehe `_tmp`-Sondierung, nicht geraten):
   *  - `betriebe` und `integrationen` sind Sammelpfade OHNE eigenes Pfadsegment
   *    (`venuesRouter.get("/", ...)`) - registriert wird dadurch buchstäblich
   *    ".../venues/" MIT Schrägstrich, nicht ".../venues" ohne. Ein Kandidat ohne
   *    Schrägstrich fände die Route hier NICHT (anders als zur Laufzeit, wo
   *    Express beide Schreibweisen matcht - `collectRoutes` liest aber die
   *    registrierten Strings, nicht das Matching-Verhalten).
   *  - Die Kennung im generischen Platzhalter (":id") heisst je nach Route
   *    unterschiedlich (`:venueId`, `:slug`, `:provider`) - wie bei
   *    `LOYALTY_PFADE` per Kandidatenliste abgedeckt, nicht neu erfunden.
   */
  it.each(
    Object.entries(BETRIEB_PFADE).map(([name, wert]) => {
      // BETRIEB_PFADE ist - anders als LOYALTY_PFADE - keine homogene Sammlung:
      // `integrationVerbinden` nimmt einen `ProviderId`, nicht jeden `string`. Der
      // Cast betrifft nur den TESTAUFRUF hier (ein Platzhalter-String für JEDE
      // Pfadfunktion), nicht die Typisierung von BETRIEB_PFADE selbst - die bleibt
      // in packages/core/src/api/index.ts unverändert eng.
      const pfad =
        typeof wert === "function"
          ? (wert as (id: string) => string)("__id__").replace("__id__", ":id")
          : (wert as string);
      return [name, pfad] as const;
    }),
  )("venues.%s (%s) existiert serverseitig", (_name, pfad) => {
    const mitPraefix = `/api/maitr${pfad}`;
    const kandidaten = new Set<string>([
      mitPraefix,
      `${mitPraefix}/`, // Sammelpfade (betriebe, integrationen) hängen an der Router-Wurzel "/".
      ...["venueId", "slug", "provider"].map((param) => mitPraefix.replace(":id", `:${param}`)),
    ]);
    const vorhanden = routes.some((r) => kandidaten.has(r));

    expect(
      vorhanden,
      `Pfad "${pfad}" aus packages/core/src/api ist serverseitig nicht registriert.\n` +
        `Geprüfte Kandidaten:\n  ${[...kandidaten].join("\n  ")}\n` +
        `Bekannte Routen:\n  ${routes.sort().join("\n  ")}`,
    ).toBe(true);
  });

  /**
   * Und dieselben Pfade noch einmal - diesmal MIT der Methode.
   *
   * Anlass: Der Pfadvergleich oben blieb grün, als `venuesRouter.patch` testweise
   * zu `.put` wurde. Der Client rief danach PATCH auf eine Route, die es nur als
   * PUT gab. Für `API_PATHS` und `LOYALTY_PFADE` bleibt es beim reinen
   * Pfadvergleich: die beiden Konstanten führen keine Methode mit, und sie darum
   * umzubauen, hätte an dieser Stelle nichts mit dem Anlass zu tun. Der
   * Unterschied ist also gewollt, kein Versehen.
   */
  it.each(
    Object.entries(BETRIEB_PFADE).map(([name, wert]) => {
      const pfad =
        typeof wert === "function"
          ? (wert as (id: string) => string)("__id__").replace("__id__", ":id")
          : (wert as string);
      return [name, pfad, ERWARTETE_METHODEN[name as keyof typeof BETRIEB_PFADE]] as const;
    }),
  )("venues.%s (%s) ist unter der erwarteten Methode registriert", (_name, pfad, erwartet) => {
    const mitPraefix = `/api/maitr${pfad}`;
    const kandidaten = new Set<string>([
      mitPraefix,
      `${mitPraefix}/`,
      ...["venueId", "slug", "provider"].map((param) => mitPraefix.replace(":id", `:${param}`)),
    ]);
    // Ein Pfad kann mehrfach registriert sein (GET und POST auf "/"), deshalb alle
    // passenden Einträge einsammeln statt nur den ersten zu nehmen.
    const vorhandeneMethoden = new Set(
      routeEintraege.filter((e) => kandidaten.has(e.path)).flatMap((e) => e.methods),
    );

    expect(
      erwartet,
      `Für "${_name}" ist keine erwartete Methode hinterlegt - siehe ERWARTETE_METHODEN.`,
    ).toBeDefined();
    for (const methode of erwartet) {
      expect(
        vorhandeneMethoden.has(methode),
        `"${pfad}" ist serverseitig nicht als ${methode.toUpperCase()} registriert.\n` +
          `Gefundene Methoden: ${[...vorhandeneMethoden].join(", ") || "(keine)"}`,
      ).toBe(true);
    }
  });

  it("der frühere Fehlpfad /api/apps/publish existiert weiterhin NICHT", () => {
    // Absicherung gegen einen Rückfall: Wäre er da, hätte jemand den Router
    // zusätzlich an der Wurzel gemountet und beide Schreibweisen wären gültig –
    // genau die Zweideutigkeit, die den Fehler damals verdeckt hat.
    expect(routes).not.toContain("/apps/publish");
  });
});
