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
}

/**
 * Nur öffentliche, indexierbare Routen. Bewusst NICHT enthalten:
 * /login, /signup, /mode-selection (noindex), /dashboard/*, /configurator/*
 * (hinter der Anmeldung) sowie /site/* und /:id/:name/* (nutzerspezifisch).
 * Die Liste spiegelt die Einträge aus public/sitemap.xml.
 */
const ROUTES: Record<string, RouteDef> = {
  "/": { Component: Index, pattern: "/" },
  "/impressum": { Component: Impressum, pattern: "/impressum" },
  "/datenschutz": { Component: Datenschutz, pattern: "/datenschutz" },
  "/agb": { Component: AGB, pattern: "/agb" },
  "/impressum-check": { Component: CheckImpressum, pattern: "/impressum-check" },
  "/datenschutz-check": { Component: CheckDatenschutz, pattern: "/datenschutz-check" },
  "/check-landing": { Component: CheckLanding, pattern: "/check-landing" },
  // DemoDashboardHome enthält ein eigenes <Routes> und leitet den Indexpfad per
  // <Navigate> auf /insights um. Ein <Navigate> beim ersten Render ist im
  // StaticRouter wirkungslos – gerendert würde nichts, und das <PageSEO> der
  // Zielseite käme nie zum Zug. Deshalb direkt am Zielpfad rendern; der dort
  // gesetzte Canonical zeigt ohnehin auf /demo-dashboard.
  "/demo-dashboard": {
    Component: DemoDashboardHome,
    pattern: "/demo-dashboard/*",
    location: "/demo-dashboard/insights",
  },
};

export const ROUTE_PATHS = Object.keys(ROUTES);

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
