/**
 * Speisekarten-Erkennung als Auftrag: anstoßen, dann abfragen.
 *
 *   POST /api/menu/extract        -> 202 { jobId }        (antwortet sofort)
 *   GET  /api/menu/extract/:jobId -> { status, items, … } (antwortet sofort)
 *
 * Warum zweistufig und nicht einfach synchron: Der erste Anlauf lief synchron
 * und lieferte HTTP 504. /api/* geht über einen Netlify-Proxy zu Railway, und
 * der bricht nach 26 Sekunden ab; die Erkennung eines 21-MB-Bild-PDFs braucht
 * 40 bis 90. Netlifys eigene Empfehlung für längere Vorgänge lautet
 * ausdrücklich, asynchron zu arbeiten. Beide Aufrufe hier sind in
 * Millisekunden durch.
 *
 * Zwei Quellen, beide beim POST:
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
import type { MenuExtractionResult } from "../services/menuExtraction";
import {
  extractMenuFromBuffer,
  extractMenuFromUrl,
} from "../services/menuExtraction";
import {
  startMenuJob,
  getMenuJob,
  TooManyJobsError,
} from "../services/menuJobs";
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
  (req: Request, res: Response) => {
    const file = req.file;
    const url = typeof req.body?.url === "string" ? req.body.url.trim() : "";
    const userId = req.user!.id;

    if (!file && !url) {
      return res.status(400).json({
        success: false,
        error: 'Bitte eine "url" angeben oder eine Datei im Feld "file" hochladen',
      });
    }

    // Die Bytes werden JETZT festgehalten: req.file lebt nur für diese Anfrage,
    // die Arbeit läuft aber darüber hinaus weiter.
    const buffer = file?.buffer;
    const mimetype = file?.mimetype || "application/octet-stream";

    try {
      const job = startMenuJob(userId, () =>
        buffer
          ? extractMenuFromBuffer(buffer, mimetype)
          : extractMenuFromUrl(url),
      );

      // 202: angenommen, läuft noch. Der Client fragt unter jobId nach.
      return res.status(202).json({ success: true, jobId: job.id, status: job.status });
    } catch (e) {
      if (e instanceof TooManyJobsError) {
        return res.status(429).json({ success: false, error: e.message });
      }
      console.error("[Menu] Auftrag konnte nicht gestartet werden:", e);
      return res.status(500).json({
        success: false,
        error: "Die Erkennung konnte nicht gestartet werden",
      });
    }
  },
);

/**
 * GET /api/menu/extract/:jobId — Stand eines Auftrags.
 *
 * Bewusst HTTP 200 auch bei null Gerichten: Die Anfrage war in Ordnung, die
 * Karte gab nur nichts her. Die Begründung steht in diagnostics, und der Client
 * kann sie anzeigen, statt einen Fehler zu melden.
 */
menuRouter.get(
  "/extract/:jobId",
  requireAuth,
  (req: Request, res: Response) => {
    const job = getMenuJob(String(req.params.jobId), req.user!.id);

    if (!job) {
      // "Gibt es nicht" und "gehört jemand anderem" sehen absichtlich gleich aus.
      return res.status(404).json({ success: false, error: "Auftrag nicht gefunden" });
    }

    if (job.status === "running") {
      return res.json({ success: true, status: "running" });
    }

    if (job.status === "failed") {
      return res.json({
        success: false,
        status: "failed",
        error: job.error ?? "Erkennung fehlgeschlagen",
      });
    }

    return res.json(menuJobAntwort(job.result!));
  },
);

/**
 * Baut die Antwort eines fertigen Erkennungsauftrags.
 *
 * Eigene Funktion, weil hier schon einmal etwas verlorenging: Die
 * Kürzel-Legende wurde in menuExtraction.ts gelesen, in res.json() aber nicht
 * aufgeführt. Am Gericht standen dadurch nur Kürzel wie "a1" — und was die
 * bedeuten, legt jede Karte selbst fest. Für einen Gast mit einer
 * Unverträglichkeit ist "(a1, f)" wertlos.
 *
 * Fehlt die Legende auf der Karte, fehlt auch das Feld. Die Oberfläche zeigt
 * dann das rohe Kürzel — lieber das als eine erfundene Zuordnung.
 */
export function menuJobAntwort(result: MenuExtractionResult) {
  return {
    success: true as const,
    status: "done" as const,
    items: result.items,
    count: result.items.length,
    source: result.source,
    diagnostics: result.diagnostics,
    ...(result.allergenLegend && Object.keys(result.allergenLegend).length
      ? { allergenLegend: result.allergenLegend }
      : {}),
  };
}

export { MAX_UPLOAD_BYTES, MAX_DOCUMENT_BYTES };
