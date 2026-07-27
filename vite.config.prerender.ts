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
 */
import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  ssr: {
    // react-helmet-async wird als CommonJS ausgeliefert. Extern gelassen
    // scheitert der ESM-Import der Named Exports zur Laufzeit, deshalb mit
    // einbündeln und Rollup die CJS-Interop übernehmen lassen.
    noExternal: ["react-helmet-async"],
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
