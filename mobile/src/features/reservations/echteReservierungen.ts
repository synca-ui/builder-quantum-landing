/**
 * Echte Reservierungen in der App - die reinen Entscheidungen, ohne React.
 *
 * ANLASS (Integrationsprüfung 15.09., Punkte 10, 16, 20, 22): Tische und Gäste
 * zeigten jedem Betrieb die Fixture-Tage vom Juli 2025, obwohl Web-App-Buchungen
 * längst in `Reservation` liegen und der Server dafür einen Push schickt. Einen
 * Tischplan gibt es auf dem Server nicht - wohl aber die Reservierungen selbst
 * (`GET /reservations/upcoming`). Hier steht, wie die App daraus Tagesgruppen,
 * erlaubte Aktionen und eine Gästeliste macht. Getrennt vom Screen, damit es sich
 * ohne React-Native-Testaufbau prüfen lässt.
 */
import type { Reservation } from "@maitr/core";

/** Wie weit die App vorausschaut. Der Server nimmt 1-60, Vorgabe 14. */
export const RESERVIERUNGS_FENSTER_TAGE = 14;

export type ReservierungsStatus = Reservation["status"];

/**
 * Was der Betrieb an einer Reservierung ändern darf - dieselben drei Werte wie
 * `ReservierungsEntscheidung` im Core. Hier strukturell wiederholt, weil jener Typ
 * nur über den Funktions-Namensraum `api` erreichbar ist.
 */
export type Entscheidung = "confirmed" | "cancelled" | "no_show";

/** Knöpfe an einer Zeile. Getrennt von `Entscheidung`, weil die UI Verben braucht. */
export type Aktion = "bestaetigen" | "absagen" | "no_show";

export const ENTSCHEIDUNG_FUER: Record<Aktion, Entscheidung> = {
  bestaetigen: "confirmed",
  absagen: "cancelled",
  no_show: "no_show",
};

const STATUS_WERTE: readonly ReservierungsStatus[] = [
  "pending",
  "confirmed",
  "cancelled",
  "walk_in",
  "no_show",
];

/* ── Form der Antwort ──────────────────────────────────────────────────────── */

/**
 * Form prüfen, nicht nur Erfolg - dieselbe Lehre wie in `useDailyBriefing`: Ein
 * HTTP 200 von einem fremden Dienst ist auch ein Erfolg, und `Date.parse` auf
 * `undefined` rechnet still mit NaN weiter.
 */
export function istReservierung(wert: unknown): wert is Reservation {
  if (!wert || typeof wert !== "object") return false;
  const r = wert as Partial<Reservation>;
  return (
    typeof r.id === "string" &&
    r.id.length > 0 &&
    typeof r.guestName === "string" &&
    typeof r.partySize === "number" &&
    Number.isFinite(r.partySize) &&
    typeof r.start === "string" &&
    Number.isFinite(Date.parse(r.start)) &&
    typeof r.status === "string" &&
    STATUS_WERTE.includes(r.status as ReservierungsStatus)
  );
}

/**
 * Antwort von `upcoming` → Liste, aufsteigend nach Beginn. `null`, wenn die Antwort
 * gar keine Liste ist - das ist ein Fehler, keine leere Woche.
 *
 * Einzelne kaputte Zeilen fallen heraus: Ohne gültigen Beginn lässt sich eine
 * Reservierung keinem Tag zuordnen, und eine Zeile ohne Id ließe sich nicht
 * bestätigen. Der Rest der Woche soll daran nicht scheitern.
 */
export function reservierungenAus(roh: unknown): Reservation[] | null {
  if (!Array.isArray(roh)) return null;
  return roh.filter(istReservierung).sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

/* ── Zeit in Europe/Berlin ─────────────────────────────────────────────────── */

export interface Wanduhr {
  jahr: number;
  /** 1-12 */
  monat: number;
  tag: number;
  stunde: number;
  minute: number;
  /** 0 = Sonntag */
  wochentag: number;
}

/** UTC-Zeitpunkt des letzten Sonntags eines Monats, 01:00 UTC (EU-Umstellzeit). */
function letzterSonntagEinsUhrUtc(jahr: number, monatIndex: number): number {
  const letzterTag = new Date(Date.UTC(jahr, monatIndex + 1, 0));
  const sonntag = letzterTag.getUTCDate() - letzterTag.getUTCDay();
  return Date.UTC(jahr, monatIndex, sonntag, 1);
}

/**
 * Wanduhr in Europe/Berlin, nach der EU-Sommerzeitregel gerechnet statt über
 * `Intl` mit `timeZone`.
 *
 * WARUM: Die App kennt die Zeitzone des Betriebs nicht (sie steht nicht im Store),
 * und die Gerätezeit ist nicht zwingend Berlin - ein Wirt im Urlaub sähe sonst
 * seine 19-Uhr-Buchungen um 18 Uhr. `Intl` mit `timeZone` rechnet zwar richtig,
 * schreibt aber je nach Engine anders ("Sep" in Hermes, "Sept." in neueren
 * ICU-Ständen von Node) - Beschriftungen und Tests liefen auseinander. Die Regel
 * (letzter Sonntag im März bis letzter Sonntag im Oktober, jeweils 01:00 UTC)
 * gilt seit 1996 unverändert. Kommt `Business.timezone` einmal in die App, gehört
 * die Zone hier als Parameter hinein.
 */
export function wanduhrBerlin(ms: number): Wanduhr {
  const jahr = new Date(ms).getUTCFullYear();
  const sommerzeit =
    ms >= letzterSonntagEinsUhrUtc(jahr, 2) && ms < letzterSonntagEinsUhrUtc(jahr, 9);
  const lokal = new Date(ms + (sommerzeit ? 2 : 1) * 3_600_000);
  return {
    jahr: lokal.getUTCFullYear(),
    monat: lokal.getUTCMonth() + 1,
    tag: lokal.getUTCDate(),
    stunde: lokal.getUTCHours(),
    minute: lokal.getUTCMinutes(),
    wochentag: lokal.getUTCDay(),
  };
}

const zwei = (n: number) => String(n).padStart(2, "0");

/** Kalendertag in Berlin als Schlüssel: "2026-09-17". */
export function tagesSchluessel(ms: number): string {
  const w = wanduhrBerlin(ms);
  return `${w.jahr}-${zwei(w.monat)}-${zwei(w.tag)}`;
}

/** Schlüssel des Folgetags - über den Kalender, nicht über +24 h (Umstellungstage). */
function folgetag(schluessel: string): string {
  const [j, m, t] = schluessel.split("-").map(Number);
  const d = new Date(Date.UTC(j, m - 1, t + 1));
  return `${d.getUTCFullYear()}-${zwei(d.getUTCMonth() + 1)}-${zwei(d.getUTCDate())}`;
}

const WOCHENTAGE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

/** "Heute", "Morgen" oder "Mi, 17. Sep". */
export function tagesTitel(ms: number, jetzt: number): string {
  const schluessel = tagesSchluessel(ms);
  const heute = tagesSchluessel(jetzt);
  if (schluessel === heute) return "Heute";
  if (schluessel === folgetag(heute)) return "Morgen";
  const w = wanduhrBerlin(ms);
  return `${WOCHENTAGE[w.wochentag]}, ${w.tag}. ${MONATE[w.monat - 1]}`;
}

/** "19:00" */
export function uhrzeit(ms: number): string {
  const w = wanduhrBerlin(ms);
  return `${zwei(w.stunde)}:${zwei(w.minute)}`;
}

/** "Heute · 19:00", "Mi, 17. Sep · 19:00" */
export function tagUndUhrzeit(ms: number, jetzt: number): string {
  return `${tagesTitel(ms, jetzt)} · ${uhrzeit(ms)}`;
}

/* ── Texte ─────────────────────────────────────────────────────────────────── */

export function personenText(anzahl: number): string {
  return anzahl === 1 ? "1 Person" : `${anzahl} Personen`;
}

export function anfragenOffenText(anzahl: number): string {
  if (anzahl === 0) return "Keine Anfrage offen";
  return anzahl === 1 ? "1 Anfrage offen" : `${anzahl} Anfragen offen`;
}

export const STATUS_TEXT: Record<ReservierungsStatus, string> = {
  pending: "Anfrage",
  confirmed: "Bestätigt",
  cancelled: "Abgesagt",
  walk_in: "Walk-in",
  no_show: "Nicht erschienen",
};

/** Woher die Buchung kam. `null` für unbekannte Quellen - lieber nichts als geraten. */
export function quelleText(source: string | undefined): string | null {
  switch (source) {
    case "website":
      return "Web-App";
    case "maitr":
      return "App";
    case "walk_in":
      return "Walk-in";
    default:
      return null;
  }
}

/**
 * `tel:`-Adresse aus einer frei eingegebenen Nummer. Leerzeichen, Schrägstriche
 * und Klammern stören manche Wählprogramme; `+` bleibt für Auslandsnummern.
 * `null`, wenn kaum Ziffern drin sind ("—", "keine").
 */
export function telefonLink(telefon: string | undefined): string | null {
  if (!telefon) return null;
  const bereinigt = telefon.trim().replace(/[^\d+]/g, "");
  const ziffern = bereinigt.replace(/\D/g, "");
  if (ziffern.length < 3) return null;
  // Ein "+" mitten in der Nummer ist ein Tippfehler, kein Ländercode.
  const vorne = bereinigt.startsWith("+") ? "+" : "";
  return `tel:${vorne}${ziffern}`;
}

/* ── Aktionen ──────────────────────────────────────────────────────────────── */

/**
 * Welche Knöpfe eine Zeile zeigt. Spiegelt die Regeln von
 * `PATCH /reservations/:id/status`, damit kein Knopf erscheint, den der Server
 * mit 400 ablehnt:
 *  - Anfrage → Bestätigen oder Absagen.
 *  - Bestätigt und begonnen → No-Show (vorher lehnt der Server ihn ab: eine
 *    Absage unter falschem Namen verfälschte die No-Show-Quote).
 *  - Bestätigt und in der Zukunft → Absagen.
 *  - Abgesagt, No-Show, Walk-in → nichts. Der Walk-in sitzt schon.
 *
 * Grenzfall, den die Liste nicht sehen kann: Der Server bildet auch ARRIVED und
 * COMPLETED auf "confirmed" ab. Ein No-Show auf eine abgeschlossene Zeile lehnt er
 * mit "bereits abgeschlossen" ab - der Text erscheint dann an der Zeile.
 */
export function erlaubteAktionen(r: Reservation, jetzt: number): Aktion[] {
  switch (r.status) {
    case "pending":
      return ["bestaetigen", "absagen"];
    case "confirmed":
      return Date.parse(r.start) <= jetzt ? ["no_show"] : ["absagen"];
    default:
      return [];
  }
}

export const AKTION_TEXT: Record<Aktion, string> = {
  bestaetigen: "Bestätigen",
  absagen: "Absagen",
  no_show: "No-Show",
};

/** Kurze Meldung, nachdem der Server die Änderung bestätigt hat. */
export const ERFOLG_TEXT: Record<Aktion, string> = {
  bestaetigen: "Reservierung bestätigt",
  absagen: "Reservierung abgesagt",
  no_show: "Als No-Show markiert",
};

export interface Rueckfrage {
  titel: string;
  text: string;
  bestaetigen: string;
}

/**
 * Rückfrage vor Absagen und No-Show - beide lassen sich in der App nicht
 * zurücknehmen. Bestätigen fragt nicht nach: Es ist der Normalfall und umkehrbar.
 *
 * Der Text sagt ehrlich, ob der Gast etwas erfährt. Der Server schickt eine Mail
 * NUR beim Übergang aus einer Anfrage und nur, wenn der Gast eine E-Mail
 * hinterlassen hat; eine bestätigte Reservierung abzusagen benachrichtigt niemanden.
 */
export function rueckfrage(aktion: Aktion, r: Reservation, jetzt: number): Rueckfrage | null {
  const ms = Date.parse(r.start);
  const name = r.guestName.trim() || "Ohne Namen";
  if (aktion === "absagen") {
    const benachrichtigung =
      r.status === "pending"
        ? r.email
          ? `Maitr schickt die Absage an ${r.email}.`
          : "Der Gast hat keine E-Mail hinterlassen und erfährt die Absage nicht automatisch."
        : r.phone
          ? "Der Gast wird nicht automatisch benachrichtigt - ruf ihn am besten an."
          : "Der Gast wird nicht automatisch benachrichtigt.";
    return {
      titel: "Reservierung absagen?",
      text: `${name} · ${tagUndUhrzeit(ms, jetzt)} · ${personenText(r.partySize)}.\n\n${benachrichtigung}`,
      bestaetigen: "Absagen",
    };
  }
  if (aktion === "no_show") {
    return {
      titel: "Als No-Show markieren?",
      text: `${name} ist zu ${uhrzeit(ms)} Uhr nicht erschienen. Das lässt sich danach nicht mehr ändern.`,
      bestaetigen: "No-Show",
    };
  }
  return null;
}

/* ── Fehler ────────────────────────────────────────────────────────────────── */

/**
 * Fehler → Satz für die Oberfläche. Nie "keine Reservierungen", wenn die Liste
 * nur nicht abrufbar war. Liest `status` und `message` strukturell (Form von
 * `ApiError`), damit dieses Modul ohne Laufzeit-Import aus dem Core auskommt.
 */
export function fehlerText(fehler: unknown, wo: "laden" | "zeile"): string {
  const status = (fehler as { status?: unknown })?.status;
  const nachricht = (fehler as { message?: unknown })?.message;

  if (status === 401) return "Deine Anmeldung ist abgelaufen. Melde dich neu an.";
  if (status === 403) return "Für diesen Betrieb fehlt deinem Konto der Zugriff.";
  if (status === 404) {
    return wo === "laden"
      ? "Der Server kennt diese Abfrage noch nicht. Die App ist vermutlich neuer als der Server."
      : "Diese Reservierung gibt es nicht mehr.";
  }
  // 400 trägt die Begründung des Servers ("Ein No-Show geht erst ab Beginn …",
  // "bereits abgeschlossen") - die ist genauer als jeder Satz von hier.
  if (status === 400 && typeof nachricht === "string" && nachricht.trim()) return nachricht;
  // ANLASS (Prüfung 15.09.): Hier stand für Zeilen "Keine Verbindung zum Server.
  // Nichts wurde geändert." Der Server schreibt den Status aber, BEVOR er die Mail
  // an den Gast abwartet und antwortet. Nach Timeout (15 s im Core), Abbruch,
  // 5xx oder einer Antwort in falscher Form weiß die App nicht, ob die Absage samt
  // Mail schon durch ist - wer dann "Bestätigen" tippt, weil angeblich nichts
  // geschah, macht aus der Absage beim Gast eine stille Bestätigung.
  if (wo === "zeile" && unklarObGeaendert(fehler)) {
    return "Keine klare Antwort vom Server - ob die Änderung durchging, ist unklar. Die Liste wird neu geladen.";
  }
  if (typeof status === "number" && status >= 500) {
    return "Der Server hatte gerade einen Fehler. Versuch es gleich noch einmal.";
  }
  if (typeof status !== "number") {
    return "Reservierungen ließen sich nicht abrufen. Prüfe die Verbindung.";
  }
  // Übrige 4xx lehnt der Server vor dem Schreiben ab (Anmeldung, Zugriff, Eingabe).
  return wo === "laden"
    ? "Reservierungen ließen sich nicht abrufen."
    : "Das hat nicht geklappt. Nichts wurde geändert.";
}

/**
 * Ob nach einem gescheiterten Statuswechsel offen ist, was der Server gespeichert
 * hat: kein HTTP-Status (Timeout, Netz, unerwartete Antwortform) oder 5xx. Dann
 * muss die Liste neu geholt werden, statt die alten Knöpfe stehen zu lassen.
 */
export function unklarObGeaendert(fehler: unknown): boolean {
  const status = (fehler as { status?: unknown })?.status;
  return typeof status !== "number" || status >= 500;
}

/* ── Tagesgruppen ──────────────────────────────────────────────────────────── */

export interface TagesGruppe {
  schluessel: string;
  titel: string;
  reservierungen: Reservation[];
  /** Anfragen, die noch jemand bestätigen oder absagen muss. */
  anfragenOffen: number;
  /** Personen aus bestätigten Reservierungen und Walk-ins - wer sicher kommt. */
  personenBestaetigt: number;
}

/** Nach Kalendertag in Berlin gruppieren, Tage und Zeilen aufsteigend. */
export function gruppiereNachTag(reservierungen: Reservation[], jetzt: number): TagesGruppe[] {
  const nachTag = new Map<string, Reservation[]>();
  const sortiert = [...reservierungen].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  for (const r of sortiert) {
    const schluessel = tagesSchluessel(Date.parse(r.start));
    const liste = nachTag.get(schluessel);
    if (liste) liste.push(r);
    else nachTag.set(schluessel, [r]);
  }
  return [...nachTag.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([schluessel, zeilen]) => ({
      schluessel,
      titel: tagesTitel(Date.parse(zeilen[0].start), jetzt),
      reservierungen: zeilen,
      anfragenOffen: zeilen.filter((r) => r.status === "pending").length,
      personenBestaetigt: zeilen
        .filter((r) => r.status === "confirmed" || r.status === "walk_in")
        .reduce((summe, r) => summe + r.partySize, 0),
    }));
}

/** "2 Anfragen offen · 6 Personen bestätigt" - leere Teile fallen weg. */
export function tagesZusammenfassung(gruppe: TagesGruppe): string {
  const teile: string[] = [];
  if (gruppe.anfragenOffen > 0) teile.push(anfragenOffenText(gruppe.anfragenOffen));
  if (gruppe.personenBestaetigt > 0) teile.push(`${personenText(gruppe.personenBestaetigt)} bestätigt`);
  return teile.length ? teile.join(" · ") : "Nichts bestätigt";
}

export function anfragenOffen(reservierungen: Reservation[]): number {
  return reservierungen.filter((r) => r.status === "pending").length;
}

/**
 * Die nächste bestätigte Ankunft ab jetzt. Anfragen zählen nicht - ob sie kommen,
 * steht noch nicht fest, und dafür gibt es den Zähler "Anfragen offen".
 */
export function naechsteAnkunft(reservierungen: Reservation[], jetzt: number): Reservation | null {
  let beste: Reservation | null = null;
  for (const r of reservierungen) {
    if (r.status !== "confirmed") continue;
    const ms = Date.parse(r.start);
    if (ms < jetzt) continue;
    if (!beste || ms < Date.parse(beste.start)) beste = r;
  }
  return beste;
}

/* ── Gäste aus Reservierungen ──────────────────────────────────────────────── */

export interface GastAusReservierungen {
  schluessel: string;
  /** Name aus der jüngsten Reservierung - Gäste schreiben sich nicht immer gleich. */
  name: string;
  telefon?: string;
  /** Reservierungen außer Absagen (Anfragen, bestätigt, No-Shows). */
  buchungen: number;
  abgesagt: number;
  noShows: number;
  naechste: Reservation | null;
  letzte: Reservation | null;
}

/**
 * Vergleichsform einer Telefonnummer: nur Ziffern, "+49"/"0049" wie "0". Unter
 * sechs Ziffern ist es keine Nummer, über die sich Gäste sicher zuordnen lassen.
 */
export function telefonSchluessel(telefon: string | undefined): string | null {
  if (!telefon) return null;
  const roh = telefon.trim();
  let ziffern = roh.replace(/\D/g, "");
  if (ziffern.startsWith("0049")) ziffern = `0${ziffern.slice(4)}`;
  else if (roh.startsWith("+49")) ziffern = `0${ziffern.slice(2)}`;
  return ziffern.length >= 6 ? ziffern : null;
}

/** "  Marie   WEBER " → "marie weber" */
export function namensSchluessel(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Der Server trägt Walk-ins ohne Namen als "Walk-in" ein - das ist kein Gast. */
const PLATZHALTER_NAMEN = new Set(["", "walk-in", "walk in", "walkin"]);

/**
 * Gästeliste aus den geladenen Reservierungen.
 *
 * Nur, was die Daten hergeben: kein Umsatzwert, keine Stammgast-Segmente, keine
 * Tags. Zuordnung über die Telefonnummer, wo eine da ist - zwei "M. Weber" sind
 * sonst ein Gast. Eine Reservierung OHNE Nummer landet bei dem Gast mit
 * gleichem Namen, wenn es genau einen solchen mit Nummer gibt; bei mehreren
 * wäre das geraten, dann bleibt sie ein eigener Eintrag.
 *
 * Sortierung: wer als Nächstes kommt, zuerst; danach, wer zuletzt da war.
 */
export function gaesteAusReservierungen(
  reservierungen: Reservation[],
  jetzt: number,
): GastAusReservierungen[] {
  const gruppen = new Map<string, Reservation[]>();
  const nummernJeName = new Map<string, Set<string>>();
  const ohneNummer: Reservation[] = [];

  const hinzu = (schluessel: string, r: Reservation) => {
    const liste = gruppen.get(schluessel);
    if (liste) liste.push(r);
    else gruppen.set(schluessel, [r]);
  };

  for (const r of reservierungen) {
    const name = namensSchluessel(r.guestName);
    const nummer = telefonSchluessel(r.phone);
    if (!nummer) {
      if (!PLATZHALTER_NAMEN.has(name)) ohneNummer.push(r);
      continue;
    }
    hinzu(`tel:${nummer}`, r);
    if (!PLATZHALTER_NAMEN.has(name)) {
      const nummern = nummernJeName.get(name) ?? new Set<string>();
      nummern.add(nummer);
      nummernJeName.set(name, nummern);
    }
  }

  for (const r of ohneNummer) {
    const name = namensSchluessel(r.guestName);
    const nummern = nummernJeName.get(name);
    if (nummern && nummern.size === 1) hinzu(`tel:${[...nummern][0]}`, r);
    else hinzu(`name:${name}`, r);
  }

  const gaeste: GastAusReservierungen[] = [];
  for (const [schluessel, zeilen] of gruppen) {
    const nachBeginn = [...zeilen].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
    const juengste = nachBeginn[nachBeginn.length - 1];
    const telefon = [...nachBeginn].reverse().find((r) => telefonSchluessel(r.phone))?.phone;

    const naechste =
      nachBeginn.find(
        (r) => Date.parse(r.start) >= jetzt && (r.status === "pending" || r.status === "confirmed"),
      ) ?? null;
    const letzte =
      [...nachBeginn].reverse().find((r) => Date.parse(r.start) < jetzt && r.status !== "cancelled") ??
      null;

    gaeste.push({
      schluessel,
      name: juengste.guestName.trim() || "Ohne Namen",
      ...(telefon ? { telefon } : {}),
      buchungen: zeilen.filter((r) => r.status !== "cancelled").length,
      abgesagt: zeilen.filter((r) => r.status === "cancelled").length,
      noShows: zeilen.filter((r) => r.status === "no_show").length,
      naechste,
      letzte,
    });
  }

  return gaeste.sort((a, b) => {
    if (a.naechste && b.naechste) return Date.parse(a.naechste.start) - Date.parse(b.naechste.start);
    if (a.naechste) return -1;
    if (b.naechste) return 1;
    if (a.letzte && b.letzte) return Date.parse(b.letzte.start) - Date.parse(a.letzte.start);
    if (a.letzte) return -1;
    if (b.letzte) return 1;
    return a.name.localeCompare(b.name, "de");
  });
}

/** "3 Buchungen · 1 abgesagt · 1 No-Show" */
export function gastZusammenfassung(gast: GastAusReservierungen): string {
  const teile = [
    gast.buchungen === 1 ? "1 Buchung" : gast.buchungen === 0 ? "Keine Buchung" : `${gast.buchungen} Buchungen`,
  ];
  if (gast.abgesagt > 0) teile.push(`${gast.abgesagt} abgesagt`);
  if (gast.noShows > 0) teile.push(gast.noShows === 1 ? "1 No-Show" : `${gast.noShows} No-Shows`);
  return teile.join(" · ");
}
