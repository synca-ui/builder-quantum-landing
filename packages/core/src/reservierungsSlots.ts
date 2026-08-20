/**
 * Reservierungs-Zeitfenster × Öffnungszeiten — EINE Logik für Server
 * (GET /api/public/reservations/slots) und Konfigurator-Vorschau.
 *
 * Anlass: Der Slots-Endpunkt lieferte die konfigurierten Zeitfenster auch an
 * Ruhetagen und außerhalb der Öffnungszeiten — ein Gast konnte 19:00 Uhr am
 * Sonntag anfragen, obwohl der Betrieb sonntags geschlossen ist.
 *
 * Verhalten bewusst konservativ gegenüber Altbestand: Fehlen die
 * Öffnungszeiten ganz oder gibt es für den Tag KEINEN Eintrag, wird NICHT
 * gefiltert (wie bisher alle Slots) — lieber eine überflüssige Anfrage, die
 * der Betreiber ablehnt, als ein Betrieb, dessen Formular wegen leerer
 * Altdaten gar keine Zeiten mehr anbietet.
 */
import { DAYS, type Day, type OpeningHours } from "./types";

/** "2026-08-20" → "thursday" (UTC, wie die Slot-Datetimes des Endpunkts). */
export function wochentagSchluessel(isoDatum: string): Day | null {
  const d = new Date(`${isoDatum}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  // getUTCDay(): 0 = Sonntag … 6 = Samstag; DAYS beginnt mit monday.
  const proTag: Day[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ] as Day[];
  const key = proTag[d.getUTCDay()];
  return (DAYS as readonly string[]).includes(key) ? key : null;
}

/** "18:30" → 1110 Minuten seit Mitternacht; ungültig → null. */
function minuten(zeit: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(zeit);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Liegt ein Zeitfenster innerhalb der Öffnungszeiten des Tages?
 *
 * Sperrstunde nach Mitternacht (close < open, z. B. 18:00–01:00): gültig ist
 * slot ≥ open ODER slot < close. close == open gilt als durchgehend geöffnet.
 */
export function slotImOeffnungsfenster(
  slot: string,
  tag: { closed: boolean; open?: string; close?: string } | undefined,
): boolean {
  if (!tag) return true; // kein Eintrag → nicht filtern (Altbestand)
  if (tag.closed) return false;

  const s = minuten(slot);
  const auf = tag.open ? minuten(tag.open) : null;
  const zu = tag.close ? minuten(tag.close) : null;
  if (s == null || auf == null || zu == null) return true; // unlesbar → nicht filtern

  if (auf === zu) return true; // 24h geöffnet
  if (zu < auf) return s >= auf || s < zu; // über Mitternacht
  return s >= auf && s <= zu;
}

/**
 * Filtert die konfigurierten Zeitfenster für ein Datum gegen die
 * Öffnungszeiten. Leere/fehlende Öffnungszeiten → unverändert.
 */
export function slotsFuerDatum(
  zeitfenster: string[],
  oeffnungszeiten: OpeningHours | null | undefined,
  isoDatum: string,
): string[] {
  if (!oeffnungszeiten || Object.keys(oeffnungszeiten).length === 0) {
    return zeitfenster;
  }
  const key = wochentagSchluessel(isoDatum);
  if (!key) return zeitfenster;
  const tag = oeffnungszeiten[key] as
    | { closed: boolean; open?: string; close?: string }
    | undefined;
  return zeitfenster.filter((slot) => slotImOeffnungsfenster(slot, tag));
}
