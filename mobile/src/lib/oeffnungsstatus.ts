/**
 * Öffnungszeiten → "Jetzt geöffnet · bis 23:00" - die reinen Entscheidungen, ohne React.
 *
 * ANLASS: Die Funktionen standen lokal in PublicProfileScreen.tsx. Seit auch der
 * Abend-Screen und die Gastbuchung für einen echten Betrieb aus den
 * Öffnungszeiten rechnen, liegen sie hier - eine Stelle, die sich ohne
 * React-Native-Testaufbau prüfen lässt (oeffnungsstatus.spec.ts), statt drei
 * Abschriften, die beim nächsten Randfall auseinanderlaufen.
 */
import type { Day, OpeningHours } from "@maitr/core/types";
import { DAYS } from "@maitr/core/types";

import type { ProfilZeile } from "./venueAdopt";

/**
 * Die Zone, in der gerechnet wird, solange die App die des Betriebs nicht kennt.
 *
 * `venueProfile` trägt keine Zeitzone; der Server setzt ohne Angabe
 * Europe/Berlin (Venue.timezone) und zieht dort auch die Tagesgrenze von
 * `GET /reservations/upcoming`. Vorher rechnete das Profil in der Uhrzeit des
 * Geräts - ein Wirt im Urlaub auf Mallorca ginge noch, einer auf Lanzarote sähe
 * seinen Betrieb eine Stunde falsch geöffnet. Und die Gastbuchung MUSS in
 * derselben Zone rechnen, in der der Server "18:30" versteht.
 */
export const BETRIEBS_ZEITZONE = "Europe/Berlin";

export interface Oeffnungsstatus {
  label: string;
  offen: boolean;
  /** Text hinter dem Punkt, z. B. "bis 23:59". */
  zusatz?: string;
}

/** Ein Tag in Minuten seit Mitternacht. */
export type Tagesfenster = { geschlossen: true } | { geschlossen: false; auf: number; zu: number };

/** Kalendertag und Uhrzeit, wie eine Wanduhr in der Zone sie zeigt. */
export interface Wanduhr {
  jahr: number;
  /** 1-12 */
  monat: number;
  tag: number;
  /** 0 = Montag … 6 = Sonntag - dieselbe Reihenfolge wie `DAYS`. */
  wochentag: number;
  /** Minuten seit Mitternacht. */
  minute: number;
}

/**
 * Wanduhr in `zeitzone` für einen Zeitpunkt.
 *
 * Der Wochentag kommt aus dem Datum, nicht aus einem Wochentagsnamen: Die
 * Namen hängen an der Sprache der Laufzeit, die Rechnung nicht. Kann die
 * Laufzeit keine Zonen (altes Intl), bleibt die Uhr des Geräts - das ist in
 * aller Regel dieselbe, und ein Profil ohne Geöffnet-Zeile wäre der schlechtere
 * Rückfall.
 */
export function wanduhrIn(jetzt: Date, zeitzone: string = BETRIEBS_ZEITZONE): Wanduhr {
  try {
    const format = new Intl.DateTimeFormat("en-US", {
      timeZone: zeitzone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    if (typeof format.formatToParts === "function") {
      const teile: Record<string, number> = {};
      for (const t of format.formatToParts(jetzt)) {
        if (t.type !== "literal") teile[t.type] = Number(t.value);
      }
      const { year, month, day, hour, minute } = teile;
      if ([year, month, day, hour, minute].every(Number.isFinite)) {
        // Manche Laufzeiten schreiben Mitternacht trotz h23 als "24".
        const stunde = hour % 24;
        return {
          jahr: year,
          monat: month,
          tag: day,
          wochentag: (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7,
          minute: stunde * 60 + minute,
        };
      }
    }
  } catch {
    // Unbekannte Zone oder Laufzeit ohne Zonen: unten weiter mit der Geräteuhr.
  }
  return {
    jahr: jetzt.getFullYear(),
    monat: jetzt.getMonth() + 1,
    tag: jetzt.getDate(),
    wochentag: (jetzt.getDay() + 6) % 7,
    minute: jetzt.getHours() * 60 + jetzt.getMinutes(),
  };
}

/** "9:30", "09:30" oder "9.30" → Minuten; alles andere → null. */
export function minutenAus(text: string): number | null {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(text.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59 || (h === 24 && min > 0)) return null;
  return h * 60 + min;
}

/**
 * Minuten → "9:30", ohne führende Null wie die Profilzeilen (venueAdopt `uhr`).
 * Mitternacht als Schluss heißt "24:00": Google meldet "bis Mitternacht" als
 * close "00:00" (places.ts), und "bis 0:00" liest sich wie ein Datenfehler.
 */
export function uhrzeit(minuten: number, alsSchluss = false): string {
  if (alsSchluss && minuten === 0) return "24:00";
  return `${Math.floor(minuten / 60)}:${String(minuten % 60).padStart(2, "0")}`;
}

/**
 * Auf == zu ist keine Öffnungszeit, sondern ein Datenfehler: So kamen Ruhetage
 * aus dem Konfigurator als "00:00-00:00" an. Das als "rund um die Uhr" zu lesen,
 * hieße einem Gast am Ruhetag "Jetzt geöffnet" zu zeigen - also unbekannt.
 */
function fenster(auf: string, zu: string): Tagesfenster | null {
  const a = minutenAus(auf);
  const z = minutenAus(zu);
  if (a === null || z === null || a === z) return null;
  return { geschlossen: false, auf: a, zu: z };
}

/**
 * Welche Tage eine Profilzeile SICHER meint. Die Zeilen eines echten Betriebs
 * entstehen in `zeilenAusOeffnungszeiten` (lib/venueAdopt.ts): Kennung "monday"
 * für einen Tag, "monday_thursday" für eine zusammengefasste Folge.
 *
 * Eine Folge gilt für jeden Tag von ihrem Anfang bis zu ihrem Ende:
 * `zeilenAusOeffnungszeiten` fasst seit 15.09.2026 nur noch lückenlose Tage
 * zusammen. Vorher übersprang es Tage, die in den Serverdaten fehlten ("Mo bis
 * Do" trotz unbekanntem Dienstag), und hier galten deshalb nur die Enden.
 *
 * Andere Kennungen (die Fixture "mo_fr") sagen nichts Verlässliches → keine Tage.
 */
export function tageDerZeile(zeile: Pick<ProfilZeile, "id">): Day[] {
  const tage = DAYS as readonly string[];
  const [von, bis, ...rest] = zeile.id.split("_");
  if (rest.length > 0 || !tage.includes(von)) return [];
  if (bis === undefined) return [von as Day];
  if (!tage.includes(bis) || tage.indexOf(von) >= tage.indexOf(bis)) return [];
  return tage.slice(tage.indexOf(von), tage.indexOf(bis) + 1) as Day[];
}

/** Der Tag laut gepflegtem Profil. Frei eingetippte Werte, die sich nicht lesen lassen → unbekannt. */
export function fensterAusProfil(zeilen: ReadonlyArray<ProfilZeile>, tag: Day): Tagesfenster | null {
  const zeile = zeilen.find((z) => tageDerZeile(z).includes(tag));
  if (!zeile) return null;
  if (zeile.closed || /geschlossen|ruhetag/i.test(zeile.value)) return { geschlossen: true };
  const m = /(\d{1,2}[:.]\d{2})\s*[–—-]\s*(\d{1,2}[:.]\d{2})/.exec(zeile.value);
  return m ? fenster(m[1], m[2]) : null;
}

/** Der Tag laut Google. Tage mit Mittagspause liefert Google hier gar nicht (places.ts führt sie in `tageMitPause`) - sie bleiben unbekannt. */
export function fensterAusGoogle(zeiten: OpeningHours | undefined, tag: Day): Tagesfenster | null {
  const eintrag = zeiten?.[tag];
  if (!eintrag) return null;
  // `"open" in` statt `closed`-Verengung - dieselbe Vorsicht wie in oeffentlichePraesenz.ts.
  return "open" in eintrag ? fenster(eintrag.open, eintrag.close) : { geschlossen: true };
}

/**
 * Das Fenster eines Wochentags: Profil vor Google, sonst unbekannt (`null`).
 *
 * Vorrang hat das Profil: Es spiegelt, was der Wirt in Maitr pflegt, und eine
 * Änderung in "Profil verwalten" soll überall sofort stimmen. Google springt
 * ein, wenn das Profil den Tag nicht sicher kennt. Weichen beide ab, meldet das
 * der Präsenzbericht als eigenen Hebel.
 */
export function fensterFuer(
  tag: Day,
  profil: ReadonlyArray<ProfilZeile>,
  google: OpeningHours | undefined,
): Tagesfenster | null {
  return fensterAusProfil(profil, tag) ?? fensterAusGoogle(google, tag);
}

/**
 * Die Geöffnet-Zeile für jetzt, oder `null`, wenn der heutige Tag unbekannt ist.
 *
 * Kennt weder Profil noch Google den Tag, fällt die Zeile weg - lieber keine
 * Auskunft als "Jetzt geöffnet" am Ruhetag.
 */
export function oeffnungsstatus(
  jetzt: Date,
  profil: ReadonlyArray<ProfilZeile>,
  google: OpeningHours | undefined,
  zeitzone: string = BETRIEBS_ZEITZONE,
): Oeffnungsstatus | null {
  const uhr = wanduhrIn(jetzt, zeitzone);
  const heute = fensterFuer(DAYS[uhr.wochentag], profil, google);
  const gestern = fensterFuer(DAYS[(uhr.wochentag + 6) % 7], profil, google);
  const minute = uhr.minute;

  // Ein Fenster über Mitternacht (18:00-2:00) gehört noch zum Vortag.
  if (gestern && !gestern.geschlossen && gestern.zu < gestern.auf && minute < gestern.zu) {
    return { label: "Jetzt geöffnet", offen: true, zusatz: `bis ${uhrzeit(gestern.zu, true)}` };
  }
  if (!heute) return null;
  if (heute.geschlossen) return { label: "Heute geschlossen", offen: false };

  const ueberMitternacht = heute.zu < heute.auf;
  if (minute >= heute.auf && (ueberMitternacht || minute < heute.zu)) {
    return { label: "Jetzt geöffnet", offen: true, zusatz: `bis ${uhrzeit(heute.zu, true)}` };
  }
  if (minute < heute.auf) {
    return { label: "Jetzt geschlossen", offen: false, zusatz: `öffnet ${uhrzeit(heute.auf)}` };
  }
  return { label: "Jetzt geschlossen", offen: false };
}

/** "Jetzt geöffnet · bis 23:00" als eine Zeile - für Stellen ohne Statuspunkt. */
export function statusZeile(status: Oeffnungsstatus): string {
  return status.zusatz ? `${status.label} · ${status.zusatz}` : status.label;
}
