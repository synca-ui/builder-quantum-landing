import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./test/setupTests.ts"],
    exclude: [
      // Vitest-Standard. Muss mit aufgeführt werden, weil exclude ihn ersetzt
      // statt ihn zu ergänzen.
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
      // Agenten legen unter .claude/worktrees/ vollständige Kopien des Repos an.
      // Ohne diesen Ausschluss sammelt vitest sie mit ein und führt JEDE Spec
      // doppelt aus – einmal gegen den Arbeitsbaum, einmal gegen eine veraltete
      // Kopie. Ein grüner Lauf sagt dann nichts mehr aus, weil unklar ist,
      // welche Fassung geprüft wurde.
      "**/.claude/worktrees/**",
    ],
  },
});
