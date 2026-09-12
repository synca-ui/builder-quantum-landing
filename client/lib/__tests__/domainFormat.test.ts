import { describe, it, expect } from "vitest";
import { pruefeDomainFormat } from "../domainFormat";

describe("pruefeDomainFormat", () => {
  it("akzeptiert gewöhnliche Domains", () => {
    for (const domain of [
      "mein-restaurant.de",
      "www.haus-toeller.de",
      "bistro.example.co.uk",
      "café-münster.de",
      "0815-bar.berlin",
    ]) {
      expect(pruefeDomainFormat(domain)).toEqual({
        ok: true,
        domain: domain.toLowerCase(),
      });
    }
  });

  it("normalisiert Groß-/Kleinschreibung, Leerraum und Schlusspunkt", () => {
    expect(pruefeDomainFormat("  Mein-Restaurant.DE. ")).toEqual({
      ok: true,
      domain: "mein-restaurant.de",
    });
  });

  // Der eigentliche Fehler: „asdf“ galt früher als „bereit zur Verbindung“.
  it("weist Eingaben ohne Endung ab", () => {
    const ergebnis = pruefeDomainFormat("asdf");
    expect(ergebnis.ok).toBe(false);
  });

  it("weist leere Eingaben ab", () => {
    expect(pruefeDomainFormat("   ").ok).toBe(false);
  });

  it.each([
    "not a domain",
    "https://mein-restaurant.de",
    "mein-restaurant.de/speisekarte",
    "mein-restaurant.de:8080",
    "post@mein-restaurant.de",
    "-restaurant.de",
    "restaurant-.de",
    "restaurant..de",
    "restaurant.d",
    "restaurant.123",
  ])("weist %s ab", (eingabe) => {
    expect(pruefeDomainFormat(eingabe).ok).toBe(false);
  });
});
