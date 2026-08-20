/**
 * Fachlogik der Stempelkarte — Programm, Karten, Hauptbuch.
 *
 * Die Routen in `routes.ts` bleiben duenn: sie lesen `req.venueId`, pruefen den
 * Rumpf und rufen genau eine Funktion von hier. Alles, was man nachrechnen koennen
 * muss, steht in dieser Datei an EINER Stelle.
 *
 * ─── DIE DREI REGELN, DIE HIER ALLES TRAGEN ─────────────────────────────────
 *
 * 1) DAS HAUPTBUCH IST DIE WAHRHEIT, `currentStamps` IST NUR EIN LESE-CACHE.
 *    So steht es im Schemakommentar, und es ist keine Feinheit: der Cache kann
 *    auseinanderlaufen (abgebrochene Transaktion, spaeterer Importlauf, ein
 *    zweiter Schreibpfad, den es heute noch nicht gibt). Deshalb kommt JEDE Zahl,
 *    die jemand nachrechnen koennte — Uebersicht, Kartendetail, die Pruefung beim
 *    Stempeln — aus der Summe der `StampEvent.delta`. Der Cache wird nur noch
 *    als Vergleichswert mitgefuehrt (`cacheAbweichungen`, `cacheStand`), damit
 *    eine Abweichung SICHTBAR wird statt still zu wirken. Und der Stempelpfad
 *    SETZT `currentStamps` auf den Hauptbuchstand, statt blind zu inkrementieren:
 *    ein einmal verrutschter Cache heilt damit beim naechsten Stempel von selbst.
 *
 * 2) JEDE ABFRAGE FUEHRT `businessId` AUS `req.venueId` IN DER WHERE-KLAUSEL.
 *    Auch die Detailabrufe. Ein `findUnique({ where: { id } })` gibt es hier
 *    nirgends: die id steht im Pfad, ist eine uuid und damit kein Geheimnis. Der
 *    zusammengesetzte Fremdschluessel des Schemas schuetzt das SCHREIBEN, nicht
 *    das LESEN.
 *
 * 3) EINE AENDERUNG AM PROGRAMM DARF EINER LAUFENDEN KARTE NICHTS NEHMEN.
 *    `maxStamps` traegt die Karte seit jeher als Snapshot. Fuer `rewardText` fehlte
 *    dieser Snapshot — siehe `praemieFestschreiben()` weiter unten und die neue
 *    Spalte `StampCard.rewardText` (Migration 20260806_add_stampcard_reward_snapshot,
 *    NOCH NICHT EINGESPIELT).
 *
 * ─── WAS HIER BEWUSST NICHT STEHT ───────────────────────────────────────────
 * Kein Sendepfad, kein "alle benachrichtigen". Der Apple-Wallet-Push traegt
 * keinen Text (er sagt dem Geraet nur "hol den Pass neu"); Passbau, APNs und
 * Google-Save-Link liegen in server/wallet/ — diese Datei bleibt die reine
 * Fachlogik, und die Routen stossen den Versand NACH der Buchung an.
 */
import { createHash, randomBytes, randomUUID } from "node:crypto";
// Pass-Token: dieselbe AES-256-GCM-Huelle wie die OAuth-Tokens des Moduls.
// Alias-Namen, damit an der Verwendungsstelle steht, WAS verschluesselt wird.
import {
  encryptToken as verschluesselePassToken,
  decryptToken as entschluesselePassToken,
} from "./security";
import { zuE164 } from "../../shared/telefon";
import { prisma } from "../db/prisma";
import { walletReadiness, type WalletReadiness } from "../wallet/env";

const TAG_MS = 86_400_000;

/** Ab wann eine angefangene Karte als eingeschlafen gilt. */
export const EINGESCHLAFEN_TAGE = 30;
/** Zeitraum der Kennzahl "Praemien eingeloest". */
export const EINGELOEST_TAGE = 30;
/**
 * Ab wie vielen abgeschlossenen Karten die Durchlaufdauer ueberhaupt gezeigt wird.
 * Darunter ist sie kein Messwert, sondern Zufall — und eine Zahl, die wie ein
 * Messergebnis aussieht, ist schlimmer als keine.
 */
export const MEDIAN_MINDESTZAHL = 5;
/** "Kurz vor der Praemie" = es fehlen ein oder zwei Stempel. */
export const FASTVOLL_ABSTAND = 2;
/** Vorgabe und Obergrenze der Seitengroesse in der Kartenliste. */
export const SEITE_VORGABE = 20;
export const SEITE_MAX = 100;
/**
 * Wie viele Karten fuer die JS-seitigen Filter hoechstens geladen werden.
 *
 * "Kurz vor der Praemie" und "eingeschlafen" lassen sich nicht als WHERE-Klausel
 * ausdruecken: Prisma kann zwei Spalten nicht vergleichen, und der Stand kommt
 * ohnehin aus dem Hauptbuch. Statt `$queryRaw` (mehr Risiko als Nutzen bei diesen
 * Mengen) wird begrenzt geladen und in JS gefiltert. Wird die Grenze erreicht,
 * sagt die Antwort das mit `abgeschnitten: true` — lieber sichtbar unvollstaendig
 * als still falsch.
 */
export const FILTER_OBERGRENZE = 500;
/** Groesse der `in`-Bloecke gegen das Hauptbuch. */
const IN_BLOCK = 500;
/** Vorgabe und Obergrenze der Verlaufslaenge im Kartendetail. */
export const VERLAUF_VORGABE = 50;
export const VERLAUF_MAX = 200;

/** Anzeigename eines anonymisierten Gastes. Der echte Name verlaesst den Server nie. */
export const GELOESCHTER_GAST = "Gelöschter Gast";
/** Platzhalter, der beim Anonymisieren IN die Zeile geschrieben wird. */
export const ANONYM_PLATZHALTER = GELOESCHTER_GAST;

/* ── Ein typisierter Zugang zu Prisma ────────────────────────────────────── */

/**
 * Der generierte Prisma-Client liegt in diesem Baum nicht (`node_modules/.prisma`
 * fehlt), `prisma` ist damit zur Uebersetzungszeit `any`. Statt das durch die ganze
 * Datei zu tragen, wird EINMAL auf diese Beschreibung gecastet. Sie prueft nicht die
 * `where`-Klauseln — das kann ohne generierten Client niemand —, aber sie legt fest,
 * WELCHE Tabellen und WELCHE Operationen dieses Modul ueberhaupt anfasst. Ein
 * `delete` auf `maitrGuest` ist hier nicht vorgesehen und faellt beim Schreiben auf,
 * nicht erst im Betrieb (Begruendung: an MaitrGuest haengen per Cascade die Karten
 * und darueber das Hauptbuch — "Gast loeschen" waere ein Loeschknopf fuer
 * Beweismittel).
 */
type TxArgs = Record<string, unknown>;

interface TxDelegate {
  findFirst<Z>(args: TxArgs): Promise<Z | null>;
  findMany<Z>(args: TxArgs): Promise<Z[]>;
  create<Z>(args: TxArgs): Promise<Z>;
  count(args: TxArgs): Promise<number>;
  updateMany(args: TxArgs): Promise<{ count: number }>;
  deleteMany(args: TxArgs): Promise<{ count: number }>;
  aggregate<Z>(args: TxArgs): Promise<Z>;
  groupBy<Z>(args: TxArgs): Promise<Z[]>;
}

interface LoyaltyTx {
  stampProgram: TxDelegate;
  stampCard: TxDelegate;
  stampEvent: TxDelegate;
  maitrGuest: TxDelegate;
  walletDeviceRegistration: TxDelegate;
  /**
   * Nur `create`. Das Hauptbuch dieses Moduls sind die StampEvents; ins AuditLog
   * schreibt hier ausschliesslich die Anonymisierung — der einzige unumkehrbare
   * Schreibzugriff, der KEIN Hauptbuchereignis erzeugt und deshalb sonst spurlos
   * bliebe.
   */
  auditLog: Pick<TxDelegate, "create">;
}

interface LoyaltyDb extends LoyaltyTx {
  $transaction<T>(fn: (tx: LoyaltyTx) => Promise<T>): Promise<T>;
}

const db = prisma as unknown as LoyaltyDb;

/* ── Zeilen- und Antwortformen ───────────────────────────────────────────── */

/**
 * WARUM DIE ERGEBNISTYPEN UNTEN AUF `art: "..."` UNTERSCHEIDEN UND NICHT AUF
 * `ok: true | false`.
 *
 * Die tsconfig dieses Projekts hat `strictNullChecks: false`. Damit weitet
 * TypeScript boolesche Literaltypen, und die Verengung ueber einen booleschen
 * Unterscheider FUNKTIONIERT NICHT — `if (!ergebnis.ok) ergebnis.fehler` ist ein
 * Uebersetzungsfehler ("Property 'fehler' does not exist"), obwohl der Code
 * offensichtlich richtig ist. Bei einem Unterscheider aus Zeichenketten greift die
 * Verengung dagegen auch ohne strictNullChecks. Wer das nicht weiss, baut die Typen
 * um, bis sie "irgendwie" durchgehen, und verliert dabei die Prueffaehigkeit.
 */
export type KartenStatus = "ACTIVE" | "COMPLETED" | "REDEEMED" | "EXPIRED" | "VOIDED";
export type EreignisArt = "EARNED" | "REDEEMED" | "CORRECTION" | "VOIDED";
export type EreignisQuelle = "QR_SCAN" | "MANUAL" | "IMPORT" | "MOCK";

/** Zustaende, in denen eine Karte noch ein offenes Versprechen traegt. */
const OFFENE_ZUSTAENDE: KartenStatus[] = ["ACTIVE", "COMPLETED"];

interface ProgramRow {
  id: string;
  name: string;
  maxStamps: number;
  rewardText: string;
  isActive: boolean;
  cooldownSeconds: number;
  validityDays: number | null;
  applePassTypeIdentifier: string | null;
  googleClassId: string | null;
}

/**
 * Was vom Programm gelesen wird — und was ausdruecklich NICHT.
 *
 * `designJson` und `googleIssuerId` stehen hier nicht: sie werden nicht angezeigt
 * und nicht gebraucht. `applePassTypeIdentifier`/`googleClassId` werden gelesen, aber
 * nie ausgeliefert; aus ihnen entsteht nur das abgeleitete `walletStatus`.
 */
const PROGRAM_SELECT = {
  id: true,
  name: true,
  maxStamps: true,
  rewardText: true,
  isActive: true,
  cooldownSeconds: true,
  validityDays: true,
  applePassTypeIdentifier: true,
  googleClassId: true,
} as const;

export interface Program {
  id: string;
  name: string;
  maxStamps: number;
  rewardText: string;
  isActive: boolean;
  cooldownSeconds: number;
  validityDays: number | null;
  /**
   * Abgeleitet aus dem Vorhandensein der Kennungen. Die Kennungen selbst gehen NICHT
   * ueber die Grenze: `applePassTypeIdentifier` wird serverseitig aus der Umgebung
   * gesetzt, `googleClassId` ist unveraenderlich, sobald ein Objekt darauf zeigt —
   * ein Eingabefeld dafuer waere ein Weg, die Darstellung auf ausgelieferten Karten
   * FREMDER Betriebe zu aendern.
   */
  walletStatus: { apple: boolean; google: boolean };
}

function toProgram(row: ProgramRow): Program {
  return {
    id: row.id,
    name: row.name,
    maxStamps: row.maxStamps,
    rewardText: row.rewardText,
    isActive: row.isActive,
    cooldownSeconds: row.cooldownSeconds,
    validityDays: row.validityDays ?? null,
    walletStatus: {
      apple: Boolean(row.applePassTypeIdentifier),
      google: Boolean(row.googleClassId),
    },
  };
}

interface GastRow {
  id: string;
  name: string;
  anonymizedAt: Date | null;
  isMock: boolean;
}

export interface GastAnzeige {
  id: string;
  anzeigename: string;
  geloescht: boolean;
  istBeispiel: boolean;
}

/**
 * Gastzeile → Anzeige. Die Ersetzung passiert SERVERSEITIG, nicht im Bildschirm:
 * ein anonymisierter Gast darf gar nicht erst als Name ueber die Grenze gehen. Die
 * Zeile selbst bleibt sichtbar — die Karte und ihr Hauptbuch gehoeren dem Betrieb.
 * Kontaktdaten (phone/phoneE164/email) werden hier nirgends gelesen: in einer Liste
 * sind sie nicht zweckgedeckt.
 */
function toGast(g: GastRow | null | undefined): GastAnzeige {
  if (!g) {
    // Kann nach dem Schema nicht vorkommen (guestId ist NOT NULL). Trotzdem
    // beantwortet: ein `undefined.name` waere ein 500er auf einer Leseansicht.
    return { id: "", anzeigename: GELOESCHTER_GAST, geloescht: true, istBeispiel: false };
  }
  const geloescht = g.anonymizedAt !== null && g.anonymizedAt !== undefined;
  return {
    id: g.id,
    anzeigename: geloescht ? GELOESCHTER_GAST : g.name,
    geloescht,
    istBeispiel: Boolean(g.isMock),
  };
}

interface KartenRow {
  id: string;
  programId: string;
  guestId: string;
  cycle: number;
  currentStamps: number;
  maxStamps: number;
  rewardText: string | null;
  redeemedCount: number;
  status: KartenStatus;
  version: number;
  createdAt: Date;
  completedAt: Date | null;
  redeemedAt: Date | null;
  expiresAt: Date | null;
  guest?: GastRow | null;
}

const KARTEN_SELECT = {
  id: true,
  programId: true,
  guestId: true,
  cycle: true,
  currentStamps: true,
  maxStamps: true,
  rewardText: true,
  redeemedCount: true,
  status: true,
  version: true,
  createdAt: true,
  completedAt: true,
  redeemedAt: true,
  expiresAt: true,
  guest: { select: { id: true, name: true, anonymizedAt: true, isMock: true } },
} as const;

export interface KartenZeile {
  id: string;
  stand: { current: number; max: number };
  status: KartenStatus;
  cycle: number;
  /** Zeitpunkt des letzten Hauptbucheintrags dieser Karte, ISO. */
  letzterStempelAt: string | null;
  gast: GastAnzeige;
}

export interface KartenSeite {
  items: KartenZeile[];
  /** Undurchsichtig fuer den Aufrufer. Heute ein Versatz, spaeter evtl. ein Schluessel. */
  nextCursor: string | null;
  /** Nur bei den JS-gefilterten Ansichten: die Obergrenze wurde erreicht. */
  abgeschnitten: boolean;
}

export interface KartenDetail {
  id: string;
  programId: string;
  /** `current` kommt aus dem HAUPTBUCH — das Detail ist die Ansicht im Streitfall. */
  stand: { current: number; max: number };
  /** Was der Lese-Cache sagt. Weicht er ab, ist das hier sichtbar statt still. */
  cacheStand: number;
  status: KartenStatus;
  cycle: number;
  redeemedCount: number;
  /** Die Zusage DIESER Karte. Siehe `rewardTextQuelle`. */
  rewardText: string;
  /**
   * "karte" = der beim Ausgeben festgeschriebene Snapshot. "programm" = Rueckfall,
   * weil die Karte vor der Migration 20260806 entstanden ist. Nur im zweiten Fall
   * wirkt eine Praemienaenderung rueckwirkend — und genau dieser Fall wird von
   * `praemieFestschreiben()` beim naechsten Speichern beseitigt.
   */
  rewardTextQuelle: "karte" | "programm";
  ausgegebenAm: string;
  gueltigBis: string | null;
  vollSeit: string | null;
  eingeloestAm: string | null;
  gast: GastAnzeige;
  /** Apple-Geraete, die diesen Pass registriert haben. Google taucht hier nie auf. */
  walletGeraete: number;
}

export interface EreignisZeile {
  id: string;
  createdAt: string;
  kind: EreignisArt;
  delta: number;
  balanceAfter: number;
  source: EreignisQuelle;
  /**
   * Name des Mitarbeiters oder `null` ("nicht mehr zuordenbar"). Bleibt in der
   * BETRIEBSansicht, weil Missbrauchspruefung der ausdrueckliche Zweck des
   * Hauptbuchs ist — gehoert aber nicht in einen spaeteren Auskunftsexport an den
   * Gast: das ist ein Personaldatum, kein Gastdatum.
   */
  staffName: string | null;
  deviceLabel: string | null;
  note: string | null;
}

export interface Uebersicht {
  /** Alle je in diesem Programm ausgegebenen Karten. Trennt "leer" von "0". */
  gesamt: number;
  aktiv: number;
  /**
   * Karten in OFFENE_ZUSTAENDE — also ACTIVE **und** COMPLETED.
   *
   * EIGENES FELD UND NICHT `aktiv + voll`. Der Bildschirm warnt vor einer
   * Praemienaenderung mit einer Zahl, und diese Zahl muss dieselbe Menge meinen wie
   * `praemieFestschreiben()`, das ueber OFFENE_ZUSTAENDE laeuft. Vorher stand dort
   * `aktiv` — die volle Karte des Gastes, der morgen seinen Kaffee abholt, fehlte
   * damit in genau der Warnung, die es fuer sie gibt. `aktiv + voll` waere kein
   * Ersatz: `voll` zaehlt aus dem Hauptbuch, `aktiv` aus dem Status, und eine
   * ACTIVE-Karte mit vollem Hauptbuch stuende in beiden.
   */
  offeneKarten: number;
  fastVoll: number;
  /** Volle, noch nicht eingeloeste Karten — das offene Versprechen des Wirts. */
  voll: number;
  eingeschlafen: number;
  /**
   * GAESTE mit mehr als einer Karte, nicht Folgekarten.
   *
   * Vorher wurde `cycle > 1` ueber alle Kartenzeilen gezaehlt: ein einziger
   * Stammgast bei seiner vierten Karte ergab die Zahl 3, und der Bildschirm
   * beschriftet sie mit "Zweite Karte begonnen" — der Wirt las "drei Gaeste sind
   * wiedergekommen". Es war eine Person.
   */
  wiederkommer: number;
  eingeloest30d: number;
  /** Median, nicht Mittelwert. `null` unterhalb von MEDIAN_MINDESTZAHL. */
  medianTageBisVoll: number | null;
  /** Apple-only. Im Bildschirm als "iPhone-Gäste mit Pass" zu beschriften. */
  walletRegistrierteKarten: number;
  /** Karten, deren Lese-Cache vom Hauptbuch abweicht. Im Normalfall 0. */
  cacheAbweichungen: number;
}

/**
 * Gibt es einen Passbau? NEIN — und das ist eine Tatsache ueber dieses Repo, keine
 * Einstellung.
 *
 * `walletReadiness()` prueft ausschliesslich, ob die Umgebungsvariablen da sind. Es
 * gibt aber im ganzen Baum weder Passbau noch APNs-Client noch einen Google-REST-
 * Aufruf (`grep -rn "passkit-generator|v1/passes|walletobjects|serialNumber"` = 0
 * Treffer). Wer sein Apple-Zertifikat in Railway eintraegt, bekam damit
 * "Apple Wallet: eingerichtet" und den Satz "iPhone-Gaeste sehen den neuen Stand" —
 * und suchte den Fehler danach in den Telefoneinstellungen seiner Gaeste.
 *
 * Deshalb geht die Tatsache MIT ueber die Grenze, statt sie im Bildschirm noch
 * einmal zu behaupten: hier steht die eine Stelle, die der Wallet-Pfad umlegt,
 * sobald er existiert.
 */
export const PASSAUSGABE_GEBAUT = true;

/** Bereitschaft plus die Frage, ob ueberhaupt schon Paesse ausgegeben werden. */
export interface WalletZustand extends WalletReadiness {
  /** `false` = Zugangsdaten koennen vollstaendig sein, es wird trotzdem kein Pass gebaut. */
  passausgabeGebaut: boolean;
}

export interface ProgrammAntwort {
  program: Program | null;
  /** Serverzustand, nicht Programmzustand: was fuer Wallet-Paesse noch fehlt. */
  wallet: WalletZustand;
  /**
   * Die Rolle des Anfragenden in DIESEM Betrieb.
   *
   * Der Bildschirm blendet danach die drei Knoepfe aus, die der Server nur dem
   * Inhaber erlaubt. Ohne diesen Wert zeigte er eine Zusage, die der Server nicht
   * haelt — und das ist der Fehler, den der ganze Bildschirm sonst vermeidet.
   */
  rolle: "OWNER" | "STAFF" | "ADMIN";
}

/* ── Fehlende Tabellen und Spalten ───────────────────────────────────────── */

/**
 * Fehlt die Loyalty-Tabelle (oder die neue Spalte)?
 *
 * Der Code landet ueber main automatisch auf Railway, die Migration spielt ein
 * Mensch von Hand ein — dazwischen liegt ein Fenster, in dem Tabelle oder Spalte
 * fehlen. Das ist ein BEKANNTER, VORUEBERGEHENDER Zustand und kein Absturz; er
 * gehoert als 503 beantwortet, nicht als 500.
 *
 * Bewusst nicht nur auf den Prisma-Code gefiltert: welche Fassung des generierten
 * Clients P2021/P2022 meldet und wann stattdessen die rohe Postgres-Meldung
 * durchschlaegt, ist nichts, worauf man einen Fehlerpfad stuetzen sollte. Zugleich
 * NICHT so breit wie das `catch` in `loadDecisions` — dort ist der Rueckfall
 * inhaltlich richtig ("keine Entscheidungen"), hier waere ein stiller Rueckfall
 * eine Luege ueber den Stempelstand. Ein Verbindungsabbruch muss deshalb weiterhin
 * als 500 durchschlagen.
 */
export function istFehlendeLoyaltyTabelle(err: unknown): boolean {
  const e = err as { code?: string; message?: string; meta?: { code?: string } };
  if (e?.code === "P2021" || e?.code === "P2022") return true;
  if (e?.meta?.code === "42P01" || e?.meta?.code === "42703") return true;
  const text = String(e?.message ?? "");
  return (
    /does not exist in the current database/i.test(text) ||
    /relation "[^"]*(Stamp|Wallet)[^"]*" does not exist/i.test(text) ||
    /column [^ ]*rewardText[^ ]* does not exist/i.test(text) ||
    /\b42P01\b/.test(text) ||
    /\b42703\b/.test(text)
  );
}

/* ── Kleine reine Helfer (fuer sich pruefbar) ────────────────────────────── */

/**
 * Median einer Messreihe, auf eine Nachkommastelle.
 *
 * Median und nicht Mittelwert: ein einziger Gast, der die Karte ein Jahr in der
 * Jacke hatte, verschoebe den Mittelwert so weit, dass die Zahl dem Wirt beim
 * Festlegen der Stempelzahl das Gegenteil raet.
 */
export function median(werte: number[]): number | null {
  if (werte.length === 0) return null;
  const sortiert = [...werte].sort((a, b) => a - b);
  const mitte = Math.floor(sortiert.length / 2);
  const roh =
    sortiert.length % 2 === 1 ? sortiert[mitte] : (sortiert[mitte - 1] + sortiert[mitte]) / 2;
  return Math.round(roh * 10) / 10;
}

/** Fehlen ein oder zwei Stempel bis zur Praemie? */
export function istFastVoll(stand: number, max: number): boolean {
  const fehlend = max - stand;
  return fehlend >= 1 && fehlend <= FASTVOLL_ABSTAND;
}

/** Ganzzahl aus einem Query-Parameter, mit Vorgabe und harten Grenzen. */
export function ganzzahl(wert: unknown, vorgabe: number, min: number, max: number): number {
  const n = Number.parseInt(String(wert ?? ""), 10);
  if (!Number.isFinite(n)) return vorgabe;
  return Math.min(max, Math.max(min, n));
}

function bloecke<T>(werte: T[], groesse = IN_BLOCK): T[][] {
  const raus: T[][] = [];
  for (let i = 0; i < werte.length; i += groesse) raus.push(werte.slice(i, i + groesse));
  return raus;
}

function iso(d: Date | null | undefined): string | null {
  return d ? new Date(d).toISOString() : null;
}

/* ── Das Hauptbuch je Karte ──────────────────────────────────────────────── */

export interface HauptbuchStand {
  /** Summe aller `delta` — DER Stand der Karte. */
  summe: number;
  /** Juengster Eintrag (fuer "eingeschlafen" und "letzter Stempel"). */
  letzter: Date | null;
  /** Aeltester Eintrag (Startpunkt der Durchlaufdauer). */
  erster: Date | null;
}

interface HauptbuchGruppe {
  stampCardId: string;
  _sum: { delta: number | null };
  _max: { createdAt: Date | null };
  _min: { createdAt: Date | null };
}

/**
 * Stand, erster und letzter Eintrag je Karte — in EINER Gruppierung.
 *
 * `businessId` steht auch hier in der WHERE-Klausel, obwohl die Kartenkennungen
 * bereits betriebsgebunden ermittelt wurden: der Filter kostet nichts (er fuehrt den
 * Index `[businessId, createdAt]` an) und haelt die Abfrage auch dann dicht, wenn
 * ein spaeterer Aufrufer die Kennungen anderswoher nimmt.
 */
export async function hauptbuchJeKarte(
  venueId: string,
  kartenIds: string[],
): Promise<Map<string, HauptbuchStand>> {
  const karte = new Map<string, HauptbuchStand>();
  for (const block of bloecke(kartenIds)) {
    const gruppen = await db.stampEvent.groupBy<HauptbuchGruppe>({
      by: ["stampCardId"],
      where: { businessId: venueId, stampCardId: { in: block } },
      _sum: { delta: true },
      _max: { createdAt: true },
      _min: { createdAt: true },
    });
    for (const g of gruppen) {
      karte.set(g.stampCardId, {
        summe: g._sum?.delta ?? 0,
        letzter: g._max?.createdAt ?? null,
        erster: g._min?.createdAt ?? null,
      });
    }
  }
  return karte;
}

/** Stand einer Karte aus dem Hauptbuch; ohne Eintraege ist er 0. */
function standVon(karte: Map<string, HauptbuchStand>, id: string): number {
  return karte.get(id)?.summe ?? 0;
}

/* ── Programm lesen, anlegen, aendern ────────────────────────────────────── */

/**
 * Das Programm dieses Betriebs. GENAU EINES je Betrieb (Entscheidung der
 * Spezifikation): es gibt keinen Scanpfad, der zwischen mehreren waehlen koennte —
 * ein zweites Programm erzeugte Karten, die niemand stempeln kann.
 */
export async function programLesen(
  venueId: string,
  rolle: ProgrammAntwort["rolle"] = "STAFF",
): Promise<ProgrammAntwort> {
  const row = await db.stampProgram.findFirst<ProgramRow>({
    where: { businessId: venueId },
    select: PROGRAM_SELECT,
    orderBy: { createdAt: "asc" },
  });
  return {
    program: row ? toProgram(row) : null,
    wallet: { ...walletReadiness(), passausgabeGebaut: PASSAUSGABE_GEBAUT },
    rolle,
  };
}

export interface ProgrammEingabe {
  name: string;
  maxStamps: number;
  rewardText: string;
  cooldownSeconds: number;
  validityDays: number | null;
  isActive: boolean;
}

export type AnlegenErgebnis =
  | { art: "ok"; program: Program }
  /** Es gibt schon eines. Das vorhandene kommt mit, damit ein Doppeltipp keine Sackgasse ist. */
  | { art: "programm_existiert_bereits"; program: Program };

/**
 * Programm anlegen. Existiert bereits eines — egal unter welchem Namen —, wird
 * NICHT angelegt, sondern das vorhandene mit 409 zurueckgegeben. Der Aufrufer muss
 * daraus keine Sackgasse machen (gleiches Muster wie beim Anlegen des Betriebs).
 *
 * Die Pruefung liegt IN der Transaktion, damit ein Doppeltipp nicht zwei Programme
 * erzeugt. Der Unique-Index `[businessId, name]` faengt zusaetzlich den Fall ab,
 * dass beide Anfragen denselben Namen tragen; bei zwei verschiedenen Namen greift
 * die Pruefung in der Transaktion.
 */
export async function programAnlegen(
  venueId: string,
  eingabe: ProgrammEingabe,
): Promise<AnlegenErgebnis> {
  try {
    return await db.$transaction(async (tx) => {
      const vorhanden = await tx.stampProgram.findFirst<ProgramRow>({
        where: { businessId: venueId },
        select: PROGRAM_SELECT,
        orderBy: { createdAt: "asc" },
      });
      if (vorhanden) {
        return {
          art: "programm_existiert_bereits" as const,
          program: toProgram(vorhanden),
        };
      }
      const neu = await tx.stampProgram.create<ProgramRow>({
        data: {
          businessId: venueId,
          name: eingabe.name,
          maxStamps: eingabe.maxStamps,
          rewardText: eingabe.rewardText,
          cooldownSeconds: eingabe.cooldownSeconds,
          validityDays: eingabe.validityDays,
          isActive: eingabe.isActive,
        },
        select: PROGRAM_SELECT,
      });
      return { art: "ok" as const, program: toProgram(neu) };
    });
  } catch (err) {
    if (!istUniqueVerletzung(err)) throw err;
    // Wettlauf: die andere Anfrage war schneller. Ihr Ergebnis ist das gueltige.
    const vorhanden = await db.stampProgram.findFirst<ProgramRow>({
      where: { businessId: venueId },
      select: PROGRAM_SELECT,
      orderBy: { createdAt: "asc" },
    });
    if (!vorhanden) throw err;
    return { art: "programm_existiert_bereits", program: toProgram(vorhanden) };
  }
}

function istUniqueVerletzung(err: unknown): boolean {
  return (err as { code?: string })?.code === "P2002";
}

export interface ProgrammAenderung {
  name?: string;
  maxStamps?: number;
  rewardText?: string;
  cooldownSeconds?: number;
  validityDays?: number | null;
  isActive?: boolean;
}

/**
 * Was eine Aenderung tatsaechlich bewirkt — mit echten Zahlen, damit der Bildschirm
 * nicht mit einer Floskel warnen muss.
 */
export interface Wirkung {
  /** Karten, die gerade laufen oder voll und noch nicht eingeloest sind. */
  laufendeKarten: number;
  /**
   * Karten, in die beim Speichern der ALTE Praemientext geschrieben wurde, weil sie
   * noch keinen Snapshot hatten. Genau diese Karten haetten sonst rueckwirkend die
   * neue Praemie bekommen.
   */
  praemieFestgeschrieben: number;
  /** Felder, die auch LAUFENDE Karten sofort treffen. Heute nur die Sperrfrist. */
  sofortWirksam: Array<"cooldownSeconds">;
  /** Felder, die ausschliesslich fuer kuenftig ausgegebene Karten gelten. */
  nurFuerNeueKarten: Array<"maxStamps" | "rewardText" | "validityDays">;
}

export type AendernErgebnis =
  | { art: "ok"; program: Program; wirkung: Wirkung }
  | { art: "nicht_gefunden" }
  | { art: "name_bereits_vergeben" };

/**
 * Programm aendern — und dabei laufenden Karten nichts nehmen.
 *
 * DER KERN DIESER FUNKTION IST DER ERSTE SCHRITT, NICHT DER ZWEITE.
 *
 * `maxStamps` war nie ein Problem: die Karte traegt ihren eigenen Snapshot, eine
 * Aenderung wirkt nur auf kuenftige Karten. `rewardText` dagegen stand bis heute
 * NUR am Programm. Wer die Praemie von "1x Kaffee gratis" auf "1x Espresso"
 * aenderte, aenderte damit rueckwirkend die Zusage an jeden, der schon sammelt —
 * auch an den Gast, der 10 von 10 hat und morgen seinen Kaffee abholen wollte.
 *
 * Die neue Spalte `StampCard.rewardText` allein reicht dafuer NICHT: sie ist wegen
 * der Migration nullbar, und gelesen wird `karte.rewardText ?? programm.rewardText`.
 * Eine Bestandskarte mit NULL bekaeme also weiterhin den neuen Text. Deshalb
 * schreibt dieser Pfad den ALTEN Text in jede offene Karte ohne Snapshot, BEVOR er
 * den neuen speichert — in derselben Transaktion, sonst gibt es ein Fenster, in dem
 * beides zugleich gilt.
 */
export async function programAendern(
  venueId: string,
  programId: string,
  aenderung: ProgrammAenderung,
): Promise<AendernErgebnis> {
  try {
    return await db.$transaction(async (tx) => {
      const alt = await tx.stampProgram.findFirst<ProgramRow>({
        // Lesen mit businessId in der WHERE-Klausel, nicht per findUnique auf der id:
        // die id steht im Pfad und ist kein Geheimnis.
        where: { id: programId, businessId: venueId },
        select: PROGRAM_SELECT,
      });
      if (!alt) return { art: "nicht_gefunden" as const };

      const praemieAendertSich =
        aenderung.rewardText !== undefined && aenderung.rewardText !== alt.rewardText;

      let praemieFestgeschrieben = 0;
      if (praemieAendertSich) {
        const { count } = await tx.stampCard.updateMany({
          where: {
            businessId: venueId,
            programId,
            rewardText: null,
            status: { in: OFFENE_ZUSTAENDE },
          },
          data: { rewardText: alt.rewardText },
        });
        praemieFestgeschrieben = count;
      }

      const laufendeKarten = await tx.stampCard.count({
        where: { businessId: venueId, programId, status: { in: OFFENE_ZUSTAENDE } },
      });

      // updateMany statt update: nur so steht die businessId IN der WHERE-Klausel
      // des Schreibzugriffs und kann bei einem spaeteren Umbau nicht verlorengehen.
      const { count } = await tx.stampProgram.updateMany({
        where: { id: programId, businessId: venueId },
        data: aenderung as TxArgs,
      });
      if (count === 0) return { art: "nicht_gefunden" as const };

      const neu = await tx.stampProgram.findFirst<ProgramRow>({
        where: { id: programId, businessId: venueId },
        select: PROGRAM_SELECT,
      });
      if (!neu) return { art: "nicht_gefunden" as const };

      const sofortWirksam: Wirkung["sofortWirksam"] = [];
      if (
        aenderung.cooldownSeconds !== undefined &&
        aenderung.cooldownSeconds !== alt.cooldownSeconds
      ) {
        // Die Sperrfrist liest der Stempelpfad IMMER am Programm — sie gilt ab
        // sofort auch fuer laufende Karten. Als einziges der sechs Felder.
        sofortWirksam.push("cooldownSeconds");
      }

      const nurFuerNeueKarten: Wirkung["nurFuerNeueKarten"] = [];
      if (aenderung.maxStamps !== undefined && aenderung.maxStamps !== alt.maxStamps) {
        nurFuerNeueKarten.push("maxStamps");
      }
      if (praemieAendertSich) nurFuerNeueKarten.push("rewardText");
      if (
        aenderung.validityDays !== undefined &&
        (aenderung.validityDays ?? null) !== (alt.validityDays ?? null)
      ) {
        // expiresAt wird bei der Ausgabe festgeschrieben und steht auf der Karte.
        nurFuerNeueKarten.push("validityDays");
      }

      return {
        art: "ok" as const,
        program: toProgram(neu),
        wirkung: { laufendeKarten, praemieFestgeschrieben, sofortWirksam, nurFuerNeueKarten },
      };
    });
  } catch (err) {
    if (istUniqueVerletzung(err)) return { art: "name_bereits_vergeben" };
    throw err;
  }
}

/**
 * Programm dieses Betriebs anhand der Pfadkennung aufloesen.
 *
 * `null` heisst "gibt es nicht ODER gehoert einem anderen Betrieb" — der Aufrufer
 * macht daraus in beiden Faellen 404. Ununterscheidbar mit Absicht: sonst waere die
 * Existenz fremder Programme am Antwortverhalten ablesbar.
 */
async function programDesBetriebs(venueId: string, programId: string): Promise<ProgramRow | null> {
  return db.stampProgram.findFirst<ProgramRow>({
    where: { id: programId, businessId: venueId },
    select: PROGRAM_SELECT,
  });
}

/* ── Uebersicht ──────────────────────────────────────────────────────────── */

interface UebersichtKarte {
  id: string;
  /** Nur fuer `wiederkommer`: die Kennzahl zaehlt Gaeste, nicht Karten. */
  guestId: string;
  cycle: number;
  status: KartenStatus;
  maxStamps: number;
  currentStamps: number;
  completedAt: Date | null;
}

/**
 * Die Kennzahlen des Programms. ALLE aus dem Hauptbuch, keine aus dem Lese-Cache.
 *
 * Warum die Karten geladen und in JS ausgewertet werden statt per SQL gezaehlt:
 * "kurz vor der Praemie" vergleicht zwei Spalten (Stand gegen den maxStamps-Snapshot
 * DER KARTE, nicht den des Programms — sonst zaehlt die Zahl nach jeder Aenderung
 * die falschen Karten), und der Stand kommt ohnehin aus einer zweiten Tabelle.
 * `$queryRaw` waere hier mehr Risiko als Nutzen; die Mengen sind pro Betrieb klein.
 */
export async function uebersicht(
  venueId: string,
  programId: string,
  jetzt: Date = new Date(),
): Promise<Uebersicht | null> {
  const programm = await programDesBetriebs(venueId, programId);
  if (!programm) return null;

  // Bewusst OHNE `take`. Ein Limit hier machte die Kennzahlen still unvollstaendig,
  // und genau das verbietet sich die Datei an anderer Stelle ("lieber sichtbar
  // unvollstaendig als still falsch", siehe FILTER_OBERGRENZE). Die Haeufigkeit ist
  // stattdessen im Client gesenkt: die Uebersicht haengt dort nicht mehr an Filter
  // und Limit, ein Filtertipp rechnet sie nicht mehr neu.
  const karten = await db.stampCard.findMany<UebersichtKarte>({
    where: { businessId: venueId, programId },
    select: {
      id: true,
      guestId: true,
      cycle: true,
      status: true,
      maxStamps: true,
      currentStamps: true,
      completedAt: true,
    },
  });

  const leer: Uebersicht = {
    gesamt: 0,
    aktiv: 0,
    offeneKarten: 0,
    fastVoll: 0,
    voll: 0,
    eingeschlafen: 0,
    wiederkommer: 0,
    eingeloest30d: 0,
    medianTageBisVoll: null,
    walletRegistrierteKarten: 0,
    cacheAbweichungen: 0,
  };
  if (karten.length === 0) return leer;

  const ids = karten.map((k) => k.id);
  const buch = await hauptbuchJeKarte(venueId, ids);
  const eingeschlafenAb = jetzt.getTime() - EINGESCHLAFEN_TAGE * TAG_MS;

  let aktiv = 0;
  let offeneKarten = 0;
  let fastVoll = 0;
  let voll = 0;
  let eingeschlafen = 0;
  let cacheAbweichungen = 0;
  // Ein Set und kein Zaehler: gezaehlt werden GAESTE mit mehr als einer Karte.
  const wiedergekommen = new Set<string>();
  const durchlaufTage: number[] = [];

  for (const k of karten) {
    const stand = standVon(buch, k.id);
    if (stand !== k.currentStamps) cacheAbweichungen++;
    if (k.cycle > 1) wiedergekommen.add(k.guestId);
    if (OFFENE_ZUSTAENDE.includes(k.status)) offeneKarten++;

    if (k.status === "ACTIVE") {
      aktiv++;
      if (istFastVoll(stand, k.maxStamps)) fastVoll++;
      const letzter = buch.get(k.id)?.letzter ?? null;
      if (stand > 0 && letzter && letzter.getTime() < eingeschlafenAb) eingeschlafen++;
    }

    // "Voll" heisst: das Versprechen steht noch offen. Aus dem Hauptbuch, nicht aus
    // dem Status - der Status ist nur die Folge, die der Stempelpfad geschrieben hat.
    if (OFFENE_ZUSTAENDE.includes(k.status) && stand >= k.maxStamps) voll++;

    const erster = buch.get(k.id)?.erster ?? null;
    if (k.completedAt && erster) {
      durchlaufTage.push((new Date(k.completedAt).getTime() - erster.getTime()) / TAG_MS);
    }
  }

  const seit = new Date(jetzt.getTime() - EINGELOEST_TAGE * TAG_MS);
  // Die Bloecke laufen nebeneinander statt hintereinander: sie haengen nicht
  // voneinander ab, und die Uebersicht ist der Aufruf, der beim Oeffnen des
  // Bildschirms auf dem kritischen Weg liegt. Bei 4.000 Karten waren das vorher
  // sechzehn Umlaeufe in Reihe.
  const [eingeloestJeBlock, walletJeBlock] = await Promise.all([
    Promise.all(
      bloecke(ids).map((block) =>
        // Ueber die EREIGNISSE gezaehlt, nicht ueber StampCard.status: eine Karte kann
        // in mehreren Zyklen eingeloest werden, der Status zeigt nur den letzten.
        db.stampEvent.count({
          where: {
            businessId: venueId,
            stampCardId: { in: block },
            kind: "REDEEMED",
            createdAt: { gte: seit },
          },
        }),
      ),
    ),
    Promise.all(
      bloecke(ids).map((block) =>
        db.walletDeviceRegistration.findMany<{ stampCardId: string }>({
          where: { businessId: venueId, stampCardId: { in: block } },
          select: { stampCardId: true },
          distinct: ["stampCardId"],
        }),
      ),
    ),
  ]);
  const eingeloest30d = eingeloestJeBlock.reduce((summe, n) => summe + n, 0);
  const walletRegistrierteKarten = walletJeBlock.reduce((summe, z) => summe + z.length, 0);

  return {
    gesamt: karten.length,
    aktiv,
    offeneKarten,
    fastVoll,
    voll,
    eingeschlafen,
    wiederkommer: wiedergekommen.size,
    eingeloest30d,
    medianTageBisVoll:
      durchlaufTage.length >= MEDIAN_MINDESTZAHL ? median(durchlaufTage) : null,
    walletRegistrierteKarten,
    cacheAbweichungen,
  };
}

/* ── Kartenliste ─────────────────────────────────────────────────────────── */

export type KartenFilter = "alle" | "fastvoll" | "voll" | "eingeschlafen";

export function istKartenFilter(wert: unknown): wert is KartenFilter {
  return wert === "alle" || wert === "fastvoll" || wert === "voll" || wert === "eingeschlafen";
}

function toKartenZeile(k: KartenRow, stand: number, letzter: Date | null): KartenZeile {
  return {
    id: k.id,
    stand: { current: stand, max: k.maxStamps },
    status: k.status,
    cycle: k.cycle,
    letzterStempelAt: iso(letzter),
    gast: toGast(k.guest),
  };
}

/**
 * Wer sammelt gerade — ausgehend von der KARTE, der Gast wird dazugezogen.
 *
 * Nicht ueber `assembleVenueDataset`/`MaitrGuest`: das laedt alle Gaeste eines
 * Betriebs, also auch jeden reinen Reservierungsgast, der nie eine Karte hatte.
 *
 * Die Seitenbildung ist ein Versatz, kein Schluesselcursor. Bewusst: die drei
 * gefilterten Ansichten koennen ohnehin nicht in SQL gefiltert werden, und zwei
 * verschiedene Seitenmodelle nebeneinander waeren die groessere Fehlerquelle. Der
 * Wert bleibt fuer den Aufrufer undurchsichtig und kann spaeter ohne Aenderung am
 * Client zu einem echten Cursor werden.
 */
export async function kartenListe(
  venueId: string,
  programId: string,
  optionen: { filter: KartenFilter; versatz: number; limit: number },
  jetzt: Date = new Date(),
): Promise<KartenSeite | null> {
  const programm = await programDesBetriebs(venueId, programId);
  if (!programm) return null;

  const { filter, versatz, limit } = optionen;

  if (filter === "alle") {
    const zeilen = await db.stampCard.findMany<KartenRow>({
      where: { businessId: venueId, programId },
      select: KARTEN_SELECT,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: versatz,
      take: limit + 1,
    });
    const seite = zeilen.slice(0, limit);
    const buch = await hauptbuchJeKarte(
      venueId,
      seite.map((k) => k.id),
    );
    return {
      items: seite.map((k) => toKartenZeile(k, standVon(buch, k.id), buch.get(k.id)?.letzter ?? null)),
      nextCursor: zeilen.length > limit ? String(versatz + limit) : null,
      abgeschnitten: false,
    };
  }

  // Die drei gefilterten Ansichten: begrenzt laden, gegen das Hauptbuch filtern.
  const kandidaten = await db.stampCard.findMany<KartenRow>({
    where: {
      businessId: venueId,
      programId,
      status: filter === "voll" ? { in: OFFENE_ZUSTAENDE } : "ACTIVE",
    },
    select: KARTEN_SELECT,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: FILTER_OBERGRENZE + 1,
  });
  const abgeschnitten = kandidaten.length > FILTER_OBERGRENZE;
  const geprueft = kandidaten.slice(0, FILTER_OBERGRENZE);
  const buch = await hauptbuchJeKarte(
    venueId,
    geprueft.map((k) => k.id),
  );
  const eingeschlafenAb = jetzt.getTime() - EINGESCHLAFEN_TAGE * TAG_MS;

  const passend = geprueft.filter((k) => {
    const stand = standVon(buch, k.id);
    if (filter === "fastvoll") return istFastVoll(stand, k.maxStamps);
    if (filter === "voll") return stand >= k.maxStamps;
    const letzter = buch.get(k.id)?.letzter ?? null;
    return stand > 0 && letzter !== null && letzter.getTime() < eingeschlafenAb;
  });

  const seite = passend.slice(versatz, versatz + limit);
  return {
    items: seite.map((k) => toKartenZeile(k, standVon(buch, k.id), buch.get(k.id)?.letzter ?? null)),
    nextCursor: versatz + limit < passend.length ? String(versatz + limit) : null,
    abgeschnitten,
  };
}

/* ── Kartendetail und Verlauf ────────────────────────────────────────────── */

interface KarteMitProgramm extends KartenRow {
  program?: { rewardText: string } | null;
}

async function karteLaden(venueId: string, cardId: string): Promise<KarteMitProgramm | null> {
  return db.stampCard.findFirst<KarteMitProgramm>({
    where: { id: cardId, businessId: venueId },
    select: { ...KARTEN_SELECT, program: { select: { rewardText: true } } },
  });
}

async function toKartenDetail(venueId: string, k: KarteMitProgramm): Promise<KartenDetail> {
  const buch = await hauptbuchJeKarte(venueId, [k.id]);
  const stand = standVon(buch, k.id);
  const walletGeraete = await db.walletDeviceRegistration.count({
    where: { businessId: venueId, stampCardId: k.id },
  });
  return {
    id: k.id,
    programId: k.programId,
    stand: { current: stand, max: k.maxStamps },
    cacheStand: k.currentStamps,
    status: k.status,
    cycle: k.cycle,
    redeemedCount: k.redeemedCount,
    // Snapshot der Karte schlaegt den Programmtext. Der Rueckfall greift nur bei
    // Karten, die vor der Migration 20260806 entstanden sind.
    rewardText: k.rewardText ?? k.program?.rewardText ?? "",
    rewardTextQuelle: k.rewardText ? "karte" : "programm",
    ausgegebenAm: new Date(k.createdAt).toISOString(),
    gueltigBis: iso(k.expiresAt),
    vollSeit: iso(k.completedAt),
    eingeloestAm: iso(k.redeemedAt),
    gast: toGast(k.guest),
    walletGeraete,
  };
}

/**
 * Gast-Sicht auf eine Karte — die EINE Ausnahme von Regel 2 dieses Moduls.
 *
 * Alle anderen Lesewege fuehren `businessId` aus der geprueften Venue-
 * Mitgliedschaft in der WHERE-Klausel, weil die Kennung im Pfad kein Geheimnis
 * ist. HIER ist die Kennung allein ebenfalls kein Zutritt: Die oeffentliche
 * Route (server/routes/publicStampcards.ts) verlangt zusaetzlich eine
 * HMAC-Signatur ueber die cardId, die nur der Betreiber erzeugen und als
 * QR/Link an SEINEN Gast weitergeben kann. Erst Signatur + uuid zusammen
 * oeffnen die Karte — raten reicht nicht, und ein Token der einen Karte
 * taugt nicht fuer eine andere.
 *
 * Die Antwort traegt bewusst KEINE Personendaten (kein Gastname, kein
 * Telefon) und keine Betreiber-Kennzahlen — nur, was auf einer Stempelkarte
 * aus Pappe auch stuende: Betrieb, Stand, Ziel, Praemie, Status.
 */
export interface GastKartenSicht {
  betriebsName: string;
  stand: number;
  max: number;
  rewardText: string;
  status: KartenStatus;
}

interface GastKartenRow {
  id: string;
  status: KartenStatus;
  maxStamps: number;
  rewardText: string | null;
  program: { rewardText: string } | null;
  business: { name: string } | null;
}

export async function karteFuerGastLesen(
  cardId: string,
): Promise<GastKartenSicht | null> {
  const karte = await db.stampCard.findFirst<GastKartenRow>({
    where: { id: cardId },
    select: {
      id: true,
      status: true,
      maxStamps: true,
      rewardText: true,
      program: { select: { rewardText: true } },
      business: { select: { name: true } },
    },
  });
  if (!karte) return null;

  // Gleiches Prinzip wie ueberall: der Stand kommt aus dem Hauptbuch,
  // nicht aus dem Lese-Cache.
  const summe = await db.stampEvent.aggregate<{
    _sum: { delta: number | null };
  }>({
    where: { stampCardId: cardId },
    _sum: { delta: true },
  });

  return {
    betriebsName: karte.business?.name ?? "",
    stand: summe._sum?.delta ?? 0,
    max: karte.maxStamps,
    rewardText: karte.rewardText ?? karte.program?.rewardText ?? "",
    status: karte.status,
  };
}

/**
 * Wallet-Ausstattung einer Karte sicherstellen: serialNumber + verschluesseltes
 * authenticationToken, GEMEINSAM gesetzt (Schema-Kommentar) und nur einmal.
 * Rueckgabe ist der KLARTEXT des Tokens — er wandert in pass.json; die
 * Datenbank kennt ihn nur AES-256-GCM-verschluesselt (encryptToken).
 *
 * Gleiche Zugriffs-Ausnahme wie karteFuerGastLesen: aufgerufen wird das nur
 * hinter dem signierten Gast-Link (publicStampcards) — die HMAC-Signatur ist
 * der Riegel, nicht die Venue-Mitgliedschaft.
 */
export async function passAusstattungSichern(
  cardId: string,
): Promise<{ serialNumber: string; authToken: string } | null> {
  const karte = await db.stampCard.findFirst<{
    id: string;
    serialNumber: string | null;
    encAuthToken: string | null;
  }>({
    where: { id: cardId },
    select: { id: true, serialNumber: true, encAuthToken: true },
  });
  if (!karte) return null;

  if (karte.serialNumber && karte.encAuthToken) {
    return {
      serialNumber: karte.serialNumber,
      authToken: entschluesselePassToken(karte.encAuthToken),
    };
  }

  const serialNumber = randomUUID();
  const authToken = randomBytes(24).toString("base64url");
  await db.stampCard.updateMany({
    where: { id: cardId, serialNumber: null },
    data: {
      serialNumber,
      encAuthToken: verschluesselePassToken(authToken),
    },
  });
  // Falls parallel ein zweiter Abruf gewonnen hat: dessen Werte lesen statt
  // mit den eigenen weiterzuarbeiten, die nie geschrieben wurden.
  const endgueltig = await db.stampCard.findFirst<{
    serialNumber: string | null;
    encAuthToken: string | null;
  }>({
    where: { id: cardId },
    select: { serialNumber: true, encAuthToken: true },
  });
  if (!endgueltig?.serialNumber || !endgueltig.encAuthToken) return null;
  return {
    serialNumber: endgueltig.serialNumber,
    authToken: entschluesselePassToken(endgueltig.encAuthToken),
  };
}

/** Alles, was Passbau und Apple-Web-Service zu einer Serial brauchen. */
export interface WalletKartenDaten {
  cardId: string;
  businessId: string;
  programId: string;
  betriebsName: string;
  stand: number;
  max: number;
  rewardText: string;
  status: KartenStatus;
  authToken: string;
  contentChangedAt: Date;
  passUpdateSeq: number;
}

export async function walletKartenDaten(
  serialNumber: string,
): Promise<WalletKartenDaten | null> {
  const karte = await db.stampCard.findFirst<{
    id: string;
    businessId: string;
    programId: string;
    status: KartenStatus;
    maxStamps: number;
    rewardText: string | null;
    encAuthToken: string | null;
    contentChangedAt: Date;
    passUpdateSeq: number;
    program: { rewardText: string } | null;
    business: { name: string } | null;
  }>({
    where: { serialNumber },
    select: {
      id: true,
      businessId: true,
      programId: true,
      status: true,
      maxStamps: true,
      rewardText: true,
      encAuthToken: true,
      contentChangedAt: true,
      passUpdateSeq: true,
      program: { select: { rewardText: true } },
      business: { select: { name: true } },
    },
  });
  if (!karte || !karte.encAuthToken) return null;

  const summe = await db.stampEvent.aggregate<{ _sum: { delta: number | null } }>({
    where: { stampCardId: karte.id },
    _sum: { delta: true },
  });

  return {
    cardId: karte.id,
    businessId: karte.businessId,
    programId: karte.programId,
    betriebsName: karte.business?.name ?? "",
    stand: summe._sum?.delta ?? 0,
    max: karte.maxStamps,
    rewardText: karte.rewardText ?? karte.program?.rewardText ?? "",
    status: karte.status,
    authToken: entschluesselePassToken(karte.encAuthToken),
    contentChangedAt: karte.contentChangedAt,
    passUpdateSeq: karte.passUpdateSeq,
  };
}

export async function kartenDetail(venueId: string, cardId: string): Promise<KartenDetail | null> {
  const k = await karteLaden(venueId, cardId);
  return k ? toKartenDetail(venueId, k) : null;
}

interface EreignisRow {
  id: string;
  createdAt: Date;
  kind: EreignisArt;
  delta: number;
  balanceAfter: number;
  source: EreignisQuelle;
  deviceLabel: string | null;
  note: string | null;
  staff?: { fullName: string | null } | null;
}

/**
 * Der Verlauf einer Karte — die Ansicht im Streitfall ("der Gast sagt, ich hatte
 * neun"). Auf Anlass geoeffnet, nicht als Dauerspalte ueber alle Gaeste: ueber alle
 * hinweg dauerhaft angezeigt waere dasselbe Material ein Anwesenheitsprotokoll.
 *
 * Die Karte wird VORHER auf Zugehoerigkeit geprueft. Ohne das lieferte eine fremde
 * Kartenkennung eine leere Liste — also 200 statt 404 und damit einen Unterschied,
 * an dem die Existenz fremder Karten ablesbar waere.
 */
export async function kartenEreignisse(
  venueId: string,
  cardId: string,
  limit: number,
): Promise<EreignisZeile[] | null> {
  const karte = await db.stampCard.findFirst<{ id: string }>({
    where: { id: cardId, businessId: venueId },
    select: { id: true },
  });
  if (!karte) return null;

  const zeilen = await db.stampEvent.findMany<EreignisRow>({
    where: { businessId: venueId, stampCardId: cardId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      createdAt: true,
      kind: true,
      delta: true,
      balanceAfter: true,
      source: true,
      deviceLabel: true,
      note: true,
      // Nur der Anzeigename. Die E-Mail des Mitarbeiters hat in einer
      // Verlaufsansicht nichts zu suchen.
      staff: { select: { fullName: true } },
    },
  });

  return zeilen.map((e) => ({
    id: e.id,
    createdAt: new Date(e.createdAt).toISOString(),
    kind: e.kind,
    delta: e.delta,
    balanceAfter: e.balanceAfter,
    source: e.source,
    staffName: e.staff?.fullName ?? null,
    deviceLabel: e.deviceLabel ?? null,
    note: e.note ?? null,
  }));
}

/* ── Stufe 2: Karten ausgeben und stempeln ───────────────────────────────── */

export type AusgebenErgebnis =
  | { art: "ok"; karte: KartenDetail }
  | { art: "kein_programm" }
  | { art: "keine_neuen_karten" }
  | { art: "gast_nicht_gefunden" }
  | { art: "gast_geloescht" }
  | { art: "karte_laeuft_bereits"; kartenId: string };

export interface AusgebenEingabe {
  guestId?: string;
  gast?: { name: string; phone?: string };
}

/**
 * Eine Karte ausgeben.
 *
 * Ohne diesen Pfad bliebe jede Uebersicht dauerhaft leer und niemand koennte
 * pruefen, ob das Gebaute funktioniert — deshalb gehoert er in denselben Auftrag.
 * Bewusst OHNE Kamera und ohne Wallet: `expo-camera` ist nicht installiert, ein
 * Scanpfad braeuchte einen neuen nativen Bau. Die Ereignisse tragen `MANUAL`, den
 * das Enum genau dafuer vorsieht.
 *
 * ZUM SCANTOKEN: Es wird ein Zufallswert erzeugt und NUR sein Hash gespeichert.
 * `encScanToken` (das reversible Gegenstueck fuer den Passbau) bleibt NULL, weil es
 * heute keinen Passbau gibt — ein entschluesselbares Geheimnis anzulegen, das
 * niemand liest, waere Angriffsflaeche ohne Gegenwert. Sobald der Wallet-Pfad
 * entsteht, vergibt er den Token neu (dafuer ist `scanTokenRotatedAt` da) und legt
 * beide Spalten in einer Transaktion an.
 */
export async function karteAusgeben(
  venueId: string,
  eingabe: AusgebenEingabe,
  jetzt: Date = new Date(),
): Promise<AusgebenErgebnis> {
  const ergebnis = await db.$transaction(async (tx) => {
    const programm = await tx.stampProgram.findFirst<ProgramRow>({
      where: { businessId: venueId },
      select: PROGRAM_SELECT,
      orderBy: { createdAt: "asc" },
    });
    if (!programm) return { art: "kein_programm" as const };
    if (!programm.isActive) return { art: "keine_neuen_karten" as const };

    let guestId = eingabe.guestId ?? null;
    if (guestId) {
      const gast = await tx.maitrGuest.findFirst<GastRow>({
        // Auch hier businessId in der WHERE-Klausel: die Gastkennung kaeme sonst
        // ungeprueft aus dem Rumpf.
        where: { id: guestId, businessId: venueId },
        select: { id: true, name: true, anonymizedAt: true, isMock: true },
      });
      if (!gast) return { art: "gast_nicht_gefunden" as const };
      if (gast.anonymizedAt) return { art: "gast_geloescht" as const };
    } else {
      // Die Nummer wird NORMALISIERT geschrieben, nicht nur roh.
      //
      // Ohne `phoneE164` greift `@@unique([businessId, phoneE164])` nicht - Postgres
      // laesst beliebig viele NULL nebeneinander zu -, und derselbe Gast entstand
      // bei jedem Besuch ein zweites Mal: die Reservierungszeile mit Nummer und
      // daneben die Tresenzeile ohne. Folge war nicht nur eine doppelte Kartei,
      // sondern dass die spaetere Loeschanfrage dieses Gastes nur EINE der beiden
      // Zeilen traf.
      const e164 = zuE164(eingabe.gast?.phone);

      // Erst suchen, dann anlegen. Nur ueber die normalisierte Nummer, NICHT ueber
      // den Namen: zwei verschiedene "Anna M." zusammenzufuehren gaebe der einen die
      // Stempel der anderen - das waere schlimmer als der Doppeleintrag, den es
      // vermeiden soll.
      const vorhanden = e164
        ? await tx.maitrGuest.findFirst<GastRow>({
            where: { businessId: venueId, phoneE164: e164 },
            select: { id: true, name: true, anonymizedAt: true, isMock: true },
          })
        : null;

      if (vorhanden) {
        // Gleiche Pruefung wie im guestId-Zweig: fuer einen geloeschten Gast wird
        // keine Karte ausgegeben, auch nicht ueber die Wiedererkennung.
        if (vorhanden.anonymizedAt) return { art: "gast_geloescht" as const };
        guestId = vorhanden.id;
        await tx.maitrGuest.updateMany({
          where: { id: vorhanden.id, businessId: venueId },
          data: { lastVisit: jetzt },
        });
      } else {
        const neu = await tx.maitrGuest.create<{ id: string }>({
          data: {
            businessId: venueId,
            name: eingabe.gast!.name,
            phone: eingabe.gast?.phone ?? null,
            phoneE164: e164,
            // firstVisit/lastVisit haben im Schema keinen Default und sind NOT NULL.
            firstVisit: jetzt,
            lastVisit: jetzt,
          },
          select: { id: true },
        });
        guestId = neu.id;
      }
    }

    const bisherige = await tx.stampCard.findMany<{ id: string; cycle: number; status: KartenStatus }>({
      where: { businessId: venueId, programId: programm.id, guestId },
      select: { id: true, cycle: true, status: true },
      orderBy: { cycle: "desc" },
    });
    // OFFENE_ZUSTAENDE und nicht nur ACTIVE - dieselbe Frage ("ist bei diesem Gast
    // noch etwas offen?") wird im ganzen Modul so beantwortet. Vorher rutschte eine
    // VOLLE, noch nicht eingeloeste Karte durch: der Gast bekam eine zweite Karte,
    // die volle sank in der nach `createdAt desc` sortierten Liste nach unten, und
    // die Praemie wurde vergessen. Der 409 traegt die Kartenkennung mit - der
    // Bildschirm oeffnet damit genau die Karte, auf der "Praemie eingeloest" steht.
    const laufend = bisherige.find((k) => OFFENE_ZUSTAENDE.includes(k.status));
    if (laufend) {
      return { art: "karte_laeuft_bereits" as const, kartenId: laufend.id };
    }
    // cycle traegt "mehrere Karten nacheinander" - eine partielle Eindeutigkeit
    // ("nur EINE ACTIVE je Gast und Programm") kann Prisma nicht ausdruecken.
    const cycle = (bisherige[0]?.cycle ?? 0) + 1;

    const angelegt = await tx.stampCard.create<{ id: string }>({
      data: {
        businessId: venueId,
        programId: programm.id,
        guestId,
        cycle,
        currentStamps: 0,
        maxStamps: programm.maxStamps,
        rewardText: programm.rewardText,
        status: "ACTIVE",
        scanTokenHash: createHash("sha256").update(randomBytes(32)).digest("hex"),
        expiresAt: programm.validityDays
          ? new Date(jetzt.getTime() + programm.validityDays * TAG_MS)
          : null,
      },
      select: { id: true },
    });
    return { art: "ok" as const, kartenId: angelegt.id };
  });

  if (ergebnis.art !== "ok") return ergebnis;
  const karte = await karteLaden(venueId, ergebnis.kartenId);
  // Kann nur fehlen, wenn zeitgleich der ganze Betrieb geloescht wurde.
  if (!karte) return { art: "kein_programm" };
  return { art: "ok", karte: await toKartenDetail(venueId, karte) };
}

export type BuchungsErgebnis =
  | { art: "ok"; wiederholung: boolean; karte: KartenDetail }
  | { art: "nicht_gefunden" }
  | { art: "karte_nicht_aktiv"; status: KartenStatus }
  | { art: "karte_abgelaufen" }
  | { art: "praemie_nicht_erreicht"; stand: number; benoetigt: number }
  | { art: "sperrfrist"; frueheste: string }
  | { art: "konflikt" };

type InternesErgebnis =
  | { art: "ok"; wiederholung: boolean; kartenId: string }
  | Exclude<BuchungsErgebnis, { art: "ok" }>;

async function mitDetail(venueId: string, e: InternesErgebnis): Promise<BuchungsErgebnis> {
  if (e.art !== "ok") return e;
  const karte = await karteLaden(venueId, e.kartenId);
  if (!karte) return { art: "nicht_gefunden" };
  return { art: "ok", wiederholung: e.wiederholung, karte: await toKartenDetail(venueId, karte) };
}

interface StempelEingabe {
  idempotencyKey: string;
  note?: string;
  deviceLabel?: string;
  staffUserId?: string | null;
}

/**
 * Einen Stempel setzen — in EINER Transaktion, mit vier Riegeln.
 *
 * 1) IDEMPOTENZ. Derselbe Vorgangsschluessel ein zweites Mal ist ERFOLG, kein
 *    Fehler: das erste Piepen ging unter, das Personal tippt nochmal. Antwort ist
 *    200 mit dem bestehenden Zustand. Die eigentliche Abwehr sitzt in der Datenbank
 *    (@@unique([stampCardId, idempotencyKey])) - die Vorabpruefung hier spart nur
 *    den Rollback im Normalfall.
 * 2) SPERRFRIST. Gegen den letzten EARNED-Eintrag geprueft, nicht gegen
 *    `updatedAt`: nur so zaehlt der letzte STEMPEL und nicht die letzte beliebige
 *    Aenderung an der Zeile.
 * 3) OPTIMISTISCHE SPERRE. `updateMany where { id, businessId, version }`. Prismas
 *    `increment` allein genuegt NICHT: das Inkrement ist atomar, die Pruefung davor
 *    nicht - zwei gleichzeitige Anfragen mit verschiedenen Vorgangsschluesseln
 *    laesen sonst beide "keine Sperre" und schrieben beide.
 * 4) DER NEUE STAND WIRD GESETZT, NICHT INKREMENTIERT. Er kommt aus dem Hauptbuch;
 *    ein einmal verrutschter Lese-Cache heilt damit hier. Sicher ist das nur wegen
 *    (3): die Versionspruefung schliesst aus, dass zwischen Lesen und Schreiben
 *    jemand anders gestempelt hat.
 */
export async function stempelSetzen(
  venueId: string,
  cardId: string,
  eingabe: StempelEingabe,
  jetzt: Date = new Date(),
): Promise<BuchungsErgebnis> {
  let ergebnis: InternesErgebnis;
  try {
    ergebnis = await db.$transaction(async (tx) => {
      const karte = await tx.stampCard.findFirst<KartenRow>({
        where: { id: cardId, businessId: venueId },
        select: KARTEN_SELECT,
      });
      if (!karte) return { art: "nicht_gefunden" as const };

      const schonGebucht = await tx.stampEvent.findFirst<{ id: string }>({
        // `businessId` steht auch hier in der WHERE-Klausel, obwohl drei Zeilen
        // darueber bereits betriebsgebunden geladen wurde. Es waren die einzigen
        // zwei Abfragen dieses Moduls ohne Mandantenbezug - ausnutzbar nicht, aber
        // die Regel "JEDE Abfrage fuehrt businessId" ist nur dann ein Riegel, wenn
        // sie keine Ausnahme kennt, ueber die man beim naechsten Umbau nachdenken muss.
        where: {
          businessId: venueId,
          stampCardId: cardId,
          idempotencyKey: eingabe.idempotencyKey,
        },
        select: { id: true },
      });
      if (schonGebucht) {
        return { art: "ok" as const, wiederholung: true, kartenId: karte.id };
      }

      if (karte.status !== "ACTIVE") {
        return { art: "karte_nicht_aktiv" as const, status: karte.status };
      }
      if (karte.expiresAt && new Date(karte.expiresAt).getTime() <= jetzt.getTime()) {
        // Der Status wird hier NICHT auf EXPIRED gesetzt: das ist die Aufgabe eines
        // Aufraeumlaufs, und ein Schreibzugriff im Fehlerpfad einer abgelehnten
        // Buchung waere eine Nebenwirkung, die niemand erwartet.
        return { art: "karte_abgelaufen" as const };
      }

      const programm = await tx.stampProgram.findFirst<ProgramRow>({
        where: { id: karte.programId, businessId: venueId },
        select: PROGRAM_SELECT,
      });
      const sperre = programm?.cooldownSeconds ?? 0;
      if (sperre > 0) {
        const letzter = await tx.stampEvent.findFirst<{ createdAt: Date }>({
          where: { businessId: venueId, stampCardId: cardId, kind: "EARNED" },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        });
        if (letzter) {
          const frueheste = new Date(letzter.createdAt).getTime() + sperre * 1000;
          if (frueheste > jetzt.getTime()) {
            return {
              art: "sperrfrist" as const,
              frueheste: new Date(frueheste).toISOString(),
            };
          }
        }
      }

      const summe = await tx.stampEvent.aggregate<{ _sum: { delta: number | null } }>({
        where: { businessId: venueId, stampCardId: cardId },
        _sum: { delta: true },
      });
      const stand = summe._sum?.delta ?? 0;
      const neuerStand = stand + 1;
      const voll = neuerStand >= karte.maxStamps;

      const { count } = await tx.stampCard.updateMany({
        where: { id: cardId, businessId: venueId, version: karte.version },
        data: {
          currentStamps: neuerStand,
          version: { increment: 1 },
          // Quelle des Last-Modified-Headers, sobald es Wallet-Paesse gibt. Wird
          // hier schon gefuehrt, damit der Pfad spaeter nichts nachtragen muss.
          //
          // `passUpdateSeq` bleibt bewusst unberuehrt: der Wert kommt aus der
          // Sequenz "wallet_pass_update_seq", die erst die noch nicht eingespielte
          // Migration anlegt, und er zaehlt nur fuer REGISTRIERTE Paesse. Es gibt
          // heute keinen einzigen (ohne Apple-Zertifikat wird kein Pass gebaut,
          // serialNumber ist ueberall NULL). Ein nextval() hier waere also ein
          // sicherer 500er fuer einen Zweck, den es noch nicht gibt. Der Wallet-Pfad
          // muss ihn spaeter in DERSELBEN Transaktion fortschreiben.
          contentChangedAt: jetzt,
          ...(voll ? { status: "COMPLETED", completedAt: jetzt } : {}),
        },
      });
      if (count === 0) return { art: "konflikt" as const };

      await tx.stampEvent.create<{ id: string }>({
        data: {
          businessId: venueId,
          stampCardId: cardId,
          kind: "EARNED",
          delta: 1,
          balanceAfter: neuerStand,
          source: "MANUAL",
          idempotencyKey: eingabe.idempotencyKey,
          staffUserId: eingabe.staffUserId ?? null,
          deviceLabel: eingabe.deviceLabel ?? null,
          note: eingabe.note ?? null,
        },
        select: { id: true },
      });

      return { art: "ok" as const, wiederholung: false, kartenId: karte.id };
    });
  } catch (err) {
    // Wettlauf auf @@unique([stampCardId, idempotencyKey]): die Transaktion ist
    // zurueckgerollt, die andere Anfrage hat gebucht. Fuer den Aufrufer ist das
    // Erfolg - er hat denselben Vorgang zweimal geschickt.
    if (!istUniqueVerletzung(err)) throw err;
    ergebnis = { art: "ok", wiederholung: true, kartenId: cardId };
  }
  return mitDetail(venueId, ergebnis);
}

/**
 * Praemie eingeloest.
 *
 * Eigenes Ereignis mit `delta = -maxStamps` statt "currentStamps = 0" - sonst ist
 * hinterher nicht unterscheidbar, ob eingeloest oder zurueckgesetzt wurde.
 *
 * EIN UEBERSCHUSS BLEIBT STEHEN — UND DIE KARTE BLEIBT DAFUER OFFEN.
 * Das war bis hierher eine Zusage im Kommentar, die der Code brach: `rest` wurde
 * geschrieben UND `status: "REDEEMED"` im selben Block. Der elfte Stempel lag danach
 * auf einer geschlossenen Karte - nicht mehr bestempelbar (der Stempelpfad verlangt
 * ACTIVE), nicht mehr einloesbar, und `karteAusgeben` legt die Folgekarte bei 0 an,
 * uebertragen wird nichts. Er war dem Gast genommen, und der Test daneben prueste
 * nur die geschriebene Spalte.
 *
 * Deshalb: bei `rest > 0` geht die Karte auf ACTIVE zurueck und `completedAt` wird
 * geloescht (sie ist ja nicht mehr voll). `redeemedCount` traegt die Einloesung, und
 * das Schema sieht mehrfaches Einloesen derselben Karte ausdruecklich vor. Kein
 * Uebertrag auf eine neue Karte: das waeren zwei Ereignisse fuer eine Zahl, die
 * schon da steht.
 *
 * Es wird KEINE Anschlusskarte angelegt. Das ist eine Entscheidung des Betriebs
 * ("will der Gast weitersammeln?") und laeuft ueber `karteAusgeben`, das den
 * naechsten `cycle` selbst ermittelt.
 */
export async function praemieEinloesen(
  venueId: string,
  cardId: string,
  eingabe: StempelEingabe,
  jetzt: Date = new Date(),
): Promise<BuchungsErgebnis> {
  let ergebnis: InternesErgebnis;
  try {
    ergebnis = await db.$transaction(async (tx) => {
      const karte = await tx.stampCard.findFirst<KartenRow>({
        where: { id: cardId, businessId: venueId },
        select: KARTEN_SELECT,
      });
      if (!karte) return { art: "nicht_gefunden" as const };

      const schonGebucht = await tx.stampEvent.findFirst<{ id: string }>({
        // Siehe `stempelSetzen`: businessId gehoert auch in diese WHERE-Klausel.
        where: {
          businessId: venueId,
          stampCardId: cardId,
          idempotencyKey: eingabe.idempotencyKey,
        },
        select: { id: true },
      });
      if (schonGebucht) return { art: "ok" as const, wiederholung: true, kartenId: karte.id };

      if (!OFFENE_ZUSTAENDE.includes(karte.status)) {
        return { art: "karte_nicht_aktiv" as const, status: karte.status };
      }

      const summe = await tx.stampEvent.aggregate<{ _sum: { delta: number | null } }>({
        where: { businessId: venueId, stampCardId: cardId },
        _sum: { delta: true },
      });
      const stand = summe._sum?.delta ?? 0;
      if (stand < karte.maxStamps) {
        return {
          art: "praemie_nicht_erreicht" as const,
          stand,
          benoetigt: karte.maxStamps,
        };
      }
      const rest = stand - karte.maxStamps;

      const { count } = await tx.stampCard.updateMany({
        where: { id: cardId, businessId: venueId, version: karte.version },
        data: {
          currentStamps: rest,
          redeemedCount: { increment: 1 },
          version: { increment: 1 },
          redeemedAt: jetzt,
          contentChangedAt: jetzt,
          // Nur schliessen, wenn wirklich nichts uebrig ist. Sonst naehme das
          // REDEEMED dem Gast seinen Ueberschuss - siehe Funktionskommentar.
          ...(rest > 0
            ? { status: "ACTIVE" as const, completedAt: null }
            : { status: "REDEEMED" as const }),
        },
      });
      if (count === 0) return { art: "konflikt" as const };

      await tx.stampEvent.create<{ id: string }>({
        data: {
          businessId: venueId,
          stampCardId: cardId,
          kind: "REDEEMED",
          delta: -karte.maxStamps,
          balanceAfter: rest,
          source: "MANUAL",
          idempotencyKey: eingabe.idempotencyKey,
          staffUserId: eingabe.staffUserId ?? null,
          deviceLabel: eingabe.deviceLabel ?? null,
          note: eingabe.note ?? null,
        },
        select: { id: true },
      });

      return { art: "ok" as const, wiederholung: false, kartenId: karte.id };
    });
  } catch (err) {
    if (!istUniqueVerletzung(err)) throw err;
    ergebnis = { art: "ok", wiederholung: true, kartenId: cardId };
  }
  return mitDetail(venueId, ergebnis);
}

/**
 * Karte entwerten. UNUMKEHRBAR — deshalb gehoert der Aufruf ins Kartendetail mit
 * Grund und Rueckfrage und nicht in die Liste, wo er einen Fehltipp entfernt saesse.
 * Der Grund landet im Hauptbuch, nicht in einem Kommentarfeld an der Karte: er ist
 * Teil des Vorgangs.
 */
export async function karteEntwerten(
  venueId: string,
  cardId: string,
  grund: string,
  staffUserId: string | null,
  jetzt: Date = new Date(),
): Promise<BuchungsErgebnis> {
  const ergebnis = await db.$transaction<InternesErgebnis>(async (tx) => {
    const karte = await tx.stampCard.findFirst<KartenRow>({
      where: { id: cardId, businessId: venueId },
      select: KARTEN_SELECT,
    });
    if (!karte) return { art: "nicht_gefunden" as const };
    if (!OFFENE_ZUSTAENDE.includes(karte.status)) {
      return { art: "karte_nicht_aktiv" as const, status: karte.status };
    }

    const summe = await tx.stampEvent.aggregate<{ _sum: { delta: number | null } }>({
      where: { businessId: venueId, stampCardId: cardId },
      _sum: { delta: true },
    });
    const stand = summe._sum?.delta ?? 0;

    const { count } = await tx.stampCard.updateMany({
      where: { id: cardId, businessId: venueId, version: karte.version },
      data: {
        currentStamps: 0,
        version: { increment: 1 },
        status: "VOIDED",
        contentChangedAt: jetzt,
      },
    });
    if (count === 0) return { art: "konflikt" as const };

    await tx.stampEvent.create<{ id: string }>({
      data: {
        businessId: venueId,
        stampCardId: cardId,
        kind: "VOIDED",
        delta: -stand,
        balanceAfter: 0,
        source: "MANUAL",
        // Entwerten geht nur einmal (der Statuscheck oben sperrt die Wiederholung),
        // ein vom Aufrufer gelieferter Schluessel brauchte hier nichts zu leisten.
        idempotencyKey: randomUUID(),
        staffUserId,
        note: grund,
      },
      select: { id: true },
    });

    return { art: "ok" as const, wiederholung: false, kartenId: karte.id };
  });
  return mitDetail(venueId, ergebnis);
}

/* ── Gastdaten loeschen = anonymisieren ──────────────────────────────────── */

export type AnonymisierenErgebnis = { art: "ok" } | { art: "nicht_gefunden" };

/**
 * Die Loeschanfrage eines Gastes beantworten — als ANONYMISIERUNG, nie als DELETE.
 *
 * Das Verfahren steht als verbindlich im Modellkommentar: phone, phoneE164 und email
 * auf NULL, name auf einen festen Platzhalter, anonymizedAt setzen. Karten,
 * Hauptbuch und Auswertung bleiben stehen.
 *
 * WARUM KEIN DELETE ANGEBOTEN WIRD: An MaitrGuest haengen per Cascade die Karten und
 * darueber das Hauptbuch. Ein Mitarbeiter, der sich vierzigmal selbst gestempelt hat,
 * raeumte mit "Gast loeschen" in einem Klick alle vierzig Belege ab — mit einem
 * Recht, das er fuer die taegliche Arbeit ohnehin braucht.
 *
 * DIE WALLET-REGISTRIERUNGEN MUESSEN MIT. `deviceLibraryIdentifier` und `pushToken`
 * sind personenbezogen; blieben sie stehen, waere das Geraet der Person nach der
 * Anonymisierung weiterhin adressierbar. Deshalb in DERSELBEN Transaktion.
 *
 * Idempotent: ein bereits anonymisierter Gast wird erneut ueberschrieben und
 * behaelt seinen urspruenglichen `anonymizedAt`-Zeitpunkt.
 *
 * ZWEI RIEGEL, DIE HIER FRUEHER FEHLTEN:
 *
 * 1) WER ES GETAN HAT, IST SELBST EIN BELEG. Das ist der einzige unumkehrbare
 *    Schreibzugriff dieses Moduls, der KEIN StampEvent erzeugt — es gab also
 *    hinterher keine Zeile, aus der hervorging, dass jemand ihn ausgeloest hat. Wer
 *    sich vierzigmal auf einen erfundenen Gast gestempelt hat, konnte damit den
 *    einzigen Beleg dafuer, dass "Tom" ein Phantom war (keine Nummer, niemand, den
 *    der Wirt anrufen kann), spurlos entfernen. Das Loeschen der Belege verhindert
 *    der Verzicht auf DELETE; das Loeschen des Kontexts verhindert diese Zeile.
 *    Deshalb: `staffUserId` ist PFLICHT und der AuditLog-Eintrag laeuft in DERSELBEN
 *    Transaktion — scheitert er, ist auch nichts anonymisiert.
 *
 * 2) NUR GAESTE MIT KARTE. Der Bildschirm heisst "Stempelkarte"; ohne diesen Filter
 *    konnte ueber ihn jeder MaitrGuest des Betriebs anonymisiert werden, auch ein
 *    reiner Reservierungsgast, der mit Treue nie zu tun hatte. Ein Endpunkt darf
 *    nicht mehr koennen, als der Bildschirm davor braucht.
 */
export async function gastAnonymisieren(
  venueId: string,
  guestId: string,
  staffUserId: string,
  jetzt: Date = new Date(),
): Promise<AnonymisierenErgebnis> {
  return db.$transaction(async (tx) => {
    const gast = await tx.maitrGuest.findFirst<{ id: string; anonymizedAt: Date | null }>({
      where: { id: guestId, businessId: venueId },
      select: { id: true, anonymizedAt: true },
    });
    if (!gast) return { art: "nicht_gefunden" as const };

    const karten = await tx.stampCard.findMany<{ id: string }>({
      where: { businessId: venueId, guestId },
      select: { id: true },
    });
    // Ununterscheidbar von "gibt es nicht", mit Absicht: sonst waere am
    // Antwortverhalten ablesbar, welche Gaeste des Betriebs eine Karte haben.
    if (karten.length === 0) return { art: "nicht_gefunden" as const };

    for (const block of bloecke(karten.map((k) => k.id))) {
      await tx.walletDeviceRegistration.deleteMany({
        where: { businessId: venueId, stampCardId: { in: block } },
      });
    }

    await tx.maitrGuest.updateMany({
      where: { id: guestId, businessId: venueId },
      data: {
        name: ANONYM_PLATZHALTER,
        phone: null,
        phoneE164: null,
        email: null,
        // Beim zweiten Aufruf nicht neu setzen: der Zeitpunkt der Loeschung ist der
        // erste, nicht der letzte.
        anonymizedAt: gast.anonymizedAt ?? jetzt,
      },
    });

    await tx.auditLog.create<{ id: string }>({
      data: {
        userId: staffUserId,
        action: "guest.anonymize",
        resource: "MaitrGuest",
        resourceId: guestId,
        // Was NICHT hineingeht: der alte Name und die alte Nummer. Ein Protokoll,
        // das die geloeschten Daten mitschreibt, hebt die Loeschung auf.
        changes: { businessId: venueId, betroffeneKarten: karten.length },
      },
      select: { id: true },
    });

    return { art: "ok" as const };
  });
}
