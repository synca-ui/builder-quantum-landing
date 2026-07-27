/**
 * Präsenzscore - eine Quelle der Wahrheit.
 *
 * Der Score erscheint an zwei Stellen: als Kennzahl-Kachel auf dem Start-Screen
 * und als Ring im Profil-Check. Beide leiten ihn hier ab, damit ein erledigtes
 * Profil-Item (z. B. „Speisekarte hinterlegen") sofort in beiden Ansichten
 * denselben Wert zeigt - nie 64 hier und 76 dort.
 */

export interface ProfileCheckItem {
  id: string;
  title: string;
  /** Warum das zählt - im Design die Begründung unter dem Titel. */
  reason?: string;
  points: number;
}

export const PROFILE_ITEMS: ProfileCheckItem[] = [
  { id: "menu", title: "Speisekarte hinterlegen", reason: "53 % der Gäste schauen vorab", points: 12 },
  { id: "holidays", title: "Feiertagszeiten prüfen", reason: "Grund Nr. 1 für 1★-Bewertungen", points: 6 },
  { id: "outdoor", title: "Attribut „Außenplätze\" setzen", reason: "Jeder 3. Gast filtert nach Terrasse", points: 4 },
  { id: "photos", title: "5 aktuelle Fotos hochladen", points: 8 },
];

/** Ausgangswert des Profils, bevor offene Aufgaben abgehakt werden. */
export const BASE_SCORE = 64;

/** Diese Items stecken schon im Basiswert - ihr Häkchen zählt nicht doppelt. */
export const IN_BASE = new Set(["photos"]);

/** Basiswert plus die Punkte der erledigten, noch nicht eingerechneten Aufgaben. */
export function computeProfileScore(profileDone: Record<string, boolean>): number {
  const earned = PROFILE_ITEMS.filter((i) => profileDone[i.id] && !IN_BASE.has(i.id)).reduce(
    (sum, i) => sum + i.points,
    0,
  );
  return BASE_SCORE + earned;
}

/** Summe der offenen (noch nicht erledigten) Punkte. */
export function computeOpenPoints(profileDone: Record<string, boolean>): number {
  return PROFILE_ITEMS.filter((i) => !profileDone[i.id]).reduce((sum, i) => sum + i.points, 0);
}
