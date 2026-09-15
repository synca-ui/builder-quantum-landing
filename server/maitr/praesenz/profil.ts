/**
 * Gemeinsame Bausteine des Präsenz-Workflows, die auch das Tagesbriefing braucht
 * (server/maitr/dataset.ts): das Maitr-Profil eines Betriebs und der gespeicherte
 * Snapshot.
 *
 * Eigene Datei, damit dataset.ts nicht index.ts importiert - index.ts rechnet den
 * Score über `assembleVenueDataset` und bräuchte sonst einen Importkreis.
 */
import type {
  GoogleAbrufStatus,
  GoogleEintrag,
  MaitrProfil,
  WebsitePruefung,
} from "@maitr/core/analytics";
import type { OpeningHours } from "@maitr/core/types";
import { prisma } from "../../db/prisma";
import { StrictOpeningHoursSchema } from "../../schemas/configuration";
import { bereinigterWebsiteFehler } from "./website";

export interface BetriebZeile {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  openingHours: unknown;
  socialLinks: unknown;
  contactInfo: unknown;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
}

export function feld(wert: unknown): string | undefined {
  return typeof wert === "string" && wert.trim() ? wert.trim() : undefined;
}

export function objekt(wert: unknown): Record<string, unknown> {
  return wert && typeof wert === "object" && !Array.isArray(wert) ? (wert as Record<string, unknown>) : {};
}

/** Was Maitr über den Betrieb weiß - dieselbe Sicht für Bericht und Briefing. */
export function maitrProfilAus(zeile: BetriebZeile, speisekarteGerichte: number): MaitrProfil {
  const kontakt = objekt(zeile.contactInfo);
  const social = objekt(zeile.socialLinks);
  const zeiten = StrictOpeningHoursSchema.safeParse(zeile.openingHours);
  const oeffnungszeiten =
    zeiten.success && Object.keys(zeiten.data).length ? (zeiten.data as OpeningHours) : undefined;
  return {
    name: zeile.name,
    hatSpeisekarte: speisekarteGerichte > 0,
    hatBeschreibung: Boolean(feld(zeile.description)),
    tags: zeile.tags ?? [],
    ...(oeffnungszeiten ? { oeffnungszeiten } : {}),
    ...(feld(social.instagram) ? { instagram: feld(social.instagram) } : {}),
    ...(feld(kontakt.website) ? { website: feld(kontakt.website) } : {}),
    ...(feld(kontakt.phone) ? { telefon: feld(kontakt.phone) } : {}),
  };
}

export interface SnapshotZeile {
  /** Fehlt in Test-Zeilen und Altbeständen - dann gilt die placeId im google-JSON. */
  placeId?: string | null;
  status: string;
  fehler: string | null;
  google: unknown;
  website: unknown;
  fetchedAt: Date;
}

/**
 * Ergebnis des Lesens: `lesbar: false` heißt, die Tabelle ließ sich nicht lesen
 * (fehlt vor der Migration, Datenbank weg) - etwas anderes als "keine Zeile".
 *
 * ANLASS (Prüfbefund): Beides war `null`. Die Kosten-Drossel in index.ts hängt am
 * gespeicherten Stand; ohne lesbare Tabelle gab es nie einen, und jeder Refresh,
 * jedes App-Öffnen löste einen bezahlten Places-Abruf aus. Wer "nicht lesbar"
 * erkennt, ruft gar nicht erst ab.
 */
export interface SnapshotLesung {
  lesbar: boolean;
  zeile: SnapshotZeile | null;
}

export async function leseSnapshot(venueId: string): Promise<SnapshotLesung> {
  try {
    const zeile = await prisma.presenceSnapshot.findUnique({
      where: { businessId: venueId },
      select: { placeId: true, status: true, fehler: true, google: true, website: true, fetchedAt: true },
    });
    return { lesbar: true, zeile };
  } catch (err) {
    console.warn(
      `[maitr] PresenceSnapshot nicht lesbar (Migration eingespielt?): ${(err as Error).message}`,
    );
    return { lesbar: false, zeile: null };
  }
}

/** Nur die Zeile - "nicht lesbar" und "keine Zeile" sind hier dasselbe (Briefing). */
export async function ladeSnapshot(venueId: string): Promise<SnapshotZeile | null> {
  return (await leseSnapshot(venueId)).zeile;
}

export const STATUS_WERTE: GoogleAbrufStatus[] = ["bereit", "ausstehend", "kein_schluessel", "nicht_gefunden", "fehler"];

export function alsStatus(wert: string | undefined): GoogleAbrufStatus {
  return STATUS_WERTE.includes(wert as GoogleAbrufStatus) ? (wert as GoogleAbrufStatus) : "fehler";
}

/**
 * Nur ein Objekt mit placeId gilt als Google-Eintrag - eine kaputte Zeile nicht.
 * Der interne Zeitstempel `abgerufenAt` (siehe unten) geht nie mit hinaus.
 */
export function alsGoogle(wert: unknown): GoogleEintrag | null {
  const { abgerufenAt: _intern, ...o } = objekt(wert);
  return typeof o.placeId === "string" && o.placeId ? (o as unknown as GoogleEintrag) : null;
}

/* ── Places-Inhalte: Höchstalter ────────────────────────────────────────── */

/**
 * Wie lange gespeicherte Places-Inhalte (Schnitt, Anzahl, Bewertungen, Fotos,
 * Zeiten …) höchstens ausgeliefert werden.
 *
 * ANLASS: Die Nutzungsbedingungen der Google Maps Platform erlauben das dauerhafte
 * Speichern von Places-Inhalten nicht - dauerhaft speicherbar ist nur die
 * Place-ID. Der Snapshot hält den Eintrag aber, bis ihn ein neuer Abruf ersetzt,
 * und ohne Schlüssel oder bei gescheitertem Abruf behält der Workflow bewusst den
 * alten Stand. Ohne Grenze stünden so bei ausgeschaltetem Zeitgeber monatealte
 * Google-Inhalte in der App. Das ist technische Schadensbegrenzung, KEINE
 * rechtliche Freigabe - die Caching-Regeln prüft ein Mensch.
 */
export const GOOGLE_HOECHSTALTER_MS = 30 * 24 * 60 * 60_000;

/**
 * Wann der gespeicherte Google-Inhalt wirklich bei Places abgerufen wurde.
 *
 * NICHT `fetchedAt` der Zeile: Die wird bei jedem Lauf neu gesetzt (Drossel,
 * Zeitgeber) - auch wenn Google gar nicht gefragt wurde (kein Schlüssel) oder der
 * Abruf scheiterte und der alte Eintrag stehen blieb. Deshalb schreibt
 * index.ts den Abrufzeitpunkt als `abgerufenAt` ins google-JSON. Zeilen von vor
 * dieser Änderung tragen ihn nicht; für sie gilt `fetchedAt` - nie früher als der
 * echte Abruf, also nachsichtig, aber nur bis zum nächsten Schreiben, das den
 * Zeitpunkt festhält.
 */
export function googleAbgerufenAm(zeile: Pick<SnapshotZeile, "google" | "fetchedAt">): Date {
  const roh = objekt(zeile.google).abgerufenAt;
  const zeit = typeof roh === "string" ? Date.parse(roh) : NaN;
  // Ein Zeitpunkt nach dem Zeilenstempel ist kaputt - er hielte den Eintrag ewig frisch.
  return Number.isFinite(zeit) && zeit <= zeile.fetchedAt.getTime() ? new Date(zeit) : zeile.fetchedAt;
}

/** Der gespeicherte Eintrag - `null`, wenn keiner da ist oder er zu alt ist. */
export function gueltigesGoogle(zeile: Pick<SnapshotZeile, "google" | "fetchedAt">, jetzt: Date): GoogleEintrag | null {
  const eintrag = alsGoogle(zeile.google);
  if (!eintrag) return null;
  return jetzt.getTime() - googleAbgerufenAm(zeile).getTime() > GOOGLE_HOECHSTALTER_MS ? null : eintrag;
}

/** Place-ID der Zeile - bleibt auch, wenn der Inhalt zu alt ist. */
export function placeIdAus(zeile: Pick<SnapshotZeile, "placeId" | "google">): string | null {
  if (typeof zeile.placeId === "string" && zeile.placeId) return zeile.placeId;
  const ausJson = objekt(zeile.google).placeId;
  return typeof ausJson === "string" && ausJson ? ausJson : null;
}

/**
 * Stand aus einer gespeicherten Zeile, mit Höchstalter. Ein zu alter Eintrag
 * zählt wie "kein Eintrag": Stand "bereit" ohne Eintrag gäbe es sonst - der
 * Bericht spräche von gefundenen Daten, die er nicht zeigt. Er fällt deshalb auf
 * `ohneEintrag` zurück (ausstehend bzw. kein_schluessel, wie ohne Zeile).
 * `fehler` und `nicht_gefunden` bleiben, was sie sind.
 */
export function standAusSnapshot(
  zeile: SnapshotZeile,
  jetzt: Date,
  ohneEintrag: GoogleAbrufStatus,
): { status: GoogleAbrufStatus; google: GoogleEintrag | null; website: WebsitePruefung | null; googleAbgelaufen: boolean } {
  const google = gueltigesGoogle(zeile, jetzt);
  const googleAbgelaufen = !google && alsGoogle(zeile.google) !== null;
  const gespeichert = alsStatus(zeile.status);
  return {
    status: googleAbgelaufen && gespeichert === "bereit" ? ohneEintrag : gespeichert,
    google,
    website: alsWebsite(zeile.website),
    googleAbgelaufen,
  };
}

/**
 * Gespeicherte Website-Prüfung → `WebsitePruefung`. Der interne Zeitstempel
 * `geprueftAt` (siehe `websiteGeprueftAm`) geht nicht mit hinaus, ein alter
 * `fehler` mit Host oder Adresse wird neutralisiert (website.ts).
 */
export function alsWebsite(wert: unknown): WebsitePruefung | null {
  const { geprueftAt: _intern, fehler, ...o } = objekt(wert);
  if (typeof o.url !== "string" || typeof o.erreichbar !== "boolean") return null;
  const neutral = bereinigterWebsiteFehler(fehler);
  return { ...(o as unknown as WebsitePruefung), ...(neutral ? { fehler: neutral } : {}) };
}

/**
 * Wann die gespeicherte Website-Prüfung wirklich lief. Wie bei Google nicht
 * `fetchedAt` der Zeile: Behält ein Lauf nach einem Ausfall den vorigen Befund
 * (index.ts), schreibt er trotzdem ein neues `fetchedAt`. Zeilen ohne Stempel
 * fallen auf `fetchedAt` zurück.
 */
export function websiteGeprueftAm(zeile: Pick<SnapshotZeile, "website" | "fetchedAt">): Date {
  const roh = objekt(zeile.website).geprueftAt;
  const zeit = typeof roh === "string" ? Date.parse(roh) : NaN;
  return Number.isFinite(zeit) && zeit <= zeile.fetchedAt.getTime() ? new Date(zeit) : zeile.fetchedAt;
}

/**
 * Nur die Google-Ergänzung fürs Tagesbriefing (dataset.ts): gespeicherter Eintrag
 * plus Maitr-Profil, ohne Bericht. `null`, wenn nichts gespeichert oder die
 * Tabelle fehlt. Ein Eintrag über dem Höchstalter fehlt auch hier - sonst
 * rechnete der Start-Screen mit Google-Sternen, die der Profil-Check nicht mehr
 * zeigt.
 */
export async function gespeichertePraesenz(
  venueId: string,
  jetzt: Date = new Date(),
): Promise<{ google: GoogleEintrag | null; website: WebsitePruefung | null; status: GoogleAbrufStatus } | null> {
  const snapshot = await ladeSnapshot(venueId);
  if (!snapshot) return null;
  const { status, google, website } = standAusSnapshot(snapshot, jetzt, "ausstehend");
  return { google, website, status };
}

