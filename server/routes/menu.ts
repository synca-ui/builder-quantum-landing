/**
 * POST /api/menu/extract — erkennt eine Speisekarte und liefert die Gerichte.
 *
 * Zwei Wege, beide über denselben Endpunkt:
 *   { "url": "https://…/speisekarte.pdf" }   – Adresse, die der Scrape fand
 *   multipart/form-data, Feld "file"          – ein Foto, das jemand hochlädt
 *
 * Der zweite Weg ist genau das, was für den Reiter „Speisekarte" gewünscht war:
 * ein Bild der Karte hochladen, fertig.
 *
 * Anmeldung ist Pflicht, und das nicht nur aus Gewohnheit: Der Endpunkt holt
 * Daten von einer Adresse, die der Aufrufer bestimmt, und ruft eine
 * kostenpflichtige Erkennung auf. Unauthentifiziert wäre er ein offener
 * Netzwerk-Späher auf fremde Rechnung. safeFetch begrenzt zusätzlich, WOHIN
 * die Anfrage gehen darf.
 */
import { Router, type Request, type Response } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth";
import {
  extractMenuFromBuffer,
  extractMenuFromUrl,
} from "../services/menuExtraction";
import { ocrConfigured, configuredProviders, MAX_DOCUMENT_BYTES } from "../services/ocr";

/** Passend zur größten Karte, die im Feld aufgetaucht ist (21 MB). */
const MAX_UPLOAD_BYTES = 32 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

/**
 * Jede Erkennung kostet Geld und dauert bis zu anderthalb Minuten. Enger als
 * der globale Rahmen, aber weit genug, dass jemand mehrere Karten hintereinander
 * hochladen kann.
 */
const menuLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Zu viele Erkennungsläufe. Bitte warte einen Moment.",
  },
});

export const menuRouter = Router();

/**
 * GET /api/menu/health — sagt nur, ob die Erkennung überhaupt einsatzbereit ist.
 *
 * Ohne diesen Endpunkt ist von außen nicht unterscheidbar, ob eine leere Karte
 * an der Datei liegt oder daran, dass GEMINI_API_KEY fehlt. Es wird kein
 * Schlüssel und kein Modellname preisgegeben, nur ein Boolean.
 */
menuRouter.get("/health", (_req: Request, res: Response) => {
  res.json({ ocrConfigured: ocrConfigured(), providers: configuredProviders() });
});

menuRouter.post(
  "/extract",
  requireAuth,
  menuLimiter,
  // Multer-Fehler als JSON statt als HTML-500 zurückgeben.
  (req: Request, res: Response, next) =>
    upload.single("file")(req, res, (err) => {
      if (err) {
        const tooBig =
          err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE";
        return res.status(tooBig ? 413 : 400).json({
          success: false,
          error: tooBig
            ? `Datei zu groß (max. ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB)`
            : "Ungültiger Upload",
        });
      }
      next();
    }),
  async (req: Request, res: Response) => {
    const file = req.file;
    const url = typeof req.body?.url === "string" ? req.body.url.trim() : "";

    if (!file && !url) {
      return res.status(400).json({
        success: false,
        error: 'Bitte eine "url" angeben oder eine Datei im Feld "file" hochladen',
      });
    }

    try {
      const result = file
        ? await extractMenuFromBuffer(
            file.buffer,
            file.mimetype || "application/octet-stream",
          )
        : await extractMenuFromUrl(url);

      // Bewusst HTTP 200 auch bei null Gerichten: Die Anfrage war in Ordnung,
      // die Karte gab nur nichts her. Die Begründung steht in diagnostics, und
      // der Client kann sie anzeigen, statt einen Fehler zu melden.
      return res.json({
        success: true,
        items: result.items,
        count: result.items.length,
        source: result.source,
        diagnostics: result.diagnostics,
      });
    } catch (e) {
      console.error("[Menu] Erkennung fehlgeschlagen:", e);
      const message = e instanceof Error ? e.message : "Erkennung fehlgeschlagen";
      // Fehlende Konfiguration ist ein Betriebs-, kein Nutzerproblem.
      const status = /nicht konfiguriert/.test(message)
        ? 503
        : /zu groß/.test(message)
          ? 413
          : 502;
      return res.status(status).json({ success: false, error: message });
    }
  },
);

export { MAX_UPLOAD_BYTES, MAX_DOCUMENT_BYTES };
