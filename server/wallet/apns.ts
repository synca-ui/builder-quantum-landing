/**
 * APNs-Pushes für Wallet-Pässe.
 *
 * Ein Wallet-Push trägt KEINEN Text: er sagt dem Gerät nur "hol den Pass
 * neu" (leeres JSON an das Topic = Pass-Type-ID). Versand über Node-Bordmittel:
 * http2 für den Request, crypto für das ES256-JWT (`dsaEncoding: ieee-p1363`
 * liefert direkt das JOSE-Format — kein DER-Umbau, keine Dependency).
 *
 * Das Provider-JWT wird gecacht: Apple akzeptiert Tokens bis 60 Minuten und
 * wirft `TooManyProviderTokenUpdates`, wenn man öfter als nötig neue baut.
 */
import { createPrivateKey, sign as cryptoSign } from "node:crypto";
import { connect } from "node:http2";
import { appleWalletEnv } from "./env";

const TOKEN_LEBENSDAUER_MS = 45 * 60_000;

let tokenCache: { wert: string; erstelltUm: number } | null = null;

function base64url(eingabe: Buffer | string): string {
  return Buffer.from(eingabe)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function providerToken(jetzt: number = Date.now()): string {
  if (tokenCache && jetzt - tokenCache.erstelltUm < TOKEN_LEBENSDAUER_MS) {
    return tokenCache.wert;
  }
  const env = appleWalletEnv();
  const p8 = Buffer.from(env.APNS_KEY_P8_BASE64, "base64").toString("utf8");
  const schluessel = createPrivateKey(p8);

  const header = base64url(
    JSON.stringify({ alg: "ES256", kid: env.APNS_KEY_ID }),
  );
  const payload = base64url(
    JSON.stringify({ iss: env.APNS_TEAM_ID, iat: Math.floor(jetzt / 1000) }),
  );
  const signatur = cryptoSign("sha256", Buffer.from(`${header}.${payload}`), {
    key: schluessel,
    dsaEncoding: "ieee-p1363",
  });
  const token = `${header}.${payload}.${base64url(signatur)}`;
  tokenCache = { wert: token, erstelltUm: jetzt };
  return token;
}

export interface ApnsErgebnis {
  pushToken: string;
  status: number;
  grund?: string;
}

/**
 * Schickt jedem Geräte-Token den "Pass neu laden"-Anstoß. Antwortet je Token
 * mit Status + Apple-Grund; der Aufrufer entscheidet über die Buchführung
 * (failedPushes, Aufräumen bei 410/BadDeviceToken).
 */
export async function walletPushSenden(
  pushTokens: string[],
): Promise<ApnsErgebnis[]> {
  if (pushTokens.length === 0) return [];
  const env = appleWalletEnv();
  const jwt = providerToken();
  // Host folgt APNS_ENV — die env.ts begründet, warum es keinen Vorgabewert
  // gibt: ein falsch geratenes Ziel sieht aus wie kaputte Registrierungen.
  const host =
    env.APNS_ENV === "production"
      ? "api.push.apple.com"
      : "api.sandbox.push.apple.com";

  const client = connect(`https://${host}`);
  try {
    return await Promise.all(
      pushTokens.map(
        (pushToken) =>
          new Promise<ApnsErgebnis>((resolve) => {
            const req = client.request({
              ":method": "POST",
              ":path": `/3/device/${pushToken}`,
              authorization: `bearer ${jwt}`,
              "apns-topic": env.APPLE_PASS_TYPE_IDENTIFIER,
              "apns-push-type": "background",
              "content-type": "application/json",
            });
            let status = 0;
            let body = "";
            req.on("response", (headers) => {
              status = Number(headers[":status"] ?? 0);
            });
            req.on("data", (teil) => (body += teil));
            req.on("end", () => {
              let grund: string | undefined;
              try {
                grund = (JSON.parse(body) as { reason?: string }).reason;
              } catch {
                /* leerer Body bei 200 */
              }
              resolve({ pushToken, status, grund });
            });
            req.on("error", (err) =>
              resolve({ pushToken, status: 0, grund: String(err) }),
            );
            req.end(JSON.stringify({}));
          }),
      ),
    );
  } finally {
    client.close();
  }
}
