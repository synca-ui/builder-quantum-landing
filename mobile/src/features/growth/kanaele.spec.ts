/**
 * Kanäle, Wachstum und Beiträge für den echten Betrieb (mobile/src/features/growth/kanaele.ts).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { VenuePresence } from "@maitr/core";

import { CHANNELS, findChannel } from "./channels";
import {
  ENTWURF_OHNE_TERMIN,
  GOOGLE_VERBINDEN_ROUTE,
  aufgabenAusBriefing,
  aufgabenRoute,
  aufgabenWirkung,
  beitragsKanaele,
  beitragsVorschlaege,
  bewertungKachel,
  entwurfZeile,
  kanaeleFuerBeitrag,
  kanalBerechtigungen,
  kanalStatus,
  kanalStatusText,
  kanalZaehlung,
  kanalZweck,
  kennzahlLeerzustand,
  neuerEigenerBeitrag,
  reservierungKachel,
  serverProvider,
  sichtbareBeitraege,
  sichtbareEintraege,
  sichtbarkeitHinweis,
  verbindenAusgang,
  zaehleKommendeReservierungen,
  zuordnungAusSpeicher,
  zuordnungMit,
} from "./kanaele";

const ALLE_AUS = { google: false, instagram: false, yelp: false, thefork: false, facebook: false };
const SEED = { google: true, instagram: true, yelp: false, thefork: false, facebook: false };

function praesenz(teil: Partial<VenuePresence> = {}): VenuePresence {
  return {
    status: "bereit",
    fetchedAt: "2026-09-15T08:00:00.000Z",
    bericht: {
      score: 71,
      faktoren: [],
      deckung: { gemessen: 1, unbekannt: [], geschaetzt: [], hinweis: "" },
      hebel: [],
      websiteBefunde: [],
      bewertungen: { schnitt: 0, anzahl: 0, themen: [] },
    },
    ...teil,
  } as VenuePresence;
}

function google(teil: Record<string, unknown> = {}): VenuePresence["google"] {
  return {
    placeId: "p1",
    name: "Haus Töller",
    reviewCount: 1312,
    rating: 4.6,
    bewertungen: [],
    fotos: [],
    fotoAnzahl: 0,
    status: "OPERATIONAL",
    ...teil,
  } as VenuePresence["google"];
}

describe("serverProvider", () => {
  it("ordnet Google und beide Meta-Kanäle zu, Yelp/TheFork nicht", () => {
    expect(serverProvider("google")).toBe("google");
    expect(serverProvider("instagram")).toBe("meta");
    expect(serverProvider("facebook")).toBe("meta");
    expect(serverProvider("yelp")).toBeNull();
    expect(serverProvider("thefork")).toBeNull();
  });
});

describe("kanalZaehlung", () => {
  it("Demo zählt wie bisher alle fünf Kanäle", () => {
    expect(kanalZaehlung(SEED, false)).toEqual({ verbunden: 2, gesamt: 5, offen: 3 });
  });

  it("echter Betrieb zählt nur Kanäle mit Anbindung", () => {
    expect(kanalZaehlung(ALLE_AUS, true)).toEqual({ verbunden: 0, gesamt: 3, offen: 3 });
    expect(kanalZaehlung({ ...ALLE_AUS, instagram: true, facebook: true }, true)).toEqual({
      verbunden: 2,
      gesamt: 3,
      offen: 1,
    });
  });

  it("ein verbundener Yelp-Wert (Altlast aus dem Gerätespeicher) zählt echt nicht mit", () => {
    expect(kanalZaehlung({ ...ALLE_AUS, yelp: true }, true).verbunden).toBe(0);
  });
});

describe("kanalStatus", () => {
  it("Yelp und TheFork sind echt nicht verfügbar statt „Verbinden ›“", () => {
    expect(kanalStatus("yelp", ALLE_AUS, true)).toBe("nicht_verfuegbar");
    expect(kanalStatus("thefork", ALLE_AUS, true)).toBe("nicht_verfuegbar");
    expect(kanalStatusText(kanalStatus("yelp", ALLE_AUS, true))).toBe("Nicht verfügbar");
  });

  it("Demo bleibt beim Vorführzustand", () => {
    expect(kanalStatus("yelp", SEED, false)).toBe("verbinden");
    expect(kanalStatusText(kanalStatus("google", SEED, false))).toBe("Verbunden");
    expect(kanalStatusText(kanalStatus("yelp", SEED, false))).toBe("Verbinden ›");
  });

  it("echter Betrieb folgt dem Serverstatus", () => {
    expect(kanalStatus("google", ALLE_AUS, true)).toBe("verbinden");
    expect(kanalStatus("google", { ...ALLE_AUS, google: true }, true)).toBe("verbunden");
  });
});

describe("kanalBerechtigungen und kanalZweck", () => {
  it("echt: nur Lesen, nirgends Veröffentlichen", () => {
    for (const channel of CHANNELS) {
      const zeilen = kanalBerechtigungen(channel, true).join(" ") + " " + kanalZweck(channel, true);
      expect(zeilen).not.toMatch(/veröffentlich|posten|beantwort|teilen|pflegen/i);
    }
    expect(kanalBerechtigungen(findChannel("google"), true)).toEqual(["Bewertungen und Sichtbarkeit lesen"]);
    expect(kanalBerechtigungen(findChannel("instagram"), true)).toEqual(["Reichweite und Empfehlungen lesen"]);
    expect(kanalBerechtigungen(findChannel("facebook"), true)).toEqual(["Reichweite und Empfehlungen lesen"]);
    expect(kanalBerechtigungen(findChannel("yelp"), true)).toEqual([]);
  });

  it("Demo zeigt den Katalog unverändert", () => {
    const g = findChannel("google");
    expect(kanalBerechtigungen(g, false)).toBe(g.scopes);
    expect(kanalZweck(g, false)).toBe(g.purpose);
  });
});

describe("verbindenAusgang", () => {
  it("Erfolg nur, wenn der Kanal nach dem Neuladen verbunden ist", () => {
    expect(
      verbindenAusgang({ browserTyp: "success", rueckUrl: "maitr://i?status=connected", verbunden: false, kanalName: "Google Business" }),
    ).toEqual({ erfolg: false, meldung: "Die Verbindung wurde nicht bestätigt. Bitte erneut versuchen." });
    expect(verbindenAusgang({ browserTyp: "success", verbunden: true, kanalName: "Instagram" })).toEqual({
      erfolg: true,
      meldung: "Instagram verbunden",
    });
  });

  it("geschlossener Browser ist Abbruch - außer die Verbindung steht trotzdem", () => {
    expect(verbindenAusgang({ browserTyp: "cancel", verbunden: false, kanalName: "Google Business" }).meldung).toMatch(
      /abgebrochen/,
    );
    expect(verbindenAusgang({ browserTyp: "dismiss", verbunden: true, kanalName: "Google Business" }).erfolg).toBe(true);
  });

  it("status=error vom Server-Callback wird als fehlgeschlagene Anmeldung benannt", () => {
    const a = verbindenAusgang({
      browserTyp: "success",
      rueckUrl: "maitr://integrations?provider=google&status=error",
      verbunden: false,
      kanalName: "Google Business",
    });
    expect(a).toEqual({
      erfolg: false,
      meldung: "Die Anmeldung bei Google Business ist fehlgeschlagen. Bitte erneut versuchen.",
    });
  });
});

describe("bewertungKachel", () => {
  it("zeigt Googles Schnitt und Anzahl, ohne Vormonatsdelta", () => {
    expect(bewertungKachel(praesenz({ google: google() }), false)).toEqual({ value: "4,6", delta: "1.312 bei Google" });
  });

  it("unterscheidet laden, nicht abgerufen, nicht gefunden, Fehler", () => {
    expect(bewertungKachel(null, true)).toEqual({ value: "…", delta: "wird geladen" });
    expect(bewertungKachel(null, false)).toEqual({ value: "–", delta: "nicht abgerufen" });
    expect(bewertungKachel(praesenz({ status: "nicht_gefunden" }), false).delta).toBe("bei Google nicht gefunden");
    expect(bewertungKachel(praesenz({ status: "fehler" }), false).delta).toBe("Abruf fehlgeschlagen");
    expect(bewertungKachel(praesenz({ status: "kein_schluessel" }), false).delta).toBe("nicht abrufbar");
    expect(bewertungKachel(praesenz({ status: "ausstehend" }), false).delta).toBe("noch nicht abgerufen");
  });

  it("„noch keine“ nur, wenn Google selbst null meldet - nie aus dem Bericht", () => {
    expect(bewertungKachel(praesenz({ google: google({ rating: undefined, reviewCount: 0 }) }), false)).toEqual({
      value: "–",
      delta: "noch keine bei Google",
    });
    // Ohne Google-Eintrag steht im Bericht anzahl 0 - das darf nicht „keine“ heißen.
    expect(bewertungKachel(praesenz({ status: "kein_schluessel" }), false).delta).not.toMatch(/keine/);
  });
});

describe("zaehleKommendeReservierungen", () => {
  it("zählt offene Anfragen und Bestätigte, nicht Absagen und No-Shows", () => {
    expect(
      zaehleKommendeReservierungen([
        { status: "pending" },
        { status: "confirmed" },
        { status: "walk_in" },
        { status: "cancelled" },
        { status: "no_show" },
      ]),
    ).toBe(3);
    expect(zaehleKommendeReservierungen([])).toBe(0);
  });

  it("fremde Antwortform ist „nicht abrufbar“ (null), nicht 0", () => {
    expect(zaehleKommendeReservierungen("<html>")).toBeNull();
    expect(zaehleKommendeReservierungen({ reservations: [] })).toBeNull();
    expect(zaehleKommendeReservierungen([{ id: "r1" }])).toBeNull();
  });

  it("Kachelwerte je Abrufzustand", () => {
    expect(reservierungKachel({ art: "laedt" }, 14)).toEqual({ value: "…", delta: "wird geladen" });
    expect(reservierungKachel({ art: "fehler" }, 14)).toEqual({ value: "–", delta: "nicht abrufbar" });
    expect(reservierungKachel({ art: "da", anzahl: 0 }, 14)).toEqual({ value: "0", delta: "nächste 14 Tage" });
  });
});

describe("sichtbarkeitHinweis und kennzahlLeerzustand", () => {
  it("verspricht nichts, was auch mit Freigabe nicht gebaut ist", () => {
    const ohne = sichtbarkeitHinweis(false);
    expect(ohne.verbindenZeigen).toBe(true);
    expect(ohne.text).not.toMatch(/folgen|kommen|erst mit/i);
    expect(sichtbarkeitHinweis(true).verbindenZeigen).toBe(false);
  });

  it("jede Kennzahl hat einen ehrlichen Leerzustand", () => {
    for (const key of ["aufrufe", "bewertungen", "reservierungen", "routen", undefined]) {
      const leer = kennzahlLeerzustand(key, false);
      expect(leer.title).toBe("Kein Verlauf verfügbar");
      expect(leer.message.length).toBeGreaterThan(10);
    }
  });
});

describe("Erkenntnisse aus dem Briefing", () => {
  it("prüft die Antwortform und lässt kaputte Einträge fallen", () => {
    expect(aufgabenAusBriefing(null)).toBeNull();
    expect(aufgabenAusBriefing({ tasks: "x" })).toBeNull();
    expect(
      aufgabenAusBriefing({ tasks: [{ id: "a", title: "Profil ergänzen" }, { id: 3 }, null] })?.map((t) => t.id),
    ).toEqual(["a"]);
    expect(aufgabenAusBriefing({ tasks: [] })).toEqual([]);
  });

  it("springt nur app-interne Pfade an", () => {
    expect(aufgabenRoute("/profil-check")).toBe("/profil-check");
    expect(aufgabenRoute("/speisekarte")).toBe("/speisekarte");
    expect(aufgabenRoute("https://evil.example")).toBeNull();
    expect(aufgabenRoute("//evil.example")).toBeNull();
    expect(aufgabenRoute("maitr://x")).toBeNull();
    expect(aufgabenRoute(undefined)).toBeNull();
    expect(aufgabenRoute("")).toBeNull();
  });

  it("springt nicht auf den Screen, auf dem die Karte schon steht", () => {
    expect(aufgabenRoute("/wachstum", "/wachstum")).toBeNull();
    expect(aufgabenRoute("/wachstum/", "/wachstum")).toBeNull();
    expect(aufgabenRoute("/bewertungen", "/wachstum")).toBe("/bewertungen");
  });

  it("lässt die ROI-Aufgabe ohne Grundlage weg, auch vor dem Kürzen", () => {
    const antwort = {
      tasks: [
        { id: "roi_month", title: "5 € Provision gespart", impact: "61 € / Jahr" },
        { id: "profile_photos", title: "Fotos anheben", impact: "+6 Präsenzpunkte" },
      ],
    };
    const aufgaben = aufgabenAusBriefing(antwort) ?? [];
    expect(aufgaben.map((t) => t.id)).toEqual(["profile_photos"]);
    expect(sichtbareEintraege(aufgaben, {}, 4).map((t) => t.id)).toEqual(["profile_photos"]);
    // Nur die ROI-Aufgabe: keine Aufgaben, aber eine gültige Antwort - nicht „nicht abrufbar“.
    expect(aufgabenAusBriefing({ tasks: [antwort.tasks[0]] })).toEqual([]);
  });

  it("zeigt Wirkungszahlen nur, wo sie gemessen sind", () => {
    expect(aufgabenWirkung({ id: "profile_photos", impact: "+6 Präsenzpunkte" })).toBe("+6 Präsenzpunkte");
    expect(aufgabenWirkung({ id: "timing_4_9", impact: "+22 % Reichweite" })).toBe("+22 % Reichweite");
    expect(aufgabenWirkung({ id: "review_abc", impact: "+35 % Profilaufrufe" })).toBeNull();
    expect(aufgabenWirkung({ id: "guest_g1", impact: "320 € Beziehung" })).toBeNull();
    expect(aufgabenWirkung({ id: "occupancy_fill", impact: "~72 € Auslastung" })).toBeNull();
    expect(aufgabenWirkung({ id: "review_abc", impact: "Schaden begrenzen" })).toBe("Schaden begrenzen");
    expect(aufgabenWirkung({ id: "noshow_g2", impact: "Tisch absichern" })).toBe("Tisch absichern");
    expect(aufgabenWirkung({ id: "profile_x", impact: "  " })).toBeNull();
    expect(aufgabenWirkung({ id: "profile_x" })).toBeNull();
  });

  it("filtert weggewischte VOR dem Kürzen", () => {
    const liste = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }];
    expect(sichtbareEintraege(liste, { b: true }, 4).map((e) => e.id)).toEqual(["a", "c", "d", "e"]);
  });
});

describe("Beiträge", () => {
  it("Kanal-Chips echt nur für verbundene Kanäle, Demo alle drei", () => {
    expect(beitragsKanaele(ALLE_AUS, true)).toEqual([]);
    expect(beitragsKanaele({ ...ALLE_AUS, google: true }, true)).toEqual(["Google"]);
    expect(beitragsKanaele(ALLE_AUS, false)).toEqual(["Instagram", "Google", "Facebook"]);
  });

  it("beschneidet die Auswahl auf Erlaubtes", () => {
    expect(kanaeleFuerBeitrag(["Instagram", "Google"], ["Google"])).toEqual(["Google"]);
    expect(kanaeleFuerBeitrag(["Instagram"], [])).toEqual([]);
  });

  it("echter Betrieb sieht nur eigene Entwürfe, nicht den Café-Goldstück-Seed", () => {
    const posts = [{ id: "p_live" }, { id: "p_suggestion" }, { id: "p_quick_abc_1" }];
    const zuordnung = { p_quick_abc_1: "venue-a" };
    expect(sichtbareBeitraege(posts, true, zuordnung, "venue-a").map((p) => p.id)).toEqual(["p_quick_abc_1"]);
  });

  it("Schnellbeiträge aus dem Demo und Entwürfe eines anderen Kontos bleiben draußen", () => {
    const posts = [
      { id: "p_quick_demo_1" }, // im Demo angelegt: „Frische Zimtschnecken …“, keine Zuordnung
      { id: "p_quick_a_2" }, // Konto A
      { id: "p_quick_b_3" }, // Konto B
      { id: "p_live" },
    ];
    const zuordnung = { p_quick_a_2: "venue-a", p_quick_b_3: "venue-b", p_live: "venue-b" };
    expect(sichtbareBeitraege(posts, true, zuordnung, "venue-b").map((p) => p.id)).toEqual(["p_quick_b_3"]);
    expect(sichtbareBeitraege(posts, true, zuordnung, "venue-a").map((p) => p.id)).toEqual(["p_quick_a_2"]);
    expect(sichtbareBeitraege(posts, true, zuordnung, "")).toEqual([]);
  });

  it("Demo bleibt wie bisher, zeigt aber keine Entwürfe echter Betriebe", () => {
    const posts = [{ id: "p_live" }, { id: "p_quick_demo_1" }, { id: "p_quick_a_2" }];
    expect(sichtbareBeitraege(posts, false, {}, "demo")).toEqual(posts);
    expect(sichtbareBeitraege(posts, false, { p_quick_a_2: "venue-a" }, "demo").map((p) => p.id)).toEqual([
      "p_live",
      "p_quick_demo_1",
    ]);
  });

  it("erkennt den gerade angelegten Entwurf an neuer id UND Text", () => {
    const vorher = ["p_live", "p_quick_x_1"];
    const posts = [
      { id: "p_quick_y_3", title: "Aus dem Speicher" },
      { id: "p_quick_y_2", title: "Heute auf unserer Karte: Kölsch." },
      { id: "p_quick_x_1", title: "Heute auf unserer Karte: Kölsch." },
      { id: "p_live", title: "Hausröstung" },
    ];
    expect(neuerEigenerBeitrag(vorher, posts, "Heute auf unserer Karte: Kölsch.")).toBe("p_quick_y_2");
    expect(neuerEigenerBeitrag(vorher, posts, "Gibt es nicht")).toBeNull();
    expect(neuerEigenerBeitrag(posts.map((p) => p.id), posts, "Aus dem Speicher")).toBeNull();
  });

  it("liest den Speicherstand misstrauisch", () => {
    expect(zuordnungAusSpeicher(null)).toEqual({});
    expect(zuordnungAusSpeicher("kaputt{")).toEqual({});
    expect(zuordnungAusSpeicher("[1,2]")).toEqual({});
    expect(zuordnungAusSpeicher('{"p_quick_a":"venue-a","p_quick_b":3,"p_quick_c":""}')).toEqual({
      p_quick_a: "venue-a",
    });
  });

  it("ergänzt die Zuordnung und räumt Beiträge, die es nicht mehr gibt", () => {
    const alt = { p_quick_weg: "venue-a", p_quick_da: "venue-a" };
    expect(zuordnungMit(alt, "p_quick_neu", "venue-b", ["p_quick_da", "p_quick_neu"])).toEqual({
      p_quick_da: "venue-a",
      p_quick_neu: "venue-b",
    });
  });

  it("Vorschläge aus der Speisekarte, Server-Gerichte zuerst, ohne Dopplung", () => {
    const menu = [
      { id: "m_1", name: "Eigene Suppe" },
      { id: "srv-1", name: "Halver Hahn" },
      { id: "srv-2", name: "Halver Hahn" },
      { id: "srv-3", name: "  " },
      { id: "srv-4", name: "Himmel un Ääd" },
      { id: "srv-5", name: "Kölsch" },
    ];
    expect(beitragsVorschlaege(menu)).toEqual([
      "Heute auf unserer Karte: Halver Hahn.",
      "Heute auf unserer Karte: Himmel un Ääd.",
      "Heute auf unserer Karte: Kölsch.",
    ]);
    expect(beitragsVorschlaege([])).toEqual([]);
    expect(beitragsVorschlaege(menu).join(" ")).not.toMatch(/Zimtschnecke|Flat White/);
  });

  it("Entwurfszeile sagt nie „Live“ oder „Eingeplant“", () => {
    expect(entwurfZeile({ when: ENTWURF_OHNE_TERMIN, channels: [] })).toBe("Entwurf · ohne Termin · kein Kanal");
    expect(entwurfZeile({ when: "Do 9:00", channels: ["Instagram", "Google"] })).toBe(
      "Entwurf · Do 9:00 · Instagram + Google",
    );
  });
});

/*
 * Prüfer-Befund 21 (15.09.): „Google verbinden" aus Bewertungen und Präsenzbericht
 * lief ins Onboarding, das den Kanalstatus des Stores nie nachlud. Ohne
 * React-Native-Testaufbau lässt sich die Verdrahtung nur am Quelltext prüfen.
 */
describe("Google verbinden aus dem echten Betrieb", () => {
  const quelle = (datei: string) => readFileSync(resolve(__dirname, datei), "utf8");

  it("führt auf die Kanal-Seite, die es als Route gibt", () => {
    expect(GOOGLE_VERBINDEN_ROUTE).toBe("/kanal/google");
    expect(existsSync(resolve(__dirname, "../../../app/kanal/[id].tsx"))).toBe(true);
  });

  it("Bewertungen und Präsenzbericht springen nicht mehr ins Onboarding", () => {
    for (const datei of ["../reviews/GoogleBewertungenAnsicht.tsx", "PraesenzBerichtAnsicht.tsx"]) {
      const text = quelle(datei);
      expect(text, datei).not.toContain("/onboarding/google");
      expect(text, datei).toContain("router.push(GOOGLE_VERBINDEN_ROUTE)");
    }
  });

  it("der Onboarding-Schritt zieht nach bestätigter Verbindung den Kanalstatus des Stores nach", () => {
    const text = quelle("../onboarding/screens.tsx");
    const ablaufGoogle = text.slice(text.indexOf("api.integrations"), text.indexOf("weiterZuZeiten"));
    expect(ablaufGoogle.match(/aktualisiereKanaele\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });
});
