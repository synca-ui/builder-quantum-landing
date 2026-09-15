/**
 * Öffentliche Präsenz in der App - die reinen Entscheidungen, ohne React.
 *
 * Der Server liefert über `api.venues.presence` den Google-Eintrag, die
 * Website-Prüfung und den Präsenzbericht (server/maitr/praesenz/). Hier steht,
 * wann die App einen frischen Abruf anstößt, ob eine Antwort überhaupt die
 * erwartete Form hat, und wie Zahlen deutsch geschrieben werden. Getrennt von
 * store.tsx, damit es sich ohne React-Native-Testaufbau prüfen lässt.
 */
import type { VenuePresence } from "@maitr/core";

/** Ab diesem Alter stößt die App beim Öffnen einen neuen Abruf an. */
export const PRAESENZ_VERALTET_MS = 24 * 60 * 60_000;

/**
 * Form prüfen, nicht nur Erfolg - dieselbe Lehre wie in `useDailyBriefing`: Ein
 * HTTP 200 von einem fremden Dienst ist auch ein Erfolg. Ohne diese Prüfung
 * stürzte ein Screen beim ersten `bericht.hebel.map` ab.
 */
export function istPraesenz(wert: unknown): wert is VenuePresence {
  if (!wert || typeof wert !== "object") return false;
  const p = wert as Partial<VenuePresence>;
  const b = p.bericht as Partial<VenuePresence["bericht"]> | undefined;
  return (
    typeof p.status === "string" &&
    !!b &&
    typeof b.score === "number" &&
    Array.isArray(b.hebel) &&
    Array.isArray(b.faktoren) &&
    Array.isArray(b.websiteBefunde) &&
    !!b.deckung &&
    !!b.bewertungen
  );
}

/**
 * Soll die App nach dem Laden einen Abruf anstoßen?
 *
 * Ja, wenn noch nie abgerufen wurde (kein `fetchedAt`) oder der Stand älter als
 * 24 Stunden ist. Das gilt auch ohne Places-Schlüssel auf dem Server: Die
 * Website-Prüfung läuft trotzdem, und danach trägt der Stand ein `fetchedAt`,
 * sodass die App nicht bei jedem Öffnen erneut fragt. Die Kosten-Drossel liegt
 * zusätzlich auf dem Server (zehn Minuten je Betrieb).
 */
export function brauchtAbruf(praesenz: VenuePresence, jetzt: number): boolean {
  if (!praesenz.fetchedAt) return true;
  const stand = Date.parse(praesenz.fetchedAt);
  if (!Number.isFinite(stand)) return true;
  return jetzt - stand >= PRAESENZ_VERALTET_MS;
}

/** Gespeicherter Eintrag gilt nur für den Betrieb, für den er geholt wurde. */
export interface PraesenzEintrag {
  venueId: string;
  daten: VenuePresence;
}

export function praesenzFuer(eintrag: PraesenzEintrag | null, venueId: string): VenuePresence | null {
  return eintrag && eintrag.venueId === venueId ? eintrag.daten : null;
}

/**
 * Höchstalter eines gespeicherten Stands - dasselbe wie für Google-Inhalte auf dem
 * Server (`GOOGLE_HOECHSTALTER_MS` in server/maitr/praesenz/profil.ts).
 */
export const PRAESENZ_HOECHSTALTER_MS = 30 * 24 * 60 * 60_000;

/**
 * Schnappschuss aus AsyncStorage prüfen - eine kaputte Zeile wird verworfen, eine zu
 * alte auch.
 *
 * Anlass (Prüfer-Befund 15.09., „Google-Inhalte ohne Altersgrenze"): Der Server gibt
 * Places-Inhalte nach 30 Tagen nicht mehr heraus, die App zeigte ihren letzten Stand
 * aber unbegrenzt - scheitert `GET /presence` (kein Netz, 5xx), bleibt der
 * gespeicherte Stand laut Store bewusst stehen. Das Google-Abrufdatum selbst liefert
 * der Server nicht mit; `fetchedAt` ist aber nie älter als der Google-Abruf (es wird
 * auch ohne Google-Abruf erneuert). Liegt also schon `fetchedAt` über der Grenze, ist
 * der Google-Teil sicher zu alt. Verworfen wird der ganze Eintrag, nicht nur
 * `google`: Score, Hebel und `bericht.bewertungen` sind aus genau diesem Google-Teil
 * gerechnet und zeigten sonst weiter dessen Zahlen. Ein nie abgerufener Stand (ohne
 * `fetchedAt`) trägt keine Google-Inhalte und bleibt.
 */
export function praesenzEintragAus(roh: unknown, jetzt: number): PraesenzEintrag | null {
  if (!roh || typeof roh !== "object") return null;
  const e = roh as Partial<PraesenzEintrag>;
  if (typeof e.venueId !== "string" || !e.venueId || !istPraesenz(e.daten)) return null;
  if (e.daten.fetchedAt) {
    const stand = Date.parse(e.daten.fetchedAt);
    if (!Number.isFinite(stand) || jetzt - stand > PRAESENZ_HOECHSTALTER_MS) return null;
  }
  return { venueId: e.venueId, daten: e.daten };
}

/** 4.6 → "4,6". */
export function sterneText(wert: number): string {
  return wert.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** 1312 → "1.312". */
export function anzahlText(wert: number): string {
  return wert.toLocaleString("de-DE");
}

/** "Stand vor 3 Std" - wie alt der Abruf ist, grob und ehrlich. */
export function standText(fetchedAt: string | undefined, jetzt: number): string | null {
  if (!fetchedAt) return null;
  const t = Date.parse(fetchedAt);
  if (!Number.isFinite(t)) return null;
  const min = Math.max(0, Math.round((jetzt - t) / 60_000));
  if (min < 1) return "Stand gerade eben";
  if (min < 60) return `Stand vor ${min} Min`;
  const std = Math.round(min / 60);
  if (std < 24) return `Stand vor ${std} Std`;
  const tage = Math.round(std / 24);
  return tage === 1 ? "Stand von gestern" : `Stand vor ${tage} Tagen`;
}
