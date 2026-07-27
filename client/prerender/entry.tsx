/**
 * Prerender-Einstiegspunkt.
 *
 * Rendert die Startseite zur Build-Zeit zu statischem HTML. Das Ergebnis wird
 * von scripts/prerender.mjs in dist/spa/index.html eingesetzt.
 *
 * Zweck:
 *  1. Der Google-Abschnitt (und der restliche Seiteninhalt) steht im rohen HTML,
 *     also ohne JavaScript-Ausführung.
 *  2. Er behebt die Hauptursache des gemessenen CLS von 0,5: Bisher zeigte der
 *     erste Paint nur einen Spinner (100vh), den React anschließend durch die
 *     8232px hohe Seite ersetzt hat – ein einziger, riesiger Layout-Shift des
 *     <body>. Wenn der erste Paint bereits das endgültige Layout zeigt,
 *     entfällt dieser Shift.
 *
 * WICHTIG: Gerendert wird <Index /> – exakt das, was HostAwareRoot auf der
 * Hauptdomain zurückgibt. Der Zustand entspricht dem ersten Client-Render
 * (isVisible=false, Clerk nicht geladen, Suspense-Fallbacks aktiv), damit das
 * Markup beim Mounten deckungsgleich ist.
 */
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { HelmetProvider, type HelmetServerState } from "react-helmet-async";
import Index from "../pages/Index";

export function render(url = "/") {
  const helmetContext: { helmet?: HelmetServerState } = {};

  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location={url}>
        <Index />
      </StaticRouter>
    </HelmetProvider>,
  );

  const helmet = helmetContext.helmet;

  return {
    html,
    title: helmet?.title?.toString() ?? "",
    meta: helmet?.meta?.toString() ?? "",
    link: helmet?.link?.toString() ?? "",
  };
}
