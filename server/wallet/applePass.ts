/**
 * Apple-Wallet-Pass (.pkpass) für die Stempelkarte.
 *
 * Ein .pkpass ist ein ZIP aus pass.json, den Bildmarken, manifest.json
 * (SHA-1 jeder Datei) und einer PKCS#7-Detached-Signatur über das Manifest
 * (Pass-Zertifikat + WWDR-Kette). Gebaut wird hier NUR mit Material aus
 * `appleWalletEnv()` — fehlt es, wirft der Aufruf, und die Routen antworten
 * vorher schon 503 über `walletReadiness()`.
 *
 * `passJson()` ist bewusst eine reine Funktion (Daten rein, Objekt raus):
 * die Tests rechnen daran die Zusagen nach (Serial, Token, Stempelstand),
 * ohne Zertifikate zu brauchen.
 */
import { createHash } from "node:crypto";
import forge from "node-forge";
import JSZip from "jszip";
import { appleWalletEnv } from "./env";
import { ICON_PNG_BASE64, LOGO_PNG_BASE64 } from "./passAssets";

export interface PassDaten {
  serialNumber: string;
  /** Klartext-Token für Apples Web-Service-Aufrufe (im Schema nur verschlüsselt). */
  authenticationToken: string;
  betriebsName: string;
  stand: number;
  max: number;
  rewardText: string;
  /** Basis-URL des Web-Service, z. B. https://www.maitr.de/api/wallet */
  webServiceURL: string;
  /** Link zur Web-Ansicht der Karte (Rückseite des Passes). */
  webKarteUrl: string;
}

export function passJson(
  daten: PassDaten,
  env: { teamIdentifier: string; passTypeIdentifier: string },
): Record<string, unknown> {
  return {
    formatVersion: 1,
    passTypeIdentifier: env.passTypeIdentifier,
    teamIdentifier: env.teamIdentifier,
    serialNumber: daten.serialNumber,
    authenticationToken: daten.authenticationToken,
    webServiceURL: daten.webServiceURL,
    organizationName: daten.betriebsName,
    description: `Stempelkarte – ${daten.betriebsName}`,
    logoText: daten.betriebsName,
    // Der Stempel-Moment: Der Gast ZEIGT den Pass, der Wirt scannt den QR mit
    // der Maitr-App (die aus dem Pfad die Karten-Kennung liest). Bewusst OHNE
    // das Gast-Token — wer nur den QR sieht, kann damit die Karte nicht
    // öffnen; er ist Kennung, kein Schlüssel.
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: daten.webKarteUrl,
        messageEncoding: "iso-8859-1",
        altText: "Stempelkarte",
      },
    ],
    foregroundColor: "rgb(255, 255, 255)",
    backgroundColor: "rgb(13, 148, 136)",
    labelColor: "rgb(204, 251, 241)",
    storeCard: {
      primaryFields: [
        {
          key: "stempel",
          label: "STEMPEL",
          value: `${Math.min(daten.stand, daten.max)} / ${daten.max}`,
        },
      ],
      secondaryFields: daten.rewardText
        ? [{ key: "praemie", label: "PRÄMIE", value: daten.rewardText }]
        : [],
      backFields: [
        {
          key: "webkarte",
          label: "Karte im Browser",
          value: daten.webKarteUrl,
        },
        {
          key: "hinweis",
          label: "So funktioniert es",
          value:
            "Der Betrieb stempelt bei jedem Besuch. Der Pass aktualisiert sich von selbst.",
        },
      ],
    },
  };
}

/** SHA-1-Manifest über alle Dateien des Passes, wie Apple es verlangt. */
export function manifestVon(dateien: Record<string, Buffer>): string {
  const eintraege: Record<string, string> = {};
  for (const [name, inhalt] of Object.entries(dateien)) {
    eintraege[name] = createHash("sha1").update(inhalt).digest("hex");
  }
  return JSON.stringify(eintraege);
}

/**
 * PKCS#7-Detached-Signatur über das Manifest. Das .p12 trägt Zertifikat und
 * Schlüssel; das WWDR-Zwischenzertifikat muss mit in die Kette, sonst lehnt
 * das Gerät den Pass wortlos ab.
 */
function signaturErzeugen(
  manifest: Buffer,
  p12Base64: string,
  passwort: string,
  wwdrPemBase64: string,
): Buffer {
  const p12Der = forge.util.decode64(p12Base64.replace(/\s/g, ""));
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, passwort);

  let zertifikat: forge.pki.Certificate | null = null;
  let schluessel: forge.pki.PrivateKey | null = null;
  for (const safeContent of p12.safeContents) {
    for (const safeBag of safeContent.safeBags) {
      if (safeBag.cert) zertifikat = safeBag.cert;
      if (safeBag.key) schluessel = safeBag.key;
    }
  }
  if (!zertifikat || !schluessel) {
    throw new Error("Pass-Zertifikat oder Schlüssel fehlen im .p12");
  }

  const wwdrPem = Buffer.from(wwdrPemBase64, "base64").toString("utf8");
  const wwdr = forge.pki.certificateFromPem(wwdrPem);

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(manifest.toString("binary"));
  p7.addCertificate(zertifikat);
  p7.addCertificate(wwdr);
  p7.addSigner({
    key: schluessel as forge.pki.rsa.PrivateKey,
    certificate: zertifikat,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() as unknown as string },
    ],
  });
  p7.sign({ detached: true });

  return Buffer.from(forge.asn1.toDer(p7.toAsn1()).getBytes(), "binary");
}

export async function pkpassErzeugen(daten: PassDaten): Promise<Buffer> {
  const env = appleWalletEnv();

  const dateien: Record<string, Buffer> = {
    "pass.json": Buffer.from(
      JSON.stringify(
        passJson(daten, {
          teamIdentifier: env.APPLE_TEAM_IDENTIFIER,
          passTypeIdentifier: env.APPLE_PASS_TYPE_IDENTIFIER,
        }),
      ),
      "utf8",
    ),
    "icon.png": Buffer.from(ICON_PNG_BASE64, "base64"),
    "icon@2x.png": Buffer.from(ICON_PNG_BASE64, "base64"),
    "logo.png": Buffer.from(LOGO_PNG_BASE64, "base64"),
  };

  const manifest = Buffer.from(manifestVon(dateien), "utf8");
  const signatur = signaturErzeugen(
    manifest,
    env.APPLE_PASS_CERT_P12_BASE64,
    env.APPLE_PASS_CERT_PASSWORD,
    env.APPLE_WWDR_CERT_PEM_BASE64,
  );

  const zip = new JSZip();
  for (const [name, inhalt] of Object.entries(dateien)) {
    zip.file(name, inhalt);
  }
  zip.file("manifest.json", manifest);
  zip.file("signature", signatur);

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
