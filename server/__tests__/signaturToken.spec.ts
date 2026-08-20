// @vitest-environment node
/**
 * Signierte Gast-Links (Stempelkarte) — die Zusicherungen, an denen das
 * Zugriffsmodell hängt: deterministisch, kennungs- und secretgebunden,
 * und der Vergleich lehnt Längen-Tricks ab.
 */
import { describe, expect, it } from "vitest";
import { hmacToken, tokenGleich } from "../utils/signaturToken";

describe("hmacToken", () => {
  it("ist deterministisch für gleiche Eingaben", () => {
    expect(hmacToken("stampcard.abc", "s3cret")).toBe(
      hmacToken("stampcard.abc", "s3cret"),
    );
  });

  it("ändert sich mit Kennung UND Secret", () => {
    const basis = hmacToken("stampcard.abc", "s3cret");
    expect(hmacToken("stampcard.xyz", "s3cret")).not.toBe(basis);
    expect(hmacToken("stampcard.abc", "anderes")).not.toBe(basis);
  });
});

describe("tokenGleich", () => {
  it("akzeptiert nur das exakte Token", () => {
    const t = hmacToken("stampcard.abc", "s3cret");
    expect(tokenGleich(t, t)).toBe(true);
    expect(tokenGleich(t, t.slice(0, -1) + "0")).toBe(false);
  });

  it("lehnt abweichende Längen ab statt zu werfen", () => {
    const t = hmacToken("stampcard.abc", "s3cret");
    expect(tokenGleich(t, "")).toBe(false);
    expect(tokenGleich(t, t + "00")).toBe(false);
  });
});
