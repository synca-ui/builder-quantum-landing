/**
 * Sicherheits-Primitive des Maitr-Backends. Bewusst klein und ohne Abhängigkeit
 * ausser Node-`crypto` - je weniger Fläche, desto weniger Angriffsfläche.
 *
 * Enthält:
 *   • Token-Verschlüsselung at rest (AES-256-GCM) — OAuth-Tokens nie im Klartext.
 *   • Signierter OAuth-`state` — CSRF-Schutz für den Callback.
 *   • Meta-Webhook-Verifikation — HMAC-Signatur + Verify-Token.
 */
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { maitrEnv } from "./env";

/* ── Token-Verschlüsselung (AES-256-GCM) ─────────────────────────────────── */

function encryptionKey(): Buffer {
  return Buffer.from(maitrEnv().MAITR_ENCRYPTION_KEY, "hex");
}

/** Format: iv.ciphertext.tag, jeweils base64url, per '.' getrennt. */
export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, ct, tag].map((b) => b.toString("base64url")).join(".");
}

export function decryptToken(enc: string): string {
  const [ivB, ctB, tagB] = enc.split(".");
  if (!ivB || !ctB || !tagB) throw new Error("Ungültiges Token-Format");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivB, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ctB, "base64url")), decipher.final()]).toString("utf8");
}

/* ── OAuth-State (CSRF) ──────────────────────────────────────────────────── */

const STATE_TTL_MS = 10 * 60_000;

export interface StatePayload {
  businessId: string;
  provider: string;
  nonce: string;
  exp: number;
  /**
   * Wer den Flow gestartet hat.
   *
   * Der Rücksprung trägt keinen App-Token — der Provider ruft ihn ohne Anmeldung
   * auf. Ohne diese Angabe wüsste der Callback nur, FÜR WELCHEN Betrieb er eine
   * Verbindung anlegt, aber nicht, auf wessen Veranlassung. Mit ihr kann er vor
   * dem Speichern erneut prüfen, ob diese Person überhaupt (noch) Mitglied des
   * Betriebs ist — ein zwischenzeitlich entfernter Mitarbeiter kann so keine
   * offene Autorisierungs-URL mehr einlösen.
   */
  userId: string;
}

function signState(body: string): string {
  return createHmac("sha256", maitrEnv().MAITR_OAUTH_STATE_SECRET).update(body).digest("base64url");
}

/**
 * Single-Use-Speicher für verbrauchte state-Nonces (Replay-Schutz). Ein signierter
 * state ist sonst bis zum Ablauf beliebig oft einlösbar. Hinweis: In-Memory reicht für
 * eine Instanz; bei mehreren Instanzen einen geteilten Store (Redis/DB) verwenden.
 */
const consumedNonces = new Map<string, number>();

function consumeNonce(nonce: string, exp: number): boolean {
  const now = Date.now();
  if (consumedNonces.has(nonce)) return false; // bereits verwendet → Replay
  consumedNonces.set(nonce, exp);
  // Abgelaufene Einträge gelegentlich aufräumen.
  if (consumedNonces.size > 5000) {
    for (const [n, e] of consumedNonces) if (e < now) consumedNonces.delete(n);
  }
  return true;
}

/** Kurzlebiger, signierter State, der Betrieb + Provider + Auslöser bindet. */
export function createState(businessId: string, provider: string, userId: string): string {
  const payload: StatePayload = {
    businessId,
    provider,
    userId,
    nonce: randomBytes(16).toString("hex"),
    exp: Date.now() + STATE_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${signState(body)}`;
}

/** Wirft, wenn Signatur ungültig oder abgelaufen - der Callback vertraut nur so. */
export function verifyState(state: string): StatePayload {
  const [body, sig] = state.split(".");
  if (!body || !sig) throw new Error("Ungültiger state");
  const expected = signState(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("state-Signatur ungültig");

  const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as unknown;
  // Form validieren, bevor Felder vertraut werden (nicht blind casten).
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as StatePayload).businessId !== "string" ||
    typeof (parsed as StatePayload).provider !== "string" ||
    typeof (parsed as StatePayload).nonce !== "string" ||
    typeof (parsed as StatePayload).exp !== "number" ||
    typeof (parsed as StatePayload).userId !== "string"
  ) {
    throw new Error("state-Payload ungültig");
  }
  const payload = parsed as StatePayload;
  if (payload.exp < Date.now()) throw new Error("state abgelaufen");
  // Single-Use erzwingen: ein bereits eingelöster state ist ein Replay.
  if (!consumeNonce(payload.nonce, payload.exp)) throw new Error("state bereits verwendet");
  return payload;
}

/* ── Meta-Webhook-Verifikation ───────────────────────────────────────────── */

/** HMAC-SHA256 über den Rohbody, gegen X-Hub-Signature-256. */
export function verifyMetaSignature(rawBody: Buffer, header: string | undefined): boolean {
  if (!header || !header.startsWith("sha256=")) return false;
  const expected = "sha256=" + createHmac("sha256", maitrEnv().META_APP_SECRET).update(rawBody).digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Zeitkonstanter String-Vergleich (verhindert Timing-Leaks bei Token-Prüfung). */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Handshake beim Einrichten des Webhooks (hub.mode/verify_token). */
export function metaVerifyChallenge(query: Record<string, unknown>): string | null {
  const token = query["hub.verify_token"];
  if (query["hub.mode"] === "subscribe" && typeof token === "string" && safeEqual(token, maitrEnv().META_WEBHOOK_VERIFY_TOKEN)) {
    return String(query["hub.challenge"] ?? "");
  }
  return null;
}
