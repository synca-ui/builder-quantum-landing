/**
 * Speisekarten-Erkennung über n8n.
 *
 * Der Flow "Speisekarte OCR (Konfigurator)" (`30lCOG42bIKhc2d2`, Webhook
 * `POST /webhook/speisekarte-ocr`) bekommt Foto oder PDF und gibt Gerichte
 * zurück. Er ersetzt für den Bildweg die zweistufige Kette dieses Servers
 * (erst Texterkennung, dann Strukturierung) durch EINEN Aufruf: Gemini liest
 * die Karte und antwortet direkt im Schema.
 *
 * WARUM überhaupt n8n, wo der Server das selbst kann:
 * Der automatische Modus läuft schon vollständig über n8n. Liegt die Erkennung
 * dort, ist sie an einer Stelle einstellbar (Modell, Anweisung, Schema), jeder
 * Lauf ist in der n8n-Oberfläche einzeln nachlesbar, und ein Fehlschlag ist
 * sichtbar statt nur eine Zeile im Railway-Log.
 *
 * WARUM die eigene Kette bleibt:
 * Sie ist gemessen (7.8.2026, siehe menuStructure.ts) und kostenlos für
 * Text-PDFs. Dieser Weg wird ihr deshalb nur VORGESCHALTET, und zwar nur dort,
 * wo ohnehin bezahlte Bilderkennung nötig wäre. Liefert n8n nichts – Flow aus,
 * Netz weg, Kontingent leer –, läuft alles weiter wie bisher. Ohne gesetztes
 * N8N_MENU_WEBHOOK_URL ist dieses Modul vollständig untätig.
 *
 * Die Antwortform des Flows ist bewusst DIESELBE wie die des Anthropic-Schemas
 * (`gerichte` + `allergenLegende`), damit hier `zuGerichten()` unverändert
 * greift: eine Umformung, ein Satz Regeln für Preise, Varianten und Kürzel.
 */
import { zuGerichten } from "./menuStructure";
import type { ParsedMenuItem } from "../../shared/menuParser";

export interface N8nMenuResult {
  items: ParsedMenuItem[];
  allergenLegend?: Record<string, string>;
  /** Was unterwegs passiert ist – wandert in die diagnostics der Erkennung. */
  diagnostics: string[];
}

/** Ist der n8n-Weg eingerichtet? */
export function menuN8nConfigured(): boolean {
  return Boolean(process.env.N8N_MENU_WEBHOOK_URL);
}

/**
 * Obergrenze für den Upload zu n8n.
 *
 * n8n nimmt standardmäßig 16 MB je Anfrage an (`N8N_PAYLOAD_SIZE_MAX`), und
 * Base64 bläht die Datei um ein Drittel auf. Über dieser Grenze würde der
 * Aufruf mit HTTP 413 zurückkommen, nachdem er die Bytes einmal umsonst durchs
 * Netz geschoben hat — die eigene Kette kann große Scans ohnehin, also gar
 * nicht erst versuchen.
 *
 * Beim JEDEN Aufruf gelesen, nicht beim Laden des Moduls: Sonst hinge der Wert
 * an der Reihenfolge der Importe, und in Tests ließe er sich gar nicht setzen.
 * Dieselbe Bauart wie ocrConfigured() und menuStructureConfigured().
 */
function maxBytes(): number {
  const wert = Number(process.env.N8N_MENU_MAX_BYTES);
  return Number.isFinite(wert) && wert > 0 ? wert : 10 * 1024 * 1024;
}

/**
 * Wie lange auf n8n gewartet wird.
 *
 * Eine mehrseitige Karte braucht dort gemessen 123 Sekunden (4,2-MB-PDF,
 * 112 Gerichte, 31 Allergen-Kürzel, Stand 01.09.2026). Die Grenze muss
 * darüber liegen, aber deutlich unter der Gesamtfrist des Clients (300 s in
 * client/lib/menuExtract.ts), damit im Fehlerfall noch Zeit für die eigene
 * Kette bleibt.
 *
 * Die 180 s sind so gewählt, dass auch ein Lauf MIT Wiederholung hineinpasst:
 * Der HTTP-Knoten im Flow versucht es dreimal mit 5 s Abstand, und ein
 * Aussetzer von Gemini (503 „high demand") kommt in unter zwei Sekunden
 * zurück — ein Fehlversuch plus voller zweiter Lauf sind rund 130 s. Hängt
 * dagegen schon der erste Versuch, greift diese Grenze und die eigene Kette
 * übernimmt; genau dafür ist sie da.
 */
function timeoutMs(): number {
  const wert = Number(process.env.N8N_MENU_TIMEOUT_MS);
  return Number.isFinite(wert) && wert > 0 ? wert : 180_000;
}

/**
 * Macht aus "18,90" ein "18.90".
 *
 * Der Flow verlangt in seiner Anweisung den Punkt, aber verlassen darf man sich
 * darauf nicht: Das Speichern der Konfiguration prüft `price` mit
 * `z.coerce.number().positive()`. Aus "18,90" wird dabei NaN, und dann
 * scheitert das Speichern der GANZEN Konfiguration mit HTTP 400, während die
 * Oberfläche "Gespeichert" meldet — derselbe Fehler, der am 7.8.2026 schon
 * einmal an leeren Preisen hing. Ein Komma aus einem fremden Modell darf das
 * nicht auslösen.
 *
 * Nur der Trenner wird angefasst. Was nicht wie ein Preis aussieht, bleibt
 * unverändert stehen, statt zurechtgebogen zu werden.
 */
function preisMitPunkt(preis: string | undefined): string | undefined {
  if (!preis) return preis;
  const passt = /^(\d+),(\d{1,2})$/.exec(preis.trim());
  return passt ? `${passt[1]}.${passt[2]}` : preis;
}

interface N8nAntwort {
  ok?: unknown;
  gerichte?: unknown;
  allergenLegende?: unknown;
  diagnostics?: unknown;
  fehler?: unknown;
}

/**
 * Schickt die Datei an n8n und formt die Antwort um.
 *
 * Wirft NIE. Jeder Fehlschlag ist ein `null` plus eine Zeile in `diagnostics`
 * des Aufrufers — der Weg ist eine Abkürzung, kein Nadelöhr.
 */
export async function extractMenuViaN8n(
  buffer: Buffer,
  mimeType: string,
  dateiname = "speisekarte",
): Promise<N8nMenuResult | null> {
  const url = process.env.N8N_MENU_WEBHOOK_URL;
  if (!url) return null;

  const grenze = maxBytes();
  if (buffer.length > grenze) {
    return {
      items: [],
      diagnostics: [
        `n8n übersprungen: ${Math.round(buffer.length / 1024 / 1024)} MB überschreiten die Grenze von ${Math.round(grenze / 1024 / 1024)} MB`,
      ],
    };
  }

  const frist = timeoutMs();
  const abbruch = new AbortController();
  const wecker = setTimeout(() => abbruch.abort(), frist);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dateiname,
        mimeType,
        base64: buffer.toString("base64"),
        ...(process.env.N8N_MENU_MODEL ? { modell: process.env.N8N_MENU_MODEL } : {}),
        // Ausweis gegenüber dem Flow. Der n8n-Webhook ist öffentlich
        // erreichbar und jeder Lauf kostet Gemini-Kontingent; steht drüben
        // MENU_OCR_TOKEN, lehnt der Flow alles ohne passenden Wert ab. Fehlt
        // die Variable hier, wird nichts mitgeschickt — dann muss sie auch
        // drüben fehlen, sonst weist der Flow uns selbst ab.
        ...(process.env.N8N_MENU_TOKEN ? { token: process.env.N8N_MENU_TOKEN } : {}),
      }),
      signal: abbruch.signal,
    });

    // Der Flow antwortet absichtlich immer mit 200 und ok:true/false. Ein
    // anderer Status heißt: die Anfrage kam gar nicht bei ihm an (Flow nicht
    // aktiv, falscher Pfad, Proxy davor). Der Rohtext ist dann die einzige
    // brauchbare Spur.
    const roh = await res.text();
    if (!res.ok) {
      return {
        items: [],
        diagnostics: [`n8n antwortete HTTP ${res.status}: ${roh.slice(0, 200)}`],
      };
    }

    let antwort: N8nAntwort;
    try {
      antwort = JSON.parse(roh) as N8nAntwort;
    } catch {
      return {
        items: [],
        diagnostics: [`n8n antwortete kein JSON: ${roh.slice(0, 200)}`],
      };
    }

    const diagnostics = Array.isArray(antwort.diagnostics)
      ? antwort.diagnostics.filter((d): d is string => typeof d === "string")
      : [];

    /**
     * Abgewiesen am Tor.
     *
     * Der Webhook prüft in `onlyRunIf`, ob `token` stimmt. Passt er nicht,
     * entsteht gar keine Ausführung: n8n antwortet mit HTTP 200 und
     * `{"message":"Webhook call received"}` — kein `ok`, keine `diagnostics`.
     *
     * Das MUSS hier einen eigenen Zweig haben. Sonst sähe ein falsch gesetztes
     * N8N_MENU_TOKEN exakt so aus wie eine unlesbare Karte, und man suchte den
     * Fehler beim Foto des Wirts statt in der Umgebungsvariablen.
     */
    if (antwort.ok === undefined && typeof (antwort as { message?: unknown }).message === "string") {
      return {
        items: [],
        diagnostics: [
          ...diagnostics,
          "n8n hat den Aufruf abgewiesen, ohne ihn auszuführen — stimmt N8N_MENU_TOKEN mit dem Wert im Webhook überein?",
        ],
      };
    }

    if (antwort.ok !== true) {
      if (typeof antwort.fehler === "string" && antwort.fehler) {
        diagnostics.push(`n8n: ${antwort.fehler}`);
      }
      return { items: [], diagnostics };
    }

    // Dieselbe Umformung wie beim eigenen Modellaufruf: Varianten als extras
    // ans Hauptgericht, Kürzel kleingeschrieben.
    const { items, allergenLegend } = zuGerichten(
      { gerichte: antwort.gerichte, allergenLegende: antwort.allergenLegende },
      "n8n",
    );

    // Den Dezimaltrenner übernimmt zuGerichten NICHT — dort verlässt sich alles
    // auf die Anweisung an das eigene Modell. Bei einer fremden Antwort ist das
    // eine Annahme zu viel, siehe preisMitPunkt().
    for (const gericht of items) {
      gericht.price = preisMitPunkt(gericht.price);
      for (const extra of gericht.extras ?? []) {
        extra.price = preisMitPunkt(extra.price);
      }
    }

    return {
      items,
      diagnostics,
      ...(allergenLegend ? { allergenLegend } : {}),
    };
  } catch (err) {
    const grund =
      err instanceof Error && err.name === "AbortError"
        ? `n8n antwortete nicht innerhalb von ${Math.round(frist / 1000)} s`
        : `n8n nicht erreichbar (${String(err)})`;
    return { items: [], diagnostics: [grund] };
  } finally {
    clearTimeout(wecker);
  }
}
