import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { generateKeyPairSync } from "node:crypto";

/**
 * Diese Prüfungen sichern die Entscheidung ab, die Wallet-Variablen NICHT in
 * server/maitr/env.ts zu legen: Dort wirft `maitrEnv()` bei der ersten
 * fehlenden Variablen, und der Server könnte ohne Apple-Zertifikate nichts
 * mehr bedienen. Der wichtigste Fall unten ist deshalb der unvollständige —
 * eine halb eingerichtete Wallet darf nichts umwerfen, sie muss beantwortbar
 * sein.
 *
 * Es kommen keine echten Schlüssel vor. Das APNs-Material wird zur Laufzeit
 * erzeugt (echtes P-256, wie ES256 es braucht), alles andere sind als solche
 * erkennbare Platzhalter.
 */

/** Echtes, aber wegwerfbares EC-P-256-Material — dasselbe Format wie ein APNs-.p8. */
function frischerP8Base64(): string {
  const { privateKey } = generateKeyPairSync("ec", {
    namedCurve: "P-256",
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  return Buffer.from(privateKey).toString("base64");
}

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");

function appleVariablen(): Record<string, string> {
  return {
    APPLE_TEAM_IDENTIFIER: "TESTTEAM01",
    APPLE_PASS_TYPE_IDENTIFIER: "pass.de.maitr.test.stempelkarte",
    APPLE_PASS_CERT_P12_BASE64: b64("PLATZHALTER-KEIN-ECHTES-P12"),
    APPLE_PASS_CERT_PASSWORD: "platzhalter-passwort",
    APPLE_WWDR_CERT_PEM_BASE64: b64(
      "-----BEGIN CERTIFICATE-----\nPLATZHALTER-KEIN-ECHTES-WWDR\n-----END CERTIFICATE-----\n",
    ),
    APNS_KEY_P8_BASE64: frischerP8Base64(),
    APNS_KEY_ID: "TESTKEYID1",
    APNS_TEAM_ID: "TESTTEAM01",
    APNS_ENV: "sandbox",
  };
}

function googleVariablen(): Record<string, string> {
  return {
    GOOGLE_WALLET_ISSUER_ID: "3388000000000000000",
    GOOGLE_WALLET_SERVICE_ACCOUNT_JSON: JSON.stringify({
      type: "service_account",
      project_id: "platzhalter-projekt",
      client_email: "platzhalter@platzhalter-projekt.iam.gserviceaccount.com",
      private_key: "-----BEGIN PRIVATE KEY-----\nPLATZHALTER\n-----END PRIVATE KEY-----\n",
    }),
  };
}

const ALLE_NAMEN = [...Object.keys(appleVariablen()), ...Object.keys(googleVariablen())];

let gesichert: Record<string, string | undefined> = {};

beforeEach(() => {
  gesichert = {};
  for (const name of ALLE_NAMEN) {
    gesichert[name] = process.env[name];
    delete process.env[name];
  }
});

afterEach(() => {
  for (const [name, wert] of Object.entries(gesichert)) {
    if (wert === undefined) delete process.env[name];
    else process.env[name] = wert;
  }
});

/**
 * Das Modul merkt sich das Auswertungsergebnis absichtlich (die Umgebung eines
 * laufenden Prozesses ändert sich nicht). Für die Tests muss es deshalb pro
 * Fall frisch geladen werden — sonst prüft der zweite Fall den Cache des ersten.
 */
async function ladeMitUmgebung(vars: Record<string, string>) {
  // Erst räumen, dann setzen: Wird die Funktion zweimal im selben Test benutzt,
  // stünde sonst noch die Variable des ersten Aufrufs da und der zweite Fall
  // prüfte etwas anderes als er behauptet.
  for (const name of ALLE_NAMEN) delete process.env[name];
  for (const [k, v] of Object.entries(vars)) process.env[k] = v;
  vi.resetModules();
  return import("../wallet/env");
}

describe("walletReadiness: gar nichts eingerichtet", () => {
  it("wirft nicht, sondern meldet 'nicht bereit'", async () => {
    const env = await ladeMitUmgebung({});
    const stand = env.walletReadiness();

    expect(stand.apple).toBe(false);
    expect(stand.google).toBe(false);
    expect(stand.ready).toBe(false);
    expect(env.isWalletConfigured()).toBe(false);
  });

  it("benennt jede fehlende Variable, damit die Einrichtung nicht raten muss", async () => {
    const env = await ladeMitUmgebung({});
    expect(env.walletReadiness().missing.sort()).toEqual([...ALLE_NAMEN].sort());
  });

  it("wirft erst, wenn jemand wirklich signieren will", async () => {
    const env = await ladeMitUmgebung({});
    expect(() => env.appleWalletEnv()).toThrow(/nicht eingerichtet/);
    expect(() => env.googleWalletEnv()).toThrow(/nicht eingerichtet/);
    expect(() => env.walletEnv()).toThrow();
  });
});

describe("walletReadiness: nur eine Hälfte eingerichtet", () => {
  it("gibt Apple frei, während das Google-Dienstkonto noch fehlt", async () => {
    // Der Fall, für den die Trennung überhaupt existiert: Die Apple-Freigabe
    // ist da, die Google-Issuer-Freigabe dauert noch Wochen.
    const env = await ladeMitUmgebung(appleVariablen());
    const stand = env.walletReadiness();

    expect(stand.apple).toBe(true);
    expect(stand.google).toBe(false);
    expect(stand.ready).toBe(true);
    expect(stand.missing).toEqual(expect.arrayContaining(["GOOGLE_WALLET_ISSUER_ID"]));

    expect(() => env.appleWalletEnv()).not.toThrow();
    expect(() => env.googleWalletEnv()).toThrow(/GOOGLE_WALLET/);
  });

  it("gibt umgekehrt Google frei, während Apple fehlt", async () => {
    const env = await ladeMitUmgebung(googleVariablen());
    const stand = env.walletReadiness();

    expect(stand.apple).toBe(false);
    expect(stand.google).toBe(true);
    expect(stand.ready).toBe(true);
    expect(() => env.googleWalletEnv()).not.toThrow();
    expect(() => env.appleWalletEnv()).toThrow(/APPLE|APNS/);
  });

  it("bleibt unvollständig, wenn innerhalb einer Hälfte etwas fehlt", async () => {
    const { APNS_KEY_ID: _weg, ...rest } = appleVariablen();
    const env = await ladeMitUmgebung({ ...rest, ...googleVariablen() });
    const stand = env.walletReadiness();

    expect(stand.apple).toBe(false);
    expect(stand.google).toBe(true);
    expect(stand.missing).toEqual(["APNS_KEY_ID"]);
  });
});

describe("walletEnv: vollständig eingerichtet", () => {
  it("meldet beide Geldbörsen bereit", async () => {
    const env = await ladeMitUmgebung({ ...appleVariablen(), ...googleVariablen() });
    const stand = env.walletReadiness();

    expect(stand).toMatchObject({ apple: true, google: true, ready: true, missing: [] });
    expect(env.isWalletConfigured()).toBe(true);
  });

  it("reicht die Werte unverändert durch", async () => {
    const apple = appleVariablen();
    const google = googleVariablen();
    const env = await ladeMitUmgebung({ ...apple, ...google });
    const gelesen = env.walletEnv();

    expect(gelesen.APPLE_PASS_TYPE_IDENTIFIER).toBe(apple.APPLE_PASS_TYPE_IDENTIFIER);
    expect(gelesen.APNS_ENV).toBe("sandbox");
    expect(gelesen.GOOGLE_WALLET_ISSUER_ID).toBe(google.GOOGLE_WALLET_ISSUER_ID);
    // Das Schlüsselmaterial muss dekodierbar bleiben — sonst hilft "bereit" nichts.
    expect(Buffer.from(gelesen.APNS_KEY_P8_BASE64, "base64").toString("utf8")).toContain(
      "BEGIN PRIVATE KEY",
    );
  });
});

describe("walletEnv: Einrichtungsfehler, die sonst erst beim Signieren auffallen", () => {
  it("lehnt einen roh eingesetzten PEM-Block ab statt ihn zu dekodieren", async () => {
    const env = await ladeMitUmgebung({
      ...appleVariablen(),
      APPLE_WWDR_CERT_PEM_BASE64: "-----BEGIN CERTIFICATE-----\nnicht base64\n-----END CERTIFICATE-----",
    });
    expect(env.walletReadiness().missing).toContain("APPLE_WWDR_CERT_PEM_BASE64");
  });

  it("lehnt die Bundle-ID an der Stelle der Pass Type ID ab", async () => {
    // Ohne führendes "pass." nimmt kein Gerät den Pass an — und sagt nicht warum.
    const env = await ladeMitUmgebung({
      ...appleVariablen(),
      APPLE_PASS_TYPE_IDENTIFIER: "de.maitr.app",
    });
    expect(env.walletReadiness().missing).toContain("APPLE_PASS_TYPE_IDENTIFIER");
  });

  it("lehnt ein unbekanntes APNs-Ziel ab, statt still auf einen Host zu raten", async () => {
    const env = await ladeMitUmgebung({ ...appleVariablen(), APNS_ENV: "staging" });
    expect(env.walletReadiness().missing).toContain("APNS_ENV");
  });

  it("lehnt einen Dateipfad anstelle des Dienstkonto-JSON ab", async () => {
    const env = await ladeMitUmgebung({
      ...googleVariablen(),
      GOOGLE_WALLET_SERVICE_ACCOUNT_JSON: "/secrets/service-account.json",
    });
    expect(env.walletReadiness().missing).toContain("GOOGLE_WALLET_SERVICE_ACCOUNT_JSON");
  });

  it("lehnt ein Dienstkonto-JSON ohne private_key ab", async () => {
    const env = await ladeMitUmgebung({
      ...googleVariablen(),
      GOOGLE_WALLET_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: "a@b.iam.gserviceaccount.com" }),
    });
    expect(env.walletReadiness().missing).toContain("GOOGLE_WALLET_SERVICE_ACCOUNT_JSON");
  });

  it("erlaubt ein leeres .p12-Passwort, aber kein weggelassenes", async () => {
    // Ein Export ohne Passwort ist zulässig. Fehlt die Variable dagegen ganz,
    // ist nicht unterscheidbar, ob leer gemeint war oder vergessen wurde.
    const mitLeerem = await ladeMitUmgebung({
      ...appleVariablen(),
      APPLE_PASS_CERT_PASSWORD: "",
    });
    expect(mitLeerem.walletReadiness().apple).toBe(true);

    const { APPLE_PASS_CERT_PASSWORD: _weg, ...ohne } = appleVariablen();
    const ohneVariable = await ladeMitUmgebung(ohne);
    expect(ohneVariable.walletReadiness().missing).toContain("APPLE_PASS_CERT_PASSWORD");
  });
});
