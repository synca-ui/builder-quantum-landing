/**
 * Validierte Server-Umgebung für das Maitr-Backend.
 *
 * Secrets kommen ausschliesslich aus dem Environment/Secrets-Manager, nie aus dem
 * Repo. Fehlt eine Pflichtvariable, bricht der erste Zugriff früh und laut ab -
 * besser als ein halb konfigurierter OAuth-Flow zur Laufzeit. `maitrEnv()` wird
 * lazy ausgewertet, damit der übrige Server auch ohne Maitr-Config startet.
 */
import { z } from "zod";

const schema = z.object({
  /** 32-Byte-Schlüssel als Hex (64 Zeichen) für die Token-Verschlüsselung. */
  MAITR_ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, "muss 64 Hex-Zeichen (32 Byte) sein"),
  /** Secret zum Signieren des OAuth-`state` (CSRF-Schutz). */
  MAITR_OAUTH_STATE_SECRET: z.string().min(32),
  /** Basis-URL des Backends, für OAuth-Redirects. */
  MAITR_API_BASE_URL: z.string().url(),
  /** Deep-Link zurück in die App nach dem OAuth-Callback (z. B. maitr://connected). */
  MAITR_APP_DEEP_LINK: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  META_APP_ID: z.string().min(1),
  META_APP_SECRET: z.string().min(1),
  META_WEBHOOK_VERIFY_TOKEN: z.string().min(1),
});

export type MaitrEnv = z.infer<typeof schema>;

let cached: MaitrEnv | null = null;

export function maitrEnv(): MaitrEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`[maitr] Ungültige/fehlende Umgebungsvariablen: ${missing}`);
  }
  cached = parsed.data;
  return cached;
}
