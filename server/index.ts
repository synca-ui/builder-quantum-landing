import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { apiRouter } from "./routes";

// Diese Middleware fängt Anfragen ab und behebt das Buffer-Problem in Netlify.
const rawBodyMiddleware = (req: any, _res: any, next: any) => {
  // === DIE FINALE KORREKTUR ===
  // Wir prüfen, ob der Body ein Buffer ist, und wandeln ihn um.
  // Buffer.isBuffer() ist der korrekte Weg, dies zu tun.
  if (Buffer.isBuffer(req.body)) {
    try {
      req.body = JSON.parse(req.body.toString());
    } catch (e) {
      console.error("Fehler beim Parsen des Buffer-Bodys:", e);
      req.body = {}; // Fallback auf ein leeres Objekt bei Fehlern
    }
  }
  next();
};

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(rawBodyMiddleware); // Repariert den Body von Netlify

  // Body-Parser für die lokale Entwicklung
  if (process.env.NODE_ENV !== 'production') {
    app.use(express.json({ limit: "25mb" }));
  }

  // API-Routen
  app.use("/api", apiRouter);

  // Statische Dateien für die Produktion
  if (process.env.NODE_ENV === "production") {
    const clientDistPath = path.join(__dirname, "../../client/dist");
    app.use(express.static(clientDistPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(clientDistPath, "index.html"));
    });
  }

  return app;
}
