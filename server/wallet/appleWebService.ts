/**
 * Apples PassKit-Web-Service — die sitzungslosen Endpunkte, die Wallet auf
 * dem Gerät von selbst aufruft (Spec: "PassKit Web Service Reference").
 * Gemountet unter /api/wallet, sodass `webServiceURL` + "/v1/..." hier landet.
 *
 * Auth: `Authorization: ApplePass <token>` — das ist das authenticationToken
 * aus pass.json, das die Datenbank nur AES-256-GCM-verschlüsselt kennt
 * (StampCard.encAuthToken). Der Vergleich läuft über die entschlüsselte Form
 * je Karte; eine falsche Serial und ein falsches Token antworten identisch
 * 401 — kein Existenz-Orakel.
 *
 * Venue-Scoping-Ausnahme wie im Schema dokumentiert: businessId kommt AUS
 * der über die Serial gefundenen Karte — Apples Gerät hat keine Sitzung.
 */
import { Router, type Request, type Response } from "express";
import prisma from "../db/prisma";
import { walletReadiness, appleWalletEnv } from "./env";
import { walletKartenDaten } from "../maitr/stempelkarte";
import { pkpassErzeugen } from "./applePass";

export const appleWebServiceRouter = Router();

const PUBLIC_URL = process.env.PUBLIC_URL || "https://www.maitr.de";

function applePassToken(req: Request): string | null {
  const kopf = req.headers.authorization;
  if (!kopf || !kopf.startsWith("ApplePass ")) return null;
  return kopf.slice("ApplePass ".length).trim();
}

/** Karte laden + Token prüfen; null = 401 (ununterscheidbar warum). */
async function autorisierteKarte(req: Request, serialNumber: string) {
  const token = applePassToken(req);
  if (!token) return null;
  const karte = await walletKartenDaten(serialNumber);
  if (!karte || karte.authToken !== token) return null;
  return karte;
}

// ── Registrierung eines Geräts ────────────────────────────────────────────────
appleWebServiceRouter.post(
  "/v1/devices/:deviceId/registrations/:passTypeId/:serialNumber",
  async (req: Request, res: Response) => {
    try {
      if (!walletReadiness().apple) return res.status(503).end();
      const { deviceId, passTypeId, serialNumber } = req.params as Record<string, string>;
      const karte = await autorisierteKarte(req, serialNumber);
      if (!karte) return res.status(401).end();

      const pushToken = (req.body as { pushToken?: unknown })?.pushToken;
      if (typeof pushToken !== "string" || pushToken.length === 0) {
        return res.status(400).end();
      }

      const vorhanden = await prisma.walletDeviceRegistration.findFirst({
        where: {
          deviceLibraryIdentifier: deviceId,
          passTypeIdentifier: passTypeId,
          stampCardId: karte.cardId,
        },
        select: { id: true },
      });
      if (vorhanden) {
        await prisma.walletDeviceRegistration.update({
          where: { id: vorhanden.id },
          data: { pushToken },
        });
        return res.status(200).end();
      }
      await prisma.walletDeviceRegistration.create({
        data: {
          businessId: karte.businessId,
          stampCardId: karte.cardId,
          deviceLibraryIdentifier: deviceId,
          passTypeIdentifier: passTypeId,
          pushToken,
        },
      });
      return res.status(201).end();
    } catch (err) {
      console.error("[Wallet] Registrierung:", err);
      return res.status(500).end();
    }
  },
);

// ── Abmeldung eines Geräts ────────────────────────────────────────────────────
appleWebServiceRouter.delete(
  "/v1/devices/:deviceId/registrations/:passTypeId/:serialNumber",
  async (req: Request, res: Response) => {
    try {
      const { deviceId, passTypeId, serialNumber } = req.params as Record<string, string>;
      const karte = await autorisierteKarte(req, serialNumber);
      if (!karte) return res.status(401).end();

      await prisma.walletDeviceRegistration.deleteMany({
        where: {
          deviceLibraryIdentifier: deviceId,
          passTypeIdentifier: passTypeId,
          stampCardId: karte.cardId,
        },
      });
      return res.status(200).end();
    } catch (err) {
      console.error("[Wallet] Abmeldung:", err);
      return res.status(500).end();
    }
  },
);

// ── Welche Pässe dieses Geräts haben sich geändert? ──────────────────────────
appleWebServiceRouter.get(
  "/v1/devices/:deviceId/registrations/:passTypeId",
  async (req: Request, res: Response) => {
    try {
      const { deviceId, passTypeId } = req.params as Record<string, string>;
      // Bewusst OHNE ApplePass-Auth: so spezifiziert es Apple — die Antwort
      // enthält nur Serials, die das Gerät ohnehin registriert hat.
      const seit = typeof req.query.passesUpdatedSince === "string"
        ? Number.parseInt(req.query.passesUpdatedSince, 10)
        : null;

      const registrierungen = await prisma.walletDeviceRegistration.findMany({
        where: {
          deviceLibraryIdentifier: deviceId,
          passTypeIdentifier: passTypeId,
        },
        select: {
          stampCard: { select: { serialNumber: true, passUpdateSeq: true } },
        },
      });

      const geaendert = registrierungen
        .map((r) => r.stampCard)
        .filter(
          (k): k is { serialNumber: string; passUpdateSeq: number } =>
            !!k?.serialNumber &&
            (seit == null || Number.isNaN(seit) || k.passUpdateSeq > seit),
        );

      if (geaendert.length === 0) return res.status(204).end();

      const neuesterTag = Math.max(...geaendert.map((k) => k.passUpdateSeq));
      return res.json({
        serialNumbers: geaendert.map((k) => k.serialNumber),
        lastUpdated: String(neuesterTag),
      });
    } catch (err) {
      console.error("[Wallet] Änderungsliste:", err);
      return res.status(500).end();
    }
  },
);

// ── Den aktuellen Pass ausliefern ─────────────────────────────────────────────
appleWebServiceRouter.get(
  "/v1/passes/:passTypeId/:serialNumber",
  async (req: Request, res: Response) => {
    try {
      if (!walletReadiness().apple) return res.status(503).end();
      const { serialNumber } = req.params as Record<string, string>;
      const karte = await autorisierteKarte(req, serialNumber);
      if (!karte) return res.status(401).end();

      // If-Modified-Since ehrlich beantworten — Quelle ist contentChangedAt
      // (Schema-Kommentar: NICHT der letzte Bau, sonst dauerhaft 304).
      const wennGeaendertSeit = req.headers["if-modified-since"];
      if (wennGeaendertSeit) {
        const seit = new Date(wennGeaendertSeit as string).getTime();
        if (
          Number.isFinite(seit) &&
          Math.floor(karte.contentChangedAt.getTime() / 1000) <= Math.floor(seit / 1000)
        ) {
          return res.status(304).end();
        }
      }

      const env = appleWalletEnv();
      const pkpass = await pkpassErzeugen({
        serialNumber,
        authenticationToken: karte.authToken,
        betriebsName: karte.betriebsName,
        stand: karte.stand,
        max: karte.max,
        rewardText: karte.rewardText,
        webServiceURL: `${PUBLIC_URL}/api/wallet`,
        webKarteUrl: `${PUBLIC_URL}/karte/${karte.cardId}`,
      });

      res.setHeader("Content-Type", "application/vnd.apple.pkpass");
      res.setHeader("Last-Modified", karte.contentChangedAt.toUTCString());
      // env nur angefordert, um Konfigurationsfehler HIER laut zu machen,
      // nicht erst im nächsten Gerät-Retry-Zyklus.
      void env;
      return res.send(pkpass);
    } catch (err) {
      console.error("[Wallet] Passauslieferung:", err);
      return res.status(500).end();
    }
  },
);

// ── Fehlerprotokoll der Geräte ────────────────────────────────────────────────
appleWebServiceRouter.post("/v1/log", (req: Request, res: Response) => {
  const logs = (req.body as { logs?: unknown })?.logs;
  if (Array.isArray(logs)) {
    for (const zeile of logs.slice(0, 20)) {
      console.warn("[Wallet] Gerätelog:", String(zeile).slice(0, 500));
    }
  }
  res.status(200).end();
});
