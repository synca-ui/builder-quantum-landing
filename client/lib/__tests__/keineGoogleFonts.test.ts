// @vitest-environment node
/**
 * Wächter: Keine Schrift kommt von Google-Servern.
 *
 * Die Datenschutzerklärung (client/pages/Datenschutz.tsx, „Google Fonts“)
 * verspricht, dass Schriftarten lokal eingebunden sind und beim Seitenaufruf
 * keine Verbindung zu Google entsteht. Bis 09/2026 lud index.html Poppins und
 * Space Grotesk trotzdem von fonts.googleapis.com — ein Verstoß, der in
 * Deutschland abgemahnt wird (LG München, 2022). Seitdem: fontsource-Pakete,
 * eingebunden über client/lib/siteFonts.ts (Landingpage) und
 * client/lib/templateFonts.ts (Papier-Templates).
 *
 * Dieser Test bricht, sobald irgendwo wieder ein Google-Fonts-Verweis steht.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(process.cwd());
const MUSTER = /fonts\.googleapis\.com|fonts\.gstatic\.com/;

function dateien(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "__tests__" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) dateien(p, out);
    else if (/\.(tsx?|css|html)$/.test(name)) out.push(p);
  }
  return out;
}

describe("Keine Google-Fonts-Aufrufe", () => {
  it("index.html lädt keine Schrift von Google", () => {
    const html = readFileSync(join(ROOT, "index.html"), "utf8");
    expect(html).not.toMatch(MUSTER);
  });

  it("kein Quelltext unter client/ verweist auf fonts.googleapis.com", () => {
    const treffer = dateien(join(ROOT, "client"))
      .filter((p) => MUSTER.test(readFileSync(p, "utf8")))
      // templateFonts.ts nennt die Domain nur im Kommentar, als Begründung
      .filter((p) => !p.endsWith("templateFonts.ts"));
    expect(treffer).toEqual([]);
  });

  it("App.tsx bindet die selbst gehosteten Schriften ein", () => {
    const app = readFileSync(join(ROOT, "client/App.tsx"), "utf8");
    expect(app).toMatch(/import "\.\/lib\/siteFonts";/);
    const fonts = readFileSync(join(ROOT, "client/lib/siteFonts.ts"), "utf8");
    expect(fonts).toMatch(/@fontsource\/poppins\/400\.css/);
    expect(fonts).toMatch(/@fontsource\/space-grotesk\/400\.css/);
  });
});
