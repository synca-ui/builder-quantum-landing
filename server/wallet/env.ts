/**
 * Validierte Umgebung für die digitale Stempelkarte (Apple Wallet + Google Wallet).
 *
 * BEWUSST GETRENNT von server/maitr/env.ts, und das ist keine Kosmetik: Das
 * Schema dort kennt kein `.optional()`, und `maitrEnv()` wirft, sobald EINE
 * Variable fehlt. Lägen die Wallet-Variablen dort mit drin, könnte der Server
 * ohne Apple-Zertifikate keinen OAuth-Callback mehr bedienen — eine Funktion,
 * die noch gar nicht ausgerollt ist, würde eine bestehende lahmlegen.
 *
 * Deshalb hier zwei Ebenen:
 *   - `appleWalletEnv()` / `googleWalletEnv()` werfen laut, wenn jemand einen
 *     Pass erzeugen will, ohne dass die Schlüssel da sind. Ein halb signierter
 *     Pass ist schlimmer als gar keiner.
 *   - `walletReadiness()` wirft NIE. Damit kann die API sauber
 *     "noch nicht eingerichtet" antworten, statt eine 500 zu werfen.
 *
 * Apple und Google werden getrennt geprüft, weil die Freigaben getrennt
 * eintreffen: das Apple-Zertifikat hängt am Developer-Programm, das
 * Google-Dienstkonto an der Wallet-Issuer-Freigabe. Wer beide in einen Topf
 * wirft, blockiert die fertige Hälfte, bis die andere nachkommt.
 */
import { z } from "zod";

/**
 * Zertifikate und Schlüssel stehen base64-kodiert im Environment, weil PEM und
 * .p12 Zeilenumbrüche bzw. Binärbytes enthalten, die kein Secrets-Manager
 * verlustfrei durchreicht.
 *
 * Die Prüfung fängt den häufigsten Einrichtungsfehler ab: den rohen PEM-Block
 * oder einen Dateipfad einzusetzen statt dessen base64. Beides käme sonst erst
 * beim Signieren als unverständlicher Krypto-Fehler heraus.
 */
function istBase64(wert: string): boolean {
  const roh = wert.replace(/\s/g, "");
  if (roh.length === 0) return false;
  const puffer = Buffer.from(roh, "base64");
  if (puffer.length === 0) return false;
  // Buffer.from ist nachsichtig und verschluckt ungültige Zeichen stillschweigend.
  // Nur der Rückweg beweist, dass wirklich base64 drinstand.
  return puffer.toString("base64").replace(/=+$/, "") === roh.replace(/=+$/, "");
}

const base64Feld = (hinweis: string) =>
  z.string().min(1).refine(istBase64, { message: `muss base64-kodiert sein (${hinweis})` });

const appleSchema = z.object({
  /** Team-ID aus dem Apple Developer Account. Muss zum Signaturzertifikat passen. */
  APPLE_TEAM_IDENTIFIER: z.string().min(1),
  /**
   * Die Pass Type ID beginnt bei Apple immer mit "pass." — hier geprüft, weil
   * hier statt dessen regelmäßig die Bundle-ID der App landet. Der Pass wird
   * dann erzeugt, signiert und vom Gerät wortlos abgelehnt.
   */
  APPLE_PASS_TYPE_IDENTIFIER: z
    .string()
    .min(1)
    .refine((v) => v.startsWith("pass."), { message: 'muss mit "pass." beginnen' }),
  /** Signaturzertifikat + privater Schlüssel als .p12, base64. */
  APPLE_PASS_CERT_P12_BASE64: base64Feld(".p12-Datei"),
  /**
   * Passphrase des .p12. Absichtlich ohne `.min(1)`: ein Export ohne Passwort
   * ist zulässig, die Variable muss aber gesetzt SEIN — sonst ist nicht
   * unterscheidbar, ob sie leer sein soll oder schlicht vergessen wurde.
   */
  APPLE_PASS_CERT_PASSWORD: z.string(),
  /** Apple WWDR-Zwischenzertifikat als PEM, base64. Ohne das prüft kein Gerät die Kette. */
  APPLE_WWDR_CERT_PEM_BASE64: base64Feld("PEM"),
  /** APNs-Signaturschlüssel (.p8) für die Wallet-Pushes, base64. Wird mit ES256 signiert. */
  APNS_KEY_P8_BASE64: base64Feld(".p8-Datei"),
  APNS_KEY_ID: z.string().min(1),
  /**
   * Getrennt von APPLE_TEAM_IDENTIFIER geführt, obwohl es meist derselbe Wert
   * ist: der APNs-Schlüssel kann aus einem anderen Team stammen. Stillschweigend
   * gleichzusetzen hieße, einen 403 von APNs später blind zu suchen.
   */
  APNS_TEAM_ID: z.string().min(1),
  /**
   * Kein Vorgabewert. Ein falsch geratenes Ziel schickt die Pushes an den
   * anderen APNs-Host, wo die Tokens ungültig sind — und der Fehler sieht
   * dann aus wie ein Problem mit den Registrierungen.
   */
  APNS_ENV: z.enum(["sandbox", "production"]),
});

const googleSchema = z.object({
  /** Issuer-ID aus der Google Pay & Wallet Console (rein numerisch). */
  GOOGLE_WALLET_ISSUER_ID: z.string().regex(/^\d+$/, "ist eine reine Zahlenfolge"),
  /**
   * Der komplette Dienstkonto-Schlüssel als JSON-Text. Geprüft wird, dass er
   * parsebar ist und die beiden Felder enthält, die zum Signieren gebraucht
   * werden — sonst fällt ein Dateipfad oder ein abgeschnittener Wert erst beim
   * ersten Ausstellen einer Karte auf.
   */
  GOOGLE_WALLET_SERVICE_ACCOUNT_JSON: z
    .string()
    .min(1)
    .refine(
      (v) => {
        try {
          const konto = JSON.parse(v) as Record<string, unknown>;
          return typeof konto.client_email === "string" && typeof konto.private_key === "string";
        } catch {
          return false;
        }
      },
      { message: "muss JSON mit client_email und private_key sein" },
    ),
});

export type AppleWalletEnv = z.infer<typeof appleSchema>;
export type GoogleWalletEnv = z.infer<typeof googleSchema>;
export type WalletEnv = AppleWalletEnv & GoogleWalletEnv;

/** Was fehlt, und wofür es fehlt — ohne zu werfen. */
export interface WalletReadiness {
  /** Apple-Wallet-Pässe können signiert und per APNs aktualisiert werden. */
  apple: boolean;
  /** Google-Wallet-Objekte können ausgestellt werden. */
  google: boolean;
  /** Mindestens eine der beiden Geldbörsen ist bedienbar. */
  ready: boolean;
  /** Namen der fehlenden/ungültigen Variablen, für Logs und Einrichtungshilfe. */
  missing: string[];
}

type Auswertung = {
  apple: z.SafeParseReturnType<unknown, AppleWalletEnv>;
  google: z.SafeParseReturnType<unknown, GoogleWalletEnv>;
};

let cached: Auswertung | null = null;

/**
 * Einmal auswerten, Ergebnis behalten — auch das negative. Die Umgebung eines
 * laufenden Prozesses ändert sich nicht, und die base64-Prüfung dekodiert
 * Zertifikate; die läuft nicht bei jedem Request mit, nur um eine 503 zu
 * begründen.
 */
function auswerten(): Auswertung {
  if (cached) return cached;
  cached = {
    apple: appleSchema.safeParse(process.env),
    google: googleSchema.safeParse(process.env),
  };
  return cached;
}

function fehlendeFelder(ergebnis: z.SafeParseReturnType<unknown, unknown>): string[] {
  if (ergebnis.success) return [];
  return ergebnis.error.issues.map((i) => i.path.join("."));
}

/**
 * Für die API-Schicht: sagt, ob die Wallet-Funktion überhaupt bedienbar ist.
 * Wirft unter keinen Umständen — genau das ist der Zweck.
 */
export function walletReadiness(): WalletReadiness {
  const { apple, google } = auswerten();
  return {
    apple: apple.success,
    google: google.success,
    ready: apple.success || google.success,
    missing: [...fehlendeFelder(apple), ...fehlendeFelder(google)],
  };
}

/** Kurzform für Weichen im Routing. */
export function isWalletConfigured(): boolean {
  return walletReadiness().ready;
}

export function appleWalletEnv(): AppleWalletEnv {
  const { apple } = auswerten();
  if (!apple.success) {
    throw new Error(
      `[wallet] Apple Wallet ist nicht eingerichtet, fehlend/ungültig: ${fehlendeFelder(apple).join(", ")}`,
    );
  }
  return apple.data;
}

export function googleWalletEnv(): GoogleWalletEnv {
  const { google } = auswerten();
  if (!google.success) {
    throw new Error(
      `[wallet] Google Wallet ist nicht eingerichtet, fehlend/ungültig: ${fehlendeFelder(google).join(", ")}`,
    );
  }
  return google.data;
}

/**
 * Beide Geldbörsen zusammen. Nur für Pfade, die wirklich beide brauchen —
 * wer nur einen Apple-Pass signiert, nimmt `appleWalletEnv()`, sonst blockiert
 * ein fehlendes Google-Dienstkonto die fertige Apple-Seite.
 */
export function walletEnv(): WalletEnv {
  return { ...appleWalletEnv(), ...googleWalletEnv() };
}
