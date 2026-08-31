/**
 * Macht aus einer Handeingabe wie "A1, f; G" die Kürzel-Liste ["a1", "f", "g"].
 *
 * Dieselbe Vereinheitlichung wie beim Erkennen der Karte (kleingeschrieben,
 * ohne Sonderzeichen, ohne Dubletten — siehe kuerzel() in
 * server/services/menuStructure.ts). Ohne sie fände die Legende ein von Hand
 * eingetragenes "A1" nicht wieder: DishModal schlägt mit code.toLowerCase()
 * nach, und die Legende ist kleingeschrieben abgelegt.
 */
export function parseAllergenKuerzel(eingabe: string): string[] {
  const raus: string[] = [];
  for (const teil of eingabe.split(/[,;/\s]+/)) {
    const k = teil.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (k && !raus.includes(k)) raus.push(k);
  }
  return raus;
}
