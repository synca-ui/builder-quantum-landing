// @vitest-environment node
/**
 * Reine Bausteine des Wallet-Passbaus — pass.json, Manifest und der
 * Google-Save-Link. Signiert wird hier nichts mit echtem Material: das
 * pass.json muss stimmen, BEVOR ein Zertifikat je in die Nähe kommt.
 */
import { describe, expect, it } from "vitest";
import { manifestVon, passJson } from "../wallet/applePass";
import {
  googleClassId,
  googleObjectId,
  loyaltyPayload,
} from "../wallet/googleWallet";

const DATEN = {
  serialNumber: "serial-1",
  authenticationToken: "token-1",
  betriebsName: "Osteria del Mare",
  stand: 7,
  max: 10,
  rewardText: "1× Espresso aufs Haus",
  webServiceURL: "https://www.maitr.de/api/wallet",
  webKarteUrl: "https://www.maitr.de/karte/abc",
};

describe("passJson", () => {
  const pass = passJson(DATEN, {
    teamIdentifier: "TEAM1",
    passTypeIdentifier: "pass.de.maitr.stempelkarte",
  }) as any;

  it("trägt Serial, Token und Web-Service — ohne sie kein Update-Zyklus", () => {
    expect(pass.serialNumber).toBe("serial-1");
    expect(pass.authenticationToken).toBe("token-1");
    expect(pass.webServiceURL).toBe("https://www.maitr.de/api/wallet");
  });

  it("zeigt den Stempelstand als storeCard-Hauptfeld", () => {
    expect(pass.storeCard.primaryFields[0].value).toBe("7 / 10");
  });

  it("kappt den Stand am Maximum (Hauptbuch kann überzählen)", () => {
    const voll = passJson({ ...DATEN, stand: 12 }, {
      teamIdentifier: "T",
      passTypeIdentifier: "pass.x",
    }) as any;
    expect(voll.storeCard.primaryFields[0].value).toBe("10 / 10");
  });

  it("trägt den QR zum Vorzeigen — Kennung ohne Gast-Token", () => {
    expect(pass.barcodes[0].format).toBe("PKBarcodeFormatQR");
    expect(pass.barcodes[0].message).toBe("https://www.maitr.de/karte/abc");
    expect(pass.barcodes[0].message).not.toContain("?t=");
  });

  it("ohne Prämientext kein leeres Prämienfeld", () => {
    const ohne = passJson({ ...DATEN, rewardText: "" }, {
      teamIdentifier: "T",
      passTypeIdentifier: "pass.x",
    }) as any;
    expect(ohne.storeCard.secondaryFields).toEqual([]);
  });
});

describe("manifestVon", () => {
  it("SHA-1 je Datei, wie Apple es verlangt", () => {
    const manifest = JSON.parse(
      manifestVon({ "pass.json": Buffer.from("abc", "utf8") }),
    );
    // sha1("abc") — bekannter Wert
    expect(manifest["pass.json"]).toBe(
      "a9993e364706816aba3e25717850c26c9cd0d89d",
    );
  });
});

describe("Google-Wallet-Payload", () => {
  it("Kennungen deterministisch aus Issuer + eigenen IDs", () => {
    expect(googleClassId("123", "prog-1")).toBe("123.maitr-stamp-prog-1");
    expect(googleObjectId("123", "card-9")).toBe("123.maitr-karte-card-9");
  });

  it("Objekt referenziert die Klasse und trägt den Stand", () => {
    const payload = loyaltyPayload(
      {
        cardId: "card-9",
        programId: "prog-1",
        betriebsName: "Osteria del Mare",
        stand: 7,
        max: 10,
        rewardText: "1× Espresso aufs Haus",
        webKarteUrl: "https://www.maitr.de/karte/card-9",
      },
      "123",
    ) as any;
    expect(payload.loyaltyObjects[0].classId).toBe("123.maitr-stamp-prog-1");
    expect(payload.loyaltyObjects[0].loyaltyPoints.balance.string).toBe("7 / 10");
    expect(payload.loyaltyClasses[0].programName).toBe("Osteria del Mare");
    expect(payload.loyaltyObjects[0].barcode.value).toBe(
      "https://www.maitr.de/karte/card-9",
    );
  });
});
