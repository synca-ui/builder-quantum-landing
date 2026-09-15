// @vitest-environment node
/**
 * Google Places ohne Freigabe (server/maitr/praesenz/places.ts).
 *
 * Drei Dinge entscheiden, ob der Präsenzbericht stimmt oder einem Betrieb die
 * Bewertungen eines fremden anhängt:
 *
 *  1. Die KANDIDATENWAHL. Google liefert zu "Haus Töller, Köln" auch Nachbarn und
 *     Namensvettern. Ein falscher Treffer ist schlimmer als keiner - der Wirt
 *     sähe fremde Sterne und fremde Kritik als seine.
 *  2. Die ÖFFNUNGSZEITEN. Google zählt Tage ab Sonntag, die App ab Montag; eine
 *     Nachtbar schließt nach Mitternacht. Ein Tag Versatz oder ein verlorenes
 *     Nachtfenster erzeugt einen "Öffnungszeiten weichen ab"-Hebel, der nicht
 *     stimmt.
 *  3. Der SCHLÜSSEL. Er darf nur im Header reisen. Stünde er in einer
 *     gespeicherten Fotoadresse, läge er in der Datenbank und in jeder
 *     App-Antwort - und damit offen im Netz (das Repo ist öffentlich, die App
 *     auch).
 *
 * Kein Netz: `suchePlace` bekommt ein Fake-`fetch`, das jeden Aufruf mitschreibt.
 */
import { describe, expect, it } from "vitest";
import {
  MAX_FOTOS,
  PLACES_FIELD_MASK,
  googleEintragAus,
  hatOrtsbeleg,
  namensNaehe,
  suchePlace,
  waehleKandidat,
  zeitenAusPerioden,
  type PlacesSuche,
  type RohPlace,
} from "../maitr/praesenz/places";
import type { FetchLike } from "@maitr/core/integrations";

const SCHLUESSEL = "AIzaSy-TEST-SCHLUESSEL-geheim";

/** Haus Töller in Köln-Neustadt-Süd - die Suche, wie Maitr sie aus dem Betrieb baut. */
const SUCHE: PlacesSuche = {
  name: "Haus Töller",
  adresse: "Weyerstraße 96, 50676 Köln",
  postalCode: "50676",
  lat: 50.9311,
  lng: 6.9446,
};

const TOELLER: RohPlace = {
  id: "ChIJ-toeller",
  displayName: { text: "Haus Töller", languageCode: "de" },
  formattedAddress: "Weyerstraße 96, 50676 Köln, Deutschland",
  location: { latitude: 50.9313, longitude: 6.9441 },
};

/* ── Kandidatenwahl ─────────────────────────────────────────────────────── */

describe("waehleKandidat", () => {
  it("nimmt den Treffer, bei dem Name und PLZ passen - auch wenn Google ihn nicht zuerst nennt", () => {
    const nachbar: RohPlace = {
      id: "ChIJ-frueh",
      displayName: { text: "Früh am Dom" },
      formattedAddress: "Am Hof 12-18, 50667 Köln, Deutschland",
    };
    const treffer = waehleKandidat([nachbar, TOELLER], { name: SUCHE.name, postalCode: "50676" });
    expect(treffer?.id).toBe("ChIJ-toeller");
  });

  it("nimmt einen Namensvetter in einer anderen Stadt nicht, wenn der eigene Eintrag daneben steht", () => {
    const muenchen: RohPlace = {
      id: "ChIJ-muenchen",
      displayName: { text: "Haus Töller" },
      formattedAddress: "Sendlinger Straße 5, 80331 München, Deutschland",
      location: { latitude: 48.1351, longitude: 11.582 },
    };
    // München zuerst: Die Reihenfolge von Google darf nicht entscheiden.
    expect(waehleKandidat([muenchen, TOELLER], SUCHE)?.id).toBe("ChIJ-toeller");
  });

  /*
   * ANLASS (Prüfbefund, behoben 15.09.2026): Die Schwelle war "zwei Punkte" aus
   * Name, PLZ und Nähe in beliebiger Mischung. Der Name allein brachte zwei, die
   * PLZ allein ebenfalls. Kannte Google den eigenen Betrieb NICHT (der häufige Fall
   * bei neuen Betrieben), wurde der Münchner Namensvetter oder der Nachbar mit
   * gleicher PLZ genommen - mit fremden Bewertungen, Fotos und Öffnungszeiten.
   * Jetzt ist der Name Pflicht UND ein Ortsbeleg (PLZ oder ≤ 3 km).
   */
  it("nimmt keinen Namensvetter in einer anderen Stadt, auch wenn er der einzige Treffer ist", () => {
    const muenchen: RohPlace = {
      id: "ChIJ-muenchen",
      displayName: { text: "Haus Töller" },
      formattedAddress: "Sendlinger Straße 5, 80331 München, Deutschland",
      location: { latitude: 48.1351, longitude: 11.582 },
    };
    expect(waehleKandidat([muenchen], SUCHE)).toBeNull();
  });

  it("nimmt keinen fremden Betrieb, nur weil die PLZ passt", () => {
    const nachbar: RohPlace = {
      id: "ChIJ-lommerzheim",
      displayName: { text: "Brauerei zur Malzmühle" },
      formattedAddress: "Heumarkt 6, 50676 Köln, Deutschland",
    };
    expect(waehleKandidat([nachbar], { name: "Haus Töller", postalCode: "50676" })).toBeNull();
  });

  it("nimmt keinen Nachbarn, der nur ein Allerweltswort teilt - auch nicht 150 m entfernt mit gleicher PLZ", () => {
    // Vorher: "Café" wurde zu "caf", ein Drittel Namensnähe (1 Punkt) plus Nähe
    // (1 Punkt) = Treffer. Café Goldstück bekam die Sterne des Extrablatts.
    const extrablatt: RohPlace = {
      id: "ChIJ-extrablatt",
      displayName: { text: "Café Extrablatt" },
      formattedAddress: "Venloer Straße 400, 50825 Köln, Deutschland",
      location: { latitude: 50.9496, longitude: 6.9161 },
    };
    const goldstueck = { name: "Café Goldstück Ehrenfeld", postalCode: "50825", lat: 50.9500, lng: 6.9180 };
    expect(waehleKandidat([extrablatt], goldstueck)).toBeNull();

    // Artikel zählen ebenso wenig: "zur" verbindet Malzmühle und Linde nicht.
    const linde: RohPlace = {
      id: "ChIJ-linde",
      displayName: { text: "Gasthaus zur Linde" },
      formattedAddress: "Heumarkt 20, 50667 Köln, Deutschland",
    };
    expect(waehleKandidat([linde], { name: "Brauhaus zur Malzmühle", postalCode: "50667" })).toBeNull();
  });

  it("nimmt den eigenen Eintrag auch allein über die Nähe, ohne PLZ", () => {
    const { formattedAddress: _ohneAdresse, ...ohneAdresse } = TOELLER;
    expect(waehleKandidat([ohneAdresse], { name: "Haus Töller", lat: SUCHE.lat, lng: SUCHE.lng })?.id).toBe(
      "ChIJ-toeller",
    );
  });

  it("nimmt einen Umlaut-/Tippfehler im Namen, wenn die PLZ passt", () => {
    // "Goldstueck" = "Goldstück"; "Café" zählt nicht, "Ehrenfeld" fehlt bei Google -
    // Namensnähe ein halb. Der Name trägt, die PLZ ist der nötige Ortsbeleg.
    const goldstueck: RohPlace = {
      id: "ChIJ-goldstueck",
      displayName: { text: "Café Goldstück" },
      formattedAddress: "Venloer Straße 412, 50825 Köln, Deutschland",
    };
    const suche = { name: "Café Goldstueck Ehrenfeld" };
    expect(waehleKandidat([goldstueck], { ...suche, postalCode: "50825" })?.id).toBe("ChIJ-goldstueck");
    // Gegenprobe: Derselbe Tippfehler mit fremder PLZ reicht nicht.
    expect(waehleKandidat([goldstueck], { ...suche, postalCode: "10115" })).toBeNull();
  });

  it("liest die PLZ auch aus der Adresse, wenn das Feld postalCode fehlt", () => {
    // Ohne Koordinaten ist die PLZ der einzige mögliche Ortsbeleg - der Treffer
    // hängt also daran, dass die Adresszeile gelesen wird. Die Gegenprobe mit
    // fremder PLZ zeigt, dass der Name allein nicht reicht.
    const goldstueck: RohPlace = {
      id: "ChIJ-goldstueck",
      displayName: { text: "Café Goldstück" },
      formattedAddress: "Venloer Straße 412, 50825 Köln, Deutschland",
    };
    const name = "Café Goldstueck Ehrenfeld";
    expect(waehleKandidat([goldstueck], { name, adresse: "Venloer Straße 412, 50825 Köln" })?.id).toBe(
      "ChIJ-goldstueck",
    );
    expect(waehleKandidat([goldstueck], { name, adresse: "Hauptstraße 1, 10115 Berlin" })).toBeNull();
  });

  it("wertet Koordinaten-Nähe als Beleg: von zwei gleichnamigen Einträgen gewinnt der nahe", () => {
    const fern: RohPlace = {
      id: "ChIJ-fern",
      displayName: { text: "Haus Töller" },
      formattedAddress: "Hauptstraße 1, Bonn",
      location: { latitude: 50.7374, longitude: 7.0982 },
    };
    const nah: RohPlace = { ...TOELLER, id: "ChIJ-nah", formattedAddress: "Weyerstraße 96, Köln" };
    const mitKoordinaten = { name: "Haus Töller", lat: SUCHE.lat, lng: SUCHE.lng };
    expect(waehleKandidat([fern, nah], mitKoordinaten)?.id).toBe("ChIJ-nah");
    // Gegenprobe: Ohne Koordinaten und ohne PLZ gibt es keinen Ortsbeleg - kein Treffer.
    expect(waehleKandidat([fern, nah], { name: "Haus Töller" })).toBeNull();
  });

  it("namensNaehe: Allerweltswörter zählen nicht, Umlaut und ae/oe/ue sind gleich", () => {
    expect(namensNaehe("Café Goldstück Ehrenfeld", "Café Extrablatt")).toBe(0);
    expect(namensNaehe("Restaurant Adria", "Restaurant Zeus")).toBe(0);
    expect(namensNaehe("Haus Toeller", "Haus Töller")).toBe(1);
    expect(namensNaehe("CAFÉ GOLDSTÜCK", "Cafe Goldstueck")).toBe(1);
    // Zerlegtes ü (u + U+0308), wie es macOS-Eingaben liefern.
    expect(namensNaehe("Goldstu\u0308ck", "Goldstück")).toBe(1);
    // Ein Name NUR aus Allerweltswörtern behält seine Wörter - sonst träfe er nie.
    expect(namensNaehe("Café Bar", "Café Bar")).toBe(1);
  });

  it("überspringt Treffer ohne id", () => {
    const { id: _ohneId, ...ohneId } = TOELLER;
    expect(waehleKandidat([ohneId], SUCHE)).toBeNull();
  });
});

/* ── Öffnungszeiten ─────────────────────────────────────────────────────── */

describe("zeitenAusPerioden", () => {
  it("übersetzt Googles Tag 0 in sunday und Tag 1 in monday", () => {
    const zeiten = zeitenAusPerioden([
      { open: { day: 0, hour: 11, minute: 0 }, close: { day: 0, hour: 15, minute: 0 } },
      { open: { day: 1, hour: 17, minute: 30 }, close: { day: 1, hour: 23, minute: 0 } },
    ]);
    expect(zeiten?.sunday).toEqual({ closed: false, open: "11:00", close: "15:00" });
    expect(zeiten?.monday).toEqual({ closed: false, open: "17:30", close: "23:00" });
  });

  /*
   * ANLASS (Prüfbefund, behoben 15.09.2026): Mittag und Abend wurden zu einem
   * Fenster von der ersten Öffnung bis zur letzten Schließung. Aus 11:30-14:30 und
   * 17:30-23:00 wurde 11:30-23:00 - "Jetzt geöffnet" um 15:30, buchbare Uhrzeiten
   * mitten in der Pause. Die App kennt je Tag nur ein Fenster; ein Tag mit Pause
   * ist deshalb unbekannt, nicht geöffnet.
   */
  it("liefert für einen Tag mit Mittag und Abend KEINEN Eintrag (unbekannt) - die übrigen Tage bleiben", () => {
    const zeiten = zeitenAusPerioden([
      // Abend zuerst - die Reihenfolge der Perioden darf keine Rolle spielen.
      { open: { day: 2, hour: 17, minute: 30 }, close: { day: 2, hour: 23, minute: 0 } },
      { open: { day: 2, hour: 11, minute: 30 }, close: { day: 2, hour: 14, minute: 30 } },
      { open: { day: 3, hour: 17, minute: 30 }, close: { day: 3, hour: 23, minute: 0 } },
    ]);
    expect(zeiten).not.toHaveProperty("tuesday");
    expect(zeiten?.wednesday).toEqual({ closed: false, open: "17:30", close: "23:00" });
    // Ein Tag ganz ohne Periode bleibt ein Ruhetag - nur der Tag mit Pause ist offen.
    expect(zeiten?.monday).toEqual({ closed: true });

    // Auch drei Perioden an einem Tag: unbekannt, nicht Ruhetag.
    const dreimal = zeitenAusPerioden([
      { open: { day: 4, hour: 8, minute: 0 }, close: { day: 4, hour: 10, minute: 0 } },
      { open: { day: 4, hour: 12, minute: 0 }, close: { day: 4, hour: 14, minute: 0 } },
      { open: { day: 4, hour: 18, minute: 0 }, close: { day: 4, hour: 22, minute: 0 } },
    ]);
    expect(dreimal).not.toHaveProperty("thursday");
    expect(dreimal?.friday).toEqual({ closed: true });
  });

  it("behält eine Nacht über Mitternacht (18:00-01:00) am Tag ihrer Öffnung", () => {
    const nurNacht = zeitenAusPerioden([
      { open: { day: 6, hour: 18, minute: 0 }, close: { day: 0, hour: 1, minute: 0 } },
    ]);
    expect(nurNacht?.saturday).toEqual({ closed: false, open: "18:00", close: "01:00" });
    // Die Nacht von Samstag macht den Sonntag nicht zum Tag mit Pause.
    expect(nurNacht?.sunday).toEqual({ closed: true });

    // Mittag plus Nacht am selben Tag: wieder unbekannt statt 12:00-01:00.
    const mitMittag = zeitenAusPerioden([
      { open: { day: 5, hour: 12, minute: 0 }, close: { day: 5, hour: 14, minute: 30 } },
      { open: { day: 5, hour: 18, minute: 0 }, close: { day: 6, hour: 1, minute: 0 } },
    ]);
    expect(mitMittag).not.toHaveProperty("friday");
  });

  it("führt einen Tag ohne Periode als Ruhetag - sobald Google überhaupt Zeiten nennt", () => {
    const zeiten = zeitenAusPerioden([
      { open: { day: 3, hour: 17, minute: 0 }, close: { day: 3, hour: 23, minute: 0 } },
    ]);
    expect(zeiten?.wednesday).toEqual({ closed: false, open: "17:00", close: "23:00" });
    for (const tag of ["monday", "tuesday", "thursday", "friday", "saturday", "sunday"] as const) {
      expect(zeiten?.[tag]).toEqual({ closed: true });
    }
  });

  it("macht aus 'rund um die Uhr' (Sonntag 0:00 ohne Ende) 00:00-23:59 an allen sieben Tagen", () => {
    const zeiten = zeitenAusPerioden([{ open: { day: 0, hour: 0, minute: 0 } }]);
    expect(Object.keys(zeiten ?? {})).toHaveLength(7);
    for (const tag of Object.values(zeiten ?? {})) {
      expect(tag).toEqual({ closed: false, open: "00:00", close: "23:59" });
    }
  });

  it("liefert nichts, wenn Google keine Perioden nennt - kein Tag wird zum erfundenen Ruhetag", () => {
    expect(zeitenAusPerioden(undefined)).toBeUndefined();
    expect(zeitenAusPerioden([])).toBeUndefined();
  });
});

/* ── Normalisierung ─────────────────────────────────────────────────────── */

describe("googleEintragAus", () => {
  const VOLL: RohPlace = {
    ...TOELLER,
    rating: 4.6,
    userRatingCount: 812,
    googleMapsUri: "https://maps.google.com/?cid=123",
    websiteUri: " https://www.haus-toeller.de/ ",
    nationalPhoneNumber: "0221 2589316",
    businessStatus: "OPERATIONAL",
    priceLevel: "PRICE_LEVEL_MODERATE",
    editorialSummary: { text: "Traditionelles Brauhaus mit Kölsch vom Fass." },
    primaryTypeDisplayName: { text: "Brauhaus" },
    outdoorSeating: true,
    reservable: false,
    servesVegetarianFood: true,
    photos: [{ name: "places/ChIJ-toeller/photos/a" }, { name: "places/ChIJ-toeller/photos/b" }],
    reviews: [
      {
        name: "places/ChIJ-toeller/reviews/alt",
        rating: 5,
        text: { text: "Bestes Kölsch der Stadt." },
        authorAttribution: { displayName: "Anna K." },
        publishTime: "2026-06-01T18:00:00Z",
        relativePublishTimeDescription: "vor 3 Monaten",
      },
      {
        name: "places/ChIJ-toeller/reviews/neu",
        rating: 2,
        // Nur Originaltext (z. B. englische Bewertung ohne Übersetzung).
        originalText: { text: "Waited 40 minutes for a beer." },
        authorAttribution: { displayName: "   " },
        publishTime: "2026-09-10T20:00:00Z",
        googleMapsUri: "https://maps.google.com/review/neu",
      },
      {
        name: "places/ChIJ-toeller/reviews/mitte",
        rating: 4,
        text: { text: "Gemütlich." },
        authorAttribution: { displayName: "Ben" },
        publishTime: "2026-08-01T12:00:00Z",
      },
      // Ohne Datum lässt sich eine Bewertung weder sortieren noch datieren - raus.
      { name: "places/ChIJ-toeller/reviews/kaputt", rating: 1, text: { text: "?" } },
    ],
  };

  it("sortiert die Bewertungen neueste zuerst und verwirft solche ohne Datum", () => {
    const eintrag = googleEintragAus(VOLL);
    expect(eintrag.bewertungen.map((b) => b.id)).toEqual([
      "places/ChIJ-toeller/reviews/neu",
      "places/ChIJ-toeller/reviews/mitte",
      "places/ChIJ-toeller/reviews/alt",
    ]);
  });

  it("nimmt für einen leeren Autor 'Google-Nutzer' und fällt auf den Originaltext zurück", () => {
    const [neu] = googleEintragAus(VOLL).bewertungen;
    expect(neu).toEqual({
      id: "places/ChIJ-toeller/reviews/neu",
      autor: "Google-Nutzer",
      rating: 2,
      text: "Waited 40 minutes for a beer.",
      createdAt: "2026-09-10T20:00:00Z",
      url: "https://maps.google.com/review/neu",
    });
    const alt = googleEintragAus(VOLL).bewertungen[2];
    expect(alt.autor).toBe("Anna K.");
    expect(alt.relativ).toBe("vor 3 Monaten");
  });

  it("übernimmt Preisniveau, Attribute und Kontaktdaten", () => {
    const eintrag = googleEintragAus(VOLL, ["https://lh3.googleusercontent.com/p/a"]);
    expect(eintrag).toMatchObject({
      placeId: "ChIJ-toeller",
      name: "Haus Töller",
      adresse: "Weyerstraße 96, 50676 Köln, Deutschland",
      rating: 4.6,
      reviewCount: 812,
      fotos: ["https://lh3.googleusercontent.com/p/a"],
      fotoAnzahl: 2,
      telefon: "0221 2589316",
      website: "https://www.haus-toeller.de/",
      mapsUrl: "https://maps.google.com/?cid=123",
      status: "OPERATIONAL",
      preisniveau: 2,
      beschreibung: "Traditionelles Brauhaus mit Kölsch vom Fass.",
      aussenplaetze: true,
      reservierbar: false,
      vegetarisch: true,
      typ: "Brauhaus",
      lat: 50.9313,
      lng: 6.9441,
    });
    expect(googleEintragAus({ ...VOLL, priceLevel: "PRICE_LEVEL_VERY_EXPENSIVE" }).preisniveau).toBe(4);
  });

  it("lässt fehlende Felder weg, statt sie mit Leerwerten zu füllen", () => {
    const eintrag = googleEintragAus({ id: "ChIJ-karg", displayName: { text: "Kiosk" } });
    expect(eintrag).toEqual({
      placeId: "ChIJ-karg",
      name: "Kiosk",
      reviewCount: 0,
      bewertungen: [],
      fotos: [],
      fotoAnzahl: 0,
      status: "UNBEKANNT",
    });
    // Ausdrücklich: "false" bei Außenplätzen wäre eine Aussage, die Google nie gemacht hat.
    expect(eintrag).not.toHaveProperty("aussenplaetze");
    expect(eintrag).not.toHaveProperty("rating");
    expect(eintrag).not.toHaveProperty("oeffnungszeiten");
    // Unbekannte Preisstufe (PRICE_LEVEL_FREE) ist kein Preisniveau 1-4.
    expect(googleEintragAus({ id: "x", priceLevel: "PRICE_LEVEL_FREE" })).not.toHaveProperty("preisniveau");
  });
});

/* ── Abruf mit Fake-fetch ───────────────────────────────────────────────── */

interface Aufruf {
  url: string;
  method?: string;
  headers: Record<string, string>;
  body?: string;
}

function antwort(ok: boolean, status: number, body: unknown) {
  return {
    ok,
    status,
    json: async () => {
      if (body instanceof Error) throw body;
      return body;
    },
  };
}

/**
 * Ein `fetch`, das mitschreibt und je Adresse antwortet. `fotoFehler` nennt Foto-
 * Namen, deren Auflösung wirft (Netz) bzw. mit HTTP 500 scheitert.
 */
function fakeFetch(opts: {
  places: RohPlace[] | { fehler: { status: number; body: unknown } };
  fotoWirft?: string[];
  fotoHttp500?: string[];
}) {
  const aufrufe: Aufruf[] = [];
  const fetch: FetchLike = async (url, init) => {
    aufrufe.push({ url, method: init?.method, headers: init?.headers ?? {}, body: init?.body });
    if (url.endsWith("/places:searchText")) {
      if ("fehler" in opts.places) return antwort(false, opts.places.fehler.status, opts.places.fehler.body);
      return antwort(true, 200, { places: opts.places });
    }
    const foto = url.match(/v1\/(places\/[^/]+\/photos\/[^/]+)\/media/)?.[1];
    if (foto) {
      if (opts.fotoWirft?.includes(foto)) throw new Error("ECONNRESET");
      if (opts.fotoHttp500?.includes(foto)) return antwort(false, 500, {});
      const kurz = foto.split("/").pop();
      return antwort(true, 200, { name: `${foto}/media`, photoUri: `https://lh3.googleusercontent.com/place-photos/${kurz}=s800` });
    }
    throw new Error(`Unerwartete Adresse im Test: ${url}`);
  };
  return { fetch, aufrufe };
}

const fotos = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `places/ChIJ-toeller/photos/f${i}` }));

describe("suchePlace", () => {
  it("sucht per POST places:searchText, Schlüssel und Feldmaske nur im Header", async () => {
    const { fetch, aufrufe } = fakeFetch({ places: [{ ...TOELLER, rating: 4.6, userRatingCount: 812 }] });
    const ergebnis = await suchePlace(SUCHE, SCHLUESSEL, fetch);

    expect(ergebnis.status).toBe("bereit");
    const suche = aufrufe[0];
    expect(suche.url).toBe("https://places.googleapis.com/v1/places:searchText");
    expect(suche.method).toBe("POST");
    expect(suche.headers["X-Goog-Api-Key"]).toBe(SCHLUESSEL);
    expect(suche.headers["X-Goog-FieldMask"]).toBe(PLACES_FIELD_MASK);
    // Die Maske ist die Kostenbremse - ein "*" würde die teuerste SKU abrechnen.
    expect(suche.headers["X-Goog-FieldMask"]).not.toContain("*");

    const body = JSON.parse(suche.body ?? "{}");
    expect(body).toMatchObject({
      textQuery: "Haus Töller, Weyerstraße 96, 50676 Köln",
      languageCode: "de",
      regionCode: "DE",
      locationBias: { circle: { center: { latitude: SUCHE.lat, longitude: SUCHE.lng } } },
    });
    expect(JSON.stringify(body)).not.toContain(SCHLUESSEL);
  });

  it("löst höchstens fünf Fotos auf, speichert nur die schlüsselfreie photoUri", async () => {
    const { fetch, aufrufe } = fakeFetch({ places: [{ ...TOELLER, photos: fotos(8) }] });
    const ergebnis = await suchePlace(SUCHE, SCHLUESSEL, fetch);
    if (ergebnis.status !== "bereit") throw new Error("erwartet: bereit");

    const fotoAufrufe = aufrufe.filter((a) => a.url.includes("/media"));
    expect(fotoAufrufe).toHaveLength(MAX_FOTOS);
    for (const a of fotoAufrufe) {
      expect(a.headers["X-Goog-Api-Key"]).toBe(SCHLUESSEL);
      // Ohne skipHttpRedirect käme ein 302 statt der photoUri zurück.
      expect(a.url).toContain("skipHttpRedirect=true");
    }
    expect(ergebnis.eintrag.fotos).toEqual([0, 1, 2, 3, 4].map((i) => `https://lh3.googleusercontent.com/place-photos/f${i}=s800`));
    // Google nennt acht - das bleibt als Anzahl erhalten, auch wenn nur fünf geladen werden.
    expect(ergebnis.eintrag.fotoAnzahl).toBe(8);

    // Der Schlüssel steht in KEINER aufgerufenen Adresse und nirgends im Ergebnis,
    // das gespeichert und an die App ausgeliefert wird.
    for (const a of aufrufe) {
      expect(a.url).not.toContain(SCHLUESSEL);
      expect(a.url).not.toMatch(/[?&]key=/);
    }
    expect(JSON.stringify(ergebnis)).not.toContain(SCHLUESSEL);
  });

  it("meldet nicht_gefunden bei unpassenden Treffern - ohne Fotos zu bezahlen", async () => {
    const fremd: RohPlace = {
      id: "ChIJ-fremd",
      displayName: { text: "Pizzeria Napoli" },
      formattedAddress: "Venloer Straße 200, 50823 Köln",
      photos: fotos(3),
    };
    const { fetch, aufrufe } = fakeFetch({ places: [fremd] });
    const ergebnis = await suchePlace({ name: "Haus Töller", postalCode: "50676" }, SCHLUESSEL, fetch);
    expect(ergebnis).toEqual({ status: "nicht_gefunden" });
    expect(aufrufe.filter((a) => a.url.includes("/media"))).toHaveLength(0);
  });

  it("sucht ohne PLZ und Koordinaten gar nicht erst - kein bezahlter Abruf, kein 'nicht gefunden'", async () => {
    // Anlass: Ein nur in der App angelegter Betrieb (POST /venues kennt keine
    // Adresse) bezahlte bei jedem Lauf eine Suche, deren Treffer waehleKandidat
    // mangels Ortsbeleg ausnahmslos verwarf - selbst den eigenen Eintrag.
    const { fetch, aufrufe } = fakeFetch({ places: [TOELLER] });
    await expect(suchePlace({ name: "Haus Töller" }, SCHLUESSEL, fetch)).resolves.toEqual({
      status: "ohne_ortsangabe",
    });
    // Eine Adresszeile ohne PLZ ist ebenso wenig ein Ortsbeleg.
    await expect(
      suchePlace({ name: "Haus Töller", adresse: "Weyerstraße 96, Köln" }, SCHLUESSEL, fetch),
    ).resolves.toEqual({ status: "ohne_ortsangabe" });
    expect(aufrufe).toHaveLength(0);
  });

  it("hatOrtsbeleg: genau dann, wenn waehleKandidat einen Treffer annehmen könnte", () => {
    expect(hatOrtsbeleg({ name: "Haus Töller" })).toBe(false);
    expect(hatOrtsbeleg({ name: "Haus Töller", adresse: "Weyerstraße 96, Köln" })).toBe(false);
    expect(hatOrtsbeleg({ name: "Haus Töller", lat: SUCHE.lat })).toBe(false);
    expect(hatOrtsbeleg({ name: "Haus Töller", postalCode: "50676" })).toBe(true);
    expect(hatOrtsbeleg({ name: "Haus Töller", adresse: "Weyerstraße 96, 50676 Köln" })).toBe(true);
    expect(hatOrtsbeleg({ name: "Haus Töller", lat: SUCHE.lat, lng: SUCHE.lng })).toBe(true);
    // Gegenprobe an der Kandidatenwahl: ohne Ortsbeleg verwirft sie auch den eigenen Eintrag.
    expect(waehleKandidat([TOELLER], { name: "Haus Töller", adresse: "Weyerstraße 96, Köln" })).toBeNull();
    expect(waehleKandidat([TOELLER], { name: "Haus Töller", adresse: "Weyerstraße 96, 50676 Köln" })?.id).toBe(
      "ChIJ-toeller",
    );
  });

  it("meldet nicht_gefunden, wenn Google gar nichts liefert", async () => {
    const { fetch } = fakeFetch({ places: [] });
    await expect(suchePlace(SUCHE, SCHLUESSEL, fetch)).resolves.toEqual({ status: "nicht_gefunden" });
  });

  it("wirft bei HTTP-Fehlern mit Googles Begründung - ein toter Schlüssel ist kein 'nicht gefunden'", async () => {
    const { fetch } = fakeFetch({
      places: {
        fehler: {
          status: 400,
          body: { error: { code: 400, message: "API key not valid. Please pass a valid API key.", status: "INVALID_ARGUMENT" } },
        },
      },
    });
    await expect(suchePlace(SUCHE, SCHLUESSEL, fetch)).rejects.toThrow(
      "Google Places HTTP 400: API key not valid. Please pass a valid API key.",
    );
  });

  it("wirft auch ohne JSON-Fehlerrumpf, dann nur mit dem Status", async () => {
    const { fetch } = fakeFetch({ places: { fehler: { status: 503, body: new SyntaxError("Unexpected token <") } } });
    await expect(suchePlace(SUCHE, SCHLUESSEL, fetch)).rejects.toThrow(/^Google Places HTTP 503$/);
  });

  it("verwirft den Eintrag nicht, wenn einzelne Fotos scheitern", async () => {
    const { fetch } = fakeFetch({
      places: [{ ...TOELLER, rating: 4.6, userRatingCount: 812, photos: fotos(4) }],
      fotoWirft: ["places/ChIJ-toeller/photos/f1"],
      fotoHttp500: ["places/ChIJ-toeller/photos/f2"],
    });
    const ergebnis = await suchePlace(SUCHE, SCHLUESSEL, fetch);
    if (ergebnis.status !== "bereit") throw new Error("erwartet: bereit");
    expect(ergebnis.eintrag.rating).toBe(4.6);
    expect(ergebnis.eintrag.fotos).toEqual([
      "https://lh3.googleusercontent.com/place-photos/f0=s800",
      "https://lh3.googleusercontent.com/place-photos/f3=s800",
    ]);
    expect(ergebnis.eintrag.fotoAnzahl).toBe(4);
  });
});
