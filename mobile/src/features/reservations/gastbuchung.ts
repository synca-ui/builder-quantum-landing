/**
 * Gastbuchung und Reservierungsliste eines echten Betriebs - die reinen
 * Entscheidungen, ohne React.
 *
 * ANLASS: Die Gastbuchung zeigte jedem Betrieb die Tage 16.-20. Juli 2025 und
 * die Uhrzeiten des Demo-Cafés; abgeschickt wurde nur in den lokalen
 * Vorführzustand. Für einen echten Betrieb trägt der Screen jetzt über
 * `POST /reservations` wirklich ein. Tage, Uhrzeiten und der Zeitpunkt, den der
 * Server bekommt, stehen hier, damit sie sich ohne React-Native-Testaufbau
 * prüfen lassen (gastbuchung.spec.ts).
 *
 * `naechsteAnkunft` gehört auch hierher: Abend-Screen und Buchung lesen dieselbe
 * Vertragsform `Reservation` und brauchen dieselbe Formprüfung.
 */
import type { Reservation } from "@maitr/core";

import {
  BETRIEBS_ZEITZONE,
  minutenAus,
  uhrzeit,
  wanduhrIn,
  type Tagesfenster,
} from "../../lib/oeffnungsstatus";

export const WOCHENTAG_KURZ = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;
const WOCHENTAG_LANG = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
] as const;
const MONATE = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
] as const;

/** Ein wählbarer Kalendertag in der Zone des Betriebs. */
export interface Buchungstag {
  /** "2026-09-15" - eindeutig, taugt als React-Schlüssel. */
  key: string;
  jahr: number;
  monat: number;
  tag: number;
  /** 0 = Montag … 6 = Sonntag, Index in `DAYS`. */
  wochentag: number;
  /** "Di" */
  kurz: string;
  /** "15." */
  datum: string;
  /** "Dienstag, 15. September" */
  lang: string;
  heute: boolean;
}

/**
 * Die nächsten `anzahl` Tage ab heute - heute ist der Kalendertag in Berlin,
 * nicht der des Geräts oder von UTC (um 00:30 gehört eine Buchung in Köln schon
 * zum neuen Tag). Gerechnet wird mit Kalenderdaten in UTC, damit eine
 * Zeitumstellung keinen Tag doppelt oder gar nicht liefert.
 */
export function naechsteTage(
  jetzt: Date,
  anzahl = 7,
  zeitzone: string = BETRIEBS_ZEITZONE,
): Buchungstag[] {
  const heute = wanduhrIn(jetzt, zeitzone);
  return Array.from({ length: anzahl }, (_, i) => {
    const d = new Date(Date.UTC(heute.jahr, heute.monat - 1, heute.tag + i));
    const jahr = d.getUTCFullYear();
    const monat = d.getUTCMonth() + 1;
    const tag = d.getUTCDate();
    const wochentag = (d.getUTCDay() + 6) % 7;
    return {
      key: `${jahr}-${String(monat).padStart(2, "0")}-${String(tag).padStart(2, "0")}`,
      jahr,
      monat,
      tag,
      wochentag,
      kurz: WOCHENTAG_KURZ[wochentag],
      datum: `${tag}.`,
      lang: `${WOCHENTAG_LANG[wochentag]}, ${tag}. ${MONATE[monat - 1]}`,
      heute: i === 0,
    };
  });
}

/**
 * Feste Uhrzeiten im Halbstundentakt, 8:00 bis 22:00.
 *
 * Fest, weil unter /api/maitr keine Buchungszeiten des Betriebs erreichbar sind
 * (Configuration.timeSlots liegt nur in der Web-App, Prüfbericht Punkt 26). Der
 * Bereich deckt Frühstückscafé wie Abendküche ab; die Öffnungszeit des Tags
 * schneidet ihn zu, wenn sie bekannt ist.
 */
export const UHRZEITEN: readonly string[] = Array.from({ length: 29 }, (_, i) => uhrzeit(8 * 60 + i * 30));

/**
 * Die letzte Uhrzeit liegt eine Stunde vor Schluss. Ein Tisch, der eine halbe
 * Stunde vor Küchenschluss beginnt, wäre eine Zusage, die kein Betrieb halten will.
 */
export const LETZTE_BUCHUNG_VOR_SCHLUSS_MIN = 60;

export interface Zeitauswahl {
  zeiten: string[];
  /**
   * - `offen`: nach der Öffnungszeit zugeschnitten
   * - `unbekannt`: Öffnungszeit unbekannt, alle festen Uhrzeiten
   * - `geschlossen`: Ruhetag
   * - `keine`: geöffnet, aber keine Uhrzeit mehr möglich (etwa heute am Abend)
   */
  grund: "offen" | "unbekannt" | "geschlossen" | "keine";
}

/**
 * Wählbare Uhrzeiten eines Tags.
 *
 * `abMinute` ist für heute die aktuelle Minute - vergangene Uhrzeiten fallen
 * weg. Ein Fenster über Mitternacht (18:00-2:00) endet für die Rechnung erst am
 * Folgetag, sonst bliebe für eine Bar keine einzige Uhrzeit übrig.
 */
export function uhrzeitenFuer(fenster: Tagesfenster | null, abMinute: number | null): Zeitauswahl {
  if (fenster?.geschlossen) return { zeiten: [], grund: "geschlossen" };

  let zeiten = [...UHRZEITEN];
  if (fenster) {
    const ende = fenster.zu <= fenster.auf ? fenster.zu + 24 * 60 : fenster.zu;
    zeiten = zeiten.filter((z) => {
      const m = minutenAus(z)!;
      return m >= fenster.auf && m + LETZTE_BUCHUNG_VOR_SCHLUSS_MIN <= ende;
    });
  }
  if (abMinute !== null) zeiten = zeiten.filter((z) => minutenAus(z)! > abMinute);

  if (zeiten.length === 0) return { zeiten, grund: "keine" };
  return { zeiten, grund: fenster ? "offen" : "unbekannt" };
}

/**
 * Der UTC-Zeitpunkt zu einer Wanduhrzeit in `zeitzone`.
 *
 * Der Server prüft `start` mit `z.string().datetime()` - das nimmt nur UTC mit
 * "Z", keine Angabe wie "+02:00". "18:30" muss also hier in Berliner Zeit
 * gelesen und umgerechnet werden. Zweimal gerechnet, weil der Versatz am
 * geratenen und am echten Zeitpunkt verschieden sein kann (Tag der Umstellung).
 */
export function zeitpunktIn(
  jahr: number,
  monat: number,
  tag: number,
  minute: number,
  zeitzone: string = BETRIEBS_ZEITZONE,
): Date {
  const wand = Date.UTC(jahr, monat - 1, tag, 0, minute);
  const versatz = (zeitpunkt: number) => {
    const w = wanduhrIn(new Date(zeitpunkt), zeitzone);
    return Date.UTC(w.jahr, w.monat - 1, w.tag, 0, w.minute) - Math.floor(zeitpunkt / 60_000) * 60_000;
  };
  const erster = wand - versatz(wand);
  return new Date(wand - versatz(erster));
}

/** Startzeit für `api.reservations.create`, oder `null` bei unlesbarer Uhrzeit. */
export function startIso(
  tag: Pick<Buchungstag, "jahr" | "monat" | "tag">,
  zeit: string,
  zeitzone: string = BETRIEBS_ZEITZONE,
): string | null {
  const minute = minutenAus(zeit);
  if (minute === null) return null;
  return zeitpunktIn(tag.jahr, tag.monat, tag.tag, minute, zeitzone).toISOString();
}

/**
 * Form prüfen, nicht nur Erfolg: Ein HTTP 200 von einem fremden Dienst ist
 * auch ein Erfolg (dieselbe Lehre wie in `useDailyBriefing`).
 */
export function istReservierung(wert: unknown): wert is Reservation {
  if (!wert || typeof wert !== "object") return false;
  const r = wert as Partial<Reservation>;
  return (
    typeof r.id === "string" &&
    typeof r.guestName === "string" &&
    typeof r.partySize === "number" &&
    typeof r.start === "string" &&
    Number.isFinite(Date.parse(r.start)) &&
    typeof r.status === "string"
  );
}

/** Spiegelt `GuestBookingResult` aus store.tsx - hier ohne Import, wie venueAdopt.ts. */
export interface BestaetigteBuchung {
  weekday: string;
  dateLabel: string;
  time: string;
  partySize: number;
  guest: string;
}

/**
 * Was die Bestätigung zeigt - aus der ANTWORT des Servers, nicht aus der
 * Auswahl im Formular. Nur so steht dort, was wirklich gespeichert wurde.
 */
export function bestaetigungAus(
  reservierung: Reservation,
  zeitzone: string = BETRIEBS_ZEITZONE,
): BestaetigteBuchung {
  const uhr = wanduhrIn(new Date(reservierung.start), zeitzone);
  const [tag] = naechsteTage(new Date(reservierung.start), 1, zeitzone);
  return {
    weekday: WOCHENTAG_KURZ[uhr.wochentag],
    dateLabel: tag.lang,
    time: uhrzeit(uhr.minute),
    partySize: reservierung.partySize,
    guest: reservierung.guestName,
  };
}

export interface Ankunftslage {
  /** Die nächste erwartete Reservierung, oder `null`: heute keine mehr. */
  naechste: Reservation | null;
  /** Wie viele Reservierungen heute noch kommen (inklusive `naechste`). */
  nochHeute: number;
}

/**
 * Nächste Ankunft aus `GET /reservations/upcoming?tage=1`.
 *
 * `null` heißt: Die Antwort war keine Liste - "nicht abrufbar", nicht "keine".
 * Wer das gleichsetzt, sagt einem Wirt mit vollem Buch "Heute keine
 * Reservierungen mehr".
 *
 * Zählt nur, wer noch kommt: Beginn ab jetzt, nicht storniert, nicht als
 * No-Show markiert. Walk-ins fallen ebenfalls heraus - sie sitzen schon, ihr
 * Beginn ist der Moment, in dem sie hereinkamen. Offene Anfragen (`pending`)
 * zählen mit: Der Gast kommt, auch wenn der Wirt noch nicht bestätigt hat.
 */
export function naechsteAnkunft(antwort: unknown, jetzt: Date): Ankunftslage | null {
  if (!Array.isArray(antwort)) return null;
  const kommend = antwort
    .filter(istReservierung)
    .filter(
      (r) =>
        r.status !== "cancelled" &&
        r.status !== "no_show" &&
        r.status !== "walk_in" &&
        Date.parse(r.start) >= jetzt.getTime(),
    )
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  return { naechste: kommend[0] ?? null, nochHeute: kommend.length };
}

/** "19:00" - Beginn einer Reservierung in der Zone des Betriebs. */
export function uhrzeitDer(reservierung: Pick<Reservation, "start">, zeitzone: string = BETRIEBS_ZEITZONE): string {
  return uhrzeit(wanduhrIn(new Date(reservierung.start), zeitzone).minute);
}
