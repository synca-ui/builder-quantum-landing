/**
 * Posteingang eines echten Betriebs - die reinen Entscheidungen, ohne React.
 *
 * ANLASS (Integrationsprüfung, Punkt 19): Der Posteingang und die Glocke auf Start
 * zeigten jedem Wirt dieselben fünf Einträge aus `INBOX_SEED` - „WhatsApp-Anfrage
 * beantwortet", „5★-Bewertung von Marion", „Präsenzscore steigt +12". Nichts davon
 * war passiert. Dabei liegt, was wirklich Aufmerksamkeit braucht, längst vor:
 *
 *  - offene Reservierungsanfragen aus der Web-App (`api.reservations.upcoming`),
 *  - Warnungen aus dem Präsenzbericht, die Gäste direkt treffen (Google findet den
 *    Betrieb nicht, zeigt ihn als geschlossen, nennt andere Öffnungszeiten),
 *  - neue Google-Bewertungen aus dem öffentlichen Abruf.
 *
 * Alles davon ohne Google-Freigabe. Getrennt von `usePosteingang`, damit es sich
 * ohne React-Native-Testaufbau prüfen lässt.
 */
import type { Reservation, VenuePresence } from "@maitr/core";

import type { InboxItem } from "../../lib/store";

export interface PosteingangEintrag extends InboxItem {
  /** Sortierschlüssel (ms). `null`, wenn die Quelle keinen Zeitpunkt nennt. */
  zeitpunkt: number | null;
}

/** Wie weit eine Google-Bewertung zurückliegen darf, um noch „neu" zu sein. */
export const BEWERTUNG_NEU_MS = 7 * 24 * 60 * 60_000;

/**
 * Hebel, die in den Posteingang gehören. Bewusst nur diese drei: Sie beschreiben,
 * was ein Gast HEUTE falsch erlebt (sucht vergeblich, steht vor verschlossener
 * Tür). Die übrigen Hebel („5 Fotos", „Instagram verlinken") sind Verbesserungen
 * und stehen im Profil-Check - im Posteingang wären sie Dauerrauschen.
 */
const WARN_HEBEL = new Set(["google_nicht_gefunden", "google_geschlossen", "hours_diff"]);

/* ── Zeit in Europe/Berlin ─────────────────────────────────────────────────── */

const STUNDE_MS = 60 * 60_000;
const TAG_MS = 24 * STUNDE_MS;
const WOCHENTAG = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"] as const;
const MONAT = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"] as const;

/** Letzter Sonntag eines Monats, 01:00 UTC - dort wechselt die EU die Sommerzeit. */
function letzterSonntagUtc(jahr: number, monat0: number): number {
  const letzterTag = new Date(Date.UTC(jahr, monat0 + 1, 0));
  return Date.UTC(jahr, monat0, letzterTag.getUTCDate() - letzterTag.getUTCDay(), 1);
}

/**
 * Abstand von Europe/Berlin zu UTC zum Zeitpunkt `t`.
 *
 * Selbst gerechnet statt über `Intl` mit `timeZone`: Die Tageszuordnung
 * („Gestern", „Heute, 19:00") hängt sonst an der Intl-Ausstattung der JS-Engine
 * und am Zeitzonen-Stand des Geräts - ein Wirt in Köln mit einem Handy auf
 * Reisezeit sähe die Anfrage für 19 Uhr bei sich auf 13 Uhr. Die EU-Regel
 * (letzter Sonntag im März bis letzter Sonntag im Oktober, je 01:00 UTC) gilt
 * unverändert seit 1996.
 */
function berlinAbstandMs(t: number): number {
  const jahr = new Date(t).getUTCFullYear();
  return t >= letzterSonntagUtc(jahr, 2) && t < letzterSonntagUtc(jahr, 9) ? 2 * STUNDE_MS : STUNDE_MS;
}

export interface BerlinerZeit {
  jahr: number;
  /** 1-12. */
  monat: number;
  tag: number;
  /** 0 = Sonntag. */
  wochentag: number;
  stunde: number;
  minute: number;
  /** Kalendertag in Berlin als laufende Nummer - für „heute/gestern" per Differenz. */
  tagesnummer: number;
}

/** Datum und Uhrzeit eines Zeitpunkts, wie eine Uhr in Köln sie zeigt. */
export function berlinerZeit(t: number): BerlinerZeit {
  const lokal = t + berlinAbstandMs(t);
  const d = new Date(lokal);
  return {
    jahr: d.getUTCFullYear(),
    monat: d.getUTCMonth() + 1,
    tag: d.getUTCDate(),
    wochentag: d.getUTCDay(),
    stunde: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    tagesnummer: Math.floor(lokal / TAG_MS),
  };
}

function uhrzeit(z: BerlinerZeit): string {
  return `${z.stunde}:${String(z.minute).padStart(2, "0")}`;
}

/** „Mo, 14. Sep" - mit Jahr nur, wenn es nicht das laufende ist. */
function kurzDatum(z: BerlinerZeit, jetzt: BerlinerZeit): string {
  const basis = `${WOCHENTAG[z.wochentag]}, ${z.tag}. ${MONAT[z.monat - 1]}`;
  return z.jahr === jetzt.jahr ? basis : `${basis} ${z.jahr}`;
}

/**
 * Wann etwas eingegangen ist: „Gerade eben", „Vor 20 Min", „Vor 3 Std",
 * „Gestern", „Mo, 14. Sep".
 *
 * Stunden nur innerhalb desselben Kalendertags - „Vor 9 Std" um 8 Uhr morgens
 * meint gestern Abend, und so soll es auch dastehen. Ein Zeitpunkt in der Zukunft
 * (Geräteuhr geht nach) gilt als „Gerade eben", nicht als „Vor -3 Min".
 */
export function relativeZeit(t: number, jetzt: number): string {
  const abstand = jetzt - t;
  if (abstand < 60_000) return "Gerade eben";
  const minuten = Math.floor(abstand / 60_000);
  if (minuten < 60) return `Vor ${minuten} Min`;
  const z = berlinerZeit(t);
  const j = berlinerZeit(jetzt);
  const tage = j.tagesnummer - z.tagesnummer;
  if (tage <= 0) return `Vor ${Math.floor(minuten / 60)} Std`;
  if (tage === 1) return "Gestern";
  return kurzDatum(z, j);
}

/**
 * Wann ein Termin ist: „Heute, 19:00", „Morgen, 12:30", „Do, 17. Sep, 19:00".
 * Für Reservierungen - dort zählt der Kalendertag, nicht der Abstand.
 */
export function terminText(t: number, jetzt: number): string {
  const z = berlinerZeit(t);
  const j = berlinerZeit(jetzt);
  const tage = z.tagesnummer - j.tagesnummer;
  const tag = tage === 0 ? "Heute" : tage === 1 ? "Morgen" : kurzDatum(z, j);
  return `${tag}, ${uhrzeit(z)}`;
}

/* ── Einträge ──────────────────────────────────────────────────────────────── */

function zeitAus(iso: unknown): number | null {
  if (typeof iso !== "string") return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

/**
 * Eine Zeile aus `upcoming` einzeln prüfen. Die Liste als Ganzes prüft der Hook
 * (`Array.isArray`); eine kaputte Zeile soll nicht die übrigen Anfragen mitreißen.
 */
function istReservierung(wert: unknown): wert is Reservation {
  if (!wert || typeof wert !== "object") return false;
  const r = wert as Partial<Reservation>;
  return typeof r.id === "string" && r.id !== "" && typeof r.status === "string" && typeof r.start === "string";
}

function personen(n: unknown): string | null {
  if (typeof n !== "number" || !Number.isFinite(n) || n < 1) return null;
  return n === 1 ? "1 Person" : `${Math.round(n)} Personen`;
}

/**
 * Offene Anfragen → Einträge.
 *
 * Nur `pending`: Bestätigte, abgesagte und No-Shows verlangen nichts mehr vom
 * Wirt. Anfragen für einen Termin, der schon begonnen hat, fallen ebenfalls weg -
 * zusagen lässt sich da nichts mehr, und die Zeile bliebe bis zum Tagesende als
 * Aufforderung stehen.
 *
 * Die Zeitangabe ist der EINGANG (`createdAt`), nicht der Termin - „Vor 20 Min"
 * über einer Anfrage für Samstag ist, was ein Posteingang meint. Fehlt `createdAt`
 * (älterer Server), steht dort „Anfrage offen" statt eines erfundenen Zeitpunkts.
 */
function reservierungsEintraege(liste: readonly unknown[], jetzt: number): PosteingangEintrag[] {
  const eintraege: PosteingangEintrag[] = [];
  for (const roh of liste) {
    if (!istReservierung(roh) || roh.status !== "pending") continue;
    const beginn = zeitAus(roh.start);
    if (beginn === null || beginn < jetzt) continue;

    const name = typeof roh.guestName === "string" && roh.guestName.trim() ? roh.guestName.trim() : "Ohne Namen";
    const eingang = zeitAus(roh.createdAt);
    const teile = [terminText(beginn, jetzt), personen(roh.partySize), "wartet auf Bestätigung"].filter(
      (teil): teil is string => Boolean(teil),
    );

    eintraege.push({
      id: `res_${roh.id}`,
      kind: "reservation",
      title: `Neue Reservierungsanfrage · ${name}`,
      body: teile.join(" · "),
      time: eingang === null ? "Anfrage offen" : relativeZeit(eingang, jetzt),
      href: "/tische",
      zeitpunkt: eingang,
    });
  }
  return eintraege;
}

/**
 * Warnende Hebel → Einträge. Titel und Text kommen aus dem Bericht
 * (`packages/core/src/analytics/oeffentlichePraesenz.ts`) und sind dort schon für
 * den Wirt formuliert. Als Zeitpunkt dient der letzte Abruf - der Hebel hat keinen
 * eigenen, und „seit dem Abruf bekannt" ist die ehrliche Lesart.
 */
function hebelEintraege(praesenz: VenuePresence, jetzt: number): PosteingangEintrag[] {
  const hebel = Array.isArray(praesenz.bericht?.hebel) ? praesenz.bericht.hebel : [];
  const stand = zeitAus(praesenz.fetchedAt);
  return hebel
    .filter((h) => h && typeof h.id === "string" && WARN_HEBEL.has(h.id))
    .map((h) => ({
      id: `hebel_${h.id}`,
      kind: "system" as const,
      title: typeof h.titel === "string" ? h.titel : "Hinweis aus dem Profil-Check",
      body: typeof h.detail === "string" ? h.detail : "",
      time: stand === null ? "Profil-Check" : relativeZeit(stand, jetzt),
      href: "/profil-check",
      zeitpunkt: stand,
    }));
}

/** „Bester Kaffee der Stadt, und…" - kurz genug für zwei Zeilen. */
function auszug(text: string, max = 90): string {
  const sauber = text.replace(/\s+/g, " ").trim();
  return sauber.length <= max ? sauber : `${sauber.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Google-Bewertungen der letzten sieben Tage → Einträge.
 *
 * Grenze der Quelle: Ohne Freigabe gibt Google höchstens fünf „relevanteste"
 * Bewertungen heraus. Eine neue Bewertung, die Google nicht unter diese fünf
 * sortiert, erscheint hier nie - der Posteingang sagt deshalb „neu bei Google",
 * nicht „alle neuen".
 */
function bewertungsEintraege(praesenz: VenuePresence, jetzt: number): PosteingangEintrag[] {
  const liste = Array.isArray(praesenz.google?.bewertungen) ? praesenz.google.bewertungen : [];
  const eintraege: PosteingangEintrag[] = [];
  for (const b of liste) {
    if (!b || typeof b.id !== "string" || !b.id) continue;
    const t = zeitAus(b.createdAt);
    if (t === null || jetzt - t > BEWERTUNG_NEU_MS) continue;

    const sterne =
      typeof b.rating === "number" && Number.isFinite(b.rating)
        ? `${Math.min(5, Math.max(1, Math.round(b.rating)))}★-`
        : "";
    const autor = typeof b.autor === "string" ? b.autor.trim() : "";
    const text = typeof b.text === "string" ? b.text.trim() : "";

    eintraege.push({
      id: `rev_${b.id}`,
      kind: "review",
      title: `Neue ${sterne}Bewertung bei Google${autor ? ` von ${autor}` : ""}`,
      body: text ? `„${auszug(text)}“` : "Nur Sterne, kein Kommentar",
      time: relativeZeit(t, jetzt),
      href: "/bewertungen",
      zeitpunkt: t,
    });
  }
  return eintraege;
}

/**
 * Der Posteingang eines echten Betriebs.
 *
 * `reservierungen` ist `null`, solange die Anfragen nicht geladen sind (oder nicht
 * abrufbar waren) - dann fehlen nur diese Einträge, der Rest steht. Sortiert wird
 * neueste zuerst; Einträge ohne Zeitpunkt stehen am Ende, bei Gleichstand
 * entscheidet die Kennung, damit die Liste zwischen zwei Renders nicht springt.
 */
export function echterPosteingang({
  reservierungen,
  praesenz,
  jetzt,
}: {
  reservierungen: readonly unknown[] | null;
  praesenz: VenuePresence | null;
  jetzt: number;
}): PosteingangEintrag[] {
  const eintraege = [
    ...(reservierungen ? reservierungsEintraege(reservierungen, jetzt) : []),
    ...(praesenz ? hebelEintraege(praesenz, jetzt) : []),
    ...(praesenz ? bewertungsEintraege(praesenz, jetzt) : []),
  ];
  return eintraege.sort((a, b) => {
    if (a.zeitpunkt !== b.zeitpunkt) {
      if (a.zeitpunkt === null) return 1;
      if (b.zeitpunkt === null) return -1;
      return b.zeitpunkt - a.zeitpunkt;
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** Ungelesen = nicht in `gelesen` vermerkt. Verschwundene Einträge zählen nicht mehr. */
export function ungeleseneAnzahl(eintraege: readonly { id: string }[], gelesen: Record<string, boolean>): number {
  return eintraege.filter((e) => !gelesen[e.id]).length;
}

/**
 * Hat Google für den Posteingang geantwortet?
 *
 * - `"da"`: Ein Google-Eintrag liegt vor (auch ein stehen gebliebener nach einem
 *   gescheiterten Abruf), oder Google hat ausdrücklich „nicht gefunden" gesagt -
 *   dann steht die Warnung `google_nicht_gefunden` im Posteingang.
 * - `"laedt"`: Kein Eintrag, aber der Präsenzabruf läuft noch.
 * - `"fehlt"`: Kein Eintrag und keiner unterwegs - kein Präsenzstand, kein
 *   Schlüssel, Places-Fehler oder noch nie abgerufen.
 *
 * ANLASS (Prüfbefund): Der Hook fragte nur `praesenz === null`. Ein Stand mit
 * `status: "kein_schluessel"` oder `"fehler"` und ohne `google` - mit den toten
 * Google-Schlüsseln der Normalfall - galt als vollständige Quelle, und der
 * Posteingang sagte „keine neuen Google-Bewertungen", obwohl Google gar nicht
 * gefragt werden konnte. Bewertungen UND die Warnungen „geschlossen"/„andere
 * Zeiten" hängen beide am Google-Eintrag.
 */
export function googleQuelle(
  praesenz: Pick<VenuePresence, "status" | "google"> | null,
  praesenzLaedt: boolean,
): "da" | "laedt" | "fehlt" {
  if (praesenz?.google || praesenz?.status === "nicht_gefunden") return "da";
  return praesenzLaedt ? "laedt" : "fehlt";
}

/**
 * Begrüßung nach Berliner Uhrzeit - dieselben Grenzen wie der Server
 * (`server/maitr/briefing.ts`, `daypart`). Für Start, solange das Briefing für
 * einen echten Betrieb nicht da ist: Die Begrüßung der Fixture gehört zum
 * 16. Juli 2025 im Café Goldstück.
 */
export function begruessung(jetzt: number): string {
  const { stunde } = berlinerZeit(jetzt);
  return stunde < 11 ? "Guten Morgen," : stunde < 17 ? "Hallo," : "Guten Abend,";
}
