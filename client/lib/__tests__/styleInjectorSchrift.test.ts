/**
 * Schrift-Variablen des StyleInjectors.
 *
 * Der Paritätstest (templateParitaet.test.tsx) vergleicht Markup — die
 * Schrift steckt aber in einer CSS-Variable, die beide Renderer über
 * injectGlobalStyles setzen. Der Konfigurator (Configurator.tsx) und die
 * Live-Seite (AppRenderer.tsx) müssen dieselbe Schriftfamilie übergeben,
 * sonst zeigt die Vorschau presse in Manrope und die Live-Seite in
 * Newsreader. Hier ist festgenagelt, was die Variable aus (template,
 * fontFamily) macht — und dass der Konfigurator fontFamily mitgibt.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { injectGlobalStyles, removeInjectedStyles } from "../styleInjector";

function variable(name: string): string | null {
  const css = document.getElementById("maitr-injected-styles")?.textContent ?? "";
  const m = new RegExp(`${name}:\\s*([^;]+);`).exec(css);
  return m ? m[1].trim() : null;
}

describe("injectGlobalStyles — --font-template", () => {
  afterEach(() => removeInjectedStyles());

  it("folgt Template UND gewählter Schriftfamilie", () => {
    injectGlobalStyles({ template: "presse", fontFamily: "serif" });
    expect(variable("--font-template")).toContain("Newsreader");
    expect(variable("--font-template-display")).toContain("Newsreader");

    injectGlobalStyles({ template: "presse", fontFamily: "sans-serif" });
    expect(variable("--font-template")).toContain("Manrope");
    // Überschriften bleiben beim Template, egal was der Nutzer wählt
    expect(variable("--font-template-display")).toContain("Newsreader");

    injectGlobalStyles({ template: "kiosk", fontFamily: "sans-serif" });
    expect(variable("--font-template")).toContain("Space Grotesk");
    expect(variable("--font-template-mono")).toContain("monospace");
  });

  it("ohne Schriftfamilie fällt die Variable auf den Sans-Stapel — deshalb muss jeder Aufrufer sie mitgeben", () => {
    injectGlobalStyles({ template: "presse" });
    expect(variable("--font-template")).toContain("Manrope");
  });
});

describe("Beide Aufrufer übergeben die Schriftfamilie", () => {
  // Quelltext-Prüfung, weil Configurator.tsx (Clerk, Router, i18n) im Test
  // nicht sinnvoll zu mounten ist. Fehlt das Feld dort wieder, bricht das.
  it.each([
    "client/pages/Configurator.tsx",
    "client/components/dynamic/AppRenderer.tsx",
  ])("%s gibt fontFamily an injectGlobalStyles", (datei) => {
    const quelle = readFileSync(resolve(process.cwd(), datei), "utf8");
    const aufruf = quelle.slice(quelle.indexOf("injectGlobalStyles({"));
    const block = aufruf.slice(0, aufruf.indexOf("});") + 3);
    expect(block).toMatch(/fontFamily:\s*design\.fontFamily/);
  });
});
