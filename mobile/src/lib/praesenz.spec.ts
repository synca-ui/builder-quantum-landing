/**
 * Öffentliche Präsenz in der App (mobile/src/lib/praesenz.ts).
 */
import { describe, expect, it } from "vitest";
import type { VenuePresence } from "@maitr/core";
import {
  PRAESENZ_HOECHSTALTER_MS,
  PRAESENZ_VERALTET_MS,
  anzahlText,
  brauchtAbruf,
  istPraesenz,
  praesenzEintragAus,
  praesenzFuer,
  standText,
  sterneText,
} from "./praesenz";

const JETZT = Date.parse("2026-09-15T10:00:00.000Z");

function praesenz(teil: Partial<VenuePresence> = {}): VenuePresence {
  return {
    status: "bereit",
    fetchedAt: new Date(JETZT - 60_000).toISOString(),
    bericht: {
      score: 71,
      faktoren: [],
      deckung: { gemessen: 0.7, unbekannt: ["responsiveness", "reach"], geschaetzt: ["activity"], hinweis: "Beruht auf 3 von 5 Faktoren." },
      hebel: [],
      websiteBefunde: [],
      bewertungen: { schnitt: 4.6, anzahl: 312, themen: [] },
    },
    ...teil,
  };
}

describe("istPraesenz", () => {
  it("erkennt die Antwortform und verwirft Fremdes", () => {
    expect(istPraesenz(praesenz())).toBe(true);
    expect(istPraesenz({ status: "bereit" })).toBe(false);
    expect(istPraesenz("<html>")).toBe(false);
    expect(istPraesenz({ ...praesenz(), bericht: { score: "71" } })).toBe(false);
  });
});

describe("brauchtAbruf", () => {
  it("fragt bei nie abgerufenem oder veraltetem Stand, sonst nicht", () => {
    expect(brauchtAbruf(praesenz({ fetchedAt: undefined, status: "ausstehend" }), JETZT)).toBe(true);
    expect(brauchtAbruf(praesenz(), JETZT)).toBe(false);
    expect(brauchtAbruf(praesenz({ fetchedAt: new Date(JETZT - PRAESENZ_VERALTET_MS).toISOString() }), JETZT)).toBe(true);
    expect(brauchtAbruf(praesenz({ fetchedAt: "kaputt" }), JETZT)).toBe(true);
  });
});

describe("praesenzFuer / praesenzEintragAus", () => {
  it("gibt den Stand nur für den Betrieb heraus, für den er geholt wurde", () => {
    const eintrag = { venueId: "biz-a", daten: praesenz() };
    expect(praesenzFuer(eintrag, "biz-a")).toBe(eintrag.daten);
    expect(praesenzFuer(eintrag, "biz-b")).toBeNull();
    expect(praesenzFuer(null, "biz-a")).toBeNull();
  });

  it("verwirft kaputte Schnappschüsse", () => {
    expect(praesenzEintragAus({ venueId: "biz-a", daten: praesenz() }, JETZT)?.venueId).toBe("biz-a");
    expect(praesenzEintragAus({ venueId: "", daten: praesenz() }, JETZT)).toBeNull();
    expect(praesenzEintragAus({ venueId: "biz-a", daten: { status: "bereit" } }, JETZT)).toBeNull();
    expect(praesenzEintragAus(null, JETZT)).toBeNull();
  });

  it("verwirft gespeicherte Stände über dem Google-Höchstalter von 30 Tagen", () => {
    const tag = 24 * 60 * 60_000;
    const alt = (ms: number) => ({ venueId: "biz-a", daten: praesenz({ fetchedAt: new Date(JETZT - ms).toISOString() }) });
    expect(PRAESENZ_HOECHSTALTER_MS).toBe(30 * tag);
    expect(praesenzEintragAus(alt(29 * tag), JETZT)?.venueId).toBe("biz-a");
    expect(praesenzEintragAus(alt(30 * tag), JETZT)?.venueId).toBe("biz-a");
    expect(praesenzEintragAus(alt(30 * tag + 1), JETZT)).toBeNull();
    expect(praesenzEintragAus(alt(90 * tag), JETZT)).toBeNull();
    // Unlesbarer Zeitstempel: das Alter ist unbekannt, also nicht zeigen.
    expect(praesenzEintragAus({ venueId: "biz-a", daten: praesenz({ fetchedAt: "gestern" }) }, JETZT)).toBeNull();
    // Nie abgerufen trägt keine Google-Inhalte - bleibt.
    expect(
      praesenzEintragAus({ venueId: "biz-a", daten: praesenz({ status: "ausstehend", fetchedAt: undefined }) }, JETZT)?.venueId,
    ).toBe("biz-a");
  });
});

describe("Texte", () => {
  it("schreibt Zahlen deutsch und nennt das Alter grob", () => {
    expect(sterneText(4.6)).toBe("4,6");
    expect(anzahlText(1312)).toBe("1.312");
    expect(standText(new Date(JETZT - 20_000).toISOString(), JETZT)).toBe("Stand gerade eben");
    expect(standText(new Date(JETZT - 5 * 60_000).toISOString(), JETZT)).toBe("Stand vor 5 Min");
    expect(standText(new Date(JETZT - 3 * 3_600_000).toISOString(), JETZT)).toBe("Stand vor 3 Std");
    expect(standText(new Date(JETZT - 26 * 3_600_000).toISOString(), JETZT)).toBe("Stand von gestern");
    expect(standText(undefined, JETZT)).toBeNull();
  });
});
