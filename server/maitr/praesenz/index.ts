/**
 * Präsenz-Workflow: Google-Eintrag und Website eines Betriebs abrufen, speichern
 * und daraus den Präsenzbericht rechnen - ohne Google-Freigabe.
 *
 * DREI AUSLÖSER, EIN ABLAUF (`aktualisierePraesenz`):
 *  1. Die App meldet sich an und findet keinen oder einen veralteten Stand
 *     (POST /api/maitr/venues/:venueId/presence/refresh).
 *  2. Die Web-App wird veröffentlicht (server/routes/webapps.ts) - der Betrieb
 *     hat danach Name, Adresse und Website, und die App findet beim ersten Öffnen
 *     schon einen fertigen Bericht vor.
 *  3. Der Zeitgeber (scheduler.ts) frischt einmal täglich auf, was älter als 24
 *     Stunden ist (`aktualisiereVeraltetePraesenz`).
 *
 * ABLAUF IM EINZELNEN:
 *   Betrieb laden → Google Places suchen (falls Schlüssel) → Website bestimmen
 *   (Google > Analyse-Job des Konfigurators > Social Links > contactInfo, nie die
 *   Maitr-Web-App selbst) → Website prüfen → Rohdaten in PresenceSnapshot →
 *   Briefing-Cache verwerfen → Bericht rechnen.
 *
 * GESPEICHERT werden nur die Rohdaten. Der Bericht entsteht bei jedem Lesen neu
 * (`ladePraesenz`), damit er sofort auf eine neu angelegte Speisekarte oder
 * Beschreibung reagiert.
 *
 * PLACES-INHALTE haben ein Höchstalter von 30 Tagen (`GOOGLE_HOECHSTALTER_MS` in
 * profil.ts): Ein älterer Eintrag wird nicht mehr ausgeliefert und beim nächsten
 * Schreiben verworfen, nur die Place-ID bleibt. In Logs landet nichts aus dem
 * Eintrag (`logGrund`).
 *
 * FEHLENDE TABELLE: Der Code landet über main automatisch auf Railway, die
 * Migration spielt ein Mensch ein. Dazwischen fehlt PresenceSnapshot. Lesen und
 * Schreiben fangen das ab - aber OHNE lesbaren Stand gibt es keinen bezahlten
 * Abruf: Die Drossel hängt am gespeicherten Stand, und ohne ihn kostete jedes
 * App-Öffnen eine Places-Suche (Prüfbefund). Der Refresh meldet dann
 * "ausstehend". Scheitert nur das Schreiben, hält eine prozesslokale Drossel die
 * Kosten trotzdem im Zaum (`letzteLaeufe`).
 */
import type { VenuePresence } from "@maitr/core/api";
import {
  praesenzBericht,
  type GoogleAbrufStatus,
  type GoogleEintrag,
  type MaitrProfil,
  type PraesenzSnapshot,
  type VenueDataset,
  type WebsitePruefung,
} from "@maitr/core/analytics";
import type { FetchLike } from "@maitr/core/integrations";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { assembleVenueDataset } from "../dataset";
import {
  NAMENSNAEHE_MIN,
  hatOrtsbeleg,
  namensNaehe,
  placesSchluessel,
  suchePlace,
  type PlacesSuche,
} from "./places";
import {
  alsStatus,
  alsWebsite,
  feld,
  googleAbgerufenAm,
  gueltigesGoogle,
  leseSnapshot,
  maitrProfilAus,
  objekt,
  placeIdAus,
  standAusSnapshot,
  websiteGeprueftAm,
  type BetriebZeile,
  type SnapshotZeile,
} from "./profil";
import { pruefeWebsite } from "./website";

export { GOOGLE_HOECHSTALTER_MS, gespeichertePraesenz, maitrProfilAus } from "./profil";

/** Unterhalb dieses Abstands liefert ein Refresh den gespeicherten Stand (Kosten). */
export const DROSSEL_MS = 10 * 60_000;
/** Ab diesem Alter gilt ein Stand als veraltet (App-Hinweis + Zeitgeber). */
export const VERALTET_MS = 24 * 60 * 60_000;
/**
 * So lange übersteht ein erreichbarer Website-Befund eine gescheiterte Prüfung.
 * Ein Timeout oder ein kurzer Ausfall soll "Speisekarte verlinkt" und
 * "Reservierung" nicht bis zum nächsten Lauf löschen - eine Seite, die drei Tage
 * (drei Zeitgeber-Läufe) nicht antwortet, ist aber wirklich weg.
 */
export const WEBSITE_KULANZ_MS = 3 * 24 * 60 * 60_000;

/**
 * 7 s je Fremdabruf. Die Kette ist Suche → Fotos (parallel) → Website (eigene
 * 7 s in website.ts), also höchstens gut 21 s - unter der 26-s-Grenze des
 * Netlify-Proxys, über den die App die API erreicht.
 */
const FREMDABRUF_TIMEOUT_MS = 7_000;

const fetchLike: FetchLike = async (url, init) => {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(FREMDABRUF_TIMEOUT_MS) });
  return { ok: res.ok, status: res.status, json: () => res.json() };
};

/** Austauschbar für Tests - kein Netz, feste Zeit, frei wählbarer Schlüssel. */
export interface PraesenzUmgebung {
  fetch: FetchLike;
  pruefeWebsite: (url: string) => Promise<WebsitePruefung>;
  jetzt: () => Date;
  schluessel: () => string | null;
}

const STANDARD: PraesenzUmgebung = {
  fetch: fetchLike,
  pruefeWebsite,
  jetzt: () => new Date(),
  schluessel: placesSchluessel,
};

/**
 * Fehlergrund fürs Log - ohne Places-Inhalte.
 *
 * ANLASS: Prisma schreibt bei Validierungsfehlern den kompletten Aufruf samt
 * Werten in die Meldung. Scheitert das Speichern des Snapshots, stünden damit
 * Bewertungstexte, Autorennamen und Fotoadressen im Railway-Log - Places-Inhalte,
 * die über die Place-ID hinaus nirgends dauerhaft liegen sollen. Gleiches gilt für
 * einen JSON-Fehler beim Lesen der Places-Antwort ("Unexpected token … is not
 * valid JSON" zitiert den Rumpf).
 *
 * Deshalb nur die LETZTE Zeile (bei Prisma der eigentliche Grund, etwa "The table
 * `public.PresenceSnapshot` does not exist …"), gekürzt. Enthält sie doppelte
 * Anführungszeichen - so zitieren Prisma und JSON.parse Werte -, bleibt nur der
 * Fehlername.
 */
export function logGrund(err: unknown): string {
  const name = err instanceof Error ? err.name : "Fehler";
  const meldung = err instanceof Error ? err.message : String(err);
  const zeilen = meldung.split("\n").map((z) => z.trim()).filter(Boolean);
  const letzte = (zeilen[zeilen.length - 1] ?? "").slice(0, 200);
  const code = typeof (err as { code?: unknown } | null)?.code === "string" ? `${(err as { code: string }).code} ` : "";
  if (!letzte || letzte.includes('"')) return `${code}${name}`;
  return `${code}${letzte}`;
}

/* ── Betrieb lesen ──────────────────────────────────────────────────────── */

interface Betrieb {
  zeile: BetriebZeile;
  speisekarteGerichte: number;
  /** Websites aus den Analyse-Jobs der Mitglieder (Konfigurator). */
  analyseSeiten: Array<{ websiteUrl: string; businessName: string | null }>;
}

async function ladeBetrieb(venueId: string): Promise<Betrieb> {
  const [zeile, speisekarteGerichte, mitglieder] = await Promise.all([
    prisma.business.findUniqueOrThrow({
      where: { id: venueId },
      select: {
        id: true,
        name: true,
        description: true,
        tags: true,
        openingHours: true,
        socialLinks: true,
        contactInfo: true,
        postalCode: true,
        latitude: true,
        longitude: true,
      },
    }),
    prisma.menuItem.count({ where: { category: { businessId: venueId } } }),
    prisma.businessMember.findMany({ where: { businessId: venueId }, select: { userId: true } }),
  ]);
  const userIds = mitglieder.map((m) => m.userId);
  const analyseSeiten = userIds.length
    ? await prisma.scraperJob.findMany({
        where: { userId: { in: userIds } },
        select: { websiteUrl: true, businessName: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    : [];
  return { zeile: zeile as BetriebZeile, speisekarteGerichte, analyseSeiten };
}

/** Wonach bei Google gesucht wird. */
export function placesSucheAus(zeile: BetriebZeile): PlacesSuche {
  const kontakt = objekt(zeile.contactInfo);
  return {
    name: zeile.name,
    ...(feld(kontakt.address) ? { adresse: feld(kontakt.address) } : {}),
    ...(zeile.postalCode ? { postalCode: zeile.postalCode } : {}),
    ...(typeof zeile.latitude === "number" ? { lat: zeile.latitude } : {}),
    ...(typeof zeile.longitude === "number" ? { lng: zeile.longitude } : {}),
  };
}

/**
 * Gehört die Adresse zu Maitr selbst (die veröffentlichte Web-App unter
 * `<sub>.maitr.de` bzw. `PUBLIC_BASE_DOMAIN`)?
 *
 * ANLASS (Prüfbefund): Ohne eigene Website fiel die Prüfung auf `contactInfo.website`
 * zurück - die publishedUrl der Web-App. safeFetch schickt einen Accept-Header
 * ohne text/html, die Edge-Function steigt dann aus, und Netlify liefert die vorgerenderte
 * maitr.de-Startseite: Titel "Maitr – Restaurant-Web-App …", kein
 * Restaurant-Schema, keine Reservierung. Der Bericht empfahl "Online-Reservierung
 * anbieten - deine Maitr-Web-App bringt eine mit", obwohl genau diese Web-App
 * geprüft wurde. Selbst mit `text/html` rendert erst der Browser die Inhalte des
 * Betriebs; per HTML-Abruf ist die Web-App nicht prüfbar.
 */
export function istMaitrAdresse(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return false;
  }
  const basen = new Set(["maitr.de", (process.env.PUBLIC_BASE_DOMAIN || "maitr.de").trim().toLowerCase()]);
  for (const basis of basen) {
    if (basis && (host === basis || host.endsWith(`.${basis}`))) return true;
  }
  return false;
}

/**
 * Welche Adressen kämen für die Prüfung in Frage, in dieser Reihenfolge: die, die
 * Gäste bei Google finden, danach die, die der Wirt im Konfigurator analysieren
 * ließ (nur bei passendem Namen: ein Konto hat oft mehrere Testbetriebe - gleiche
 * bereinigte Namensnähe wie bei Places, sonst genügte ein gemeinsames
 * "Restaurant"), danach Social Links, zuletzt contactInfo.website.
 */
function websiteKandidaten(
  google: GoogleEintrag | null,
  betrieb: Pick<Betrieb, "zeile" | "analyseSeiten">,
): string[] {
  const kandidaten: Array<string | undefined> = [
    feld(google?.website),
    ...betrieb.analyseSeiten
      .filter((job) => job.businessName && namensNaehe(betrieb.zeile.name, job.businessName) >= NAMENSNAEHE_MIN)
      .map((job) => feld(job.websiteUrl)),
    feld(objekt(betrieb.zeile.socialLinks).website),
    feld(objekt(betrieb.zeile.contactInfo).website),
  ];
  return kandidaten.filter((url): url is string => Boolean(url));
}

/** Die zu prüfende Website: der erste Kandidat, der nicht Maitr selbst ist. */
export function websiteFuerPruefung(
  google: GoogleEintrag | null,
  betrieb: Pick<Betrieb, "zeile" | "analyseSeiten">,
): string | undefined {
  return websiteKandidaten(google, betrieb).find((url) => !istMaitrAdresse(url));
}

/* ── Gespeicherter Stand ────────────────────────────────────────────────── */

async function speichereSnapshot(
  venueId: string,
  daten: {
    status: GoogleAbrufStatus;
    fehler: string | null;
    google: GoogleEintrag | null;
    /** Wann `google` wirklich bei Places abgerufen wurde (Höchstalter, profil.ts). */
    googleAbgerufenAt: Date;
    /** Bleibt auch ohne Inhalt stehen - die Place-ID darf gespeichert bleiben. */
    placeId: string | null;
    website: WebsitePruefung | null;
    /** Wann `website` wirklich geprüft wurde (Kulanz nach Ausfall, siehe unten). */
    websiteGeprueftAt: Date;
    fetchedAt: Date;
  },
): Promise<void> {
  const werte = {
    placeId: daten.placeId,
    status: daten.status,
    fehler: daten.fehler,
    // Leere Json-Spalten brauchen `Prisma.DbNull` (SQL NULL). Ein blosses `null`
    // lehnt Prisma seit Version 4 ab - der Upsert warf dann bei JEDEM Lauf ohne
    // Google-Eintrag oder ohne Website, der catch unten loggte nur. Folgen waren:
    // abgelaufene Places-Inhalte wurden nie mit NULL überschrieben, die Drossel
    // fand nie einen Stand (jeder Refresh ein bezahlter Places-Abruf), und der
    // Zeitgeber wählte dieselben Betriebe bei jedem Lauf erneut aus. Dasselbe
    // Muster wie `openingHours` in server/maitr/routes.ts.
    google: daten.google
      ? ({ ...daten.google, abgerufenAt: daten.googleAbgerufenAt.toISOString() } as unknown as Prisma.InputJsonValue)
      : Prisma.DbNull,
    website: daten.website
      ? ({ ...daten.website, geprueftAt: daten.websiteGeprueftAt.toISOString() } as unknown as Prisma.InputJsonValue)
      : Prisma.DbNull,
    fetchedAt: daten.fetchedAt,
  };
  try {
    await prisma.presenceSnapshot.upsert({
      where: { businessId: venueId },
      create: { businessId: venueId, ...werte },
      update: werte,
    });
  } catch (err) {
    console.warn(`[maitr] PresenceSnapshot nicht speicherbar (Migration eingespielt?): ${logGrund(err)}`);
  }
}

/* ── Antwort ────────────────────────────────────────────────────────────── */

/** Hinweis, wenn Maitr mangels PLZ und Koordinaten nicht bei Google sucht (`hatOrtsbeleg`). */
export const HINWEIS_ORTSANGABE_FEHLT =
  "Für die Suche bei Google Maps fehlt uns die Adresse deines Betriebs mit Postleitzahl.";

function hinweisFuer(
  status: GoogleAbrufStatus,
  hatGoogle: boolean,
  googleAbgelaufen = false,
  ohneOrtsangabe = false,
): string | undefined {
  switch (status) {
    case "ausstehend":
      // Vor dem Höchstalter-Hinweis: Ohne Adresse lässt sich der Eintrag ohnehin
      // nicht auffrischen - der Wirt soll lesen, was fehlt, nicht nur, was wegfiel.
      if (ohneOrtsangabe && !hatGoogle) return HINWEIS_ORTSANGABE_FEHLT;
      return googleAbgelaufen
        ? "Die gespeicherten Google-Daten sind älter als 30 Tage und werden nicht mehr gezeigt."
        : "Deine öffentliche Präsenz wurde noch nicht abgerufen.";
    case "kein_schluessel":
      return "Google-Daten folgen, sobald der Google-Zugang von Maitr eingerichtet ist.";
    case "nicht_gefunden":
      return "Bei Google Maps haben wir keinen passenden Eintrag gefunden.";
    case "fehler":
      return hatGoogle
        ? "Der letzte Google-Abruf ist fehlgeschlagen - du siehst den vorherigen Stand."
        : "Der Google-Abruf ist fehlgeschlagen. Versuche es später erneut.";
    default:
      return undefined;
  }
}

/**
 * Das Dataset, auf dem auch das Tagesbriefing rechnet - mit dem Stand, den der
 * Aufrufer gerade in der Hand hat. Scheitert das Zusammenstellen (etwa weil eine
 * Maitr-Tabelle fehlt), rechnet der Bericht allein aus dem Snapshot; der Abruf
 * bei Google soll daran nicht scheitern.
 */
async function scoreBasis(
  venueId: string,
  jetzt: Date,
  stand: { status: GoogleAbrufStatus; google: GoogleEintrag | null; website: WebsitePruefung | null },
): Promise<VenueDataset | undefined> {
  try {
    return await assembleVenueDataset(venueId, jetzt, { praesenz: stand });
  } catch (err) {
    console.warn(`[maitr] Präsenzbericht für Betrieb ${venueId} ohne Briefing-Datenlage gerechnet: ${logGrund(err)}`);
    return undefined;
  }
}

async function antwort(
  venueId: string,
  profil: MaitrProfil,
  stand: {
    status: GoogleAbrufStatus;
    google: GoogleEintrag | null;
    website: WebsitePruefung | null;
    fetchedAt?: Date;
    googleAbgelaufen?: boolean;
    /** Mit Schlüssel, aber ohne PLZ und Koordinaten - es wird nicht gesucht. */
    ohneOrtsangabe?: boolean;
    /** Ersetzt den Standard-Hinweis zum Status. */
    hinweis?: string;
  },
  jetzt: Date,
): Promise<VenuePresence> {
  const snapshot: PraesenzSnapshot = {
    now: jetzt.toISOString(),
    google: stand.google,
    googleStatus: stand.status,
    website: stand.website,
    maitr: profil,
  };
  const hinweis =
    stand.hinweis ??
    hinweisFuer(stand.status, Boolean(stand.google), stand.googleAbgelaufen, stand.ohneOrtsangabe);
  const basis = await scoreBasis(venueId, jetzt, { status: stand.status, google: stand.google, website: stand.website });
  return {
    status: stand.status,
    ...(stand.fetchedAt ? { fetchedAt: stand.fetchedAt.toISOString() } : {}),
    ...(hinweis ? { hinweis } : {}),
    ...(stand.google ? { google: stand.google } : {}),
    ...(stand.website ? { website: stand.website } : {}),
    bericht: praesenzBericht(snapshot, basis),
  };
}

/* ── Lesen ──────────────────────────────────────────────────────────────── */

/** Gespeicherten Stand liefern und den Bericht frisch rechnen. Kein Fremdabruf. */
export async function ladePraesenz(
  venueId: string,
  umgebung: Pick<PraesenzUmgebung, "jetzt" | "schluessel"> = STANDARD,
): Promise<VenuePresence> {
  const [betrieb, { zeile: snapshot }] = await Promise.all([ladeBetrieb(venueId), leseSnapshot(venueId)]);
  const profil = maitrProfilAus(betrieb.zeile, betrieb.speisekarteGerichte);
  const jetzt = umgebung.jetzt();
  const mitSchluessel = Boolean(umgebung.schluessel());
  const ohneEintrag: GoogleAbrufStatus = mitSchluessel ? "ausstehend" : "kein_schluessel";
  const ohneOrtsangabe = mitSchluessel && !hatOrtsbeleg(placesSucheAus(betrieb.zeile));
  if (!snapshot) {
    return antwort(venueId, profil, { status: ohneEintrag, google: null, website: null, ohneOrtsangabe }, jetzt);
  }
  return antwort(
    venueId,
    profil,
    { ...standAusSnapshot(snapshot, jetzt, ohneEintrag), fetchedAt: snapshot.fetchedAt, ohneOrtsangabe },
    jetzt,
  );
}

/* ── Aktualisieren ──────────────────────────────────────────────────────── */

/** Single-Flight: Doppeltipp und paralleler Zeitgeber teilen sich einen Abruf. */
const laufend = new Map<string, Promise<VenuePresence>>();

/** Was ein Lauf zuletzt geholt hat - nur im Speicher dieses Prozesses. */
interface LetzterLauf {
  zeit: number;
  stand: { status: GoogleAbrufStatus; google: GoogleEintrag | null; website: WebsitePruefung | null; fetchedAt: Date };
}

/**
 * Prozesslokale Drossel, der Rückfall für die gespeicherte.
 *
 * ANLASS (Prüfbefund): Die Drossel hing allein am gespeicherten Stand. Scheitert
 * das Schreiben (Tabelle fehlt, Json-Validierung wie beim früheren `null`-Fehler,
 * Datenbank kurz weg), findet der nächste Refresh keinen Stand und bezahlt die
 * nächste Places-Suche - in einer Schleife unbegrenzt oft. Hier liegt der letzte
 * Lauf je Betrieb für `DROSSEL_MS` im Speicher. Mehrere Railway-Instanzen hätten
 * je eine eigene - als Rückfall genügt das, die gespeicherte Drossel bleibt die
 * eigentliche.
 */
const letzteLaeufe = new Map<string, LetzterLauf>();

/** Nur für Tests: die prozesslokale Drossel leeren (sie überlebt sonst von Test zu Test). */
export function prozessDrosselLeeren(): void {
  letzteLaeufe.clear();
}

function merkeLauf(venueId: string, lauf: LetzterLauf): void {
  // Abgelaufene Einträge mitnehmen, damit die Map nicht mit jedem Betrieb wächst.
  for (const [id, alt] of letzteLaeufe) {
    if (lauf.zeit - alt.zeit >= DROSSEL_MS) letzteLaeufe.delete(id);
  }
  letzteLaeufe.set(venueId, lauf);
}

/** Hinweis, wenn der gespeicherte Stand nicht lesbar ist und deshalb nicht abgerufen wird. */
export const HINWEIS_SPEICHER_FEHLT =
  "Deine öffentliche Präsenz kann gerade nicht abgerufen werden. Versuche es später erneut.";

export interface AktualisierenOptionen {
  /** Drossel übergehen (Zeitgeber). Nie aus einer Anfrage heraus setzen. */
  erzwingen?: boolean;
}

export function aktualisierePraesenz(
  venueId: string,
  optionen: AktualisierenOptionen = {},
  umgebung: PraesenzUmgebung = STANDARD,
): Promise<VenuePresence> {
  const offen = laufend.get(venueId);
  if (offen) return offen;
  const lauf = aktualisiere(venueId, optionen, umgebung).finally(() => laufend.delete(venueId));
  laufend.set(venueId, lauf);
  return lauf;
}

async function aktualisiere(
  venueId: string,
  optionen: AktualisierenOptionen,
  umgebung: PraesenzUmgebung,
): Promise<VenuePresence> {
  const jetzt = umgebung.jetzt();
  const [betrieb, lesung] = await Promise.all([ladeBetrieb(venueId), leseSnapshot(venueId)]);
  const profil = maitrProfilAus(betrieb.zeile, betrieb.speisekarteGerichte);
  const vorher = lesung.zeile;

  // Ohne lesbaren Stand kein Fremdabruf - auch nicht erzwungen: Ohne Gedächtnis
  // griffe keine Drossel, und das Ergebnis ließe sich ohnehin nicht speichern.
  if (!lesung.lesbar) {
    return antwort(venueId, profil, { status: "ausstehend", google: null, website: null, hinweis: HINWEIS_SPEICHER_FEHLT }, jetzt);
  }

  const key = umgebung.schluessel();
  const suche = placesSucheAus(betrieb.zeile);
  const ohneOrtsangabe = Boolean(key) && !hatOrtsbeleg(suche);

  // Drossel: Ein Stand, der keine zehn Minuten alt ist, wird nicht neu bezahlt.
  // Das Höchstalter gilt auch hier: Ohne Schlüssel frischt jeder Lauf nur
  // `fetchedAt` auf, der Google-Inhalt darin kann trotzdem 30 Tage alt sein.
  if (vorher && !optionen.erzwingen && jetzt.getTime() - vorher.fetchedAt.getTime() < DROSSEL_MS) {
    return antwort(
      venueId,
      profil,
      {
        ...standAusSnapshot(vorher, jetzt, key ? "ausstehend" : "kein_schluessel"),
        fetchedAt: vorher.fetchedAt,
        ohneOrtsangabe,
      },
      jetzt,
    );
  }
  // Rückfall: Der gespeicherte Stand fehlt oder ist älter, aber dieser Prozess hat
  // gerade erst abgerufen - das Speichern ist also gescheitert.
  const imSpeicher = letzteLaeufe.get(venueId);
  const alter = imSpeicher ? jetzt.getTime() - imSpeicher.zeit : Infinity;
  if (imSpeicher && !optionen.erzwingen && alter >= 0 && alter < DROSSEL_MS) {
    return antwort(venueId, profil, { ...imSpeicher.stand, ohneOrtsangabe }, jetzt);
  }

  // Ein zu alter Eintrag gilt ab hier als nicht vorhanden - er wird weder
  // weitergereicht noch wieder gespeichert. Seine Place-ID bleibt.
  const vorherigesGoogle = vorher ? gueltigesGoogle(vorher, jetzt) : null;
  const vorherAbgerufenAt = vorher ? googleAbgerufenAm(vorher) : jetzt;
  const vorherigePlaceId = vorher ? placeIdAus(vorher) : null;
  let status: GoogleAbrufStatus;
  let google: GoogleEintrag | null;
  // Neu abgerufen → jetzt; stehen gebliebener Eintrag → sein alter Abrufzeitpunkt.
  let googleAbgerufenAt = vorherAbgerufenAt;
  let fehler: string | null = null;

  if (!key) {
    // Ohne Schlüssel bleibt ein früher geholter Eintrag stehen - er ist nicht
    // falsch geworden, nur weil der Schlüssel fehlt (bis zum Höchstalter).
    status = vorherigesGoogle ? alsStatus(vorher?.status) : "kein_schluessel";
    google = vorherigesGoogle;
  } else {
    try {
      const ergebnis = await suchePlace(suche, key, umgebung.fetch);
      if (ergebnis.status === "ohne_ortsangabe") {
        // Nicht gesucht (keine PLZ, keine Koordinaten) - also auch nichts
        // Neues erfahren. Wie ohne Schlüssel bleibt ein früherer Eintrag bis zum
        // Höchstalter stehen, und die Place-ID bleibt: "nicht_gefunden" wäre
        // eine Aussage über Google, die niemand gemessen hat (Prüfbefund).
        status = vorherigesGoogle ? alsStatus(vorher?.status) : "ausstehend";
        google = vorherigesGoogle;
      } else {
        status = ergebnis.status;
        google = ergebnis.status === "bereit" ? ergebnis.eintrag : null;
        if (google) googleAbgerufenAt = jetzt;
      }
    } catch (err) {
      fehler = (err as Error).message.slice(0, 500);
      console.warn(`[maitr] Google Places für Betrieb ${venueId} fehlgeschlagen: ${logGrund(err)}`);
      status = "fehler";
      google = vorherigesGoogle;
    }
  }
  // "nicht_gefunden" heißt: Die alte Place-ID passt nicht mehr (umbenannt,
  // geschlossen) - sie wird nicht weitergetragen.
  const placeId = google?.placeId ?? (status === "nicht_gefunden" ? null : vorherigePlaceId);

  const { website, websiteGeprueftAt } = await websiteStand(venueId, google, betrieb, vorher, jetzt, umgebung);

  await speichereSnapshot(venueId, {
    status,
    fehler,
    google,
    googleAbgerufenAt,
    placeId,
    website,
    websiteGeprueftAt,
    fetchedAt: jetzt,
  });
  // Das Briefing rechnet mit dem Google-Eintrag - ohne das zeigte der Start-Screen
  // bis zu 15 Minuten den alten Score.
  await prisma.insightsCache.deleteMany({ where: { businessId: venueId } }).catch(() => {});

  const stand = { status, google, website, fetchedAt: jetzt };
  merkeLauf(venueId, { zeit: jetzt.getTime(), stand });
  return antwort(venueId, profil, { ...stand, ohneOrtsangabe }, jetzt);
}

/** Gleicher Host (ohne "www."), unabhängig von Pfad, Protokoll und Endschrägstrich. */
export function gleicheSeite(a: string, b: string): boolean {
  const host = (u: string) =>
    (/^[a-z][a-z0-9+.-]*:\/\/([^/?#:]+)/i.exec(u.trim())?.[1] ?? "").toLowerCase().replace(/^www\./, "");
  const ha = host(a);
  return ha !== "" && ha === host(b);
}

/**
 * Darf der vorige Befund eine Lücke überbrücken? Nur ein erreichbarer Befund einer
 * eigenen Seite (nicht der Web-App), der jünger als `WEBSITE_KULANZ_MS` ist.
 */
function innerhalbDerKulanz(
  voriger: { website: WebsitePruefung; websiteGeprueftAt: Date } | null,
  jetzt: Date,
): voriger is { website: WebsitePruefung; websiteGeprueftAt: Date } {
  return Boolean(
    voriger &&
      voriger.website.erreichbar &&
      !istMaitrAdresse(voriger.website.url) &&
      jetzt.getTime() - voriger.websiteGeprueftAt.getTime() < WEBSITE_KULANZ_MS,
  );
}

/**
 * Die Website-Prüfung dieses Laufs - oder der vorige Befund, wo ein neuer nichts
 * Besseres weiß.
 *
 *  - Nur Maitr-eigene Adressen (istMaitrAdresse): keine Prüfung. Ein voriger
 *    erreichbarer Befund einer eigenen Seite bleibt höchstens `WEBSITE_KULANZ_MS`
 *    ab seiner Prüfung (die Frist verlängert sich nicht, `geprueftAt` bleibt der
 *    alte), ein alter Befund der Web-App fällt sofort weg. ANLASS (Prüfbefund):
 *    Ohne Frist blieb der Befund für immer. Ersetzt der Wirt bei Google seine
 *    alte Seite durch die Web-App - genau das empfiehlt ein Hebel -, meldete der
 *    Bericht dauerhaft deren "keine Reservierung" samt Hebel "verlinke deine
 *    Web-App", obwohl sie längst verlinkt ist; ein gespeichertes "nicht
 *    erreichbar" stand ebenso für immer da. Die Frist deckt nur die Lücke, in der
 *    die eigene Seite kurz aus den Quellen fällt (etwa ein einzelnes
 *    "nicht_gefunden" bei Google) - dieselbe Kulanz wie beim Ausfall unten.
 *  - Neue Prüfung "nicht erreichbar", vorige erreichbar und jünger als
 *    `WEBSITE_KULANZ_MS`: der vorige Befund bleibt. ANLASS (Prüfbefund): Ein
 *    Timeout nach 7 s ersetzte den guten Stand durch "keine Speisekarte, keine
 *    Reservierung", und der Bericht behauptete das bis zum nächsten Lauf nach 24 h.
 *    `pruefeWebsite` fängt Fehler selbst ab - der catch unten, der das verhindern
 *    sollte, lief nie.
 */
async function websiteStand(
  venueId: string,
  google: GoogleEintrag | null,
  betrieb: Betrieb,
  vorher: SnapshotZeile | null,
  jetzt: Date,
  umgebung: PraesenzUmgebung,
): Promise<{ website: WebsitePruefung | null; websiteGeprueftAt: Date }> {
  const vorige = vorher ? alsWebsite(vorher.website) : null;
  const voriger = vorige && vorher ? { website: vorige, websiteGeprueftAt: websiteGeprueftAm(vorher) } : null;

  const kandidaten = websiteKandidaten(google, betrieb);
  const url = kandidaten.find((k) => !istMaitrAdresse(k));
  if (!url) {
    const nurMaitr = kandidaten.length > 0;
    return nurMaitr && innerhalbDerKulanz(voriger, jetzt) ? voriger : { website: null, websiteGeprueftAt: jetzt };
  }

  let neu: WebsitePruefung;
  try {
    neu = await umgebung.pruefeWebsite(url);
  } catch (err) {
    console.warn(`[maitr] Website-Prüfung für Betrieb ${venueId} fehlgeschlagen: ${logGrund(err)}`);
    return voriger ?? { website: null, websiteGeprueftAt: jetzt };
  }
  // Nur dieselbe Seite darf ihren eigenen Ausfall überbrücken. Wechselt die
  // Adresse (neue Website bei Google, oder eine Altzeile trug die Seite eines
  // anderen Betriebs), gilt der neue Befund - auch wenn er "nicht erreichbar" ist.
  if (!neu.erreichbar && innerhalbDerKulanz(voriger, jetzt) && gleicheSeite(voriger.website.url, url)) {
    console.warn(
      `[maitr] Website für Betrieb ${venueId} gerade nicht erreichbar - der vorige erreichbare Befund bleibt stehen.`,
    );
    return voriger;
  }
  return { website: neu, websiteGeprueftAt: jetzt };
}

/**
 * Zeitgeber-Einstieg: Betriebe mit Mitgliedern, deren Stand fehlt oder älter als
 * 24 Stunden ist, der Reihe nach auffrischen. Gedeckelt je Lauf, damit ein
 * Zeitgebertick nie hunderte Google-Abrufe auf einmal auslöst. Liefert die Zahl
 * der aufgefrischten Betriebe.
 */
export async function aktualisiereVeraltetePraesenz(
  optionen: { limit?: number } = {},
  umgebung: PraesenzUmgebung = STANDARD,
): Promise<number> {
  const grenze = new Date(umgebung.jetzt().getTime() - VERALTET_MS);
  let kandidaten: Array<{ id: string }>;
  try {
    kandidaten = await prisma.business.findMany({
      where: {
        members: { some: {} },
        OR: [{ presenceSnapshot: { is: null } }, { presenceSnapshot: { is: { fetchedAt: { lt: grenze } } } }],
      },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
      take: optionen.limit ?? 20,
    });
  } catch (err) {
    console.warn(`[maitr] Veraltete Präsenz nicht abfragbar (Migration eingespielt?): ${logGrund(err)}`);
    return 0;
  }

  let erledigt = 0;
  for (const { id } of kandidaten) {
    try {
      await aktualisierePraesenz(id, { erzwingen: true }, umgebung);
      erledigt++;
    } catch (err) {
      console.warn(`[maitr] Präsenz für Betrieb ${id} nicht aufgefrischt: ${logGrund(err)}`);
    }
  }
  return erledigt;
}

/**
 * Nach dem Veröffentlichen der Web-App anstoßen - ohne auf das Ergebnis zu
 * warten. Die Veröffentlichung darf an Google nie hängen: Der Wirt sieht seine
 * Seite sofort, der Bericht liegt bereit, wenn er die App öffnet.
 */
export function praesenzNachVeroeffentlichung(venueId: string): void {
  void aktualisierePraesenz(venueId).catch((err: unknown) => {
    console.warn(
      `[maitr] Präsenz nach Veröffentlichung für Betrieb ${venueId} nicht abgerufen: ${logGrund(err)}`,
    );
  });
}
