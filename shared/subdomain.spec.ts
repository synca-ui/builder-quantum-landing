import { describe, it, expect } from "vitest";
import {
  RESERVED_SUBDOMAINS,
  SUBDOMAIN_MAX_LENGTH,
  normalizeSubdomain,
  suggestSubdomain,
  validateSubdomain,
  nextSubdomainCandidate,
} from "./subdomain";

/**
 * Diese Regeln entscheiden, ob eine automatisch erzeugte Web-App überhaupt
 * veröffentlicht werden kann. Läuft der Client hier vom Server weg, bekommt der
 * Nutzer den Fehler erst nach der minutenlangen Analyse zu sehen.
 */
describe("suggestSubdomain", () => {
  it("schreibt deutsche Umlaute aus, statt sie zu Bindestrichen zu zerlegen", () => {
    // Der eigentliche Anlass: normalizeSubdomain allein macht daraus
    // "caf-m-ller", weil é und ü nicht im erlaubten Zeichensatz liegen.
    expect(suggestSubdomain("Café Müller")).toBe("cafe-mueller");
    expect(suggestSubdomain("Gasthaus Schröder")).toBe("gasthaus-schroeder");
    expect(suggestSubdomain("Weißes Rössl")).toBe("weisses-roessl");
  });

  it("übersteht den echten Testbetrieb aus dem Scrape", () => {
    expect(suggestSubdomain("Kleiner Kiepenkerl")).toBe("kleiner-kiepenkerl");
  });

  it("wirft Satzzeichen weg und fasst Trennerfolgen zusammen", () => {
    expect(suggestSubdomain("Zur Post – Gasthof & Hotel")).toBe(
      "zur-post-gasthof-hotel",
    );
  });

  it("liefert null statt eines unbrauchbaren Namens", () => {
    // Zu kurz nach dem Bereinigen, gar kein verwertbares Zeichen, leer.
    expect(suggestSubdomain("A")).toBeNull();
    expect(suggestSubdomain("!!!")).toBeNull();
    expect(suggestSubdomain("")).toBeNull();
    expect(suggestSubdomain(null)).toBeNull();
    expect(suggestSubdomain(undefined)).toBeNull();
  });

  it("liefert null, wenn der Name auf einer reservierten Subdomain landet", () => {
    // Sonst schlüge erst der Server zu – nach der gesamten Analyse.
    expect(suggestSubdomain("Admin")).toBeNull();
    expect(suggestSubdomain("Maitr")).toBeNull();
  });

  it("gibt immer etwas zurück, das validateSubdomain akzeptiert", () => {
    const namen = [
      "Kleiner Kiepenkerl",
      "Café Müller",
      "Zur Post – Gasthof & Hotel",
      "L'Osteria",
      "Restaurant 1900",
      "  Führung  ",
    ];
    for (const name of namen) {
      const vorschlag = suggestSubdomain(name);
      if (vorschlag !== null) {
        expect(validateSubdomain(vorschlag).valid, `${name} -> ${vorschlag}`).toBe(
          true,
        );
      }
    }
  });
});

describe("validateSubdomain", () => {
  it("lehnt zu kurze Namen ab", () => {
    expect(validateSubdomain("ab").valid).toBe(false);
    expect(validateSubdomain("abc").valid).toBe(true);
  });

  it("lehnt unerlaubte Zeichen und Randbindestriche ab", () => {
    expect(validateSubdomain("Mein-Café").valid).toBe(false);
    expect(validateSubdomain("-abc").valid).toBe(false);
    expect(validateSubdomain("abc-").valid).toBe(false);
    expect(validateSubdomain("a_b").valid).toBe(false);
  });

  it("lehnt jede reservierte Subdomain ab", () => {
    for (const reserved of RESERVED_SUBDOMAINS) {
      expect(validateSubdomain(reserved).valid, reserved).toBe(false);
    }
  });

  it("begründet die Ablehnung – die Meldung landet in der Oberfläche", () => {
    expect(validateSubdomain("ab").reason).toMatch(/mindestens/);
    expect(validateSubdomain("www").reason).toMatch(/reserviert/);
  });
});

describe("nextSubdomainCandidate", () => {
  it("lässt den ersten Versuch unverändert", () => {
    expect(nextSubdomainCandidate("kiepenkerl", 0)).toBe("kiepenkerl");
  });

  it("nummeriert ab dem zweiten Versuch durch", () => {
    expect(nextSubdomainCandidate("kiepenkerl", 1)).toBe("kiepenkerl-2");
    expect(nextSubdomainCandidate("kiepenkerl", 2)).toBe("kiepenkerl-3");
  });

  it("kürzt den Stamm statt das Suffix, damit die Zähler unterscheidbar bleiben", () => {
    // Würde das Suffix abgeschnitten, wären alle Versuche derselbe Name und
    // die Kollisionsbehandlung liefe endlos ins Leere.
    const lang = "a".repeat(SUBDOMAIN_MAX_LENGTH);
    const zweiter = nextSubdomainCandidate(lang, 1);
    const dritter = nextSubdomainCandidate(lang, 2);
    expect(zweiter.length).toBeLessThanOrEqual(SUBDOMAIN_MAX_LENGTH);
    expect(zweiter).toMatch(/-2$/);
    expect(dritter).toMatch(/-3$/);
    expect(zweiter).not.toBe(dritter);
  });

  it("liefert nur gültige Kandidaten", () => {
    for (let i = 0; i < 5; i++) {
      expect(validateSubdomain(nextSubdomainCandidate("kiepenkerl", i)).valid).toBe(
        true,
      );
    }
  });
});

describe("normalizeSubdomain", () => {
  it("verhält sich wie die Fassung, die der Server bisher privat hatte", () => {
    expect(normalizeSubdomain("  Mein Café!  ")).toBe("mein-caf");
    expect(normalizeSubdomain("A--B")).toBe("a-b");
    expect(normalizeSubdomain("-abc-")).toBe("abc");
    expect(normalizeSubdomain("x".repeat(100))).toHaveLength(
      SUBDOMAIN_MAX_LENGTH,
    );
  });
});
