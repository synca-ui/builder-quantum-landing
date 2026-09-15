/**
 * „Profil verwalten" für den ECHTEN Betrieb - die Entscheidungen, ohne React.
 *
 * ANLASS (Integrationsprüfung 15.09., Punkte 8, 14, 25): Der Screen speicherte
 * Name, Kurzbeschreibung, Beschreibung und Öffnungszeiten nur im Gerätespeicher
 * und meldete trotzdem „Profil gespeichert". Der Server - und damit der
 * Präsenzbericht, der die Beschreibung misst - erfuhr nie davon, und der nächste
 * Kaltstart (`adoptVenue`) überschrieb die Änderung wieder mit dem Serverstand.
 *
 * Hier steht, was aus dem Formular an `api.venues.update` geht (nur Geändertes),
 * wie die Öffnungszeit-Zeilen („Mo bis Sa · 17:00 – 23:59") zurück in
 * `OpeningHours` finden, wie Serverfehler in einen Satz übersetzt werden und was
 * die Google-Karte zeigt. Getrennt vom Screen, weil es für React-Native-Screens
 * keinen Testaufbau gibt (siehe `features/onboarding/ablauf.ts`).
 */
import type { UpdateVenueInput, Venue, VenuePresence } from "@maitr/core";
import { DAYS, type Day, type DayHours, type OpeningHours } from "@maitr/core/types";

import { gueltigeUhrzeit, zeitenAusEntwurf, type ZeitenEntwurf } from "../features/onboarding/ablauf";
import { profilAusVenue, zeilenAusOeffnungszeiten, type ProfilAusVenue, type ProfilZeile } from "./venueAdopt";

/* ── Öffnungszeit-Zeilen → OpeningHours ──────────────────────────────────── */

/** Dieselben Bezeichnungen wie `zeilenAusOeffnungszeiten` für einzelne Tage. */
const TAG_LANG: Record<Day, string> = {
  monday: "Montag",
  tuesday: "Dienstag",
  wednesday: "Mittwoch",
  thursday: "Donnerstag",
  friday: "Freitag",
  saturday: "Samstag",
  sunday: "Sonntag",
};

/**
 * Welche Wochentage meint eine Zeile? Die Kennungen stammen aus
 * `zeilenAusOeffnungszeiten`: ein Tag ("monday") oder ein LÜCKENLOSER Bereich
 * ("monday_friday" = Montag bis Freitag). Lückenlos ist dort garantiert, deshalb
 * darf der Bereich hier aufgefüllt werden. `null` für alles andere - etwa die
 * Kennungen des Demo-Seeds ("mo_fr"); die gehören zu keinem Serverbetrieb.
 */
export function tageDerZeile(id: string): Day[] | null {
  const teile = id.split("_");
  if (teile.length < 1 || teile.length > 2) return null;
  const von = DAYS.indexOf(teile[0] as Day);
  const bis = DAYS.indexOf((teile[1] ?? teile[0]) as Day);
  if (von < 0 || bis < 0 || bis < von) return null;
  return DAYS.slice(von, bis + 1);
}

export type ZeitraumErgebnis = { ok: true; open: string; close: string } | { ok: false; fehler: string };

const BEISPIEL = "z. B. 9:00 – 17:00";

/** "9" → "09:00", "9:30" / "9.30" → "09:30". `null`, wenn es keine Uhrzeitform ist. */
function uhrzeitAusText(teil: string): string | null {
  const treffer = /^(\d{1,2})(?:[:.](\d{2}))?$/.exec(teil);
  if (!treffer) return null;
  return `${treffer[1].padStart(2, "0")}:${treffer[2] ?? "00"}`;
}

/**
 * Den Text einer geöffneten Zeile lesen: "17:00 – 23:59", "9-17 Uhr", "8.30 bis 18".
 *
 * Bewusst großzügig in der Schreibweise (der Wirt tippt auf dem Handy, der Screen
 * selbst schreibt "8:00" ohne führende Null) und bewusst streng in der Aussage:
 * Ein Tag hat in `OpeningHours` genau EINEN Zeitraum. "12–14, 17–22" wird deshalb
 * abgewiesen statt still auf den ersten Teil gekürzt - sonst stünde nach dem
 * Speichern "mittags zu" im Profil, ohne dass es jemand so eingetragen hat.
 */
export function zeitraumAusText(text: string): ZeitraumErgebnis {
  const t = text.replace(/\s*uhr\b/gi, "").trim();
  if (!t || /^geschlossen$/i.test(t)) return { ok: false, fehler: `Uhrzeiten eintragen, ${BEISPIEL}` };
  if (/[,;&/]|\bund\b/i.test(t)) {
    return { ok: false, fehler: "Nur ein Zeitraum je Tag möglich, z. B. 12:00 – 22:00" };
  }
  const teile = t.split(/\s*(?:–|—|-|bis)\s*/i);
  if (teile.length !== 2 || !teile[0] || !teile[1]) {
    return { ok: false, fehler: `Als Zeitraum eintragen, ${BEISPIEL}` };
  }
  const zeiten: string[] = [];
  for (const teil of teile) {
    const uhrzeit = uhrzeitAusText(teil);
    if (!uhrzeit) return { ok: false, fehler: `„${teil}" ist keine Uhrzeit, ${BEISPIEL}` };
    // Dieselbe Regel wie am Server (`strictOpeningTimeSchema`) - über `ablauf.ts`,
    // dort ist die Übereinstimmung mit dem echten Schema geprüft.
    if (!gueltigeUhrzeit(uhrzeit)) {
      return { ok: false, fehler: `„${teil}" gibt es nicht - Uhrzeiten gehen von 0:00 bis 23:59` };
    }
    zeiten.push(uhrzeit);
  }
  return { ok: true, open: zeiten[0], close: zeiten[1] };
}

export type ZeilenErgebnis =
  | { ok: true; werte: OpeningHours }
  | { ok: false; fehler: Record<string, string> };

/**
 * Die Zeilen des Formulars zurück in die Form von `api.venues.update`.
 *
 * Ungültiges wird NICHT still verworfen: Jede betroffene Zeile bekommt ihren
 * eigenen Fehlertext (Schlüssel = Zeilen-Kennung), und es entsteht kein Ergebnis
 * zum Senden. `openingHours` ersetzt am Server den ganzen Wochenplan - eine
 * übersprungene Zeile wäre dort ein gelöschter Tag.
 *
 * Tage ohne Zeile bleiben ohne Angabe (kein erfundenes „geschlossen"); die
 * Zusammensetzung übernimmt `zeitenAusEntwurf` aus dem Onboarding, damit beide
 * Schreibwege dieselbe Regel haben.
 */
export function oeffnungszeitenAusZeilen(zeilen: ReadonlyArray<ProfilZeile>): ZeilenErgebnis {
  const fehler: Record<string, string> = {};
  const entwurf = Object.fromEntries(
    DAYS.map((tag) => [tag, { stand: "ohneAngabe", open: "09:00", close: "17:00" }]),
  ) as ZeitenEntwurf;
  const zeileJeTag = new Map<Day, string>();

  for (const zeile of zeilen) {
    const tage = tageDerZeile(zeile.id);
    if (!tage) {
      fehler[zeile.id] = "Diese Zeile gehört zu keinem Wochentag und lässt sich nicht speichern";
      continue;
    }
    const doppelt = tage.find((tag) => zeileJeTag.has(tag));
    if (doppelt) {
      fehler[zeile.id] = "Ein Tag steht hier doppelt";
      continue;
    }
    let zeitraum: ZeitraumErgebnis | null = null;
    if (!zeile.closed) {
      zeitraum = zeitraumAusText(zeile.value);
      if (!zeitraum.ok) {
        fehler[zeile.id] = zeitraum.fehler;
        continue;
      }
    }
    for (const tag of tage) {
      zeileJeTag.set(tag, zeile.id);
      entwurf[tag] =
        zeitraum && zeitraum.ok
          ? { stand: "geoeffnet", open: zeitraum.open, close: zeitraum.close }
          : { stand: "geschlossen", open: "09:00", close: "17:00" };
    }
  }

  if (Object.keys(fehler).length > 0) return { ok: false, fehler };

  const ergebnis = zeitenAusEntwurf(entwurf);
  if (ergebnis.ok) return { ok: true, werte: ergebnis.werte };
  // Kann nach der Prüfung oben nicht eintreten - falls doch, trotzdem der Zeile
  // zugeordnet statt verschluckt.
  for (const f of ergebnis.fehler) {
    const id = zeileJeTag.get(f.tag) ?? f.tag;
    fehler[id] = `„${f.wert}" ist keine gültige Uhrzeit`;
  }
  return { ok: false, fehler };
}

/** Sagen zwei Tagesangaben dasselbe? Beide ohne Angabe zählt als gleich. */
function gleicherTag(x: DayHours | undefined, y: DayHours | undefined): boolean {
  if (!x || !y) return !x && !y;
  if (x.closed || y.closed) return x.closed === y.closed;
  return x.open === y.open && x.close === y.close;
}

/** Beschreiben zwei Wochenpläne dasselbe? Reihenfolge der Schlüssel egal. */
export function gleicheZeiten(a: OpeningHours, b: OpeningHours): boolean {
  return DAYS.every((tag) => gleicherTag(a[tag], b[tag]));
}

/** Hat der Wirt an den Zeilen etwas angefasst? Wortgleich = nein. */
function zeilenUnveraendert(a: ReadonlyArray<ProfilZeile>, b: ReadonlyArray<ProfilZeile>): boolean {
  return (
    a.length === b.length &&
    a.every((z, i) => {
      const w = b[i];
      if (z.id !== w.id || Boolean(z.closed) !== Boolean(w.closed)) return false;
      return Boolean(z.closed) || z.value.trim() === w.value.trim();
    })
  );
}

/**
 * Sieben leere Tageszeilen - für einen Betrieb, der noch gar keine Öffnungszeiten
 * hat. Ohne sie gäbe es im Formular nichts zum Ausfüllen. Leer und geöffnet, NICHT
 * mit Vorschlagszeiten: Speichern verlangt dann für jeden Tag eine Aussage (Zeiten
 * oder geschlossen), statt Zeiten zu behaupten, die niemand eingetragen hat.
 */
export function leereWoche(): ProfilZeile[] {
  return DAYS.map((tag) => ({ id: tag, label: TAG_LANG[tag], value: "" }));
}

/* ── Formular → Patch ────────────────────────────────────────────────────── */

export interface ProfilFormular {
  name: string;
  tagline: string;
  /** Die Beschreibung - am Server `description`. */
  bio: string;
  hours: ReadonlyArray<ProfilZeile>;
}

export interface ProfilFehler {
  name?: string;
  tagline?: string;
  bio?: string;
  /** Fehlertext je Zeilen-Kennung. */
  zeilen: Record<string, string>;
}

export type ProfilPlan = { ok: true; patch: UpdateVenueInput } | { ok: false; fehler: ProfilFehler };

/** Grenzen aus `patchVenueSchema` (server/maitr/routes.ts). */
export const PROFIL_GRENZEN = { nameMin: 2, nameMax: 120, tagline: 200, beschreibung: 2000 } as const;

/**
 * Was geht an `api.venues.update`?
 *
 * Nur, was sich gegenüber `ausgang` (dem Stand beim Öffnen des Formulars)
 * geändert hat. Grund: Ein unverändertes Feld mitzuschicken überschriebe am
 * Server einen Stand, den inzwischen jemand anderes gesetzt hat (etwa die
 * Veröffentlichung der Web-App). Verglichen wird getrimmt, weil der Server trimmt;
 * bei den Zeiten nach Bedeutung ("8:00" = "08:00"), nicht nach Schreibweise.
 *
 * ACHTUNG Öffnungszeiten: `openingHours` ist am Server EIN Feld und ersetzt dort
 * den ganzen Wochenplan. Der Patch von hier enthält die Woche aus dem Formular -
 * also auch die Tage, die der Wirt nicht angefasst hat, im Stand von `ausgang`.
 * So darf er NICHT an den Server: vorher `patchGegenServerstand` (Prüfbefund zu
 * Punkt 8: Die App hätte sonst Tage mit einem veralteten Stand überschrieben).
 *
 * Geprüft wird ebenfalls nur Geändertes: Ein Name, der am Server schon zu kurz
 * steht, soll das Speichern einer neuen Beschreibung nicht blockieren.
 */
export function profilPatch(ausgang: ProfilFormular, entwurf: ProfilFormular): ProfilPlan {
  const fehler: ProfilFehler = { zeilen: {} };
  const patch: UpdateVenueInput = {};

  const name = entwurf.name.trim();
  if (name !== ausgang.name.trim()) {
    if (name.length < PROFIL_GRENZEN.nameMin) fehler.name = "Der Name braucht mindestens 2 Zeichen";
    else if (name.length > PROFIL_GRENZEN.nameMax) fehler.name = "Der Name darf höchstens 120 Zeichen haben";
    else patch.name = name;
  }

  const tagline = entwurf.tagline.trim();
  if (tagline !== ausgang.tagline.trim()) {
    if (tagline.length > PROFIL_GRENZEN.tagline) fehler.tagline = "Höchstens 200 Zeichen";
    else patch.tagline = tagline;
  }

  const beschreibung = entwurf.bio.trim();
  if (beschreibung !== ausgang.bio.trim()) {
    if (beschreibung.length > PROFIL_GRENZEN.beschreibung) fehler.bio = "Höchstens 2000 Zeichen";
    else patch.description = beschreibung;
  }

  if (!zeilenUnveraendert(ausgang.hours, entwurf.hours)) {
    const neu = oeffnungszeitenAusZeilen(entwurf.hours);
    if (!neu.ok) {
      fehler.zeilen = neu.fehler;
    } else {
      const alt = oeffnungszeitenAusZeilen(ausgang.hours);
      if (!alt.ok || !gleicheZeiten(alt.werte, neu.werte)) patch.openingHours = neu.werte;
    }
  }

  const hatFehler =
    Boolean(fehler.name || fehler.tagline || fehler.bio) || Object.keys(fehler.zeilen).length > 0;
  return hatFehler ? { ok: false, fehler } : { ok: true, patch };
}

/* ── Gegen den aktuellen Serverstand abgleichen ─────────────────────────── */

/**
 * Die Tage, die der Wirt geändert hat, in den AKTUELLEN Serverplan einmischen.
 *
 * ANLASS (Prüfbefund zu Punkt 8): Das Formular startet mit dem Profil aus dem
 * Store, und das holt der Store nur beim Anmelden bzw. Kaltstart. Läuft die App
 * seit gestern im Hintergrund und hat der Wirt inzwischen die Web-App mit neuen
 * Zeiten Mo-Sa veröffentlicht, stehen im Formular noch die alten. Schaltet er
 * dann nur den Sonntag auf, schickte die ganze Woche die alten Zeiten Mo-Sa mit -
 * und `openingHours` ersetzt am Server den ganzen Plan. Still überschrieben.
 *
 * Je Tag: Ist die Angabe im Entwurf dieselbe wie beim Öffnen, hat der Wirt den
 * Tag nicht angefasst → der Serverstand gilt. Sonst gilt der Entwurf - auch dann,
 * wenn der Server den Tag inzwischen ebenfalls geändert hat: Das ist eine
 * ausdrückliche Eingabe, kein Mitgeschlepptes.
 */
export function zeitenEinmischen(
  ausgang: OpeningHours,
  entwurf: OpeningHours,
  server: OpeningHours,
): OpeningHours {
  const ergebnis: OpeningHours = {};
  for (const tag of DAYS) {
    const wert = gleicherTag(ausgang[tag], entwurf[tag]) ? server[tag] : entwurf[tag];
    if (wert) ergebnis[tag] = wert;
  }
  return ergebnis;
}

function istBetrieb(wert: unknown, venueId: string): wert is Venue {
  if (!wert || typeof wert !== "object") return false;
  const v = wert as Partial<Venue>;
  return v.id === venueId && typeof v.name === "string" && Boolean(v.name);
}

/**
 * Den Betrieb aus der Antwort von `api.venues.mine()` - Form geprüft. `null`,
 * wenn die Antwort keine Liste ist oder diesen Betrieb nicht enthält.
 */
export function betriebAusListe(liste: unknown, venueId: string): Venue | null {
  if (!Array.isArray(liste)) return null;
  const treffer = liste.find((v) => istBetrieb(v, venueId));
  return treffer ?? null;
}

export type ServerAbgleich =
  | {
      ok: true;
      /** Was jetzt wirklich an `api.venues.update` geht - kann leer sein. */
      patch: UpdateVenueInput;
      /** Der Betrieb, wie er gerade am Server steht. */
      venue: Venue;
      /** Tage, die der Wirt nicht angefasst hat, standen am Server inzwischen anders - und bleiben so. */
      uebrigeTageNeuer: boolean;
    }
  | { ok: false; fehler: string };

/**
 * Den Patch aus `profilPatch` gegen den Betrieb abgleichen, wie er JETZT am Server
 * steht (`liste` = Antwort von `api.venues.mine()`, direkt vor dem Speichern
 * geholt). Betrifft nur `openingHours` - Name, Kurzbeschreibung und Beschreibung
 * gehen ohnehin nur mit, wenn der Wirt sie geändert hat.
 *
 * Ohne lesbaren Serverstand wird NICHT gespeichert: Blind die ganze Woche zu
 * schicken ist genau der Fehler, den dieser Abgleich verhindert.
 *
 * Steht das Ergebnis schon so am Server, fällt `openingHours` weg (der Patch kann
 * dann leer sein - der Screen sagt das, statt einen Speichervorgang zu melden).
 */
export function patchGegenServerstand(
  ausgang: ProfilFormular,
  patch: UpdateVenueInput,
  liste: unknown,
  venueId: string,
): ServerAbgleich {
  const venue = betriebAusListe(liste, venueId);
  if (!venue) {
    return {
      ok: false,
      fehler: "Nicht gespeichert - der aktuelle Stand des Betriebs ließ sich nicht abrufen. Bitte erneut versuchen.",
    };
  }
  if (!patch.openingHours) return { ok: true, patch, venue, uebrigeTageNeuer: false };

  const server = venue.openingHours ?? {};
  // Die Zeilen beim Öffnen stammen aus `zeilenAusOeffnungszeiten` und lesen sich
  // zurück (Spec „Rückrichtung"). Falls nicht: Jeder Tag im Entwurf zählt als
  // geändert, Tage ohne Zeile bleiben beim Server - nie die ganze Woche blind.
  const alt = oeffnungszeitenAusZeilen(ausgang.hours);
  const ausgangZeiten = alt.ok ? alt.werte : {};
  const entwurf = patch.openingHours;
  const zusammen = zeitenEinmischen(ausgangZeiten, entwurf, server);
  const uebrigeTageNeuer = DAYS.some(
    (tag) => gleicherTag(ausgangZeiten[tag], entwurf[tag]) && !gleicherTag(ausgangZeiten[tag], server[tag]),
  );

  const { openingHours: _entwurf, ...rest } = patch;
  if (gleicheZeiten(zusammen, server)) return { ok: true, patch: rest, venue, uebrigeTageNeuer };
  return { ok: true, patch: { ...rest, openingHours: zusammen }, venue, uebrigeTageNeuer };
}

/* ── Serverantwort und Serverfehler ─────────────────────────────────────── */

/**
 * Das Profil aus der PATCH-Antwort - aber nur, wenn sie wirklich der Betrieb ist,
 * für den gespeichert wurde. Form prüfen statt vertrauen (dieselbe Lehre wie in
 * `store.tsx`): Ein 200 mit fremdem Rumpf darf das Profil nicht leeren.
 */
export function profilAusAntwort(antwort: unknown, venueId: string): ProfilAusVenue | null {
  return istBetrieb(antwort, venueId) ? profilAusVenue(antwort) : null;
}

const FELDNAMEN: Record<string, string> = {
  name: "Name",
  tagline: "Kurzbeschreibung",
  description: "Beschreibung",
  openingHours: "Öffnungszeiten",
};

/**
 * Serverfehler in einen Satz. Auf die Form geprüft statt über `instanceof
 * ApiError` - wie `fehlerAnzeige` in `features/loyalty/aufbereitung.ts`, damit
 * die Spec Fehler als schlichte Objekte beschreiben kann.
 *
 * Jeder Satz sagt, dass NICHT gespeichert wurde: Das Formular bleibt stehen, und
 * der Wirt muss wissen, dass seine Eingabe noch nirgends angekommen ist.
 */
export function speicherFehlerText(fehler: unknown): string {
  const status = (fehler as { status?: unknown })?.status;
  const rumpf = (fehler as { body?: { error?: unknown; issues?: unknown } })?.body;
  const kennung = typeof rumpf?.error === "string" ? rumpf.error : null;

  if (status === 403 && kennung === "nur_inhaber") return "Nur der Inhaber kann das Profil ändern";
  if (status === 401) return "Nicht gespeichert - bitte neu anmelden.";
  if (status === 403) return "Nicht gespeichert - kein Zugriff auf diesen Betrieb.";
  if (status === 404) return "Nicht gespeichert - der Betrieb wurde nicht gefunden.";
  if (status === 422) {
    const issues = Array.isArray(rumpf?.issues) ? (rumpf.issues as Array<Record<string, unknown>>) : [];
    // Ein Server ohne `description` im Schema (vor dem Deploy) weist das Feld als
    // unbekannt ab - das ist kein Tippfehler des Wirts.
    const unbekannt = issues.find((i) => i?.code === "unrecognized_keys");
    if (unbekannt) {
      return "Nicht gespeichert - der Server nimmt die Beschreibung noch nicht an. Bitte später erneut versuchen.";
    }
    const felder = [
      ...new Set(
        issues
          .map((i) => (Array.isArray(i?.path) ? FELDNAMEN[String(i.path[0])] : undefined))
          .filter((f): f is string => Boolean(f)),
      ),
    ];
    return felder.length
      ? `Nicht gespeichert - ${felder.join(", ")} vom Server abgelehnt.`
      : "Nicht gespeichert - der Server hat die Angaben abgelehnt.";
  }
  if (typeof status === "number" && status >= 500) {
    return "Nicht gespeichert - der Server hat einen Fehler gemeldet. Bitte erneut versuchen.";
  }
  if (typeof status === "number") return "Nicht gespeichert. Bitte erneut versuchen.";
  return "Nicht gespeichert - keine Verbindung zum Server. Bitte erneut versuchen.";
}

/* ── Google-Karte (nur lesend) ─────────────────────────────────────────── */

/** Ohne Maps-Link: dort verwaltet ein Inhaber sein Unternehmensprofil. */
export const GOOGLE_BUSINESS_URL = "https://business.google.com/";

type GoogleEintrag = NonNullable<VenuePresence["google"]>;

export type GoogleKarte =
  | { art: "eintrag"; google: GoogleEintrag; zeilen: ProfilZeile[]; tageMitPause: number; link: string }
  | { art: "laedt" }
  | { art: "leer"; text: string; link: string };

/**
 * Was die Karte „So steht es bei Google" zeigt.
 *
 * Nur lesend: Ohne Google-Freigabe gibt es keinen Schreibweg zu Google (und auch
 * mit Freigabe ist `locations.patch` nicht gebaut). Die Karte behauptet deshalb
 * nichts über „Änderungen gehen an Google", sondern zeigt den Stand und verlinkt
 * dorthin, wo der Inhaber ihn selbst ändert.
 *
 * Fehlt der Eintrag, sagt sie WARUM - „nicht gefunden" ist etwas anderes als
 * „nicht abrufbar". Ein laufender Abruf ohne gespeicherten Eintrag zeigt Laden,
 * einer MIT Eintrag zeigt den Eintrag (der Screen setzt ein „aktualisiert").
 */
export function googleKarte(praesenz: VenuePresence | null, laedt: boolean): GoogleKarte {
  const google = praesenz?.google;
  if (google && typeof google.name === "string") {
    return {
      art: "eintrag",
      google,
      zeilen: zeilenAusOeffnungszeiten(google.oeffnungszeiten),
      tageMitPause: Array.isArray(google.tageMitPause) ? google.tageMitPause.length : 0,
      link: google.mapsUrl || GOOGLE_BUSINESS_URL,
    };
  }
  if (laedt) return { art: "laedt" };
  const link = GOOGLE_BUSINESS_URL;
  if (!praesenz) return { art: "leer", text: "Der Google-Eintrag ist noch nicht abgerufen.", link };
  switch (praesenz.status) {
    case "nicht_gefunden":
      return { art: "leer", text: "Google kennt keinen passenden Eintrag zu diesem Betrieb.", link };
    case "kein_schluessel":
      return { art: "leer", text: "Google-Daten sind auf dem Server noch nicht eingerichtet.", link };
    case "fehler":
      return { art: "leer", text: praesenz.hinweis || "Der Abruf bei Google ist gescheitert.", link };
    case "ausstehend":
      return { art: "leer", text: "Der Google-Eintrag ist noch nicht abgerufen.", link };
    default:
      return { art: "leer", text: praesenz.hinweis || "Kein Google-Eintrag vorhanden.", link };
  }
}

/**
 * "https://www.instagram.com/haustoeller/" → "@haustoeller"; "@haus" bleibt.
 * `null`, wenn sich kein Kontoname ablesen lässt - dann zeigt der Screen nichts
 * Erfundenes.
 */
export function instagramKonto(verweis: string | undefined): string | null {
  const v = verweis?.trim();
  if (!v) return null;
  if (/^@[\w.]+$/.test(v)) return v;
  const treffer = /instagram\.com\/([\w.]+)/i.exec(v);
  if (treffer && !["p", "reel", "explore", "stories"].includes(treffer[1].toLowerCase())) {
    return `@${treffer[1]}`;
  }
  return null;
}

/** Öffenbare Adresse zum Instagram-Verweis, oder `null`. */
export function instagramUrl(verweis: string | undefined): string | null {
  const v = verweis?.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  const konto = instagramKonto(v);
  return konto ? `https://www.instagram.com/${konto.slice(1)}/` : null;
}
