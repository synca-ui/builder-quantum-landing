/**
 * Echte Reservierungen in der App (mobile/src/features/reservations/echteReservierungen.ts).
 */
import { describe, expect, it } from "vitest";
import type { Reservation } from "@maitr/core";
import {
  anfragenOffen,
  anfragenOffenText,
  erlaubteAktionen,
  fehlerText,
  gaesteAusReservierungen,
  gastZusammenfassung,
  gruppiereNachTag,
  istReservierung,
  naechsteAnkunft,
  quelleText,
  reservierungenAus,
  rueckfrage,
  tagesSchluessel,
  tagesTitel,
  tagesZusammenfassung,
  tagUndUhrzeit,
  telefonLink,
  telefonSchluessel,
  uhrzeit,
  unklarObGeaendert,
  wanduhrBerlin,
} from "./echteReservierungen";

// Dienstag, 15.09.2026, 14:00 in Berlin (Sommerzeit, UTC+2).
const JETZT = Date.parse("2026-09-15T12:00:00.000Z");

let zaehler = 0;
function res(teil: Partial<Reservation> = {}): Reservation {
  zaehler += 1;
  return {
    id: `r${zaehler}`,
    guestName: "Marie Weber",
    partySize: 2,
    start: "2026-09-15T17:00:00.000Z",
    end: "2026-09-15T19:00:00.000Z",
    status: "confirmed",
    source: "website",
    ...teil,
  };
}

describe("Zeit in Europe/Berlin", () => {
  it("rechnet im Sommer mit UTC+2 und im Winter mit UTC+1", () => {
    expect(uhrzeit(Date.parse("2026-09-15T17:00:00.000Z"))).toBe("19:00");
    expect(uhrzeit(Date.parse("2026-12-01T17:00:00.000Z"))).toBe("18:00");
  });

  it("stellt am letzten Sonntag im März und Oktober um 01:00 UTC um", () => {
    // 29.03.2026 ist der letzte Sonntag im März.
    expect(uhrzeit(Date.parse("2026-03-29T00:59:00.000Z"))).toBe("01:59");
    expect(uhrzeit(Date.parse("2026-03-29T01:00:00.000Z"))).toBe("03:00");
    // 25.10.2026 ist der letzte Sonntag im Oktober.
    expect(uhrzeit(Date.parse("2026-10-25T00:59:00.000Z"))).toBe("02:59");
    expect(uhrzeit(Date.parse("2026-10-25T01:00:00.000Z"))).toBe("02:00");
  });

  it("ordnet eine Buchung kurz nach Mitternacht dem Berliner Tag zu, nicht dem UTC-Tag", () => {
    // 22:30 UTC am 16.09. ist 00:30 am 17.09. in Berlin.
    expect(tagesSchluessel(Date.parse("2026-09-16T22:30:00.000Z"))).toBe("2026-09-17");
    expect(wanduhrBerlin(Date.parse("2026-12-31T23:30:00.000Z"))).toMatchObject({
      jahr: 2027,
      monat: 1,
      tag: 1,
      stunde: 0,
    });
  });

  it("schreibt Heute, Morgen und danach Wochentag mit Datum", () => {
    expect(tagesTitel(Date.parse("2026-09-15T20:00:00.000Z"), JETZT)).toBe("Heute");
    expect(tagesTitel(Date.parse("2026-09-16T08:00:00.000Z"), JETZT)).toBe("Morgen");
    expect(tagesTitel(Date.parse("2026-09-17T08:00:00.000Z"), JETZT)).toBe("Do, 17. Sep");
    expect(tagesTitel(Date.parse("2026-10-05T08:00:00.000Z"), JETZT)).toBe("Mo, 5. Okt");
    // 23:30 Berlin am 15. ist "Heute", obwohl UTC schon 21:30 zeigt - und 00:30 am 16. "Morgen".
    expect(tagesTitel(Date.parse("2026-09-15T21:30:00.000Z"), JETZT)).toBe("Heute");
    expect(tagesTitel(Date.parse("2026-09-15T22:30:00.000Z"), JETZT)).toBe("Morgen");
    expect(tagUndUhrzeit(Date.parse("2026-09-16T17:30:00.000Z"), JETZT)).toBe("Morgen · 19:30");
  });

  it("findet Morgen auch über den Monatswechsel", () => {
    const ende = Date.parse("2026-09-30T10:00:00.000Z");
    expect(tagesTitel(Date.parse("2026-10-01T10:00:00.000Z"), ende)).toBe("Morgen");
  });
});

describe("Form der Antwort", () => {
  it("nimmt nur Listen, verwirft kaputte Zeilen und sortiert nach Beginn", () => {
    expect(reservierungenAus({ reservations: [] })).toBeNull();
    expect(reservierungenAus(null)).toBeNull();
    expect(reservierungenAus([])).toEqual([]);

    const spaet = res({ start: "2026-09-16T18:00:00.000Z" });
    const frueh = res({ start: "2026-09-15T18:00:00.000Z" });
    const liste = reservierungenAus([
      spaet,
      { ...frueh, start: "kein Datum" },
      { ...frueh, status: "seated" },
      { id: "x" },
      frueh,
    ]);
    expect(liste?.map((r) => r.id)).toEqual([frueh.id, spaet.id]);
  });

  it("erkennt eine gültige Reservierung", () => {
    expect(istReservierung(res())).toBe(true);
    expect(istReservierung({ ...res(), id: "" })).toBe(false);
    expect(istReservierung({ ...res(), partySize: "2" })).toBe(false);
  });
});

describe("erlaubte Aktionen", () => {
  it("Anfrage → Bestätigen oder Absagen, auch wenn der Beginn vorbei ist", () => {
    expect(erlaubteAktionen(res({ status: "pending" }), JETZT)).toEqual(["bestaetigen", "absagen"]);
    expect(
      erlaubteAktionen(res({ status: "pending", start: "2026-09-15T10:00:00.000Z" }), JETZT),
    ).toEqual(["bestaetigen", "absagen"]);
  });

  it("Bestätigt in der Zukunft → Absagen; ab Beginn → No-Show", () => {
    expect(erlaubteAktionen(res({ start: "2026-09-15T12:00:01.000Z" }), JETZT)).toEqual(["absagen"]);
    expect(erlaubteAktionen(res({ start: "2026-09-15T12:00:00.000Z" }), JETZT)).toEqual(["no_show"]);
    expect(erlaubteAktionen(res({ start: "2026-09-15T11:00:00.000Z" }), JETZT)).toEqual(["no_show"]);
  });

  it("Abgesagt, No-Show und Walk-in → keine", () => {
    expect(erlaubteAktionen(res({ status: "cancelled" }), JETZT)).toEqual([]);
    expect(erlaubteAktionen(res({ status: "no_show", start: "2026-09-15T10:00:00.000Z" }), JETZT)).toEqual([]);
    expect(erlaubteAktionen(res({ status: "walk_in", start: "2026-09-15T10:00:00.000Z" }), JETZT)).toEqual([]);
  });
});

describe("Rückfrage", () => {
  it("sagt bei einer Anfrage mit E-Mail, wohin die Absage geht", () => {
    const frage = rueckfrage("absagen", res({ status: "pending", email: "marie@example.de" }), JETZT);
    expect(frage?.titel).toBe("Reservierung absagen?");
    expect(frage?.text).toContain("Marie Weber · Heute · 19:00 · 2 Personen");
    expect(frage?.text).toContain("marie@example.de");
  });

  it("verspricht keine Nachricht, wo der Server keine schickt", () => {
    expect(rueckfrage("absagen", res({ status: "pending" }), JETZT)?.text).toContain(
      "erfährt die Absage nicht automatisch",
    );
    // Bestätigt absagen: Der Server mailt nur beim Übergang aus PENDING.
    const bestaetigt = rueckfrage("absagen", res({ email: "marie@example.de", phone: "0170 1234567" }), JETZT);
    expect(bestaetigt?.text).not.toContain("marie@example.de");
    expect(bestaetigt?.text).toContain("nicht automatisch benachrichtigt");
  });

  it("fragt vor dem No-Show, aber nicht vor dem Bestätigen", () => {
    expect(rueckfrage("no_show", res({ start: "2026-09-15T10:00:00.000Z" }), JETZT)?.text).toContain(
      "zu 12:00 Uhr nicht erschienen",
    );
    expect(rueckfrage("bestaetigen", res({ status: "pending" }), JETZT)).toBeNull();
  });
});

describe("Tagesgruppen und Summen", () => {
  it("gruppiert nach Berliner Tag und zählt offene Anfragen und bestätigte Personen", () => {
    const liste = [
      res({ start: "2026-09-16T17:00:00.000Z", status: "pending", partySize: 4 }),
      res({ start: "2026-09-15T17:00:00.000Z", partySize: 2 }),
      res({ start: "2026-09-15T18:00:00.000Z", status: "walk_in", partySize: 3 }),
      res({ start: "2026-09-15T19:00:00.000Z", status: "cancelled", partySize: 6 }),
      res({ start: "2026-09-15T16:00:00.000Z", status: "pending", partySize: 5 }),
      // 00:30 Berlin am 17.09.
      res({ start: "2026-09-16T22:30:00.000Z", partySize: 2 }),
    ];
    const gruppen = gruppiereNachTag(liste, JETZT);
    expect(gruppen.map((g) => g.titel)).toEqual(["Heute", "Morgen", "Do, 17. Sep"]);

    const [heute, morgen, donnerstag] = gruppen;
    expect(heute.reservierungen.map((r) => r.start)).toEqual([
      "2026-09-15T16:00:00.000Z",
      "2026-09-15T17:00:00.000Z",
      "2026-09-15T18:00:00.000Z",
      "2026-09-15T19:00:00.000Z",
    ]);
    expect(heute.anfragenOffen).toBe(1);
    expect(heute.personenBestaetigt).toBe(5);
    expect(tagesZusammenfassung(heute)).toBe("1 Anfrage offen · 5 Personen bestätigt");
    expect(tagesZusammenfassung(morgen)).toBe("1 Anfrage offen");
    expect(tagesZusammenfassung(donnerstag)).toBe("2 Personen bestätigt");
    expect(anfragenOffen(liste)).toBe(2);
  });

  it("schreibt den Kopf ehrlich auch bei null", () => {
    expect(anfragenOffenText(0)).toBe("Keine Anfrage offen");
    expect(anfragenOffenText(1)).toBe("1 Anfrage offen");
    expect(anfragenOffenText(3)).toBe("3 Anfragen offen");
  });

  it("nächste Ankunft: früheste bestätigte ab jetzt, ohne Anfragen und Vergangenes", () => {
    const vorbei = res({ start: "2026-09-15T11:00:00.000Z" });
    const anfrage = res({ start: "2026-09-15T13:00:00.000Z", status: "pending" });
    const spaeter = res({ start: "2026-09-15T18:00:00.000Z" });
    const bald = res({ start: "2026-09-15T14:00:00.000Z" });
    expect(naechsteAnkunft([vorbei, anfrage, spaeter, bald], JETZT)?.id).toBe(bald.id);
    expect(naechsteAnkunft([vorbei, anfrage], JETZT)).toBeNull();
  });
});

describe("Texte", () => {
  it("benennt die Quelle nur, wenn sie bekannt ist", () => {
    expect(quelleText("website")).toBe("Web-App");
    expect(quelleText("maitr")).toBe("App");
    expect(quelleText("google")).toBeNull();
    expect(quelleText(undefined)).toBeNull();
  });

  it("baut tel:-Links aus frei eingegebenen Nummern", () => {
    expect(telefonLink("0170 / 123 45-67")).toBe("tel:01701234567");
    expect(telefonLink("+49 (170) 1234567")).toBe("tel:+491701234567");
    expect(telefonLink("—")).toBeNull();
    expect(telefonLink(undefined)).toBeNull();
  });

  it("zeigt nie 'leer', wenn nur der Abruf scheiterte", () => {
    expect(fehlerText(new TypeError("Network request failed"), "laden")).toContain("nicht abrufen");
    expect(fehlerText({ status: 404, message: "Not Found" }, "laden")).toContain("kennt diese Abfrage");
    expect(fehlerText({ status: 404 }, "zeile")).toBe("Diese Reservierung gibt es nicht mehr.");
    expect(
      fehlerText({ status: 400, message: "Ein No-Show geht erst ab Beginn der Reservierung." }, "zeile"),
    ).toBe("Ein No-Show geht erst ab Beginn der Reservierung.");
    expect(fehlerText({ status: 503, message: "x" }, "zeile")).toContain("Server");
    expect(fehlerText({ status: 403 }, "zeile")).toContain("Zugriff");
    expect(fehlerText({ status: 422, message: "x" }, "zeile")).toContain("Nichts wurde geändert");
  });

  it("behauptet nach Timeout, Netzfehler, 5xx oder falscher Antwortform nicht, nichts sei geändert", () => {
    // Der Server schreibt den Status vor der Gast-Mail und antwortet erst danach.
    for (const fehler of [
      new Error("Request-Timeout"),
      new TypeError("Network request failed"),
      new Error("Antwort ist keine Reservierung"),
      { status: 502, message: "Bad Gateway" },
    ]) {
      expect(unklarObGeaendert(fehler)).toBe(true);
      const text = fehlerText(fehler, "zeile");
      expect(text).not.toContain("Nichts wurde geändert");
      expect(text).toContain("unklar");
    }
    expect(unklarObGeaendert({ status: 400 })).toBe(false);
    expect(unklarObGeaendert({ status: 404 })).toBe(false);
    // Beim Laden bleibt es beim ehrlichen "nicht abrufbar".
    expect(fehlerText(new Error("Request-Timeout"), "laden")).toContain("nicht abrufen");
    expect(fehlerText({ status: 503 }, "laden")).toContain("Server");
  });
});

describe("Gäste aus Reservierungen", () => {
  it("fasst über die Telefonnummer zusammen, auch bei anderer Schreibweise des Namens", () => {
    const gaeste = gaesteAusReservierungen(
      [
        res({ guestName: "M. Weber", phone: "+49 170 1234567", start: "2026-09-15T10:00:00.000Z", status: "no_show" }),
        res({ guestName: "Marie Weber", phone: "0170-1234567", start: "2026-09-18T17:00:00.000Z" }),
        res({ guestName: "Marie Weber", phone: "01701234567", start: "2026-09-20T17:00:00.000Z", status: "cancelled" }),
      ],
      JETZT,
    );
    expect(gaeste).toHaveLength(1);
    const [marie] = gaeste;
    expect(marie.name).toBe("Marie Weber");
    expect(marie.buchungen).toBe(2);
    expect(marie.abgesagt).toBe(1);
    expect(marie.noShows).toBe(1);
    expect(marie.naechste?.start).toBe("2026-09-18T17:00:00.000Z");
    expect(marie.letzte?.start).toBe("2026-09-15T10:00:00.000Z");
    expect(gastZusammenfassung(marie)).toBe("2 Buchungen · 1 abgesagt · 1 No-Show");
  });

  it("trennt gleiche Namen mit verschiedenen Nummern", () => {
    const gaeste = gaesteAusReservierungen(
      [
        res({ guestName: "Tom", phone: "0170 1111111", start: "2026-09-16T17:00:00.000Z" }),
        res({ guestName: "tom", phone: "0170 2222222", start: "2026-09-17T17:00:00.000Z" }),
      ],
      JETZT,
    );
    expect(gaeste).toHaveLength(2);
  });

  it("hängt eine Buchung ohne Nummer an den einzigen gleichnamigen Gast mit Nummer", () => {
    const gaeste = gaesteAusReservierungen(
      [
        res({ guestName: "Sam Okafor", phone: "0171 5555555", start: "2026-09-16T17:00:00.000Z" }),
        res({ guestName: "  sam   OKAFOR ", start: "2026-09-19T17:00:00.000Z" }),
      ],
      JETZT,
    );
    expect(gaeste).toHaveLength(1);
    expect(gaeste[0].buchungen).toBe(2);
    expect(gaeste[0].telefon).toBe("0171 5555555");
  });

  it("rät nicht, wenn es mehrere gleichnamige Gäste mit Nummer gibt", () => {
    const gaeste = gaesteAusReservierungen(
      [
        res({ guestName: "Tom", phone: "0170 1111111", start: "2026-09-16T17:00:00.000Z" }),
        res({ guestName: "Tom", phone: "0170 2222222", start: "2026-09-17T17:00:00.000Z" }),
        res({ guestName: "Tom", start: "2026-09-18T17:00:00.000Z" }),
      ],
      JETZT,
    );
    expect(gaeste).toHaveLength(3);
  });

  it("lässt namenlose Walk-ins weg und sortiert nach nächster, dann letzter Buchung", () => {
    const gaeste = gaesteAusReservierungen(
      [
        res({ guestName: "Walk-in", status: "walk_in", source: "walk_in", start: "2026-09-15T09:00:00.000Z" }),
        res({ guestName: "Zoe", start: "2026-09-15T08:00:00.000Z" }),
        res({ guestName: "Anna", start: "2026-09-15T10:00:00.000Z" }),
        res({ guestName: "Ben", start: "2026-09-20T17:00:00.000Z" }),
        res({ guestName: "Cem", status: "pending", start: "2026-09-16T17:00:00.000Z" }),
        res({ guestName: "Dora", status: "cancelled", start: "2026-09-17T17:00:00.000Z" }),
      ],
      JETZT,
    );
    expect(gaeste.map((g) => g.name)).toEqual(["Cem", "Ben", "Anna", "Zoe", "Dora"]);
    const dora = gaeste[4];
    expect(dora.naechste).toBeNull();
    expect(gastZusammenfassung(dora)).toBe("Keine Buchung · 1 abgesagt");
  });

  it("vergleicht Nummern mit und ohne Ländervorwahl", () => {
    expect(telefonSchluessel("+49 170 1234567")).toBe("01701234567");
    expect(telefonSchluessel("0049 170 1234567")).toBe("01701234567");
    expect(telefonSchluessel("0170 1234567")).toBe("01701234567");
    expect(telefonSchluessel("+43 660 1234567")).toBe("436601234567");
    expect(telefonSchluessel("123")).toBeNull();
  });
});
