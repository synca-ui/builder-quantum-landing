/**
 * Prerender-Einstiegspunkt.
 *
 * Rendert die öffentlichen Seiten zur Build-Zeit zu statischem HTML.
 * scripts/prerender.mjs setzt das Ergebnis in dist/spa/<pfad>/index.html ein.
 *
 * Warum jede Route und nicht nur die Startseite:
 * Netlify schreibt jeden Pfad auf index.html um. Ohne eigene Datei je Route
 * bekommt Googlebot im ersten Durchgang – der ohne JavaScript läuft – für
 * /impressum, /agb usw. den Titel UND den Canonical der Startseite geliefert.
 * Jede Unterseite meldet sich damit selbst als Dublette der Startseite; die
 * korrekten Werte aus PageSEO greifen erst nach dem Hydrieren.
 *
 * Zusätzlich gilt für "/" weiterhin: Der Google-Abschnitt (#google-profil) muss
 * ohne JavaScript im rohen HTML stehen (OAuth-Prüfung, Scope business.manage).
 *
 * Der Zustand entspricht bewusst dem ersten Client-Render (Clerk nicht geladen,
 * Suspense-Fallbacks aktiv), damit das Markup beim Mounten deckungsgleich ist.
 */
import type { ComponentType } from "react";
import { renderToString } from "react-dom/server";
import { Routes, Route } from "react-router-dom";
import { StaticRouter } from "react-router-dom/server";
import { HelmetProvider, type HelmetServerState } from "react-helmet-async";

import Index from "../pages/Index";
import Impressum from "../pages/Impressum";
import Datenschutz from "../pages/Datenschutz";
import AGB from "../pages/AGB";
import CheckImpressum from "../pages/CheckImpressum";
import CheckDatenschutz from "../pages/CheckDatenschutz";
import CheckLanding from "../pages/CheckLanding";
import DemoDashboardHome from "../pages/demo/DemoDashboardHome";

interface RouteDef {
  Component: ComponentType;
  /** Route-Muster wie in client/App.tsx, inklusive Splat wo nötig. */
  pattern: string;
  /**
   * Pfad, unter dem gerendert wird, falls er vom Ausgabepfad abweicht.
   * Nötig, wenn die Komponente intern selbst weiterleitet.
   */
  location?: string;
  /**
   * Quelldatei der Seite, relativ zum Projektstamm.
   *
   * scripts/prerender.mjs liest daraus über `git log` das Datum der letzten
   * Änderung und schreibt es als <lastmod> in die Sitemap. changefreq und
   * priority wertet Google seit Jahren nicht mehr aus, lastmod dagegen schon –
   * es ist der einzige Hinweis in der Sitemap, der ein erneutes Crawlen
   * auslöst.
   *
   * Bewusst nur die Seitenkomponente und nicht ihr gesamter Abhängigkeitsbaum:
   * Ein geändertes UI-Grundelement würde sonst alle acht Seiten gleichzeitig
   * als frisch melden. Ein Datum, das für jede URL dasselbe ist, wertet Google
   * als unglaubwürdig und ignoriert es.
   */
  source: string;
}

/**
 * Nur öffentliche, indexierbare Routen. Bewusst NICHT enthalten:
 * /login, /signup, /mode-selection (noindex), /dashboard/*, /configurator/*
 * (hinter der Anmeldung) sowie /site/* und /:id/:name/* (nutzerspezifisch).
 * Die Liste spiegelt die Einträge aus public/sitemap.xml.
 */
const ROUTES: Record<string, RouteDef> = {
  "/": { Component: Index, pattern: "/", source: "client/pages/Index.tsx" },
  "/impressum": {
    Component: Impressum,
    pattern: "/impressum",
    source: "client/pages/Impressum.tsx",
  },
  "/datenschutz": {
    Component: Datenschutz,
    pattern: "/datenschutz",
    source: "client/pages/Datenschutz.tsx",
  },
  "/agb": { Component: AGB, pattern: "/agb", source: "client/pages/AGB.tsx" },
  "/impressum-check": {
    Component: CheckImpressum,
    pattern: "/impressum-check",
    source: "client/pages/CheckImpressum.tsx",
  },
  "/datenschutz-check": {
    Component: CheckDatenschutz,
    pattern: "/datenschutz-check",
    source: "client/pages/CheckDatenschutz.tsx",
  },
  "/check-landing": {
    Component: CheckLanding,
    pattern: "/check-landing",
    source: "client/pages/CheckLanding.tsx",
  },
  // DemoDashboardHome enthält ein eigenes <Routes> und leitet den Indexpfad per
  // <Navigate> auf /insights um. Ein <Navigate> beim ersten Render ist im
  // StaticRouter wirkungslos – gerendert würde nichts, und das <PageSEO> der
  // Zielseite käme nie zum Zug. Deshalb direkt am Zielpfad rendern; der dort
  // gesetzte Canonical zeigt ohnehin auf /demo-dashboard.
  "/demo-dashboard": {
    Component: DemoDashboardHome,
    pattern: "/demo-dashboard/*",
    location: "/demo-dashboard/insights",
    source: "client/pages/demo/DemoDashboardHome.tsx",
  },
};

export const ROUTE_PATHS = Object.keys(ROUTES);

/** Route -> Quelldatei, für das <lastmod> der Sitemap. Siehe RouteDef.source. */
export const ROUTE_SOURCES: Record<string, string> = Object.fromEntries(
  Object.entries(ROUTES).map(([route, def]) => [route, def.source]),
);

export function render(url = "/") {
  const def = ROUTES[url];
  if (!def) {
    throw new Error(`[prerender] Keine Komponente für Route "${url}" hinterlegt.`);
  }
  const { Component, pattern } = def;

  const helmetContext: { helmet?: HelmetServerState } = {};

  // Über <Routes>/<Route> gerendert, nicht die Komponente direkt: nur so
  // stimmt der Routing-Kontext mit client/App.tsx überein, und verschachtelte
  // <Routes> in der Seite lösen ihre Pfade relativ korrekt auf.
  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location={def.location ?? url}>
        <Routes>
          <Route path={pattern} element={<Component />} />
        </Routes>
      </StaticRouter>
    </HelmetProvider>,
  );

  // Von react-helmet-async erzeugte <head>-Tags. Sie tragen data-rh="true";
  // prerender.mjs entfernt damit die statischen Platzhalter aus index.html und
  // setzt stattdessen diese route-spezifischen Tags ein.
  const h = helmetContext.helmet;
  const head = [h?.title, h?.meta, h?.link]
    .map((tag) => tag?.toString() ?? "")
    .filter(Boolean)
    .join("\n  ");

  return { html, head };
}
