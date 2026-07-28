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
