import type { Request, Response } from "express";
import { z } from "zod";
import { assertUrlAllowed, SafeFetchError } from "../services/safeFetch";

/**
 * Weiterleitung an den n8n-Entry-Flow.
 *
 * WARUM DIESER ENDPUNKT OEFFENTLICH BLEIBT
 *
 * Naheliegend waere `requireAuth`. Das haette aber den Haupteinstieg
 * zerschlagen: Alle drei Aufrufer - `client/pages/Index.tsx` (die Landingpage),
 * `client/pages/CheckLanding.tsx` und `client/pages/ModeSelection.tsx` - laufen
 * VOR der Registrierung. Genau das ist der Zweck: Ein Interessent traegt seine
 * Website ein und bekommt eine fertige Vorschau zu sehen, bevor er ein Konto
 * anlegt. Eine Anmeldeschranke davor entfernt keinen Missbrauch, sondern den
 * Trichter.
 *
 * WAS STATTDESSEN VERSCHLOSSEN WURDE
 *
 * ANLASS: Der Handler nahm `req.body` unbesehen entgegen und schickte ihn
 * unveraendert an n8n. Zwei Loecher auf einmal:
 *
 *   1. SSRF, einen Rechner weiter. `server/services/safeFetch.ts` schuetzt den
 *      Node-Prozess sehr gruendlich - aber der Deep-Scrape-Flow in n8n macht
 *      SEINE EIGENEN HTTP-Anfragen gegen `link`, ohne jede dieser Schranken.
 *      Ein `link` auf `http://169.254.169.254/…` oder in das interne
 *      Railway-Netz umging den Schutz also schlicht dadurch, dass die Anfrage
 *      woanders ausgefuehrt wurde. Die Grenze lag nie am Prozess, sondern an
 *      der Adresse - deshalb wird sie jetzt HIER geprueft, bevor der Wert das
 *      Haus verlaesst.
 *
 *   2. Freie Feldwahl. Was der Aufrufer schickte, sah der Flow. Die Besitzkette
 *      haengt daran, dass n8n keine `userId` gesetzt bekommt; ein
 *      durchgereichtes Feld dieses Namens war bis hierher nicht ausgeschlossen.
 *      Das Schema unten ist deshalb geschlossen (kein `passthrough`): Was nicht
 *      dasteht, geht nicht durch.
 *
 * Die Drossel (`strictLimiter`) bleibt vorgeschaltet in `server/index.ts`.
 */

/**
 * Geschlossenes Schema - `z.object` verwirft unbekannte Schluessel
 * stillschweigend, statt sie weiterzureichen. Beide Felder entsprechen dem,
 * was die drei Aufrufer heute senden.
 */
const weiterleitungSchema = z.object({
  link: z.string().trim().url().max(2048),
  timestamp: z.string().datetime().optional(),
});

export async function handleForwardN8n(req: Request, res: Response) {
  // Variable IM Handler lesen, um immer den aktuellsten Wert aus Railway zu haben
  const N8N_URL = process.env.N8N_WEBHOOK_URL;

  if (!N8N_URL) {
    console.error("❌ N8N_WEBHOOK_URL ist in Railway nicht definiert!");
    return res.status(500).json({
      error: "n8n webhook not configured",
    });
  }

  const geprueft = weiterleitungSchema.safeParse(req.body);
  if (!geprueft.success) {
    return res.status(400).json({ error: "Ungültige Adresse" });
  }

  // Dieselbe Bewertung, die auch `safeFetch` vornimmt: nur http/https, keine
  // Zugangsdaten in der Adresse, und JEDE aufgeloeste IP gegen die privaten
  // Bereiche geprueft (inkl. 169.254.169.254 und IPv4-in-IPv6). Der Rueckgabewert
  // ist die normalisierte Adresse - ab hier wird nur noch diese benutzt.
  let adresse: URL;
  try {
    adresse = await assertUrlAllowed(geprueft.data.link);
  } catch (err) {
    if (err instanceof SafeFetchError) {
      // Dem Aufrufer NICHT verraten, woran es lag: "löst auf 10.0.0.5 auf" ist
      // eine Auskunft ueber das interne Netz. Der Grund steht im Log.
      console.warn(
        `[n8n-Proxy] Adresse abgewiesen (${err.reason}): ${geprueft.data.link}`,
      );
      return res.status(400).json({ error: "Diese Adresse ist nicht erlaubt." });
    }
    throw err;
  }

  try {
    console.log(`📤 Weiterleitung an n8n: ${N8N_URL}`);

    const resp = await fetch(N8N_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Ausschliesslich die geprueften Felder, und `link` in der normalisierten
      // Form aus `assertUrlAllowed` - nicht der Rohwert aus der Anfrage.
      body: JSON.stringify({
        link: adresse.toString(),
        timestamp: geprueft.data.timestamp,
      }),
    });

    const text = await resp.text();

    if (!resp.ok) {
      // Wenn hier 404 kommt, ist der Workflow in n8n nicht "Active" oder der Pfad falsch.
      // Die Antwort von n8n gehoert ins Log, NICHT an den Aufrufer: Sie nennt
      // Workflow-Namen, Knoten und teils interne Adressen. Vorher ging sie per
      // `res.send(text)` unveraendert nach draussen.
      console.error(`⚠️ n8n antwortete mit Status ${resp.status}:`, text);
      return res.status(502).json({ error: "Analyse derzeit nicht verfügbar." });
    }

    try {
      const json = JSON.parse(text);
      return res.json({ success: true, response: json });
    } catch (e) {
      return res.json({ success: true, response: text });
    }
  } catch (error) {
    console.error("❌ Kritischer Proxy-Fehler:", error);
    return res
      .status(500)
      .json({ error: "Proxy failed" });
  }
}
