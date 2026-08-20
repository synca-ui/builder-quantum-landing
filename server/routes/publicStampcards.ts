/**
 * Öffentliche Gast-Sicht auf eine Stempelkarte.
 *
 * Der Betreiber gibt die Karte in der Maitr-App aus und teilt dem Gast einen
 * Link/QR: `https://www.maitr.de/karte/<cardId>?t=<hmac>`. Diese Route ist
 * das Lese-API dahinter.
 *
 * Zugriffsmodell: uuid ALLEIN öffnet nichts (Regel des Loyalty-Moduls: eine
 * Kennung im Pfad ist kein Geheimnis). Erst die HMAC-Signatur über die
 * cardId — erzeugbar nur mit dem Server-Secret — macht den Link zum
 * Schlüssel. Es gibt bewusst KEINEN Weg, eine Karte über die Telefonnummer
 * zu suchen: ein solcher Endpunkt wäre ein Orakel, mit dem sich durchprobieren
 * ließe, wessen Nummer bei welchem Betrieb Gast ist.
 *
 * Ohne konfiguriertes Secret antwortet die Route 404 für alles — das Feature
 * degradiert, statt mit erratbaren Tokens online zu gehen.
 */
import { Router, type Request, type Response } from "express";
import {
  karteFuerGastLesen,
  passAusstattungSichern,
  walletKartenDaten,
} from "../maitr/stempelkarte";
import { walletReadiness } from "../wallet/env";
import { pkpassErzeugen } from "../wallet/applePass";
import { saveLinkErzeugen } from "../wallet/googleWallet";
import { hmacToken, tokenGleich } from "../utils/signaturToken";

export const STAMPCARD_LINK_SECRET =
  process.env.STAMPCARD_LINK_SECRET ||
  process.env.MAITR_OAUTH_STATE_SECRET ||
  null;

export function gastKartenToken(cardId: string, secret: string): string {
  return hmacToken(`stampcard.${cardId}`, secret);
}

export const publicStampcardsRouter = Router();

publicStampcardsRouter.get("/:cardId", async (req: Request, res: Response) => {
  const cardId = typeof req.params.cardId === "string" ? req.params.cardId : "";
  const token = typeof req.query.t === "string" ? req.query.t : "";

  // Signatur zuerst — eine ungültige Anfrage erfährt nicht einmal, ob es die
  // Karte gibt (404 statt 403, kein Unterschied zu "existiert nicht").
  if (
    !STAMPCARD_LINK_SECRET ||
    !cardId ||
    !tokenGleich(gastKartenToken(cardId, STAMPCARD_LINK_SECRET), token)
  ) {
    return res.status(404).json({ error: "Karte nicht gefunden" });
  }

  try {
    const karte = await karteFuerGastLesen(cardId);
    if (!karte) {
      return res.status(404).json({ error: "Karte nicht gefunden" });
    }
    // Welche Wallet-Knöpfe die Gast-Seite zeigen darf — Env-Wahrheit,
    // kein Versprechen ins Leere.
    const bereit = walletReadiness();
    return res.json({
      success: true,
      karte,
      wallet: { apple: bereit.apple, google: bereit.google },
    });
  } catch (error) {
    console.error("Fehler beim Lesen der Gast-Stempelkarte:", error);
    return res.status(500).json({ error: "Karte konnte nicht geladen werden" });
  }
});

const PUBLIC_URL = process.env.PUBLIC_URL || "https://www.maitr.de";

function gastTokenGueltig(cardId: string, token: string): boolean {
  return (
    !!STAMPCARD_LINK_SECRET &&
    !!cardId &&
    tokenGleich(gastKartenToken(cardId, STAMPCARD_LINK_SECRET), token)
  );
}

// ── Apple-Wallet-Pass hinter dem Gast-Link ───────────────────────────────────
// Erst-Abruf stattet die Karte mit serialNumber + authenticationToken aus
// (passAusstattungSichern) — ab dann hält Apples Web-Service den Pass frisch.
publicStampcardsRouter.get(
  "/:cardId/apple.pkpass",
  async (req: Request, res: Response) => {
    const cardId = typeof req.params.cardId === "string" ? req.params.cardId : "";
    const token = typeof req.query.t === "string" ? req.query.t : "";
    if (!gastTokenGueltig(cardId, token)) {
      return res.status(404).json({ error: "Karte nicht gefunden" });
    }
    if (!walletReadiness().apple) {
      return res
        .status(503)
        .json({ error: "Apple Wallet ist noch nicht eingerichtet." });
    }
    try {
      const ausstattung = await passAusstattungSichern(cardId);
      if (!ausstattung) {
        return res.status(404).json({ error: "Karte nicht gefunden" });
      }
      const karte = await walletKartenDaten(ausstattung.serialNumber);
      if (!karte) {
        return res.status(404).json({ error: "Karte nicht gefunden" });
      }
      const pkpass = await pkpassErzeugen({
        serialNumber: ausstattung.serialNumber,
        authenticationToken: ausstattung.authToken,
        betriebsName: karte.betriebsName,
        stand: karte.stand,
        max: karte.max,
        rewardText: karte.rewardText,
        webServiceURL: `${PUBLIC_URL}/api/wallet`,
        webKarteUrl: `${PUBLIC_URL}/karte/${cardId}`,
      });
      res.setHeader("Content-Type", "application/vnd.apple.pkpass");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="stempelkarte.pkpass"',
      );
      return res.send(pkpass);
    } catch (error) {
      console.error("Fehler beim Erzeugen des Apple-Passes:", error);
      return res
        .status(500)
        .json({ error: "Pass konnte nicht erzeugt werden" });
    }
  },
);

// ── Google-Wallet-Save-Link hinter dem Gast-Link ─────────────────────────────
publicStampcardsRouter.get(
  "/:cardId/google-wallet",
  async (req: Request, res: Response) => {
    const cardId = typeof req.params.cardId === "string" ? req.params.cardId : "";
    const token = typeof req.query.t === "string" ? req.query.t : "";
    if (!gastTokenGueltig(cardId, token)) {
      return res.status(404).json({ error: "Karte nicht gefunden" });
    }
    if (!walletReadiness().google) {
      return res
        .status(503)
        .json({ error: "Google Wallet ist noch nicht eingerichtet." });
    }
    try {
      // Ausstattung sichern, damit Apple- und Google-Weg dieselbe Karte
      // ordentlich initialisieren — der Save-Link selbst braucht nur Daten.
      const ausstattung = await passAusstattungSichern(cardId);
      if (!ausstattung) {
        return res.status(404).json({ error: "Karte nicht gefunden" });
      }
      const karte = await walletKartenDaten(ausstattung.serialNumber);
      if (!karte) {
        return res.status(404).json({ error: "Karte nicht gefunden" });
      }
      const url = saveLinkErzeugen({
        cardId,
        programId: karte.programId,
        betriebsName: karte.betriebsName,
        stand: karte.stand,
        max: karte.max,
        rewardText: karte.rewardText,
        webKarteUrl: `${PUBLIC_URL}/karte/${cardId}`,
      });
      // Redirect statt JSON: der Knopf auf der Gast-Seite ist ein schlichter
      // Link, und Google übernimmt ab hier.
      return res.redirect(302, url);
    } catch (error) {
      console.error("Fehler beim Google-Wallet-Link:", error);
      return res
        .status(500)
        .json({ error: "Link konnte nicht erzeugt werden" });
    }
  },
);
