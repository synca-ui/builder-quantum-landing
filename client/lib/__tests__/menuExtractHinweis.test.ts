/**
 * Der Rückfall auf die Regeln muss in der Oberfläche sichtbar werden.
 *
 * Live-Test 12.09.2026: Der Anthropic-Schlüssel auf Railway war ungültig,
 * die Strukturierung fiel auf shared/menuParser.ts zurück — "Hauptsache:"
 * stand als Gericht in der Karte, alles unter einer Rubrik, keine Legende.
 * Die Oberfläche sagte nur "11 Gerichte übernommen".
 */
import { describe, expect, test } from "vitest";
import { erkennungsHinweis } from "../menuExtract";

describe("erkennungsHinweis", () => {
  test("kein Hinweis, wenn das Modell strukturiert hat", () => {
    expect(
      erkennungsHinweis([
        "Typ erkannt: image (image/png, 148265 Bytes)",
        "Texterkennung (gemini): 1096 Zeichen",
        "claude-haiku-4-5: 11 Gerichte aus 1096 Zeichen",
      ]),
    ).toBeNull();
  });

  test("Hinweis bei fehlgeschlagener Strukturierung (ungültiger Schlüssel)", () => {
    const hinweis = erkennungsHinweis([
      "Texterkennung (gemini): 1096 Zeichen",
      'Strukturierung fehlgeschlagen (Error: 401 {"type":"error","error":{"type":"authentication_error","message":"API key is invalid."}}) — Regeln als Rückfall',
      "Regeln: 11 Gerichte",
    ]);
    expect(hinweis).toMatch(/nur grob gelesen/);
    expect(hinweis).toMatch(/Rubriken/);
  });

  test("Hinweis bei übersprungener Strukturierung (kein Schlüssel gesetzt)", () => {
    expect(
      erkennungsHinweis([
        "Strukturierung übersprungen: ANTHROPIC_API_KEY nicht gesetzt — nur Regeln",
      ]),
    ).not.toBeNull();
  });

  test("leere Diagnose ergibt keinen Hinweis", () => {
    expect(erkennungsHinweis([])).toBeNull();
  });
});
