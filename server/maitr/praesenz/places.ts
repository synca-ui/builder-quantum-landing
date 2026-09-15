/**
 * Google Places API (New) - der Google-Maps-Eintrag eines Betriebs OHNE Freigabe.
 *
 * Was Places ohne OAuth hergibt: Schnitt und Anzahl der Bewertungen, bis zu fünf
 * "relevanteste" Bewertungen, Fotos, Öffnungszeiten, Telefon, Website, Status
 * (geöffnet / geschlossen), Attribute wie Außenplätze. Was es NICHT hergibt:
 * Inhaberantworten, Profilaufrufe, die vollständige Bewertungsliste - dafür
 * bleibt die Business-Profile-API mit Freigabe (packages/core/src/integrations).
 *
 * ZWEI ENDPUNKTE, BEIDE MIT SCHLÜSSEL STATT TOKEN:
 *   POST https://places.googleapis.com/v1/places:searchText   (Textsuche, 1 Aufruf)
 *   GET  https://places.googleapis.com/v1/{foto.name}/media    (je Foto, max. 5)
 * Der Schlüssel geht ausschließlich im Header `X-Goog-Api-Key` raus - nie in
 * einer URL, die gespeichert oder an die App ausgeliefert wird. Die Foto-Adressen
 * werden serverseitig mit `skipHttpRedirect=true` aufgelöst; gespeichert wird die
 * schlüsselfreie `photoUri` (lh3.googleusercontent.com).
 *
 * KOSTEN (Stand 2026): Die Feldmaske unten fällt in die SKU "Text Search
 * (Enterprise + Atmosphere)" - rund 4 Cent je Suche, Fotos ~0,7 Cent je Bild.
 * Deshalb die Drossel in index.ts (zehn Minuten) und der Veraltet-Lauf nur
 * einmal täglich je Betrieb.
 *
 * WARUM NICHT DER n8n-AST: Der Places-Knoten im Deep-Scrape-Flow lief auf der
 * Legacy-API mit einem toten Schlüssel und hat nie Daten geliefert (siehe
 * docs/product/PRAESENZ_WORKFLOW.md). Hier ist die Suche typgeprüft, testbar
 * und nutzt dieselbe Auswertung wie die App.
 */
import type { FetchLike } from "@maitr/core/integrations";
import type {
  GoogleBetriebsstatus,
  GoogleEintrag,
  OeffentlicheBewertung,
} from "@maitr/core/analytics";
import type { Day, OpeningHours } from "@maitr/core/types";
import { DAYS } from "@maitr/core/types";

const PLACES_BASE = "https://places.googleapis.com/v1";

/**
 * Nur die Felder, die die Auswertung liest. Jedes weitere Feld kostet - die
 * Maske ist die Kostenbremse, nicht Beiwerk.
 */
export const PLACES_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.regularOpeningHours",
  "places.businessStatus",
  "places.priceLevel",
  "places.editorialSummary",
  "places.reviews",
  "places.photos",
  "places.outdoorSeating",
  "places.reservable",
  "places.servesVegetarianFood",
  "places.primaryTypeDisplayName",
].join(",");

/** Höchstens so viele Fotos werden aufgelöst (je Foto ein bezahlter Abruf). */
export const MAX_FOTOS = 5;

/** Umkreis der Standort-Bevorzugung, wenn Maitr Koordinaten kennt. */
const BIAS_RADIUS_M = 3000;

/** Was Maitr über den Betrieb weiß, um ihn bei Google zu finden. */
export interface PlacesSuche {
  name: string;
  adresse?: string;
  postalCode?: string;
  lat?: number;
  lng?: number;
}

export type PlacesErgebnis =
  | { status: "bereit"; eintrag: GoogleEintrag }
  | { status: "nicht_gefunden" }
  /** Nicht gesucht: Ohne PLZ und Koordinaten könnte kein Treffer bestehen (`hatOrtsbeleg`). */
  | { status: "ohne_ortsangabe" };

export function placesSchluessel(): string | null {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  return key ? key : null;
}

/* ── Rohform der Antwort (nur, was gelesen wird) ────────────────────────── */

interface RohText {
  text?: string;
  languageCode?: string;
}

interface RohZeitpunkt {
  day?: number;
  hour?: number;
  minute?: number;
}

export interface RohPlace {
  id?: string;
  displayName?: RohText;
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  regularOpeningHours?: { periods?: Array<{ open?: RohZeitpunkt; close?: RohZeitpunkt }> };
  businessStatus?: string;
  priceLevel?: string;
  editorialSummary?: RohText;
  reviews?: Array<{
    name?: string;
    relativePublishTimeDescription?: string;
    rating?: number;
    text?: RohText;
    originalText?: RohText;
    authorAttribution?: { displayName?: string };
    publishTime?: string;
    googleMapsUri?: string;
  }>;
  photos?: Array<{ name?: string }>;
  outdoorSeating?: boolean;
  reservable?: boolean;
  servesVegetarianFood?: boolean;
  primaryTypeDisplayName?: RohText;
}

/* ── Kandidatenwahl ─────────────────────────────────────────────────────── */

/**
 * Wörter, die fast jeder Gastronomie-Name trägt und die deshalb nichts darüber
 * sagen, WELCHER Betrieb gemeint ist - Gattung, Küche, Artikel.
 *
 * ANLASS (Prüfbefund): Die Namensnähe zählte sie mit. "Café Goldstück Ehrenfeld"
 * und "Café Extrablatt" teilten "caf" (das é fiel aus dem Zeichenfilter) - ein
 * Drittel Namensnähe plus 150 m Abstand reichten, und der Betrieb bekam die
 * Sterne, Fotos und Öffnungszeiten des Nachbarn. Ebenso wählte der Präsenz-
 * Workflow über ein gemeinsames "Restaurant" die Website eines anderen
 * Testbetriebs desselben Kontos. Die Einträge stehen in der Form nach
 * `normalisiert` (ä → ae, é → e).
 */
const ALLERWELTSWOERTER = new Set([
  // Gattung
  "restaurant", "restaurante", "ristorante", "trattoria", "osteria", "pizzeria", "cafe", "caffe",
  "kaffee", "coffee", "bar", "bistro", "brasserie", "haus", "gasthaus", "gasthof", "brauhaus",
  "brauerei", "wirtshaus", "gaststaette", "kneipe", "imbiss", "hotel", "pub", "grill", "stube",
  "weinstube", "weinbar", "lounge", "kueche", "baeckerei", "konditorei", "eiscafe",
  "taverna", "taverne", "cantina", "kantine", "diner", "steakhouse", "burger", "doener", "kebab",
  "sushi", "pizza", "tapas", "bier", "biergarten",
  // Artikel und Bindewörter ("Brauhaus zur Malzmühle" / "Gasthaus zur Linde")
  "zum", "zur", "der", "die", "das", "den", "dem", "des", "und", "the", "and", "bei", "von", "vom",
  "alla", "alle", "del", "della", "dei", "las", "los", "les", "chez",
]);

/** Kleinbuchstaben, ä/ö/ü/ß ausgeschrieben, übrige Akzente entfernt ("Café" → "cafe"). */
function normalisiert(text: string): string {
  // NFC zuerst: Ein zerlegtes "u + ¨" (macOS-Eingaben) soll ebenfalls "ue" werden.
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Die unterscheidenden Wörter eines Namens. Besteht ein Name NUR aus
 * Allerweltswörtern ("Café Bar"), bleiben seine Wörter stehen - sonst könnte er
 * nie einen Treffer haben.
 */
function tokens(text: string): Set<string> {
  const alle = normalisiert(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
  const unterscheidend = alle.filter((t) => !ALLERWELTSWOERTER.has(t));
  return new Set(unterscheidend.length ? unterscheidend : alle);
}

/**
 * Anteil der unterscheidenden Namens-Wörter, die im Kandidatennamen wiederkehren
 * (0-1). Umlaute und ihre ae/oe/ue-Schreibweise gelten als gleich
 * ("Goldstueck" = "Goldstück").
 */
export function namensNaehe(gesucht: string, kandidat: string): number {
  const a = tokens(gesucht);
  if (a.size === 0) return 0;
  const b = tokens(kandidat);
  let treffer = 0;
  for (const t of a) if (b.has(t)) treffer++;
  return treffer / a.size;
}

/** Ab dieser Namensnähe gilt ein Name als "derselbe Betrieb" - Places wie Analyse-Jobs. */
export const NAMENSNAEHE_MIN = 0.5;

function entfernungKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** PLZ der Suche: das Feld, sonst die erste fünfstellige Zahl der Adresszeile. */
function plzAus(suche: PlacesSuche): string | undefined {
  return suche.postalCode || suche.adresse?.match(/\b(\d{5})\b/)?.[1];
}

/**
 * Hat die Suche einen Ortsbeleg, an dem `waehleKandidat` einen Treffer festmachen
 * kann - eine PLZ (Feld oder Adresszeile) oder Koordinaten?
 *
 * ANLASS (Prüfbefund zur Kandidatenwahl): Seit ein Treffer IMMER einen Ortsbeleg
 * braucht, verwirft `waehleKandidat` ohne PLZ und Koordinaten jeden Kandidaten -
 * auch den eigenen Eintrag mit voller Namensnähe. Ein Betrieb, der nur in der App
 * angelegt wurde (POST /venues kennt weder Adresse noch PLZ), bezahlte trotzdem
 * bei jedem Lauf eine Textsuche, bekam dauerhaft "nicht_gefunden" samt Hebel
 * "Lege dein Profil an" und verlor eine früher gefundene Place-ID. Ohne Ortsbeleg
 * wird deshalb gar nicht erst gesucht.
 */
export function hatOrtsbeleg(suche: PlacesSuche): boolean {
  return Boolean(plzAus(suche)) || (typeof suche.lat === "number" && typeof suche.lng === "number");
}

/**
 * Den passenden Treffer wählen - oder keinen.
 *
 * Google liefert für "Haus Töller Köln" auch Nachbarn und Namensvettern. Ein
 * Treffer braucht IMMER den Namen (unterscheidende Wörter mindestens zur Hälfte,
 * siehe `namensNaehe`) UND einen Ortsbeleg: Postleitzahl in der Google-Adresse
 * oder Standort innerhalb von drei Kilometern.
 *
 * ANLASS (Prüfbefund): Vorher reichten zwei "Punkte" aus Name, PLZ und Nähe in
 * beliebiger Mischung. Der Name allein brachte schon zwei - kannte Google den
 * eigenen Betrieb nicht (häufig bei neuen), gewann der Münchner Namensvetter.
 * Die PLZ allein brachte ebenfalls zwei - dann der Nachbar im selben Viertel.
 * Ein falscher Treffer ist schlimmer als keiner: Der Wirt sähe fremde Sterne,
 * fremde Kritik und fremde Öffnungszeiten als seine.
 *
 * Unter mehreren gültigen Treffern gewinnt der mit der höheren Namensnähe und
 * den stärkeren Ortsbelegen; bei Gleichstand der, den Google zuerst nennt.
 * Rein, damit sie sich prüfen lässt.
 */
export function waehleKandidat(places: RohPlace[], suche: PlacesSuche): RohPlace | null {
  const plz = plzAus(suche);
  let bester: { place: RohPlace; punkte: number } | null = null;

  for (const place of places) {
    if (!place.id) continue;
    const naehe = namensNaehe(suche.name, place.displayName?.text ?? "");
    if (naehe < NAMENSNAEHE_MIN) continue;
    const plzPasst = Boolean(plz && place.formattedAddress?.includes(plz));
    const nah =
      typeof suche.lat === "number" &&
      typeof suche.lng === "number" &&
      typeof place.location?.latitude === "number" &&
      typeof place.location?.longitude === "number" &&
      entfernungKm(suche.lat, suche.lng, place.location.latitude, place.location.longitude) <= 3;
    if (!plzPasst && !nah) continue;
    const punkte = naehe * 2 + (plzPasst ? 2 : 0) + (nah ? 1 : 0);
    if (!bester || punkte > bester.punkte) bester = { place, punkte };
  }
  return bester?.place ?? null;
}

/* ── Normalisierung ─────────────────────────────────────────────────────── */

function hhmm(z: RohZeitpunkt | undefined, sonst: string): string {
  if (!z || typeof z.hour !== "number") return sonst;
  const h = String(z.hour).padStart(2, "0");
  const m = String(z.minute ?? 0).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Places-Perioden → `OpeningHours` (die enge Form der App).
 *
 * Google zählt Tage ab Sonntag (0), DAYS ab Montag - daher die Verschiebung.
 * Eine Periode über Mitternacht (18:00-01:00) zählt zum Tag ihrer Öffnung.
 *
 * MEHRERE PERIODEN AM TAG (Mittag + Abend) ergeben für diesen Tag KEINEN Eintrag -
 * der Tag gilt als unbekannt. ANLASS (Prüfbefund): Vorher wurden sie zu einem
 * Fenster von der ersten Öffnung bis zur letzten Schließung zusammengezogen. Aus
 * 11:30-14:30 und 17:30-23:00 wurde 11:30-23:00: Die App zeigte um 15:30 "Jetzt
 * geöffnet", die Gastbuchung bot 15:00 bis 16:30 an und trug sie als bestätigt
 * ein, und der Hebel "Öffnungszeiten weichen ab" meldete einen Widerspruch, wenn
 * Maitr korrekt nur den Abend führte. Die App kennt je Tag nur ein Fenster; alle
 * Leser (Geöffnet-Status, Gastbuchung, Abweichungs-Hebel) behandeln einen
 * fehlenden Tag als unbekannt statt als Ruhetag.
 *
 * Tage ohne Periode gelten als Ruhetag - sobald Google überhaupt Zeiten nennt,
 * ist ein fehlender Tag eine Aussage. "Rund um die Uhr" (Sonntag 0:00 ohne Ende)
 * wird zu 00:00-23:59 an allen Tagen.
 */
export function zeitenAusPerioden(
  perioden: Array<{ open?: RohZeitpunkt; close?: RohZeitpunkt }> | undefined,
): OpeningHours | undefined {
  if (!perioden?.length) return undefined;

  const rundUmDieUhr = perioden.some(
    (p) => p.open?.day === 0 && (p.open.hour ?? 0) === 0 && (p.open.minute ?? 0) === 0 && !p.close,
  );
  const fenster = new Map<string, { open: string; close: string }>();
  /** Tage mit Pause - unbekannt, siehe oben. */
  const mitPause = new Set<string>();

  if (rundUmDieUhr) {
    for (const tag of DAYS) fenster.set(tag, { open: "00:00", close: "23:59" });
  } else {
    for (const p of perioden) {
      if (typeof p.open?.day !== "number") continue;
      const tag = DAYS[(p.open.day + 6) % 7];
      if (fenster.has(tag) || mitPause.has(tag)) {
        fenster.delete(tag);
        mitPause.add(tag);
        continue;
      }
      fenster.set(tag, { open: hhmm(p.open, "00:00"), close: hhmm(p.close, "23:59") });
    }
  }

  if (fenster.size === 0 && mitPause.size === 0) return undefined;
  const out: OpeningHours = {};
  for (const tag of DAYS) {
    if (mitPause.has(tag)) continue;
    const f = fenster.get(tag);
    out[tag] = f ? { closed: false, open: f.open, close: f.close } : { closed: true };
  }
  return out;
}

/** Tage mit mehreren Zeitfenstern (Mittagspause) - dieselbe Zählung wie in zeitenAusPerioden. */
export function tageMitPauseAus(
  perioden: Array<{ open?: RohZeitpunkt; close?: RohZeitpunkt }> | undefined,
): Day[] {
  const zaehler = new Map<Day, number>();
  for (const p of perioden ?? []) {
    if (typeof p.open?.day !== "number") continue;
    const tag = DAYS[(p.open.day + 6) % 7];
    zaehler.set(tag, (zaehler.get(tag) ?? 0) + 1);
  }
  return DAYS.filter((tag) => (zaehler.get(tag) ?? 0) > 1);
}

const PREIS: Record<string, 1 | 2 | 3 | 4> = {
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

function betriebsstatus(wert: string | undefined): GoogleBetriebsstatus {
  return wert === "OPERATIONAL" || wert === "CLOSED_TEMPORARILY" || wert === "CLOSED_PERMANENTLY"
    ? wert
    : "UNBEKANNT";
}

function text(wert: unknown): string | undefined {
  return typeof wert === "string" && wert.trim() ? wert.trim() : undefined;
}

/** Rohantwort → `GoogleEintrag`. `fotos` sind die bereits aufgelösten Bildadressen. */
export function googleEintragAus(place: RohPlace, fotos: string[] = []): GoogleEintrag {
  const bewertungen: OeffentlicheBewertung[] = (place.reviews ?? [])
    .filter((r) => typeof r.rating === "number" && r.publishTime)
    .map((r, i) => ({
      id: r.name ?? `${place.id}/reviews/${i}`,
      autor: text(r.authorAttribution?.displayName) ?? "Google-Nutzer",
      rating: r.rating!,
      text: text(r.text?.text) ?? text(r.originalText?.text) ?? "",
      createdAt: r.publishTime!,
      ...(text(r.relativePublishTimeDescription)
        ? { relativ: r.relativePublishTimeDescription!.trim() }
        : {}),
      ...(text(r.googleMapsUri) ? { url: r.googleMapsUri!.trim() } : {}),
    }))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const oeffnungszeiten = zeitenAusPerioden(place.regularOpeningHours?.periods);
  const preis = place.priceLevel ? PREIS[place.priceLevel] : undefined;

  return {
    placeId: place.id ?? "",
    name: text(place.displayName?.text) ?? "",
    ...(text(place.formattedAddress) ? { adresse: place.formattedAddress!.trim() } : {}),
    ...(typeof place.rating === "number" ? { rating: place.rating } : {}),
    reviewCount: typeof place.userRatingCount === "number" ? place.userRatingCount : 0,
    bewertungen,
    fotos,
    fotoAnzahl: place.photos?.length ?? 0,
    ...(oeffnungszeiten ? { oeffnungszeiten } : {}),
    ...(tageMitPauseAus(place.regularOpeningHours?.periods).length
      ? { tageMitPause: tageMitPauseAus(place.regularOpeningHours?.periods) }
      : {}),
    ...(text(place.nationalPhoneNumber) ? { telefon: place.nationalPhoneNumber!.trim() } : {}),
    ...(text(place.websiteUri) ? { website: place.websiteUri!.trim() } : {}),
    ...(text(place.googleMapsUri) ? { mapsUrl: place.googleMapsUri!.trim() } : {}),
    status: betriebsstatus(place.businessStatus),
    ...(preis ? { preisniveau: preis } : {}),
    ...(text(place.editorialSummary?.text) ? { beschreibung: place.editorialSummary!.text!.trim() } : {}),
    ...(typeof place.outdoorSeating === "boolean" ? { aussenplaetze: place.outdoorSeating } : {}),
    ...(typeof place.reservable === "boolean" ? { reservierbar: place.reservable } : {}),
    ...(typeof place.servesVegetarianFood === "boolean" ? { vegetarisch: place.servesVegetarianFood } : {}),
    ...(text(place.primaryTypeDisplayName?.text) ? { typ: place.primaryTypeDisplayName!.text!.trim() } : {}),
    ...(typeof place.location?.latitude === "number" ? { lat: place.location.latitude } : {}),
    ...(typeof place.location?.longitude === "number" ? { lng: place.location.longitude } : {}),
  };
}

/* ── Abruf ──────────────────────────────────────────────────────────────── */

/** Text der Suche: Name plus Adresse, sonst Name plus PLZ - so eindeutig wie möglich. */
export function suchtext(suche: PlacesSuche): string {
  const zusatz = suche.adresse ?? suche.postalCode;
  return zusatz ? `${suche.name}, ${zusatz}` : suche.name;
}

/**
 * Foto-Adressen auflösen. Fehlschläge einzelner Bilder sind kein Grund, den
 * Eintrag zu verwerfen - dann gibt es eben weniger Fotos.
 */
async function loeseFotos(
  fotos: Array<{ name?: string }>,
  key: string,
  fetchImpl: FetchLike,
): Promise<string[]> {
  const namen = fotos.map((f) => f.name).filter((n): n is string => Boolean(n)).slice(0, MAX_FOTOS);
  const ergebnisse = await Promise.all(
    namen.map(async (name) => {
      try {
        const res = await fetchImpl(
          `${PLACES_BASE}/${name}/media?maxWidthPx=800&skipHttpRedirect=true`,
          { headers: { "X-Goog-Api-Key": key } },
        );
        if (!res.ok) return null;
        const body = (await res.json()) as { photoUri?: string };
        return text(body.photoUri) ?? null;
      } catch {
        return null;
      }
    }),
  );
  return ergebnisse.filter((u): u is string => Boolean(u));
}

/**
 * Den Google-Eintrag suchen und normalisieren.
 *
 * Wirft bei HTTP-Fehlern (falscher Schlüssel, Kontingent, Netz) - der Aufrufer
 * macht daraus `status: "fehler"` mit Klartext. "Nicht gefunden" ist dagegen ein
 * gültiges Ergebnis, kein Fehler.
 *
 * Ohne Ortsbeleg (`hatOrtsbeleg`) kein Abruf, sondern "ohne_ortsangabe": Die
 * bezahlte Suche könnte keinen Treffer liefern, und "nicht gefunden" wäre eine
 * falsche Aussage über Google statt über fehlende Stammdaten.
 */
export async function suchePlace(
  suche: PlacesSuche,
  key: string,
  fetchImpl: FetchLike,
): Promise<PlacesErgebnis> {
  if (!hatOrtsbeleg(suche)) return { status: "ohne_ortsangabe" };

  const body: Record<string, unknown> = {
    textQuery: suchtext(suche),
    languageCode: "de",
    regionCode: "DE",
    maxResultCount: 3,
  };
  if (typeof suche.lat === "number" && typeof suche.lng === "number") {
    body.locationBias = {
      circle: { center: { latitude: suche.lat, longitude: suche.lng }, radius: BIAS_RADIUS_M },
    };
  }

  const res = await fetchImpl(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": PLACES_FIELD_MASK,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    // Googles Fehlerrumpf nennt den Grund ("API key not valid", "PERMISSION_DENIED").
    // Kurz mitnehmen - ohne ihn sieht ein toter Schlüssel aus wie "nicht gefunden".
    let grund = "";
    try {
      const fehler = (await res.json()) as { error?: { message?: string; status?: string } };
      grund = fehler.error?.message ?? fehler.error?.status ?? "";
    } catch {
      // kein JSON - der Status muss reichen
    }
    throw new Error(`Google Places HTTP ${res.status}${grund ? `: ${grund.slice(0, 160)}` : ""}`);
  }

  const antwort = (await res.json()) as { places?: RohPlace[] };
  const treffer = waehleKandidat(antwort.places ?? [], suche);
  if (!treffer) return { status: "nicht_gefunden" };

  const fotos = await loeseFotos(treffer.photos ?? [], key, fetchImpl);
  return { status: "bereit", eintrag: googleEintragAus(treffer, fotos) };
}
