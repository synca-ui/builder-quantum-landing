// @vitest-environment node
/**
 * Wächter: Jede Schriftfamilie, die ein Template nennt, ist selbst gehostet
 * — und heißt im Paket genau so.
 *
 * Die Stapel in templateLayout.ts nennen Familien wie "Lora Variable". Das
 * ist der Name aus der @font-face-Regel des fontsource-Pakets; stimmt er
 * nicht (Tippfehler, anderes Paket, Import vergessen), fällt der Browser
 * STILL auf den nächsten Namen im Stapel zurück — Georgia statt Lora, und
 * niemand merkt es, weil die Seite trotzdem rendert. Dieser Test liest die
 * Pakete und templateFonts.ts und bricht, bevor das passiert.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EIGENE_TEMPLATES,
  getTemplateLayout,
  SELBST_GEHOSTETE_FAMILIEN,
} from "../templateLayout";

const ROOT = resolve(process.cwd());
const IMPORTE = readFileSync(resolve(ROOT, "client/lib/templateFonts.ts"), "utf8");

/** "Plus Jakarta Sans Variable" → "plus-jakarta-sans" (Paketname bei fontsource). */
function paket(familie: string): string {
  return familie.replace(/ Variable$/, "").toLowerCase().replace(/\s+/g, "-");
}

describe("Selbst gehostete Familien", () => {
  it.each(SELBST_GEHOSTETE_FAMILIEN)("'%s' hat ein Paket, einen Import und den richtigen Namen", (familie) => {
    const name = paket(familie);
    const ordner = resolve(ROOT, "node_modules/@fontsource-variable", name);
    expect(existsSync(ordner), `Paket @fontsource-variable/${name} fehlt`).toBe(true);
    expect(IMPORTE).toMatch(new RegExp(`import "@fontsource-variable/${name}/[\\w-]+\\.css";`));
    // Der Name in der @font-face-Regel muss dem Stapel entsprechen.
    const css = ["index.css", "wght.css"]
      .map((f) => resolve(ordner, f))
      .filter(existsSync)
      .map((f) => readFileSync(f, "utf8"))
      .join("\n");
    expect(css).toMatch(new RegExp(`font-family:\\s*['"]${familie}['"]`));
  });

  it("jede „… Variable“-Familie in einem Template-Stapel steht in der Liste", () => {
    const genannt = new Set<string>();
    for (const id of [...EIGENE_TEMPLATES, "minimalist"]) {
      const s = getTemplateLayout(id).schrift;
      for (const stapel of [s.sans, s.serif, s.monospace, s.display, s.mono]) {
        for (const m of stapel.matchAll(/"([^"]+ Variable)"/g)) genannt.add(m[1]);
      }
    }
    for (const familie of genannt) {
      expect(SELBST_GEHOSTETE_FAMILIEN, `${familie} fehlt in SELBST_GEHOSTETE_FAMILIEN`).toContain(familie);
    }
  });

  it("kein Stapel und kein Import zeigt auf Google", () => {
    for (const id of EIGENE_TEMPLATES) {
      const s = getTemplateLayout(id).schrift;
      for (const stapel of [s.sans, s.serif, s.monospace, s.display, s.mono]) {
        expect(stapel).not.toMatch(/googleapis|gstatic/);
      }
    }
    // Nur die Import-Zeilen — der Kommentar der Datei nennt die Domain als
    // Begründung, warum es sie NICHT gibt.
    const importe = IMPORTE.split("\n").filter((z) => z.startsWith("import "));
    expect(importe.length).toBeGreaterThanOrEqual(SELBST_GEHOSTETE_FAMILIEN.length);
    for (const zeile of importe) {
      expect(zeile).toMatch(/^import "@fontsource-variable\//);
    }
  });
});
