import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
      // Vierte und letzte Stelle, an der dieser Alias stehen muss: Tests, die
      // server/index.ts laden, ziehen über den Maitr-Router auch @maitr/core.
      // Die anderen drei sind tsconfig.json (Typprüfung), vite.config.ts
      // (Dev-Server) und vite.config.server.ts (Server-Build).
      //
      // Dass es vier sind, liegt daran, dass es keine Workspaces gibt und
      // packages/core auf rohe .ts-Dateien zeigt — Node kann das Paket nicht
      // selbst auflösen, jeder Werkzeugkette muss man es einzeln beibringen.
      // Wer @maitr/core-Unterpfade ergänzt, muss hier nichts ändern; wer das
      // Paket verschiebt, muss alle vier anfassen.
      "@maitr/core": path.resolve(__dirname, "./packages/core/src"),
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
