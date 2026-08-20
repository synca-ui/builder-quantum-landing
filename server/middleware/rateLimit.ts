import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";

/* ── Woran ein Zaehler haengt ────────────────────────────────────────────────
 *
 * ANLASS, an der Verteilung nachgerechnet: `server/index.ts` setzte kein
 * `app.set("trust proxy", …)`. Express nimmt dann `false` an, und `req.ip` ist
 * die Adresse der GEGENSTELLE - also des Proxys. `netlify.toml` leitet
 * `/api/*` mit `force = true` an Railway weiter (Zeilen 74-76); jede
 * API-Anfrage kommt damit ueber Netlifys Rand und Railways Router an. Fuer
 * ALLE Nutzer stand dort dieselbe Adresse.
 *
 * Folge: jeder Limiter war EIN Eimer fuer die ganze Plattform, kein Eimer je
 * Klient. Das ist nicht bloss eine wirkungslose Drossel, sondern ein Hebel:
 * `strictLimiter` erlaubt 10 Anfragen je 5 Minuten - zehn Aufrufe von einem
 * einzigen Rechner legten `/api/forward-to-n8n`, `/api/autogen`,
 * `/api/schema/*` und `/api/orders/create` fuer JEDEN Kunden still.
 * `globalLimiter` mit 300 je 15 Minuten legte die gesamte API stumm.
 *
 * ZWEI MASSNAHMEN, WEIL EINE NICHT REICHT
 *
 * 1. `trust proxy` in `server/index.ts` - siehe die Anmerkung dort, warum die
 *    Zahl klein und gemessen sein muss und nicht `true` sein darf.
 *
 * 2. Dieser Schluessel. Wo jemand angemeldet ist, ist die Kennung des Kontos
 *    die ehrlichere Angabe als die Adresse: Sie ueberlebt jeden Proxy, laesst
 *    sich nicht faelschen (sie stammt aus dem geprueften Clerk-Token) und
 *    wechselt nicht mit dem Mobilfunknetz. Wer sie hat, kann andere Konten
 *    nicht mehr aussperren - der Eimer gehoert ihm allein.
 */

/** Request, nachdem `requireAuth` gelaufen ist. */
type MaybeAuthed = Request & { userId?: string };

/**
 * Der Schluessel eines Zaehlers: das angemeldete Konto, sonst die Adresse.
 *
 * Der Praefix (`u:` / `ip:`) haelt die beiden Raeume auseinander. Ohne ihn
 * koennte eine Kontokennung zufaellig wie eine Adresse aussehen und zwei
 * verschiedene Anfragende auf denselben Zaehler legen.
 *
 * Die Adresse MUSS ueber `ipKeyGenerator` laufen und nicht roh benutzt werden:
 * Das Update auf express-rate-limit 8.6.2 schliesst nur den EINGEBAUTEN
 * Schluessel (GHSA-46wh-pxpv-q5gq), ein eigener `keyGenerator` umgeht den Fix
 * vollstaendig. `ipKeyGenerator` faltet "::ffff:1.2.3.4" auf die IPv4-Form
 * zurueck (sonst zaehlt derselbe Klient auf einem Dual-Stack-Host doppelt) und
 * fasst echtes IPv6 zum /56-Praefix zusammen, damit sich niemand aus dem
 * eigenen Praefix beliebig viele Zaehler ausstellt.
 */
export function limitKey(req: Request): string {
  const userId = (req as MaybeAuthed).userId;
  if (userId) return `u:${userId}`;
  return `ip:${ipKeyGenerator(req.ip ?? "")}`;
}

// Global Rate Limiter: 300 requests per 15 minutes
// Good baseline for general API usage
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  // Laeuft VOR `requireAuth`, sieht also praktisch immer die Adresse. Der
  // gemeinsame Schluessel steht hier trotzdem, damit es nur eine Stelle gibt,
  // an der die Regel definiert ist.
  keyGenerator: limitKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Zu viele Anfragen, bitte versuchen Sie es später erneut.",
  },
});

// Strict Rate Limiter: 10 requests per 5 minutes
// For sensitive endpoints like auth, webhooks, or expensive proxies
export const strictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  // Wichtigster Nutzer dieses Schluessels: Wo `requireAuth` VOR dem Limiter
  // haengt (z.B. `/api/orders/create`), zaehlt jetzt das Konto. Ein Kunde kann
  // damit keinen anderen mehr aussperren.
  keyGenerator: limitKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Zu viele Versuche, bitte warten Sie einen Moment." },
});

// Auth Rate Limiter: 20 requests per 15 minutes
// Specifically for login/signup related attempts if not handled by Clerk directly
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  keyGenerator: limitKey,
  standardHeaders: true,
  legacyHeaders: false,
});
