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
import { LOYALTY_PFADE } from "../../packages/core/src/api";

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

/** Sammelt alle konkreten Routen der App, inklusive verschachtelter Router. */
function collectRoutes(stack: any[], prefix = ""): string[] {
  const found: string[] = [];
  for (const layer of stack ?? []) {
    if (layer.route) {
      found.push(`${prefix}${layer.route.path}`.replace(/\/{2,}/g, "/"));
    } else if (layer.handle?.stack) {
      found.push(...collectRoutes(layer.handle.stack, prefix + prefixFromLayer(layer)));
    }
  }
  return found;
}

const app: any = createServer();
const routes = collectRoutes(app._router?.stack ?? app.router?.stack);

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

  it("der frühere Fehlpfad /api/apps/publish existiert weiterhin NICHT", () => {
    // Absicherung gegen einen Rückfall: Wäre er da, hätte jemand den Router
    // zusätzlich an der Wurzel gemountet und beide Schreibweisen wären gültig –
    // genau die Zweideutigkeit, die den Fehler damals verdeckt hat.
    expect(routes).not.toContain("/apps/publish");
  });
});
