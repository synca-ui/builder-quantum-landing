import { describe, expect, it } from "vitest";

import { zuE164 } from "./telefon";

/**
 * Geprüft wird die Regel, an der die Wiedererkennung eines Gastes hängt.
 *
 * Der Index `@@unique([businessId, phoneE164])` greift nur, wenn beide Schreibpfade
 * dieselbe Zeichenkette erzeugen. Weicht die Normalisierung um ein Zeichen ab,
 * entsteht derselbe Gast zweimal - und seine Löschanfrage trifft nur eine der beiden
 * Zeilen.
 */
describe("zuE164", () => {
  it.each([
    ["0151 2345678", "491512345678"],
    ["0151-234 56 78", "491512345678"],
    ["(0151) 2345678", "491512345678"],
    ["+49 151 2345678", "491512345678"],
    ["0049 151 2345678", "491512345678"],
    ["+491512345678", "491512345678"],
  ])("führt %s auf dieselbe Kennung zurück", (eingabe, erwartet) => {
    expect(zuE164(eingabe)).toBe(erwartet);
  });

  it("erzeugt aus allen Schreibweisen derselben Nummer genau EINE Kennung", () => {
    const formen = ["0151 2345678", "+49 151 2345678", "0049-151-2345678", "(0151)2345678"];
    expect(new Set(formen.map(zuE164)).size).toBe(1);
  });

  it("rät nicht: eine Nummer ohne +, 00 oder führende 0 bleibt ohne Kennung", () => {
    // "1512345678" könnte eine Durchwahl, eine Nummer ohne Vorwahl oder bereits die
    // internationale Form sein. Wer hier rät, führt zwei fremde Gäste zusammen -
    // das ist schlimmer als ein Doppeleintrag.
    expect(zuE164("1512345678")).toBeNull();
  });

  it("weist Buchstaben ab, statt sie wegzuschneiden", () => {
    expect(zuE164("0151-KAFFEE")).toBeNull();
  });

  it.each([null, undefined, "", "   ", "0", "0151", "+4915123456789012345"])(
    "gibt für %s keine Kennung zurück",
    (eingabe) => {
      expect(zuE164(eingabe as string)).toBeNull();
    },
  );
});
