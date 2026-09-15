/**
 * „Profil verwalten" für den echten Betrieb (mobile/src/lib/profilSpeichern.ts).
 */
import { describe, expect, it } from "vitest";
import { ApiError, type VenuePresence } from "@maitr/core";
// Dieselbe Gegenprobe wie in features/onboarding/ablauf.spec.ts: gegen das ECHTE
// Schema des Servers, nicht gegen einen Nachbau. Läuft nur unter vitest, nie im
// App-Bundle.
import { StrictOpeningHoursSchema } from "../../../server/schemas/configuration";

import {
  GOOGLE_BUSINESS_URL,
  googleKarte,
  gleicheZeiten,
  instagramKonto,
  instagramUrl,
  betriebAusListe,
  leereWoche,
  oeffnungszeitenAusZeilen,
  patchGegenServerstand,
  profilAusAntwort,
  profilPatch,
  speicherFehlerText,
  tageDerZeile,
  zeitenEinmischen,
  zeitraumAusText,
  type ProfilFormular,
} from "./profilSpeichern";
import { zeilenAusOeffnungszeiten } from "./venueAdopt";

describe("tageDerZeile", () => {
  it("liest einen Tag und einen lückenlosen Bereich", () => {
    expect(tageDerZeile("sunday")).toEqual(["sunday"]);
    expect(tageDerZeile("monday_friday")).toEqual(["monday", "tuesday", "wednesday", "thursday", "friday"]);
    expect(tageDerZeile("saturday_sunday")).toEqual(["saturday", "sunday"]);
  });

  it("kennt die Demo-Kennungen und rückwärts laufende Bereiche nicht", () => {
    expect(tageDerZeile("mo_fr")).toBeNull();
    expect(tageDerZeile("friday_monday")).toBeNull();
    expect(tageDerZeile("monday_tuesday_wednesday")).toBeNull();
    expect(tageDerZeile("")).toBeNull();
  });
});

describe("zeitraumAusText", () => {
  it.each([
    ["17:00 – 23:59", "17:00", "23:59"],
    ["8:00 – 18:00", "08:00", "18:00"],
    ["9-17 Uhr", "09:00", "17:00"],
    ["8.30 bis 18", "08:30", "18:00"],
    ["18:00 — 01:00", "18:00", "01:00"],
    ["  0:00-0:00 ", "00:00", "00:00"],
  ])("„%s\" → %s bis %s", (text, open, close) => {
    expect(zeitraumAusText(text)).toEqual({ ok: true, open, close });
  });

  it("weist ab, statt zu raten - mit einem Satz, der sagt, was fehlt", () => {
    expect(zeitraumAusText("")).toMatchObject({ ok: false, fehler: expect.stringContaining("Uhrzeiten eintragen") });
    expect(zeitraumAusText("Geschlossen")).toMatchObject({ ok: false });
    expect(zeitraumAusText("abends")).toMatchObject({ ok: false, fehler: expect.stringContaining("Zeitraum") });
    expect(zeitraumAusText("9 Uhr")).toMatchObject({ ok: false });
    expect(zeitraumAusText("24:00 – 02:00")).toMatchObject({ ok: false, fehler: expect.stringContaining("„24:00\" gibt es nicht") });
    expect(zeitraumAusText("9:75 – 17:00")).toMatchObject({ ok: false });
    expect(zeitraumAusText("neun – 17")).toMatchObject({ ok: false, fehler: expect.stringContaining("„neun\" ist keine Uhrzeit") });
  });

  it("zwei Zeiträume an einem Tag werden abgewiesen, nicht auf den ersten gekürzt", () => {
    for (const text of ["12:00 – 14:30, 17:30 – 22:00", "12-14 und 17-22", "12-14 / 17-22"]) {
      expect(zeitraumAusText(text)).toMatchObject({ ok: false, fehler: expect.stringContaining("Nur ein Zeitraum") });
    }
  });
});

describe("oeffnungszeitenAusZeilen", () => {
  it("ist die Rückrichtung von zeilenAusOeffnungszeiten - und besteht das echte Serverschema", () => {
    const vomServer = {
      monday: { closed: false as const, open: "17:00", close: "23:59" },
      tuesday: { closed: false as const, open: "17:00", close: "23:59" },
      wednesday: { closed: false as const, open: "17:00", close: "23:59" },
      thursday: { closed: false as const, open: "17:00", close: "23:59" },
      friday: { closed: false as const, open: "17:00", close: "01:00" },
      saturday: { closed: false as const, open: "09:30", close: "01:00" },
      sunday: { closed: true as const },
    };
    const ergebnis = oeffnungszeitenAusZeilen(zeilenAusOeffnungszeiten(vomServer));
    expect(ergebnis).toEqual({ ok: true, werte: vomServer });
    if (ergebnis.ok) expect(() => StrictOpeningHoursSchema.parse(ergebnis.werte)).not.toThrow();
  });

  it("Tage ohne Zeile bleiben ohne Angabe - kein erfundenes „geschlossen\"", () => {
    const ergebnis = oeffnungszeitenAusZeilen([{ id: "monday", label: "Montag", value: "9:00 – 18:00" }]);
    expect(ergebnis).toEqual({ ok: true, werte: { monday: { closed: false, open: "09:00", close: "18:00" } } });
  });

  it("ein geschlossener Tag braucht keinen Zeittext", () => {
    expect(
      oeffnungszeitenAusZeilen([{ id: "sunday", label: "Sonntag", value: "Geschlossen", closed: true }]),
    ).toEqual({ ok: true, werte: { sunday: { closed: true } } });
  });

  it("ungültige Zeilen bekommen je einen Fehlertext, statt still zu verschwinden", () => {
    const ergebnis = oeffnungszeitenAusZeilen([
      { id: "monday_friday", label: "Mo bis Fr", value: "9 bis spät" },
      { id: "saturday", label: "Samstag", value: "10:00 – 16:00" },
      { id: "sunday", label: "Sonntag", value: "" },
      { id: "mo_fr", label: "Mo bis Fr", value: "8:00 – 18:00" },
    ]);
    expect(ergebnis.ok).toBe(false);
    if (ergebnis.ok) return;
    expect(Object.keys(ergebnis.fehler).sort()).toEqual(["mo_fr", "monday_friday", "sunday"]);
    expect(ergebnis.fehler.sunday).toContain("Uhrzeiten eintragen");
    expect(ergebnis.fehler.mo_fr).toContain("keinem Wochentag");
  });

  it("ein Tag in zwei Zeilen ist ein Fehler, keine stille Überschreibung", () => {
    const ergebnis = oeffnungszeitenAusZeilen([
      { id: "monday_wednesday", label: "Mo bis Mi", value: "9:00 – 17:00" },
      { id: "wednesday", label: "Mittwoch", value: "Geschlossen", closed: true },
    ]);
    expect(ergebnis).toEqual({ ok: false, fehler: { wednesday: "Ein Tag steht hier doppelt" } });
  });
});

describe("gleicheZeiten", () => {
  it("vergleicht nach Bedeutung, nicht nach Schlüsselreihenfolge", () => {
    expect(
      gleicheZeiten(
        { sunday: { closed: true }, monday: { closed: false, open: "09:00", close: "17:00" } },
        { monday: { closed: false, open: "09:00", close: "17:00" }, sunday: { closed: true } },
      ),
    ).toBe(true);
    expect(gleicheZeiten({ sunday: { closed: true } }, {})).toBe(false);
    expect(
      gleicheZeiten({ monday: { closed: true } }, { monday: { closed: false, open: "09:00", close: "17:00" } }),
    ).toBe(false);
  });
});

describe("profilPatch", () => {
  const AUSGANG: ProfilFormular = {
    name: "Haus Töller",
    tagline: "Brauhaus",
    bio: "",
    hours: [
      { id: "monday_saturday", label: "Mo bis Sa", value: "17:00 – 23:59" },
      { id: "sunday", label: "Sonntag", value: "Geschlossen", closed: true },
    ],
  };

  it("ohne Änderung ein leerer Patch - nichts wird geschickt", () => {
    expect(profilPatch(AUSGANG, { ...AUSGANG, name: " Haus Töller ", hours: [...AUSGANG.hours] })).toEqual({
      ok: true,
      patch: {},
    });
  });

  it("schickt nur Geändertes; die Beschreibung heißt am Server description", () => {
    expect(profilPatch(AUSGANG, { ...AUSGANG, bio: "  Kölsch vom Holzfass.  " })).toEqual({
      ok: true,
      patch: { description: "Kölsch vom Holzfass." },
    });
    expect(profilPatch(AUSGANG, { ...AUSGANG, name: "Haus Töller am Ring", tagline: "" })).toEqual({
      ok: true,
      patch: { name: "Haus Töller am Ring", tagline: "" },
    });
  });

  it("Öffnungszeiten nur, wenn sie sich in der Bedeutung ändern", () => {
    // Anders geschrieben, gleiche Aussage → nicht mitschicken.
    const umgeschrieben = profilPatch(AUSGANG, {
      ...AUSGANG,
      hours: [{ ...AUSGANG.hours[0], value: "17-23:59 Uhr" }, AUSGANG.hours[1]],
    });
    expect(umgeschrieben).toEqual({ ok: true, patch: {} });

    // Sonntag geöffnet → der ganze Wochenplan geht mit (PATCH ersetzt ihn vollständig).
    const geaendert = profilPatch(AUSGANG, {
      ...AUSGANG,
      hours: [AUSGANG.hours[0], { id: "sunday", label: "Sonntag", value: "12:00 – 20:00", closed: false }],
    });
    expect(geaendert.ok).toBe(true);
    if (!geaendert.ok) return;
    expect(geaendert.patch.openingHours).toEqual({
      monday: { closed: false, open: "17:00", close: "23:59" },
      tuesday: { closed: false, open: "17:00", close: "23:59" },
      wednesday: { closed: false, open: "17:00", close: "23:59" },
      thursday: { closed: false, open: "17:00", close: "23:59" },
      friday: { closed: false, open: "17:00", close: "23:59" },
      saturday: { closed: false, open: "17:00", close: "23:59" },
      sunday: { closed: false, open: "12:00", close: "20:00" },
    });
    expect(Object.keys(geaendert.patch)).toEqual(["openingHours"]);
  });

  it("ein Fehler in den Zeiten verhindert das ganze Speichern - mit Text an der Zeile", () => {
    const plan = profilPatch(AUSGANG, {
      ...AUSGANG,
      bio: "Neu",
      hours: [{ ...AUSGANG.hours[0], value: "ab 17" }, AUSGANG.hours[1]],
    });
    expect(plan.ok).toBe(false);
    if (plan.ok) return;
    expect(Object.keys(plan.fehler.zeilen)).toEqual(["monday_saturday"]);
  });

  it("prüft die Grenzen des Servers, aber nur an geänderten Feldern", () => {
    const plan = profilPatch(AUSGANG, {
      ...AUSGANG,
      name: "H",
      tagline: "x".repeat(201),
      bio: "y".repeat(2001),
    });
    expect(plan).toEqual({
      ok: false,
      fehler: {
        name: "Der Name braucht mindestens 2 Zeichen",
        tagline: "Höchstens 200 Zeichen",
        bio: "Höchstens 2000 Zeichen",
        zeilen: {},
      },
    });
    // Ein am Server schon zu kurzer Name blockiert keine neue Beschreibung.
    expect(profilPatch({ ...AUSGANG, name: "H" }, { ...AUSGANG, name: "H", bio: "Neu" })).toEqual({
      ok: true,
      patch: { description: "Neu" },
    });
    expect(profilPatch(AUSGANG, { ...AUSGANG, bio: "y".repeat(2000) }).ok).toBe(true);
  });

  it("ein Betrieb ohne Zeiten bekommt eine leere Woche, die erst vollständig speicherbar ist", () => {
    const leer: ProfilFormular = { ...AUSGANG, hours: [] };
    const woche = leereWoche();
    expect(woche.map((z) => z.id)).toEqual([
      "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    ]);
    // Nichts eingetragen → sieben Fehler, keine erfundenen Zeiten.
    const unausgefuellt = profilPatch(leer, { ...leer, hours: woche });
    expect(unausgefuellt.ok).toBe(false);
    if (!unausgefuellt.ok) expect(Object.keys(unausgefuellt.fehler.zeilen)).toHaveLength(7);

    const ausgefuellt = woche.map((z) =>
      z.id === "sunday" ? { ...z, value: "Geschlossen", closed: true } : { ...z, value: "9:00 – 17:00" },
    );
    const plan = profilPatch(leer, { ...leer, hours: ausgefuellt });
    expect(plan.ok).toBe(true);
    if (plan.ok) expect(() => StrictOpeningHoursSchema.parse(plan.patch.openingHours)).not.toThrow();
  });
});

describe("patchGegenServerstand", () => {
  // Stand beim Öffnen: Mo-Sa 17-23:59, So zu - so stand es gestern am Server.
  const AUSGANG: ProfilFormular = {
    name: "Haus Töller",
    tagline: "Brauhaus",
    bio: "",
    hours: [
      { id: "monday_saturday", label: "Mo bis Sa", value: "17:00 – 23:59" },
      { id: "sunday", label: "Sonntag", value: "Geschlossen", closed: true },
    ],
  };
  const offen = (open: string, close: string) => ({ closed: false as const, open, close });
  // Heute am Server: Die Web-App wurde mit neuen Zeiten Mo-Sa veröffentlicht.
  const SERVER = {
    id: "biz-1",
    name: "Haus Töller",
    timezone: "Europe/Berlin",
    tags: [],
    openingHours: {
      monday: { closed: true as const },
      tuesday: offen("16:00", "23:00"),
      wednesday: offen("16:00", "23:00"),
      thursday: offen("16:00", "23:00"),
      friday: offen("16:00", "01:00"),
      saturday: offen("12:00", "01:00"),
      sunday: { closed: true as const },
    },
  };
  const sonntagAuf = (): ProfilFormular => ({
    ...AUSGANG,
    hours: [AUSGANG.hours[0], { id: "sunday", label: "Sonntag", value: "12:00 – 20:00", closed: false }],
  });

  it("nur der geänderte Tag landet im Serverplan - der Befund: Sonntag auf, Mo-Sa veraltet", () => {
    const plan = profilPatch(AUSGANG, sonntagAuf());
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    // Ohne Abgleich ginge Mo-Sa mit dem Stand von gestern mit.
    expect(plan.patch.openingHours?.monday).toEqual(offen("17:00", "23:59"));

    const abgleich = patchGegenServerstand(AUSGANG, plan.patch, [SERVER], "biz-1");
    expect(abgleich.ok).toBe(true);
    if (!abgleich.ok) return;
    expect(abgleich.patch.openingHours).toEqual({ ...SERVER.openingHours, sunday: offen("12:00", "20:00") });
    expect(abgleich.uebrigeTageNeuer).toBe(true);
    expect(() => StrictOpeningHoursSchema.parse(abgleich.patch.openingHours)).not.toThrow();
  });

  it("unveränderter Serverstand: dasselbe Ergebnis wie ohne Abgleich, ohne Hinweis", () => {
    const plan = profilPatch(AUSGANG, sonntagAuf());
    if (!plan.ok) throw new Error("Plan erwartet");
    const gestern = { ...SERVER, openingHours: oeffnungszeitenWerte(AUSGANG) };
    const abgleich = patchGegenServerstand(AUSGANG, plan.patch, [gestern], "biz-1");
    expect(abgleich).toMatchObject({ ok: true, patch: plan.patch, uebrigeTageNeuer: false });
  });

  it("der ausdrücklich geänderte Tag gewinnt, auch wenn der Server ihn ebenfalls geändert hat", () => {
    const entwurf: ProfilFormular = {
      ...AUSGANG,
      hours: [
        { id: "monday_saturday", label: "Mo bis Sa", value: "18:00 – 23:00" },
        AUSGANG.hours[1],
      ],
    };
    const plan = profilPatch(AUSGANG, entwurf);
    if (!plan.ok) throw new Error("Plan erwartet");
    const abgleich = patchGegenServerstand(AUSGANG, plan.patch, [SERVER], "biz-1");
    if (!abgleich.ok) throw new Error("Abgleich erwartet");
    expect(abgleich.patch.openingHours?.monday).toEqual(offen("18:00", "23:00"));
    expect(abgleich.patch.openingHours?.sunday).toEqual({ closed: true });
  });

  it("steht es schon so am Server, fällt openingHours weg - der Rest bleibt", () => {
    const heute = { ...SERVER, openingHours: { ...SERVER.openingHours, sunday: offen("12:00", "20:00") } };
    const plan = profilPatch(AUSGANG, { ...sonntagAuf(), bio: "Kölsch." });
    if (!plan.ok) throw new Error("Plan erwartet");
    const abgleich = patchGegenServerstand(AUSGANG, plan.patch, [heute], "biz-1");
    expect(abgleich).toMatchObject({ ok: true, patch: { description: "Kölsch." } });
    if (abgleich.ok) expect(abgleich.patch).not.toHaveProperty("openingHours");
  });

  it("ohne lesbaren Serverstand wird nicht gespeichert, statt blind die Woche zu schicken", () => {
    const plan = profilPatch(AUSGANG, sonntagAuf());
    if (!plan.ok) throw new Error("Plan erwartet");
    for (const liste of [[], [{ ...SERVER, id: "biz-2" }], "<html>", null, { venues: [SERVER] }]) {
      const abgleich = patchGegenServerstand(AUSGANG, plan.patch, liste, "biz-1");
      expect(abgleich.ok).toBe(false);
      if (!abgleich.ok) expect(abgleich.fehler).toMatch(/^Nicht gespeichert/);
    }
  });

  it("ohne Öffnungszeiten im Patch bleibt der Patch unverändert", () => {
    const abgleich = patchGegenServerstand(AUSGANG, { name: "Haus Töller am Ring" }, [SERVER], "biz-1");
    expect(abgleich).toMatchObject({ ok: true, patch: { name: "Haus Töller am Ring" }, uebrigeTageNeuer: false });
  });
});

describe("zeitenEinmischen / betriebAusListe", () => {
  it("unangefasste Tage vom Server, auch ein am Server gelöschter Tag bleibt gelöscht", () => {
    const zu = { closed: true as const };
    expect(
      zeitenEinmischen({ monday: zu, sunday: zu }, { monday: zu, sunday: { closed: false, open: "10:00", close: "14:00" } }, { tuesday: zu }),
    ).toEqual({ tuesday: zu, sunday: { closed: false, open: "10:00", close: "14:00" } });
  });

  it("findet den Betrieb nur mit passender Kennung und Namen", () => {
    const v = { id: "biz-1", name: "Haus Töller", timezone: "Europe/Berlin", tags: [] };
    expect(betriebAusListe([{ id: "biz-0", name: "Alt" }, v], "biz-1")).toBe(v);
    expect(betriebAusListe([{ id: "biz-1", name: "" }], "biz-1")).toBeNull();
    expect(betriebAusListe(v, "biz-1")).toBeNull();
  });
});

/** Die Woche, die `AUSGANG`-Zeilen bedeuten - über dieselbe Rückrichtung wie der Screen. */
function oeffnungszeitenWerte(formular: ProfilFormular) {
  const r = oeffnungszeitenAusZeilen(formular.hours);
  if (!r.ok) throw new Error("Zeilen erwartet");
  return r.werte;
}

describe("profilAusAntwort", () => {
  it("übernimmt nur die Antwort für genau diesen Betrieb", () => {
    const antwort = { id: "biz-1", name: "Haus Töller", description: "Kölsch.", timezone: "Europe/Berlin", tags: [] };
    expect(profilAusAntwort(antwort, "biz-1")).toMatchObject({ name: "Haus Töller", bio: "Kölsch." });
    expect(profilAusAntwort(antwort, "biz-2")).toBeNull();
    expect(profilAusAntwort({ id: "biz-1" }, "biz-1")).toBeNull();
    expect(profilAusAntwort("<html>", "biz-1")).toBeNull();
    expect(profilAusAntwort(undefined, "biz-1")).toBeNull();
  });
});

describe("speicherFehlerText", () => {
  it("nennt die Aushilfe beim Namen", () => {
    expect(speicherFehlerText(new ApiError(403, "/venues/b", "nur_inhaber", { error: "nur_inhaber" }))).toBe(
      "Nur der Inhaber kann das Profil ändern",
    );
  });

  it("jede andere Lage sagt ausdrücklich: nicht gespeichert", () => {
    const faelle = [
      new ApiError(401, "/venues/b", "Nicht angemeldet", { error: "Nicht angemeldet" }),
      new ApiError(403, "/venues/b", "Kein Zugriff", { error: "Kein Zugriff auf diesen Betrieb" }),
      new ApiError(422, "/venues/b", "Ungültige Eingabe", { error: "Ungültige Eingabe", issues: [] }),
      new ApiError(500, "/venues/b", "boom"),
      new TypeError("Network request failed"),
      new Error("Request-Timeout"),
    ];
    for (const f of faelle) expect(speicherFehlerText(f)).toMatch(/^Nicht gespeichert/);
    // Keine englische Rohmeldung auf dem Bildschirm.
    expect(speicherFehlerText(new TypeError("Network request failed"))).not.toContain("Network");
  });

  it("422 nennt die abgelehnten Felder - und erkennt einen Server ohne description", () => {
    expect(
      speicherFehlerText(
        new ApiError(422, "/venues/b", "Ungültige Eingabe", {
          error: "Ungültige Eingabe",
          issues: [{ code: "too_big", path: ["description"] }, { code: "invalid_string", path: ["openingHours", "monday", "open"] }],
        }),
      ),
    ).toBe("Nicht gespeichert - Beschreibung, Öffnungszeiten vom Server abgelehnt.");
    expect(
      speicherFehlerText(
        new ApiError(422, "/venues/b", "Ungültige Eingabe", {
          error: "Ungültige Eingabe",
          issues: [{ code: "unrecognized_keys", keys: ["description"], path: [] }],
        }),
      ),
    ).toContain("nimmt die Beschreibung noch nicht an");
  });
});

describe("googleKarte", () => {
  const bericht = {} as VenuePresence["bericht"];
  const google = {
    placeId: "p1",
    name: "Haus Töller",
    adresse: "Weyerstraße 96, 50676 Köln",
    reviewCount: 10,
    bewertungen: [],
    fotos: [],
    fotoAnzahl: 0,
    status: "OPERATIONAL",
    telefon: "0221 2589316",
    mapsUrl: "https://maps.google.com/?cid=1",
    oeffnungszeiten: { sunday: { closed: true } },
  } as NonNullable<VenuePresence["google"]>;

  it("mit Eintrag: lesend, Zeiten als Zeilen, Link zum Maps-Eintrag", () => {
    const karte = googleKarte({ status: "bereit", google, bericht }, false);
    expect(karte).toMatchObject({
      art: "eintrag",
      link: "https://maps.google.com/?cid=1",
      zeilen: [{ id: "sunday", label: "Sonntag", value: "Geschlossen", closed: true }],
    });
    // Auch während eines Auffrischens bleibt der bekannte Eintrag stehen.
    expect(googleKarte({ status: "bereit", google, bericht }, true).art).toBe("eintrag");
    // Ohne Maps-Link: das Unternehmensprofil.
    expect(googleKarte({ status: "bereit", google: { ...google, mapsUrl: undefined }, bericht }, false)).toMatchObject({
      link: GOOGLE_BUSINESS_URL,
    });
  });

  it("ohne Eintrag sagt sie, warum - und zeigt nie Beispieldaten", () => {
    expect(googleKarte(null, true)).toEqual({ art: "laedt" });
    expect(googleKarte(null, false)).toMatchObject({ art: "leer", text: expect.stringContaining("noch nicht abgerufen") });
    expect(googleKarte({ status: "nicht_gefunden", bericht }, false)).toMatchObject({
      art: "leer",
      text: expect.stringContaining("keinen passenden Eintrag"),
    });
    expect(googleKarte({ status: "kein_schluessel", bericht }, false)).toMatchObject({ art: "leer" });
    expect(googleKarte({ status: "fehler", hinweis: "Google antwortet nicht.", bericht }, false)).toMatchObject({
      text: "Google antwortet nicht.",
    });
  });
});

describe("Instagram-Verweis", () => {
  it("liest den Kontonamen aus URL oder @-Form, erfindet keinen", () => {
    expect(instagramKonto("https://www.instagram.com/haustoeller/")).toBe("@haustoeller");
    expect(instagramKonto("@haus.toeller")).toBe("@haus.toeller");
    expect(instagramKonto("https://www.instagram.com/p/Cx123/")).toBeNull();
    expect(instagramKonto("haustoeller")).toBeNull();
    expect(instagramKonto(undefined)).toBeNull();
    expect(instagramUrl("@haustoeller")).toBe("https://www.instagram.com/haustoeller/");
    expect(instagramUrl("https://www.instagram.com/haustoeller/")).toBe("https://www.instagram.com/haustoeller/");
    expect(instagramUrl("haustoeller")).toBeNull();
  });
});
