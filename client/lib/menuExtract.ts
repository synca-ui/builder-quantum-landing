import { API_PATHS } from "@/lib/apiPaths";

/**
 * Schickt eine Speisekarte (Foto oder PDF) zur Erkennung und wartet auf das
 * Ergebnis.
 *
 * Warum zweistufig: Die Erkennung dauert bei einem Foto bis zu anderthalb
 * Minuten (Texterkennung über einen Anbieter). Der Server nimmt die Datei
 * deshalb mit HTTP 202 und einer jobId an und arbeitet weiter, während die
 * Verbindung schon geschlossen ist — siehe server/routes/menu.ts. Der Client
 * fragt danach unter dieser jobId nach.
 *
 * Kein stiller Ausfall: Auch ein Lauf mit null Gerichten liefert diagnostics
 * mit dem Grund ("kein OCR-Anbieter eingerichtet", "Datei zu groß", …). Der
 * Aufrufer soll den anzeigen können, statt "hat nicht geklappt" zu melden.
 */

export interface ExtractedMenuItem {
  id: string;
  name: string;
  description?: string;
  price?: string;
  category?: string;
  /** Allergen-Kürzel, wie sie auf der Karte am Gericht stehen. */
  allergens?: string[];
  /** Ernährungs-Labels: ["vegan"], ["vegetarisch"]. */
  labels?: string[];
  /** Aufpreise und Größen, die zu diesem Gericht gehören. */
  extras?: Array<{ name: string; price?: string; allergens?: string[] }>;
}

export interface MenuExtractOutcome {
  items: ExtractedMenuItem[];
  source: string;
  diagnostics: string[];
  /**
   * Bedeutung der Kürzel an den Gerichten, wie die hochgeladene Karte sie
   * selbst angibt: { "a1": "Weizen", "f": "Milch/Laktose" }.
   * Fehlt, wenn die Karte keine Legende mitbringt — dann bleibt das Kürzel
   * roh stehen, statt geraten zu werden.
   */
  allergenLegend?: Record<string, string>;
}

/**
 * Wie lange insgesamt gewartet wird, bevor abgebrochen wird.
 *
 * Muss die GANZE Serverkette überdecken, nicht nur den langsamsten Schritt:
 * Texterkennung (bis 90 s) und danach die Strukturierung durch das Modell (bis
 * 180 s) laufen bei einer abfotografierten Karte nacheinander. Stand die Grenze
 * hier niedriger als die Summe, sah der Nutzer einen Fehler, obwohl der Auftrag
 * auf dem Server weiterlief — und lud dieselbe Datei erneut hoch. Das kostet
 * zweimal Geld und liefert dasselbe Ergebnis.
 */
const MAX_WARTEN_MS = 300_000;
/** Abstand zwischen zwei Nachfragen. */
const ABFRAGE_MS = 1_500;

const schlafen = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Liest die Antwort roh — bei einem Proxy-Fehler kommt HTML statt JSON. */
async function alsJson(res: Response): Promise<any> {
  const roh = await res.text();
  try {
    return roh ? JSON.parse(roh) : {};
  } catch {
    return { _roh: roh.slice(0, 200) };
  }
}

export async function extractMenuFromFile(
  file: File,
  token?: string | null,
  signal?: AbortSignal,
): Promise<MenuExtractOutcome> {
  const form = new FormData();
  form.append("file", file);

  const start = await fetch(API_PATHS.extractMenu, {
    method: "POST",
    body: form,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    signal,
  });
  const angenommen = await alsJson(start);

  if (!start.ok || !angenommen?.jobId) {
    throw new Error(
      angenommen?.error ||
        angenommen?._roh ||
        `Die Erkennung konnte nicht gestartet werden (HTTP ${start.status})`,
    );
  }

  const jobId = String(angenommen.jobId);
  const frist = Date.now() + MAX_WARTEN_MS;

  while (Date.now() < frist) {
    if (signal?.aborted) throw new Error("Abgebrochen");
    await schlafen(ABFRAGE_MS);

    const res = await fetch(`${API_PATHS.extractMenu}/${encodeURIComponent(jobId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal,
    });
    const stand = await alsJson(res);

    if (res.status === 404) throw new Error("Der Erkennungsauftrag ist nicht mehr auffindbar");
    if (stand?.status === "running") continue;
    if (stand?.status === "failed") {
      throw new Error(stand?.error || "Die Erkennung ist fehlgeschlagen");
    }
    if (stand?.status === "done") {
      return {
        items: Array.isArray(stand.items) ? stand.items : [],
        source: String(stand.source ?? "none"),
        diagnostics: Array.isArray(stand.diagnostics) ? stand.diagnostics : [],
        ...(stand.allergenLegend && typeof stand.allergenLegend === "object"
          ? { allergenLegend: stand.allergenLegend as Record<string, string> }
          : {}),
      };
    }
  }

  throw new Error(
    "Die Erkennung hat zu lange gedauert. Bitte versuche es mit einem kleineren Bild noch einmal.",
  );
}
