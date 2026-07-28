import { Router, type Request, type Response } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth";
import {
  storageConfigured,
  uploadImageToStorage,
} from "../services/supabaseStorage";

/**
 * POST /api/media/upload — nimmt EIN Bild als multipart/form-data (Feld "file")
 * entgegen und legt es in Supabase Storage ab. Antwort: { success, url }.
 *
 * Anlass: Der Konfigurator erzeugte für Logo/Galerie/Gericht-Bilder nur
 * browserlokale blob:-URLs, die nie hochgeladen wurden — auf der
 * veröffentlichten Website kamen nie Bilder an.
 */

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB, passend zum UI-Versprechen

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
});

export const mediaRouter = Router();

/**
 * GET /api/media/health — sagt NUR, ob der Storage konfiguriert ist.
 *
 * Bewusst ohne Auth: Der Upload selbst prüft zuerst das Token, ein
 * fehlgeschlagener Upload sieht deshalb identisch aus, egal ob der Storage
 * fehlt oder das Token. Ohne diesen Endpunkt ist die Ursache von außen nicht
 * unterscheidbar. Es werden weder URL noch Key noch Bucket-Name preisgegeben —
 * nur ein Boolean, das ein Angreifer mit einem Gratis-Account ohnehin durch
 * einen Upload-Versuch erführe.
 */
mediaRouter.get("/health", (_req: Request, res: Response) => {
  res.json({ configured: storageConfigured() });
});

mediaRouter.post(
  "/upload",
  requireAuth,
  // Multer-Fehler (z.B. zu große Datei) als JSON statt als HTML-500
  (req: Request, res: Response, next) =>
    upload.single("file")(req, res, (err) => {
      if (err) {
        const tooBig =
          err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE";
        return res.status(tooBig ? 413 : 400).json({
          success: false,
          error: tooBig ? "Datei zu groß (max. 5MB)" : "Ungültiger Upload",
        });
      }
      next();
    }),
  async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'Keine Datei erhalten (multipart-Feld "file")',
        });
      }

      const ext = ALLOWED_TYPES[file.mimetype];
      if (!ext) {
        return res.status(415).json({
          success: false,
          error: "Nur JPG, PNG, WebP oder GIF erlaubt",
        });
      }

      // Pfad: <user>/<zeitstempel>-<zufall>.<ext> — eindeutig und ohne
      // Nutzereingaben (Originalname kann beliebigen Unfug enthalten).
      const rand = Math.random().toString(36).slice(2, 8);
      const objectPath = `${req.userId}/${Date.now()}-${rand}.${ext}`;

      const url = await uploadImageToStorage(objectPath, file.buffer, file.mimetype);
      return res.json({ success: true, url });
    } catch (e) {
      console.error("[Media] Upload failed:", e);
      const msg = e instanceof Error ? e.message : "Upload fehlgeschlagen";
      // Fehlende Storage-Konfiguration ist ein Betriebs-, kein Nutzerproblem
      const status = /nicht konfiguriert/.test(msg) ? 503 : 500;
      return res.status(status).json({ success: false, error: msg });
    }
  },
);
