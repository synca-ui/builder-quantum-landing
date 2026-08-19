import { describe, expect, it } from "vitest";
import { ApiError, type Venue } from "@maitr/core";
import { DAYS } from "@maitr/core/types";

// Echtes Serverschema, nicht nachgebaut - ein selbst gebauter Nachbau bewiese
// nichts über den Vorschlag, der tatsächlich gegen den Server geschickt wird.
import { StrictOpeningHoursSchema } from "../../../../server/schemas/configuration";

import {
  ANFANGSZUSTAND,
  OEFFNUNGSZEITEN_VORSCHLAG,
  SCHRITT_REIHENFOLGE,
  ablaufAusServerdaten,
  aktuellerSchritt,
  einstiegsWeiche,
  entwurfAusZeiten,
  eigenerVenue,
  fehlerText,
  fortschritt,
  googleVerbunden,
  gueltigeUhrzeit,
  hatOeffnungszeiten,
  oeffnungszeitenTage,
  schrittListe,
  venueAusKonflikt,
  zeitenAusEntwurf,
  type AblaufZustand,
  type SchrittStatus,
  type ZeitenEntwurf,
  brauchtNeueAnmeldung,
} from "./ablauf";

/**
 * Geprüft wird die Entscheidungslogik des neuen Onboardings.
 *
 * Für React-Native-Bildschirme gibt es in diesem Repo keinen Testaufbau (vitest
 * läuft in jsdom, react-test-renderer und jest-expo fehlen) - siehe
 * `features/loyalty/aufbereitung.spec.ts`, das Vorbild für diese Datei. Was hier
 * steht, ist deshalb das Einzige, was sich über den neuen Ablauf prüfen lässt.
 */

function zustand(patch: Partial<AblaufZustand> = {}): AblaufZustand {
  return { ...ANFANGSZUSTAND, ...patch };
}

function apiFehler(status: number, body: Record<string, unknown>): ApiError {
  return new ApiError(status, "/venues/v1", String(body.error ?? status), body);
}

describe("aktuellerSchritt", () => {
  it("betrieb ist zuerst dran, wenn nichts erledigt ist", () => {
    expect(aktuellerSchritt(ANFANGSZUSTAND)).toBe("betrieb");
  });

  it("geht zum naechsten Schritt weiter, sobald der vorherige steht", () => {
    expect(aktuellerSchritt(zustand({ betrieb: "erledigt" }))).toBe("google");
  });

  it("uebersprungen zaehlt fuer die Reihenfolge wie erledigt", () => {
    expect(aktuellerSchritt(zustand({ betrieb: "erledigt", google: "uebersprungen" }))).toBe(
      "zeiten",
    );
  });

  it("ein gescheiterter Schritt bleibt aktuell - er braucht einen neuen Versuch", () => {
    expect(aktuellerSchritt(zustand({ betrieb: "gescheitert" }))).toBe("betrieb");
  });

  it("ein laufender Schritt bleibt aktuell - keine zweite Aufforderung waehrend des Aufrufs", () => {
    expect(aktuellerSchritt(zustand({ betrieb: "laeuft" }))).toBe("betrieb");
  });

  it("kein aktueller Schritt mehr, wenn alle drei stehen - dann ist der Abschluss dran", () => {
    expect(
      aktuellerSchritt({ betrieb: "erledigt", google: "uebersprungen", zeiten: "erledigt" }),
    ).toBeNull();
  });
});

describe("schrittListe - Fuehrung heisst genau ein aktueller Schritt", () => {
  const STATUS_WERTE: SchrittStatus[] = ["offen", "laeuft", "erledigt", "uebersprungen", "gescheitert"];

  it("nie zwei aktuelle Schritte gleichzeitig, ueber jede Kombination hinweg", () => {
    // Alle 5*5*5 = 125 moeglichen Zustaende - keine Stichprobe, jede Kombination.
    for (const betrieb of STATUS_WERTE) {
      for (const google of STATUS_WERTE) {
        for (const zeiten of STATUS_WERTE) {
          const liste = schrittListe({ betrieb, google, zeiten });
          const aktuelle = liste.filter((s) => s.aktuell);
          expect(aktuelle.length).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("markiert im Anfangszustand genau betrieb als aktuell", () => {
    const liste = schrittListe(ANFANGSZUSTAND);
    expect(liste.find((s) => s.id === "betrieb")?.aktuell).toBe(true);
    expect(liste.find((s) => s.id === "google")?.aktuell).toBe(false);
    expect(liste.find((s) => s.id === "zeiten")?.aktuell).toBe(false);
  });

  it("liefert die Schritte in der festen Reihenfolge betrieb, google, zeiten", () => {
    expect(schrittListe(ANFANGSZUSTAND).map((s) => s.id)).toEqual([...SCHRITT_REIHENFOLGE]);
  });
});

describe("fortschritt", () => {
  it("zaehlt im Anfangszustand nichts als erledigt", () => {
    expect(fortschritt(ANFANGSZUSTAND)).toEqual({ erledigt: 0, gesamt: 3 });
  });

  it("uebersprungen ist NICHT erledigt - der Fortschritt darf das nicht behaupten", () => {
    const stand = fortschritt(zustand({ betrieb: "erledigt", google: "uebersprungen" }));
    expect(stand.erledigt).toBe(1);
    expect(stand.gesamt).toBe(3);
  });

  it("zaehlt alle drei, wenn alle drei wirklich erledigt sind", () => {
    expect(
      fortschritt({ betrieb: "erledigt", google: "erledigt", zeiten: "erledigt" }),
    ).toEqual({ erledigt: 3, gesamt: 3 });
  });
});

describe("googleVerbunden", () => {
  it("eine aktive Verbindung gilt als verbunden", () => {
    expect(
      googleVerbunden([{ provider: "GOOGLE", status: "ACTIVE", accountId: "a1", scopes: [], expiresAt: "" }]),
    ).toBe(true);
  });

  it("eine abgelaufene Verbindung gilt NICHT als verbunden", () => {
    // Der Kern des Befunds: die Zeile ist da, aber der Status ist nicht ACTIVE -
    // ein Haekchen dafuer waere eine erfundene Angabe.
    expect(
      googleVerbunden([{ provider: "GOOGLE", status: "EXPIRED", accountId: "a1", scopes: [], expiresAt: "" }]),
    ).toBe(false);
  });

  it("eine widerrufene Verbindung gilt NICHT als verbunden", () => {
    expect(
      googleVerbunden([{ provider: "GOOGLE", status: "REVOKED", accountId: "a1", scopes: [], expiresAt: "" }]),
    ).toBe(false);
  });

  it("eine META-Zeile zaehlt nicht als Google", () => {
    expect(
      googleVerbunden([{ provider: "META", status: "ACTIVE", accountId: "a1", scopes: [], expiresAt: "" }]),
    ).toBe(false);
  });

  it("eine leere Liste ist nichts verbunden", () => {
    expect(googleVerbunden([])).toBe(false);
  });

  it("stuerzt bei einer unerwarteten Form nicht ab", () => {
    // Dieselbe Lehre wie in store.tsx: ein HTTP 200 von einem fremden Dienst ist
    // auch ein Erfolg, die Form der Antwort ist nicht garantiert.
    expect(googleVerbunden(undefined)).toBe(false);
    expect(googleVerbunden(null)).toBe(false);
    expect(googleVerbunden({ provider: "GOOGLE", status: "ACTIVE" })).toBe(false);
    expect(googleVerbunden(["nicht ein objekt"])).toBe(false);
  });
});

describe("oeffnungszeitenTage / hatOeffnungszeiten", () => {
  it("kein Venue heisst keine Zeiten", () => {
    expect(oeffnungszeitenTage(null)).toBe(0);
    expect(hatOeffnungszeiten(null)).toBe(false);
    expect(hatOeffnungszeiten(undefined)).toBe(false);
  });

  it("ein Venue ohne openingHours heisst keine Zeiten", () => {
    expect(oeffnungszeitenTage({ openingHours: undefined })).toBe(0);
  });

  it("zaehlt jeden hinterlegten Tag, auch geschlossene", () => {
    const venue = {
      openingHours: {
        monday: { closed: false, open: "09:00", close: "17:00" } as const,
        sunday: { closed: true } as const,
      },
    };
    expect(oeffnungszeitenTage(venue)).toBe(2);
    expect(hatOeffnungszeiten(venue)).toBe(true);
  });
});

describe("OEFFNUNGSZEITEN_VORSCHLAG", () => {
  it("wird vom echten Serverschema angenommen", () => {
    // Kein selbst gebauter Nachbau: das ist dasselbe Zod-Schema, das
    // PATCH /venues/:venueId serverseitig gegen Business.openingHours prueft.
    expect(() => StrictOpeningHoursSchema.parse(OEFFNUNGSZEITEN_VORSCHLAG)).not.toThrow();
  });

  it("schlaegt Mo-Fr vor und laesst Sa/So geschlossen", () => {
    expect(OEFFNUNGSZEITEN_VORSCHLAG.monday).toEqual({ closed: false, open: "09:00", close: "17:00" });
    expect(OEFFNUNGSZEITEN_VORSCHLAG.friday).toEqual({ closed: false, open: "09:00", close: "17:00" });
    expect(OEFFNUNGSZEITEN_VORSCHLAG.saturday).toEqual({ closed: true });
    expect(OEFFNUNGSZEITEN_VORSCHLAG.sunday).toEqual({ closed: true });
  });
});

describe("ablaufAusServerdaten", () => {
  it("startet bei nichts Vorhandenem komplett offen", () => {
    expect(
      ablaufAusServerdaten({ venue: null, integrationen: [] }),
    ).toEqual(ANFANGSZUSTAND);
  });

  it("uebernimmt, was der Server schon meldet, ohne den Wirt danach zu fragen", () => {
    const stand = ablaufAusServerdaten({
      venue: { id: "v1", openingHours: { monday: { closed: false, open: "09:00", close: "17:00" } } },
      integrationen: [{ provider: "GOOGLE", status: "ACTIVE", accountId: "a", scopes: [], expiresAt: "" }],
    });
    expect(stand).toEqual({ betrieb: "erledigt", google: "erledigt", zeiten: "erledigt" });
  });

  it("eine abgelaufene Google-Verbindung zaehlt hier ebenfalls nicht als erledigt", () => {
    const stand = ablaufAusServerdaten({
      venue: { id: "v1", openingHours: undefined },
      integrationen: [{ provider: "GOOGLE", status: "EXPIRED", accountId: "a", scopes: [], expiresAt: "" }],
    });
    expect(stand.google).toBe("offen");
  });

  it("DER KERNBEFUND: betrieb ist NUR erledigt, wenn wirklich ein Venue ankommt - kein hartcodiertes true mehr", () => {
    // Google und Zeiten stehen, aber `venue` ist null (z.B. weil `eigenerVenue`
    // keinen Treffer fand oder der Abruf fehlschlug) - genau der Fall, den der
    // Abschluss-Bildschirm bisher NICHT prüfte, sondern pauschal "erledigt" setzte.
    const stand = ablaufAusServerdaten({
      venue: null,
      integrationen: [{ provider: "GOOGLE", status: "ACTIVE", accountId: "a", scopes: [], expiresAt: "" }],
    });
    expect(stand.betrieb).toBe("offen");
  });

  it("ein Venue ohne Oeffnungszeiten zaehlt als betrieb erledigt, aber zeiten offen", () => {
    const stand = ablaufAusServerdaten({ venue: { id: "v1", openingHours: {} }, integrationen: [] });
    expect(stand.betrieb).toBe("erledigt");
    expect(stand.zeiten).toBe("offen");
  });
});

/* ── entwurfAusZeiten / zeitenAusEntwurf ─────────────────────────────────── */

/** Ein leerer Entwurf: alle sieben Tage "ohneAngabe" - Ausgangspunkt für die Tests unten. */
function leererEntwurf(): ZeitenEntwurf {
  const basis = {} as ZeitenEntwurf;
  for (const tag of DAYS) basis[tag] = { stand: "ohneAngabe", open: "09:00", close: "17:00" };
  return basis;
}

describe("entwurfAusZeiten", () => {
  it("ein fehlender Tag wird ohneAngabe, NICHT geschlossen - Fachfehler a, Richtung 1", () => {
    const entwurf = entwurfAusZeiten({ monday: { closed: false, open: "09:00", close: "17:00" } });
    expect(entwurf.sunday.stand).toBe("ohneAngabe");
    // Vorbelegung steht trotzdem bereit, falls der Wirt den Tag oeffnet.
    expect(entwurf.sunday.open).toBe("09:00");
    expect(entwurf.sunday.close).toBe("17:00");
  });

  it("quelle fehlt komplett - alle sieben Tage werden ohneAngabe", () => {
    const entwurf = entwurfAusZeiten(undefined);
    expect(DAYS.every((tag) => entwurf[tag].stand === "ohneAngabe")).toBe(true);
  });

  it("ein Tag mit closed:true wird geschlossen, mit Vorbelegungszeiten dahinter", () => {
    const entwurf = entwurfAusZeiten({ sunday: { closed: true } });
    expect(entwurf.sunday).toEqual({ stand: "geschlossen", open: "09:00", close: "17:00" });
  });

  it("ein geoeffneter Tag uebernimmt open/close unveraendert", () => {
    const entwurf = entwurfAusZeiten({ friday: { closed: false, open: "18:00", close: "01:00" } });
    expect(entwurf.friday).toEqual({ stand: "geoeffnet", open: "18:00", close: "01:00" });
  });

  it("der Vorschlag OEFFNUNGSZEITEN_VORSCHLAG fuehrt alle sieben Tage - nie ohneAngabe", () => {
    const entwurf = entwurfAusZeiten(OEFFNUNGSZEITEN_VORSCHLAG);
    expect(DAYS.some((tag) => entwurf[tag].stand === "ohneAngabe")).toBe(false);
  });
});

describe("gueltigeUhrzeit - dieselbe Regel wie der Server", () => {
  it.each([
    ["00:00", true],
    ["23:59", true],
    ["09:00", true],
    ["9:00", false], // fehlende fuehrende Null
    ["24:00", false], // Stunde ausserhalb 00-23
    ["12:60", false], // Minute ausserhalb 00-59
    ["09:5", false],
    ["aa:00", false],
    ["09:00 ", false], // ungetrimmt - zeitenAusEntwurf trimmt VOR der Pruefung, diese Funktion selbst nicht
  ])("%s -> %s", (wert, erwartet) => {
    expect(gueltigeUhrzeit(wert)).toBe(erwartet);
  });

  it("GEGENPROBE: stimmt mit dem echten StrictOpeningHoursSchema ueberein, nicht nur einem Nachbau", () => {
    const stichprobe = [
      "00:00",
      "23:59",
      "09:00",
      "18:00",
      "9:00",
      "24:00",
      "12:60",
      "00:60",
      "9:0",
      "1:00",
    ];
    for (const wert of stichprobe) {
      const echtesUrteil = StrictOpeningHoursSchema.safeParse({
        monday: { closed: false, open: wert, close: "17:00" },
      }).success;
      expect(gueltigeUhrzeit(wert)).toBe(echtesUrteil);
    }
  });
});

describe("zeitenAusEntwurf", () => {
  it("FACHFEHLER A: ein Tag mit ohneAngabe fehlt im Ergebnis GANZ - kein stilles closed:true", () => {
    const entwurf = leererEntwurf(); // alle sieben ohneAngabe
    const ergebnis = zeitenAusEntwurf(entwurf);
    expect(ergebnis.ok).toBe(true);
    if (ergebnis.ok) {
      expect(ergebnis.werte).toEqual({});
      expect(Object.keys(ergebnis.werte)).toHaveLength(0);
    }
  });

  it("ein geschlossener Tag wird als {closed:true} ohne Uhrzeiten geschickt", () => {
    const entwurf = leererEntwurf();
    entwurf.sunday = { stand: "geschlossen", open: "09:00", close: "17:00" };
    const ergebnis = zeitenAusEntwurf(entwurf);
    expect(ergebnis.ok).toBe(true);
    if (ergebnis.ok) expect(ergebnis.werte.sunday).toEqual({ closed: true });
  });

  it("ein geoeffneter Tag mit gueltigen Uhrzeiten wird getrimmt uebernommen", () => {
    const entwurf = leererEntwurf();
    entwurf.monday = { stand: "geoeffnet", open: " 09:00 ", close: "17:00" };
    const ergebnis = zeitenAusEntwurf(entwurf);
    expect(ergebnis.ok).toBe(true);
    if (ergebnis.ok) {
      expect(ergebnis.werte.monday).toEqual({ closed: false, open: "09:00", close: "17:00" });
    }
  });

  it("FACHFEHLER B: eine Oeffnung ueber Mitternacht (18:00 bis 01:00) ist GUELTIG, kein Fehler", () => {
    const entwurf = leererEntwurf();
    entwurf.friday = { stand: "geoeffnet", open: "18:00", close: "01:00" };
    const ergebnis = zeitenAusEntwurf(entwurf);
    expect(ergebnis.ok).toBe(true);
    if (ergebnis.ok) expect(ergebnis.werte.friday).toEqual({ closed: false, open: "18:00", close: "01:00" });
  });

  it("FACHFEHLER B: eine ungueltige Uhrzeit wird VOR dem Senden erkannt, mit Tag und Feld", () => {
    const entwurf = leererEntwurf();
    entwurf.monday = { stand: "geoeffnet", open: "9:00", close: "17:00" };
    const ergebnis = zeitenAusEntwurf(entwurf);
    expect(ergebnis.ok).toBe(false);
    if (!ergebnis.ok) {
      expect(ergebnis.fehler).toEqual([{ tag: "monday", feld: "open", wert: "9:00" }]);
    }
  });

  it("meldet ALLE fehlerhaften Felder auf einmal, nicht nur das erste", () => {
    const entwurf = leererEntwurf();
    entwurf.monday = { stand: "geoeffnet", open: "9:00", close: "17:00" };
    entwurf.tuesday = { stand: "geoeffnet", open: "10:00", close: "25:00" };
    const ergebnis = zeitenAusEntwurf(entwurf);
    expect(ergebnis.ok).toBe(false);
    if (!ergebnis.ok) {
      expect(ergebnis.fehler).toEqual([
        { tag: "monday", feld: "open", wert: "9:00" },
        { tag: "tuesday", feld: "close", wert: "25:00" },
      ]);
    }
  });

  it("GEGENPROBE: ein erfolgreiches Ergebnis besteht das echte StrictOpeningHoursSchema", () => {
    const entwurf = leererEntwurf();
    entwurf.monday = { stand: "geoeffnet", open: "08:00", close: "18:00" };
    entwurf.friday = { stand: "geoeffnet", open: "18:00", close: "01:00" }; // Sperrstunde
    entwurf.sunday = { stand: "geschlossen", open: "09:00", close: "17:00" };
    const ergebnis = zeitenAusEntwurf(entwurf);
    expect(ergebnis.ok).toBe(true);
    if (ergebnis.ok) expect(() => StrictOpeningHoursSchema.parse(ergebnis.werte)).not.toThrow();
  });
});

/* ── venueAusKonflikt / eigenerVenue ─────────────────────────────────────── */

function venue(overrides: Partial<Venue> = {}): Venue {
  return { id: "v1", name: "Café Goldstück", timezone: "Europe/Berlin", tags: [], ...overrides };
}

function konfliktFehler(body?: Record<string, unknown>): ApiError {
  return new ApiError(409, "/venues/v1", "Betrieb existiert bereits", body);
}

describe("venueAusKonflikt", () => {
  it("ein 409 mit Venue im Rumpf liefert diesen Venue", () => {
    const v = venue();
    expect(venueAusKonflikt(konfliktFehler({ venue: v }))).toEqual(v);
  });

  it("ein 409 ohne Rumpf liefert null", () => {
    expect(venueAusKonflikt(konfliktFehler())).toBeNull();
  });

  it("ein 409 mit Venue ohne id liefert null - keine erfundene Kennung", () => {
    expect(venueAusKonflikt(konfliktFehler({ venue: { name: "ohne Kennung" } }))).toBeNull();
  });

  it("ein anderer Status als 409 liefert null, auch mit passendem Rumpf", () => {
    const fehler = new ApiError(422, "/venues/v1", "ungueltig", { venue: venue() });
    expect(venueAusKonflikt(fehler)).toBeNull();
  });
});

describe("eigenerVenue - EINE Regel, kein Rueckfall auf liste[0]", () => {
  it("findet den eigenen Venue anhand der Kennung", () => {
    const a = venue({ id: "a" });
    const b = venue({ id: "b" });
    expect(eigenerVenue([a, b], "b")).toEqual(b);
  });

  it("DER KERNBEFUND: fehlt die Kennung in der Liste, ist das Ergebnis null - NICHT liste[0]", () => {
    const a = venue({ id: "a" });
    expect(eigenerVenue([a], "b")).toBeNull();
  });

  it("keine Liste (kein Array) liefert null", () => {
    expect(eigenerVenue(undefined, "b")).toBeNull();
    expect(eigenerVenue(null, "b")).toBeNull();
  });

  it("eine leere venueId liefert null, selbst wenn ein Eintrag zufaellig auch eine leere id traegt", () => {
    // Ohne die venueId-Pruefung wuerde "" === "" zutreffen und den kaputten
    // Datensatz zurueckgeben - deshalb der Eintrag mit leerer id im Test.
    expect(eigenerVenue([venue({ id: "" })], "")).toBeNull();
  });
});

describe("fehlerText", () => {
  it("uebersetzt 401 in eine Anmelde-Aufforderung", () => {
    expect(fehlerText(apiFehler(401, { error: "unauthorized" }))).toBe(
      "Nicht angemeldet. Bitte neu anmelden.",
    );
  });

  it("uebersetzt einen generischen 403 ebenfalls als Anmelde-Aufforderung", () => {
    expect(fehlerText(apiFehler(403, { error: "Kein Zugriff auf diesen Betrieb" }))).toBe(
      "Nicht angemeldet. Bitte neu anmelden.",
    );
  });

  it("nennt bei 403 nur_inhaber den wirklichen Grund - eine Aushilfe ist angemeldet", () => {
    const text = fehlerText(apiFehler(403, { error: "nur_inhaber" }));
    expect(text).toContain("Aushilfe");
    expect(text).not.toBe("Nicht angemeldet. Bitte neu anmelden.");
  });

  it("zeigt bei 422 den deutschen Servertext wörtlich", () => {
    const fehler = new ApiError(422, "/venues/v1", "Der Name taugt nicht als Adresse.", {});
    expect(fehlerText(fehler)).toBe("Der Name taugt nicht als Adresse.");
  });

  it("uebersetzt einen Netzfehler statt die englische Rohmeldung zu zeigen", () => {
    expect(fehlerText(new Error("Network request failed"))).toBe(
      "Keine Verbindung zum Server. Bitte später noch einmal versuchen.",
    );
  });

  it("DER KERNBEFUND: ein fehlendes natives Modul ist KEIN 'keine Verbindung' - Wortlaut aus _layout.tsx", () => {
    // Exakt die Meldung, die mobile/app/_layout.tsx als real aufgetreten festhält,
    // und genau das Modul, an dem der Google-Schritt haengt (WebBrowser.openAuthSessionAsync).
    const text = fehlerText(new Error("Cannot find native module 'ExpoWebBrowser'"));
    expect(text).not.toBe("Keine Verbindung zum Server. Bitte später noch einmal versuchen.");
    expect(text).toContain("natives Modul");
  });

  it("erkennt das fehlende native Modul unabhaengig von Gross-/Kleinschreibung und Modulname", () => {
    const text = fehlerText(new Error("cannot find native module 'RNCSomething'"));
    expect(text).toContain("natives Modul");
  });
});

describe("einstiegsWeiche", () => {
  it("schickt ohne Sitzung immer zum Login", () => {
    expect(
      einstiegsWeiche({ angemeldet: false, echterAnmeldebetrieb: true, betrieb: "bekannt" }),
    ).toBe("login");
  });

  it("der Demobetrieb landet NICHT im Onboarding, egal was der Betrieb-Stand sagt", () => {
    // Kein Clerk-Schluessel: die App muss ohne Konfiguration bedienbar bleiben.
    expect(
      einstiegsWeiche({ angemeldet: true, echterAnmeldebetrieb: false, betrieb: "keiner" }),
    ).toBe("start");
    expect(
      einstiegsWeiche({ angemeldet: true, echterAnmeldebetrieb: false, betrieb: "unbekannt" }),
    ).toBe("start");
  });

  it("wartet, solange der Betrieb-Stand unbekannt ist, statt zu raten", () => {
    expect(
      einstiegsWeiche({ angemeldet: true, echterAnmeldebetrieb: true, betrieb: "unbekannt" }),
    ).toBe("warten");
  });

  it("DER KERNBEFUND: ein angemeldeter Wirt ohne Betrieb geht ins Onboarding, nicht nach /start", () => {
    expect(
      einstiegsWeiche({ angemeldet: true, echterAnmeldebetrieb: true, betrieb: "keiner" }),
    ).toBe("onboarding");
  });

  it("ein angemeldeter Wirt MIT bekanntem Betrieb geht zum Start", () => {
    expect(
      einstiegsWeiche({ angemeldet: true, echterAnmeldebetrieb: true, betrieb: "bekannt" }),
    ).toBe("start");
  });
});

/* ── brauchtNeueAnmeldung ─────────────────────────────────────────────────── */

describe("brauchtNeueAnmeldung", () => {
  it("401 rät zur neuen Anmeldung - der Bildschirm darf sie anbieten", () => {
    expect(brauchtNeueAnmeldung(apiFehler(401, { error: "unauthorized" }))).toBe(true);
  });

  it("403 ohne besonderen Rumpf ebenfalls", () => {
    expect(brauchtNeueAnmeldung(apiFehler(403, { error: "Kein Zugriff auf diesen Betrieb" }))).toBe(true);
  });

  it("nur_inhaber NICHT - eine neue Anmeldung löst das gerade nicht", () => {
    // Der wichtigste Fall: Dieselbe Aushilfe käme wieder an. Ein Knopf „Zur
    // Anmeldung" wäre hier eine Irreführung, kein Ausweg.
    expect(brauchtNeueAnmeldung(apiFehler(403, { error: "nur_inhaber" }))).toBe(false);
  });

  it.each([
    ["422", apiFehler(422, { error: "Der Name taugt nicht als Adresse" })],
    ["409", apiFehler(409, { error: "Du hast bereits einen Betrieb." })],
    ["500", apiFehler(500, {})],
    ["Netzfehler", new Error("Network request failed")],
    ["kein Fehlerobjekt", "irgendwas"],
  ])("%s rät nicht zur Anmeldung", (_name, err) => {
    expect(brauchtNeueAnmeldung(err)).toBe(false);
  });
});
