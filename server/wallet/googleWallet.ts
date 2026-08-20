/**
 * Google-Wallet-Stempelkarte als "Save to Google Wallet"-Link.
 *
 * Der Link ist ein RS256-signiertes JWT (Dienstkonto), das Klasse UND Objekt
 * eingebettet trägt ("Fat JWT") — Google legt beim Öffnen beides an bzw.
 * aktualisiert das Objekt. Für die Grundfunktion braucht es damit KEINEN
 * REST-Aufruf und keine zusätzliche Dependency: signiert wird mit
 * node:crypto.
 *
 * Kennungen deterministisch aus den eigenen IDs (`issuerId.maitr-stamp-…`),
 * damit derselbe Gast beim zweiten Klick dasselbe Objekt trifft statt ein
 * Duplikat zu erzeugen.
 */
import { createPrivateKey, sign as cryptoSign } from "node:crypto";
import { googleWalletEnv } from "./env";

function base64url(eingabe: Buffer | string): string {
  return Buffer.from(eingabe)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export interface GoogleKartenDaten {
  cardId: string;
  programId: string;
  betriebsName: string;
  stand: number;
  max: number;
  rewardText: string;
  webKarteUrl: string;
}

export function googleClassId(issuerId: string, programId: string): string {
  return `${issuerId}.maitr-stamp-${programId}`;
}

export function googleObjectId(issuerId: string, cardId: string): string {
  return `${issuerId}.maitr-karte-${cardId}`;
}

/** Klasse + Objekt, wie sie ins JWT eingebettet werden. Rein, testbar. */
export function loyaltyPayload(
  daten: GoogleKartenDaten,
  issuerId: string,
): { loyaltyClasses: unknown[]; loyaltyObjects: unknown[] } {
  const classId = googleClassId(issuerId, daten.programId);
  return {
    loyaltyClasses: [
      {
        id: classId,
        issuerName: "Maitr",
        programName: daten.betriebsName,
        programLogo: {
          sourceUri: { uri: "https://www.maitr.de/icon-192.png" },
        },
        reviewStatus: "UNDER_REVIEW",
        hexBackgroundColor: "#0d9488",
      },
    ],
    loyaltyObjects: [
      {
        id: googleObjectId(issuerId, daten.cardId),
        classId,
        state: "ACTIVE",
        barcode: {
          type: "QR_CODE",
          value: daten.webKarteUrl,
          alternateText: "Stempelkarte",
        },
        loyaltyPoints: {
          label: "Stempel",
          balance: { string: `${Math.min(daten.stand, daten.max)} / ${daten.max}` },
        },
        textModulesData: daten.rewardText
          ? [
              {
                id: "praemie",
                header: "Prämie",
                body: daten.rewardText,
              },
            ]
          : [],
        linksModuleData: {
          uris: [
            {
              uri: daten.webKarteUrl,
              description: "Karte im Browser",
              id: "webkarte",
            },
          ],
        },
      },
    ],
  };
}

export function saveLinkErzeugen(daten: GoogleKartenDaten): string {
  const env = googleWalletEnv();
  const konto = JSON.parse(env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON) as {
    client_email: string;
    private_key: string;
  };

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iss: konto.client_email,
      aud: "google",
      typ: "savetowallet",
      iat: Math.floor(Date.now() / 1000),
      payload: loyaltyPayload(daten, env.GOOGLE_WALLET_ISSUER_ID),
    }),
  );
  const signatur = cryptoSign(
    "sha256",
    Buffer.from(`${header}.${payload}`),
    createPrivateKey(konto.private_key),
  );
  return `https://pay.google.com/gp/v/save/${header}.${payload}.${base64url(signatur)}`;
}
