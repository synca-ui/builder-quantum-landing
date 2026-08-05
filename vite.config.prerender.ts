/**
 * Vite-Konfiguration für den Prerender-Build.
 *
 * Baut client/prerender/entry.tsx als SSR-Bundle nach dist/prerender/.
 * scripts/prerender.mjs importiert das Ergebnis und schreibt das erzeugte HTML
 * in dist/spa/index.html.
 *
 * Bewusst eigenständig gehalten (kein Import aus vite.config.ts): der
 * Client-Build bindet dort einen Express-Dev-Server ein und lädt .env – beides
 * wird zum Prerendern nicht gebraucht.
 *
 * NICHT gelöst durch diese Datei: Die drei <Suspense>-Grenzen der Startseite
 * bleiben ungelöst, das vorgerenderte HTML zeigt dort weiter die Fallbacks
 * (u. a. der leere Kasten h-[850px] statt MaitrWorkflowAnimation). Grund ist
 * renderToString in client/prerender/entry.tsx: es rendert synchron und kann
 * auf ein lazy()-Promise grundsätzlich nicht warten. Das lässt sich nur dort
 * oder in client/pages/Index.tsx beheben, nicht in der Build-Konfiguration.
 */
import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  // React, React-Router & Co. entscheiden erst beim LADEN anhand von
  // process.env.NODE_ENV, ob sie ihre Development- oder Production-Fassung
  // exportieren (react-dom/server.node.js, react-router-dom/dist/main.js).
  // Gelaufen ist das bisher in der Development-Fassung: `node
  // scripts/prerender.mjs` ist ein eigener Prozess, und weder Netlify noch das
  // npm-Skript setzen dort NODE_ENV. Folge im ausgelieferten HTML der
  // Startseite: react-dom hängte an jede ungelöste Suspense-Grenze ein
  // <template data-msg data-stck> mit Fehlertext und absoluten Build-Pfaden –
  // rund 4 KB Development-Diagnostik plus Verweise auf /opt/build/repo/.
  //
  // "mode" hilft dagegen NICHT: `vite build` läuft ohnehin schon in
  // production-mode, und Vite ersetzt process.env.NODE_ENV im SSR-Build
  // bewusst nicht (keepProcessEnv) – der Serverprozess soll die Wahl behalten.
  // Genau die wollen wir hier aber loswerden, also die Weiche mit einem
  // eigenen "define" zur BUILD-Zeit festnageln. Nachgeprüft: Vite übernimmt
  // benutzereigene define-Einträge auch im SSR-Build.
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  ssr: {
    // Alles mit einbündeln – "define" wirkt nur auf Code, der wirklich im
    // Bündel landet; extern gelassene Pakete löst Node zur Laufzeit selbst auf
    // und läge damit wieder auf dem Development-Zweig.
    //
    // Bewusst "true" statt einer Liste (react, react-dom, react-router-dom,
    // @remix-run/router, scheduler): Die Liste baut und rendert heute zwar
    // ebenfalls sauber – ausprobiert –, aber sie ist eine Falle. Sobald ein
    // extern gebliebenes Paket selbst React-Hooks aufruft, holt Node sich
    // dafür eine ZWEITE React-Instanz aus node_modules; deren Dispatcher ist
    // nicht der des gebündelten react-dom. Und jede neue Abhängigkeit müsste
    // man von Hand nachtragen. Der Preis ist ein größeres Bündel und ~1 s mehr
    // Buildzeit – beides reine Build-Artefakte, ausgeliefert wird nur HTML.
    //
    // react-helmet-async war schon vorher dabei: Es wird als CommonJS
    // ausgeliefert, und extern scheitert der ESM-Import der Named Exports.
    noExternal: true,
  },
  build: {
    ssr: true,
    outDir: "dist/prerender",
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      input: path.resolve(__dirname, "client/prerender/entry.tsx"),
      output: { entryFileNames: "entry.mjs", format: "es" },
    },
  },
  resolve: {
    alias: {
      // Clerk ist rein clientseitig – im Prerender durch einen Stub ersetzen,
      // der den ersten Render-Zustand im Browser abbildet.
      "@clerk/clerk-react": path.resolve(
        __dirname,
        "./client/prerender/clerk-ssr-stub.tsx",
      ),
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
    dedupe: ["react", "react-dom"],
  },
});
