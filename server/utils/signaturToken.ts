/**
 * Signierte Kurz-Token für öffentliche Links (Gast-Stempelkarte u. Ä.).
 *
 * HMAC-SHA256 über eine Nutzlast — wer das Server-Secret nicht kennt, kann
 * zu einer geratenen Kennung kein gültiges Token bilden. Der Vergleich ist
 * zeitkonstant, damit sich das richtige Token nicht Byte für Byte ertasten
 * lässt. Gleiches Muster wie die One-Click-Reservierungslinks
 * (server/routes/publicReservations.ts).
 */
import crypto from "crypto";

export function hmacToken(nutzlast: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(nutzlast).digest("hex");
}

export function tokenGleich(erwartet: string, geliefert: string): boolean {
  const a = Buffer.from(erwartet, "utf8");
  const b = Buffer.from(geliefert, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
