/**
 * POST /api/site/details — liest Logo, Adresse und soziale Netze aus einer Website.
 *
 * Ergänzt, was der Scrape offen lässt. Gegen Ausführung 632 nachgemessen kam
 * für einen echten Betrieb address = '' zurück, und ein Logo taucht im ganzen
 * n8n-Ablauf überhaupt nicht auf. Für die Web-App eines Restaurants ist beides
 * keine Beigabe: ohne Adresse weiß niemand, wo der Betrieb liegt, ohne Logo
 * sieht jede erzeugte Seite gleich aus.
 *
 * Bewusst synchron, anders als die Speisekarten-Erkennung: Hier wird eine
 * einzige HTML-Seite geladen und ausgewertet, keine Texterkennung. Das ist in
 * ein bis zwei Sekunden durch und bleibt weit unter der 26-Sekunden-Grenze des
 * Netlify-Proxys.
 *
 * Anmeldung ist Pflicht – der Endpunkt ruft eine Adresse ab, die der Aufrufer
 * bestimmt. safeFetch begrenzt zusätzlich, wohin die Anfrage gehen darf.
 */
import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth";
import { safeFetch, SafeFetchError } from "../services/safeFetch";
import { extractSiteDetails } from "../../shared/siteDetails";
import { detectReservation } from "../../shared/reservation";

/** Eine Startseite ist selten größer; darüber ist etwas anderes verlinkt. */
const MAX_HTML_BYTES = 8 * 1024 * 1024;

const siteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Zu viele Anfragen. Bitte warte einen Moment." },
});

export const siteRouter = Router();

siteRouter.post(
  "/details",
  requireAuth,
  siteLimiter,
  async (req: Request, res: Response) => {
    const url = typeof req.body?.url === "string" ? req.body.url.trim() : "";
    if (!url) {
      return res.status(400).json({ success: false, error: 'Bitte eine "url" angeben' });
    }

    try {
      const downloaded = await safeFetch(url, {
        maxBytes: MAX_HTML_BYTES,
        timeoutMs: 15_000,
        allowedContentTypes: ["text/html", "application/xhtml"],
      });

      const html = downloaded.buffer.toString("utf8");
      // Gegen die ENDadresse auflösen: Nach einer Weiterleitung von example.de
      // auf www.example.de zeigten relative Pfade sonst ins Leere.
      const details = extractSiteDetails(html, downloaded.finalUrl);

      // Das bestehende Buchungssystem des Betriebs. Wird es gefunden,
      // verlinken wir dorthin, statt ein zweites danebenzustellen.
      const reservation = detectReservation(html, downloaded.finalUrl);

      return res.json({ success: true, details, reservation });
    } catch (err) {
      const reason =
        err instanceof SafeFetchError ? `${err.reason}: ${err.message}` : String(err);
      console.warn("[Site] Details nicht lesbar:", reason);
      // Kein Fehler für den Nutzer: Die Angaben sind eine Ergänzung, ihr Fehlen
      // darf den automatischen Modus nicht aufhalten.
      return res.json({ success: true, details: {}, reservation: null, note: reason });
    }
  },
);
