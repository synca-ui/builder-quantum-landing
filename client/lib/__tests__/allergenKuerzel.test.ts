import { describe, test, expect } from "vitest";
import { parseAllergenKuerzel } from "../allergenKuerzel";

/**
 * Die Handeingabe im Konfigurator muss dieselben Kürzel erzeugen wie die
 * Karten-Erkennung — sonst findet die Legende ein von Hand eingetragenes
 * "A1" nicht wieder (DishModal schlägt kleingeschrieben nach), und am Gericht
 * stünde ein unaufgelöstes Kürzel neben lauter aufgelösten.
 */
describe("parseAllergenKuerzel", () => {
  test("vereinheitlicht Groß-/Kleinschreibung und Trennzeichen", () => {
    expect(parseAllergenKuerzel("A1, f; G")).toEqual(["a1", "f", "g"]);
  });

  test("wirft Dubletten und Sonderzeichen weg", () => {
    expect(parseAllergenKuerzel("a1, (a1), d)")).toEqual(["a1", "d"]);
  });

  test("verträgt Leereingabe und reine Trennzeichen", () => {
    expect(parseAllergenKuerzel("")).toEqual([]);
    expect(parseAllergenKuerzel(" , ; ")).toEqual([]);
  });

  test("eine halb getippte Liste verliert nichts Fertiges", () => {
    // Während des Tippens wird zwischengespeichert ("a1, " nach 400 ms
    // Pause). Das fertige Kürzel muss dann schon da sein, der Rest darf
    // folgen.
    expect(parseAllergenKuerzel("a1, ")).toEqual(["a1"]);
  });
});
