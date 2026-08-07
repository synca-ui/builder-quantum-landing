import { defineConfig } from "vite";
import path from "path";

// Server build configuration
export default defineConfig({
  build: {
    lib: {
      entry: {
        // Nur noch ein Ziel: Die API läuft auf Railway. Der zweite Entry
        // "netlify" baute eine serverless-Variante für netlify/functions/api.ts
        // — die Function war nie lauffähig (serverless-http fehlte als
        // Dependency, /.netlify/functions/api antwortete 502) und /api/*
        // wird per Redirect ohnehin an Railway geleitet.
        "node-build": path.resolve(__dirname, "server/node-build.ts"),
      },
      formats: ["es"],
    },
    outDir: "dist/server",
    target: "node22",
    ssr: true,
    rollupOptions: {
      external: [
        // Node.js built-ins
        "fs",
        "path",
        "url",
        "http",
        "https",
        "os",
        "crypto",
        "stream",
        "util",
        "events",
        "buffer",
        "querystring",
        "child_process",
        // External dependencies that should not be bundled
        "express",
        "cors",
        "@prisma/client",
        ".prisma",
        // unpdf bringt pdf.js mit (~2 MB) und wird in
        // server/services/menuExtraction.ts ohnehin nur per dynamischem
        // import() geholt. Hier ausdrücklich extern, damit es nicht von einer
        // Vite-Voreinstellung abhängt: Es steht in dependencies (nicht
        // devDependencies) und muss zur Laufzeit aus node_modules auflösbar
        // sein — sonst liest der Server in Produktion wieder keine PDF-Karte.
        "unpdf",
      ],
      output: {
        format: "es",
        entryFileNames: "[name].mjs",
      },
    },
    minify: false, // Keep readable for debugging
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
      // server/maitr importiert das Kernpaket unter diesem Namen. Es gibt weder
      // Workspaces noch ein installiertes @maitr/core, die Auflösung läuft rein
      // über diesen Alias — ohne ihn bricht der Server-Build beim Bündeln ab.
      // Gegenstück in tsconfig.json (dort für die Typprüfung).
      "@maitr/core": path.resolve(__dirname, "./packages/core/src"),
    },
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  server: {
    fs: {
      allow: [
        // Allow shared folder
        path.resolve(__dirname, "shared"),
        path.resolve(__dirname, "client"), // You can add the client folder too
        path.resolve(__dirname, "public"),
        path.resolve(__dirname, "index.html"),
      ],
    },
  },
});
