import { describe, expect, it } from "vitest";
import type { StampCardRow, StampOverview, StampProgram } from "@maitr/core";

import {
  PRAEMIE_MAX,
  VORSCHLAG,
  aenderungsWarnungen,
  buchungsFehlerText,
  entwurfAusProgramm,
  ereignisZeile,
  fehlerAnzeige,
  formularFehler,
  geaenderteFelder,
  istKartenDetail,
  istKartenZeile,
  istVoll,
  relativeZeit,
  uebersichtsZeile,
  walletMangelKlartext,
  walletSatz,
  walletStatusZeile,
  type ProgrammEntwurf,
} from "./aufbereitung";

/**
 * Geprüft wird die Datenaufbereitung des Stempelkarten-Bildschirms.
 *
 * Für React-Native-Bildschirme gibt es in diesem Repo keinen Testaufbau (vitest
 * läuft in jsdom, react-test-renderer und jest-expo fehlen). Deshalb liegt alles,
 * was rechnet oder eine Zusage formuliert, in `aufbereitung.ts` - und genau das
 * steht hier auf dem Prüfstand. Ein Fehler in diesen Funktionen zeigt dem Wirt eine
 * falsche Zahl oder eine falsche Zusage an; ein Fehler im Layout tut das nicht.
 */

const PROGRAMM: StampProgram = {
  id: "prog-1",
  name: "Stempelkarte",
  maxStamps: 10,
  rewardText: "1x Kaffee gratis",
  isActive: true,
  cooldownSeconds: 3600,
  validityDays: null,
  walletStatus: { apple: false, google: false },
};

function entwurf(aenderung: Partial<ProgrammEntwurf> = {}): ProgrammEntwurf {
  return { ...entwurfAusProgramm(PROGRAMM), ...aenderung };
}

/** Nachbau eines `ApiError` - `fehlerAnzeige` prüft bewusst auf die Form, nicht auf die Klasse. */
function apiFehler(status: number, body: Record<string, unknown>): Error & Record<string, unknown> {
  const fehler = new Error(String(body.error ?? status)) as Error & Record<string, unknown>;
  fehler.status = status;
  fehler.body = body;
  return fehler;
}

describe("geaenderteFelder", () => {
  it("meldet nichts, solange nichts anders ist", () => {
    expect(geaenderteFelder(entwurf(), PROGRAMM)).toEqual([]);
  });

  it("wertet ein angehängtes Leerzeichen nicht als Änderung", () => {
    // Sonst schriebe ein Öffnen-und-Speichern denselben Prämientext neu - und der
    // Server klopft ihn dann in jede laufende Karte fest, obwohl nichts passiert ist.
    expect(geaenderteFelder(entwurf({ rewardText: "1x Kaffee gratis " }), PROGRAMM)).toEqual([]);
  });

  it("erkennt genau die geänderten Felder", () => {
    const felder = geaenderteFelder(entwurf({ maxStamps: 8, isActive: false }), PROGRAMM);
    expect(felder.sort()).toEqual(["isActive", "maxStamps"]);
  });

  it("unterscheidet „nie“ von einer Zahl", () => {
    expect(geaenderteFelder(entwurf({ validityDays: 365 }), PROGRAMM)).toEqual(["validityDays"]);
  });
});

describe("formularFehler", () => {
  it("verlangt einen Prämientext - das Feld kann nur der Wirt beantworten", () => {
    expect(formularFehler({ ...VORSCHLAG })).toBe("Trag ein, was der Gast bekommt.");
  });

  it("lässt einen vollständigen Entwurf durch", () => {
    expect(formularFehler(entwurf())).toBeNull();
  });

  it("weist einen zu langen Prämientext ab, bevor Wallet ihn abschneidet", () => {
    const zuLang = "x".repeat(PRAEMIE_MAX + 1);
    expect(formularFehler(entwurf({ rewardText: zuLang }))).toContain("höchstens");
  });

  it("weist einen leeren Namen ab", () => {
    expect(formularFehler(entwurf({ name: "   " }))).toBe("Das Programm braucht einen Namen.");
  });
});

describe("aenderungsWarnungen", () => {
  it("schweigt, wenn sich nichts geändert hat", () => {
    expect(aenderungsWarnungen(entwurf(), PROGRAMM, 43)).toEqual([]);
  });

  it("nennt bei der Stempelzahl die echte Zahl OFFENER Karten und die ALTE Vorgabe", () => {
    const warnungen = aenderungsWarnungen(entwurf({ maxStamps: 8 }), PROGRAMM, 43);
    expect(warnungen).toHaveLength(1);
    expect(warnungen[0]).toContain("43 Karten sind noch offen");
    expect(warnungen[0]).toContain("bei 10 Stempeln");
  });

  it("zählt die vollen Karten mit - der Server tut es auch", () => {
    // Die Zahl muss dieselbe Menge meinen wie `praemieFestschreiben()`
    // (OFFENE_ZUSTAENDE = ACTIVE + COMPLETED). Mit `aktiv` nannte die Warnung 12,
    // während der Toast eine Sekunde später „für 15 laufende Karten festgehalten"
    // meldete - und die drei Fehlenden waren genau die Gäste, die morgen ihren
    // Kaffee abholen wollen.
    const warnungen = aenderungsWarnungen(entwurf({ rewardText: "1x Espresso" }), PROGRAMM, 15);
    expect(warnungen[0]).toContain("15 Karten sind noch offen");
    expect(warnungen[0]).toContain("auch die, die schon voll sind");
  });

  it("sagt bei der Prämie, dass die ALTE Zusage für laufende Karten stehen bleibt", () => {
    // Der Server schreibt beim Speichern den alten Text in jede laufende Karte ohne
    // Snapshot. Stünde hier „gilt rückwirkend", wäre die Warnung schlicht falsch.
    const warnungen = aenderungsWarnungen(entwurf({ rewardText: "1x Espresso" }), PROGRAMM, 43);
    expect(warnungen[0]).toContain("1x Kaffee gratis");
    expect(warnungen[0]).toContain("erst für Karten, die ab jetzt ausgegeben werden");
  });

  it("unterscheidet die Sperrfrist (sofort für alle) von der Gültigkeit (nur neue)", () => {
    const sofort = aenderungsWarnungen(entwurf({ cooldownSeconds: 1800 }), PROGRAMM, 5);
    expect(sofort[0]).toContain("ab sofort für alle Karten");

    const spaeter = aenderungsWarnungen(entwurf({ validityDays: 365 }), PROGRAMM, 5);
    expect(spaeter[0]).toContain("nur neu ausgegebene Karten");
  });

  it("warnt beim Ausschalten, nicht beim Einschalten", () => {
    expect(aenderungsWarnungen(entwurf({ isActive: false }), PROGRAMM, 5)[0]).toContain(
      "Laufende Karten bleiben gültig",
    );
    const aus: StampProgram = { ...PROGRAMM, isActive: false };
    expect(aenderungsWarnungen(entwurf({ isActive: true }), aus, 5)).toEqual([]);
  });

  it("erwähnt keine laufenden Karten, wenn keine laufen", () => {
    const warnungen = aenderungsWarnungen(entwurf({ maxStamps: 5 }), PROGRAMM, 0);
    expect(warnungen[0]).not.toContain("0 Karten");
  });

  it("verlangt für den Namen keine Warnung", () => {
    expect(aenderungsWarnungen(entwurf({ name: "Kaffeekarte" }), PROGRAMM, 43)).toEqual([]);
  });

  it("nennt keine Zahl, wenn die Kennzahlen nicht durchgekommen sind", () => {
    // `null` heisst „unbekannt". Eine hilfsweise 0 hiesse „es läuft keine Karte" -
    // und genau darauf hin änderte der Wirt seine Prämie.
    const warnungen = aenderungsWarnungen(entwurf({ rewardText: "1x Espresso" }), PROGRAMM, null);
    expect(warnungen).toHaveLength(1);
    expect(warnungen[0]).toContain("Für Karten, die schon laufen");
    expect(warnungen[0]).toContain("1x Kaffee gratis");
    expect(warnungen[0]).not.toContain("0 Karten");
  });

  it("warnt auch bei unbekannter Zahl noch für die Stempelzahl", () => {
    expect(aenderungsWarnungen(entwurf({ maxStamps: 12 }), PROGRAMM, null)[0]).toContain(
      "bei 10 Stempeln",
    );
  });
});

describe("relativeZeit", () => {
  const jetzt = new Date("2026-08-06T12:00:00.000Z");

  it("sagt „noch kein Stempel“ statt einer erfundenen Zeit", () => {
    expect(relativeZeit(null, jetzt)).toBe("noch kein Stempel");
  });

  it.each([
    ["2026-08-06T11:59:30.000Z", "gerade eben"],
    ["2026-08-06T11:30:00.000Z", "vor 30 Min."],
    ["2026-08-06T08:00:00.000Z", "vor 4 Std."],
    ["2026-08-05T10:00:00.000Z", "gestern"],
    ["2026-08-01T12:00:00.000Z", "vor 5 Tagen"],
    ["2026-06-01T12:00:00.000Z", "vor 2 Monaten"],
    ["2025-01-01T12:00:00.000Z", "vor 1 Jahr"],
  ])("%s → %s", (iso, erwartet) => {
    expect(relativeZeit(iso, jetzt)).toBe(erwartet);
  });

  it("stürzt bei Unsinn nicht ab", () => {
    expect(relativeZeit("gestern abend", jetzt)).toBe("Zeitpunkt unbekannt");
  });
});

describe("uebersichtsZeile", () => {
  const basis: StampOverview = {
    gesamt: 20,
    aktiv: 12,
    offeneKarten: 14,
    fastVoll: 3,
    voll: 2,
    eingeschlafen: 4,
    wiederkommer: 5,
    eingeloest30d: 7,
    medianTageBisVoll: null,
    walletRegistrierteKarten: 0,
    cacheAbweichungen: 0,
  };

  it("lässt die Durchlaufdauer weg, solange der Server keine liefert", () => {
    // Unter fünf abgeschlossenen Karten antwortet der Server mit null. Eine Zahl aus
    // drei Karten wäre kein Messwert, stünde aber wie einer da.
    // „davon", nicht „·": `eingeschlafen` ist eine TEILMENGE der laufenden Karten.
    // Als zwei durch Punkt getrennte Angaben las sich das wie 12 + 4 = 16 Sammler.
    expect(uebersichtsZeile(basis)).toBe(
      "12 Karten laufen, davon 4 eingeschlafen (30 Tage kein Stempel)",
    );
  });

  it("hängt sie an, sobald es sie gibt", () => {
    expect(uebersichtsZeile({ ...basis, medianTageBisVoll: 24 })).toContain("meist 24 Tage bis voll");
  });

  it("beugt die Einzahl", () => {
    expect(uebersichtsZeile({ ...basis, aktiv: 1 })).toContain("1 Karte läuft");
  });

  it("schweigt über den Zwischenstand, solange nichts abweicht", () => {
    expect(uebersichtsZeile(basis)).not.toContain("Zwischenstand");
  });

  it("zeigt Abweichungen des Lese-Caches, statt sie nur zu zählen", () => {
    // Der Server zählt sie ausdrücklich, damit sie „sichtbar statt still" sind -
    // gezeigt wurden sie bisher nirgends. Der Wirt erfuhr davon nur, wenn er zufällig
    // genau eine der betroffenen Karten öffnete.
    const zeile = uebersichtsZeile({ ...basis, cacheAbweichungen: 12 });
    expect(zeile).toContain("bei 12 Karten weicht der schnelle Zwischenstand ab");
    expect(zeile).toContain("gültig ist der Verlauf");
  });
});

describe("istVoll", () => {
  const karte = (status: StampCardRow["status"], current: number, max = 10): StampCardRow => ({
    id: "k1",
    stand: { current, max },
    status,
    cycle: 1,
    letzterStempelAt: null,
    gast: { id: "g1", anzeigename: "Anna", geloescht: false, istBeispiel: false },
  });

  it("rechnet aus dem STAND und nicht aus dem Status", () => {
    // Der Fall, gegen den das ganze Modul argumentiert: die Statusspalte hängt bei
    // ACTIVE, das Hauptbuch sagt 10 von 10. Kachel und Filter zählten die Karte,
    // Abzeichen und Knopf nicht - der Gast stand mit voller Karte am Tresen und
    // „Prämie eingelöst" fehlte.
    expect(istVoll(karte("ACTIVE", 10))).toBe(true);
    expect(istVoll(karte("COMPLETED", 10))).toBe(true);
    expect(istVoll(karte("ACTIVE", 9))).toBe(false);
  });

  it("hält eine geschlossene Karte nie für voll", () => {
    expect(istVoll(karte("REDEEMED", 10))).toBe(false);
    expect(istVoll(karte("VOIDED", 10))).toBe(false);
    expect(istVoll(karte("EXPIRED", 10))).toBe(false);
  });
});

describe("Formprüfung der Antworten", () => {
  const gut = {
    id: "k1",
    stand: { current: 3, max: 10 },
    status: "ACTIVE",
    cycle: 1,
    letzterStempelAt: null,
    gast: { id: "g1", anzeigename: "Anna", geloescht: false, istBeispiel: false },
  };

  it("weist eine Zeile ab, der genau das fehlt, was gerendert wird", () => {
    // `{"items":[{"id":"x"}]}` bestand die frühere Prüfung (`Array.isArray`) und warf
    // beim Rendern „Cannot read property 'current' of undefined".
    expect(istKartenZeile(gut)).toBe(true);
    expect(istKartenZeile({ id: "x" })).toBe(false);
    expect(istKartenZeile({ ...gut, stand: { current: 3 } })).toBe(false);
    expect(istKartenZeile({ ...gut, gast: {} })).toBe(false);
    expect(istKartenZeile(null)).toBe(false);
    expect(istKartenZeile("nein")).toBe(false);
  });

  it("verlangt beim Detail zusätzlich die Felder, die nur dort stehen", () => {
    expect(istKartenDetail(gut)).toBe(false);
    expect(istKartenDetail({ ...gut, programId: "p1", rewardText: "1x Kaffee" })).toBe(true);
  });
});

describe("fehlerAnzeige", () => {
  it("erkennt die fehlende Migration und bietet KEINE Wiederholung an", () => {
    const anzeige = fehlerAnzeige(apiFehler(503, { error: "loyalty_nicht_eingerichtet" }));
    expect(anzeige.art).toBe("nicht_eingerichtet");
    expect(anzeige.wiederholbar).toBe(false);
    expect(anzeige.text).toContain("noch nicht freigeschaltet");
  });

  it("übersetzt 403 in einen Satz statt in eine Zahl", () => {
    const anzeige = fehlerAnzeige(apiFehler(403, { error: "Kein Zugriff" }));
    expect(anzeige.art).toBe("kein_zugriff");
    expect(anzeige.wiederholbar).toBe(false);
  });

  it("übersetzt einen Netzfehler, statt die englische Rohmeldung zu zeigen", () => {
    // Vorher stand am Tresen wörtlich „Request-Timeout" bzw. „Network request
    // failed" - englische Maschinenmeldungen in einem Bildschirm, der sonst in
    // ganzen Sätzen spricht.
    const anzeige = fehlerAnzeige(new Error("Request-Timeout"));
    expect(anzeige.art).toBe("kein_netz");
    expect(anzeige.wiederholbar).toBe(true);
    expect(anzeige.text).toBe("Keine Verbindung. Prüf das Netz und versuch es noch einmal.");
    expect(anzeige.text).not.toContain("Timeout");
  });

  it("macht aus einem 404 keinen Wiederholknopf und keine Kennung", () => {
    const karte = fehlerAnzeige(apiFehler(404, { error: "karte_nicht_gefunden" }), "karte");
    expect(karte.text).toBe("Diese Karte gibt es nicht mehr.");
    expect(karte.wiederholbar).toBe(false);

    const programm = fehlerAnzeige(apiFehler(404, { error: "programm_nicht_gefunden" }));
    expect(programm.text).not.toContain("_");
  });

  it("nennt beim Rollenriegel den Grund", () => {
    const anzeige = fehlerAnzeige(apiFehler(403, { error: "nur_inhaber" }));
    expect(anzeige.text).toContain("nur der Inhaber");
  });

  it("verweist beim 403 nicht auf einen fremden Betrieb", () => {
    // Der häufigste Grund ist, dass der Nutzer noch gar keinen Betrieb hat.
    const anzeige = fehlerAnzeige(apiFehler(403, { error: "Kein Zugriff" }));
    expect(anzeige.text).toContain("noch keinen Betrieb");
  });

  it("verspricht bei fehlender Migration keine Selbstheilung", () => {
    // Es gibt keinen Wiederholknopf und der Ladeeffekt feuert von allein nie neu -
    // „ohne weiteres Zutun bereit" war deshalb genau falsch herum.
    const anzeige = fehlerAnzeige(apiFehler(503, { error: "loyalty_nicht_eingerichtet" }));
    expect(anzeige.text).toContain("öffne diesen Bildschirm noch einmal");
    expect(anzeige.text).not.toContain("ohne weiteres Zutun");
  });

  it("kommt auch mit einem 503 ohne passende Kennung klar", () => {
    // Ein anderer 503 (etwa ein Neustart) ist sehr wohl wiederholbar - er darf nicht
    // in den ruhigen Sondertext ohne Knopf laufen.
    expect(fehlerAnzeige(apiFehler(503, { error: "irgendwas" })).wiederholbar).toBe(true);
  });
});

describe("buchungsFehlerText", () => {
  const jetzt = new Date("2026-08-06T12:00:00.000Z");

  it("sagt bei der Sperrfrist, wie lange noch", () => {
    const text = buchungsFehlerText(
      apiFehler(409, { error: "sperrfrist", frueheste: "2026-08-06T12:20:00.000Z" }),
      jetzt,
    );
    expect(text).toBe("Ein Stempel pro Besuch - wieder möglich in 20 Min.");
  });

  it("rechnet lange Sperrfristen in Stunden um", () => {
    const text = buchungsFehlerText(
      apiFehler(409, { error: "sperrfrist", frueheste: "2026-08-06T15:00:00.000Z" }),
      jetzt,
    );
    expect(text).toContain("3 Std.");
  });

  it("nennt beim Einlösen den echten Stand", () => {
    const text = buchungsFehlerText(
      apiFehler(409, { error: "praemie_nicht_erreicht", stand: 7, benoetigt: 10 }),
      jetzt,
    );
    expect(text).toBe("Die Karte ist noch nicht voll: 7 von 10.");
  });

  it("übersetzt den Kartenstatus in Wirtssprache", () => {
    expect(
      buchungsFehlerText(apiFehler(409, { error: "karte_nicht_aktiv", status: "VOIDED" }), jetzt),
    ).toBe("Diese Karte ist entwertet.");
  });

  it("sagt beim Konflikt, dass NICHTS gebucht wurde", () => {
    // Der Satz entscheidet, ob jemand am Tresen ein zweites Mal drückt oder in dem
    // Glauben aufhört, es sei vielleicht doch durchgegangen.
    expect(buchungsFehlerText(apiFehler(409, { error: "konflikt" }), jetzt)).toContain(
      "gebucht wurde nichts",
    );
  });

  it("fällt für unbekannte Fehler auf die allgemeine Anzeige zurück - in Deutsch", () => {
    expect(buchungsFehlerText(new Error("Network request failed"), jetzt)).toBe(
      "Keine Verbindung. Prüf das Netz und versuch es noch einmal.",
    );
  });
});

describe("ereignisZeile", () => {
  it("schreibt „nicht mehr zuordenbar“ statt eine Lücke zu lassen", () => {
    const zeile = ereignisZeile({
      id: "e1",
      createdAt: "2026-08-06T10:00:00.000Z",
      kind: "EARNED",
      delta: 1,
      balanceAfter: 7,
      source: "MANUAL",
      staffName: null,
      deviceLabel: null,
      note: null,
    });
    expect(zeile.titel).toBe("Stempel gesetzt");
    expect(zeile.delta).toBe("+1");
    expect(zeile.herkunft).toBe("von Hand · nicht mehr zuordenbar");
  });

  it("zeigt ein negatives Delta mit Vorzeichen", () => {
    const zeile = ereignisZeile({
      id: "e2",
      createdAt: "2026-08-06T10:00:00.000Z",
      kind: "REDEEMED",
      delta: -10,
      balanceAfter: 0,
      source: "QR_SCAN",
      staffName: "Sofia",
      deviceLabel: "Tresen",
      note: null,
    });
    expect(zeile.delta).toBe("-10");
    expect(zeile.herkunft).toBe("Pass gescannt · Sofia · Tresen");
  });
});

describe("Wallet-Zustand", () => {
  it("fasst Variablennamen zu Klartext zusammen, ohne zu wiederholen", () => {
    expect(
      walletMangelKlartext([
        "APPLE_PASS_CERT_P12_BASE64",
        "APPLE_WWDR_CERT_PEM_BASE64",
        "APNS_KEY_P8_BASE64",
        "APNS_KEY_ID",
        "GOOGLE_WALLET_ISSUER_ID",
      ]),
    ).toEqual([
      "Pass-Zertifikat von Apple",
      "Push-Schlüssel von Apple",
      "Aussteller-Kennung von Google",
    ]);
  });

  it("gibt einen unbekannten Namen roh zurück, statt ihn zu verschlucken", () => {
    expect(walletMangelKlartext(["IRGENDWAS_NEUES"])).toEqual(["IRGENDWAS_NEUES"]);
  });

  it("verspricht ohne Wallet keinen Zustellweg", () => {
    const satz = walletSatz({ apple: false, google: false, ready: false, missing: [] });
    expect(satz).toContain("nur, wenn du ihm die Karte zeigst");
  });

  it("behauptet KEINE Zustellung, solange kein Pass gebaut wird", () => {
    // Der eigentliche Mangel: hinterlegte Zugangsdaten sind noch keine Zustellung.
    // Es gibt im Repo weder Passbau noch APNs-Client - wer sein Zertifikat eintrug,
    // las trotzdem „iPhone-Gäste sehen den neuen Stand ihrer Karte".
    const satz = walletSatz({
      apple: true,
      google: true,
      ready: true,
      missing: [],
      passausgabeGebaut: false,
    });
    expect(satz).toContain("noch keine Pässe ausgegeben");
    expect(satz).not.toContain("sehen den neuen Stand");
  });

  it("nennt bei halber Einrichtung die Plattform, die fehlt - sobald es Pässe gibt", () => {
    expect(
      walletSatz({ apple: true, google: false, ready: true, missing: [], passausgabeGebaut: true }),
    ).toContain("Für Android fehlt");
    expect(
      walletSatz({ apple: false, google: true, ready: true, missing: [], passausgabeGebaut: true }),
    ).toContain("Für das iPhone fehlt");
  });

  it("schreibt „Zugangsdaten hinterlegt“ statt „eingerichtet“, solange nichts ausgegeben wird", () => {
    expect(walletStatusZeile("Apple Wallet", true, false)).toBe(
      "Apple Wallet: Zugangsdaten hinterlegt",
    );
    expect(walletStatusZeile("Apple Wallet", true, true)).toBe("Apple Wallet: eingerichtet");
    expect(walletStatusZeile("Google Wallet", false, false)).toBe(
      "Google Wallet: noch nicht eingerichtet",
    );
  });

  it("stürzt nicht ab, wenn `missing` gar keine Liste ist", () => {
    // Der Wert kommt ungeprüft aus einer Serverantwort.
    expect(walletMangelKlartext(undefined)).toEqual([]);
    expect(walletMangelKlartext({ nope: true })).toEqual([]);
  });
});
