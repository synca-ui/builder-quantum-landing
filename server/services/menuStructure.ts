/**
 * Strukturiert ausgelesenen Speisekartentext zu einzelnen Gerichten – mit einem
 * Sprachmodell statt mit Regeln.
 *
 * WARUM es das gibt, obwohl shared/menuParser.ts dasselbe versucht:
 *
 * Am 7.8.2026 auf der Prüfmenge gemessen (13 echte Karten, gegen die nie
 * optimiert wurde), beide gegen dieselben Sollwerte:
 *
 *              gefunden   erfunden   Varianten falsch   Kennzeichnung
 *   Regeln       54 %       39 %        71/122               9 %
 *   Haiku 4.5    98 %        1 %        31/122             101 %
 *   Sonnet 5     99 %        2 %        53/122             100 %
 *
 * Sonnet kostet das Doppelte für einen Prozentpunkt und ordnet Varianten
 * schlechter zu – deshalb Haiku.
 *
 * Gegen den naheliegenden Verdacht, hier stimme nur ein Modell einem Modell zu
 * (die Sollwerte stammen selbst von Agenten), wurde unabhängig am Rohtext
 * nachgezählt: 121 von 121 Gerichtnamen der Kreta-Karte stehen wörtlich im
 * ausgelesenen Text, und 952 von 952 Preisen stimmen zeichengleich. Wo kein
 * Preis dasteht, bleibt er leer (130-mal) statt geraten zu werden.
 *
 * Ein Zwischenweg "Regeln zuerst, Modell nur bei Fehlschlag" wurde geprüft und
 * verworfen: menuQuality().usable prüft nur, ob drei Preise da sind, und ließ
 * ALLE 14 Karten durch – auch die, auf der die Regeln 8 von 118 Gerichten
 * finden. Die Regeln merken ihr eigenes Scheitern nicht.
 *
 * Die Regeln bleiben trotzdem: als Rückfall, wenn kein Schlüssel gesetzt ist
 * oder der Aufruf scheitert. Eine halb erkannte Karte ist besser als gar keine.
 *
 * Kosten: rund 0,03 US-Dollar je Karte (⌀ 4.100 Token rein, 4.500 raus).
 * Umgebungsvariable: ANTHROPIC_API_KEY.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { ParsedMenuItem } from "../../shared/menuParser";

/**
 * Haiku, nicht Opus: gemessen gleichwertig bei einem Fünftel des Preises.
 * Über MENU_STRUCTURE_MODEL umstellbar, falls eine Kartenart auffällt.
 */
const MODEL = process.env.MENU_STRUCTURE_MODEL || "claude-haiku-4-5";

/**
 * Eine große Karte (Taj: 182 Gerichte) braucht rund 10.000 Token Ausgabe.
 * Das Doppelte als Reserve – wird die Grenze erreicht, bricht das JSON mitten
 * im Gericht ab und die ganze Karte ist verloren.
 */
const MAX_TOKENS = 24_000;

/**
 * Ab dieser Textlänge lohnt der Aufruf nicht: Darunter liegt kein Kartentext,
 * sondern eine Fehlerseite oder ein leeres PDF.
 */
const MIN_ZEICHEN = 40;

/**
 * Obergrenze für den Eingabetext. Eine Speisekarte ist selten länger als
 * 60.000 Zeichen; darüber ist etwas anderes ausgelesen worden (eine ganze
 * Website, ein Katalog), und der Aufruf würde teuer, ohne besser zu werden.
 */
const MAX_ZEICHEN = 120_000;

export function menuStructureConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Das Schema ist der eigentliche Auftrag. Jede Beschreibung darin ist eine
 * Regel, an der echte Karten gescheitert sind – nicht Zierrat.
 *
 * ZWEI EINSCHRÄNKUNGEN der Structured Outputs, die hier die Form bestimmen und
 * die man nicht sieht, wenn man das Schema nur liest:
 *
 *  1. `additionalProperties` darf ausschließlich `false` sein. Eine offene
 *     Abbildung {"a1":"Weizen"} — der naheliegende Aufbau für eine Legende —
 *     ist damit verboten und lässt JEDEN Aufruf mit HTTP 400 scheitern. Die
 *     Legende ist deshalb eine LISTE von Paaren.
 *  2. Jede Eigenschaft steht in `required`. Für "kein Wert" gibt es den
 *     Leerstring bzw. die leere Liste; das ist ausdrücklich so im Text
 *     beschrieben, damit das Modell nichts erfindet, nur um ein Feld zu füllen.
 *
 * Beides ist NICHT dasselbe wie bei einem Werkzeug-Schema: Als Werkzeug lief
 * genau diese Struktur in der Messung durch, als output_config.format nicht.
 */
export const SCHEMA = {
  type: "object",
  required: ["gerichte", "allergenLegende"],
  additionalProperties: false,
  properties: {
    allergenLegende: {
      type: "array",
      description:
        'Die Legende, so wie DIESE Karte sie druckt. LEERE LISTE, wenn die Karte keine Legende hat — niemals eine allgemeine Tabelle erfinden, denn "f" bedeutet auf jeder Karte etwas anderes.',
      items: {
        type: "object",
        required: ["kuerzel", "bedeutung"],
        additionalProperties: false,
        properties: {
          kuerzel: { type: "string", description: 'Das Kürzel, z.B. "a1" oder "g".' },
          bedeutung: { type: "string", description: 'Was es laut Karte bedeutet, z.B. "Weizen".' },
        },
      },
    },
    gerichte: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "preis", "kategorie", "variante_von", "beschreibung", "allergene"],
        additionalProperties: false,
        properties: {
          name: {
            type: "string",
            description:
              "Gerichtname, ohne Preis und ohne Beschreibung. Über mehrere Zeilen umbrochene Namen wieder zusammensetzen.",
          },
          preis: {
            type: "string",
            description:
              'Punkt als Dezimaltrenner, z.B. "18.90". LEERSTRING, wenn kein Preis dabeisteht — niemals einen erfinden.',
          },
          kategorie: {
            type: "string",
            description:
              'Die Rubrik, unter der das Gericht auf der Karte steht — mit den Worten der Karte ("Aus dem Suppentopf"), nicht mit einem erfundenen Oberbegriff. Leerstring, wenn es keine gibt.',
          },
          variante_von: {
            type: "string",
            description:
              'Name des Hauptgerichts, wenn diese Zeile nur ein Aufpreis, eine Größe oder eine Abwandlung ist ("groß", "Tasse", "mit extra Käse", "dazu Salat +4,50"). Sonst LEERSTRING.',
          },
          beschreibung: {
            type: "string",
            description:
              'Beilagen- und Zutatenzeilen ("dazu Kartoffelsalat") gehören hierher, nicht in den Namen. Leerstring, wenn keine dasteht.',
          },
          allergene: {
            type: "array",
            items: { type: "string" },
            description:
              'Die Kürzel, wie sie am Gericht stehen: ["a1","f"]. Einen zusammengeschriebenen Block ("agr") in einzelne Kürzel zerlegen. LEERE LISTE, wenn keine dastehen.',
          },
        },
      },
    },
  },
} as const;

const ANWEISUNG = [
  "Der folgende Text ist die ausgelesene Speisekarte eines deutschen Restaurants,",
  "so wie ein PDF-Leser oder ein HTML-Textschäler sie liefert. Er ist unordentlich.",
  "Strukturiere ihn zu einer Speisekarte.",
  "",
  "Worauf es ankommt, weil echte Karten genau daran scheitern:",
  "- Ein Gerichtname kann über ZWEI BIS FÜNF Zeilen umbrochen sein; der Preis steht dann oft ganz am Ende. Setz den Namen wieder zusammen.",
  "- Der Preis steht manchmal ALLEIN in seiner Zeile. Er gehört zum Gericht darüber.",
  '- Beilagenzeilen ("dazu Kartoffelsalat", "mit Pommes und Salat") sind BESCHREIBUNGEN, weder Gericht noch Rubrik.',
  '- Aufpreise und Größen ("Käse + 1,20", "groß", "Tasse") sind VARIANTEN des Gerichts darüber, keine eigenen Gerichte.',
  '- Ein Gerichtname kann ein Rubrikwort enthalten ("Zwiebelsuppe", "Rumpsteak") — das macht ihn nicht zur Rubrik.',
  "- Der Betriebsname und Seitenköpfe wiederholen sich auf jeder Seite und sind keine Rubriken.",
  "- Ein Mittagstisch nach Wochentagen hat Gerichte OHNE eigenen Preis. Nimm sie trotzdem auf, Preis leer.",
  '- Allergen-Kürzel stehen in vielen Formen: "(a1, f)", "a, g" am Zeilenende, "Allergene: C, D, G", oder mitten in der Zeile "2,4,11,i,g".',
  "",
  "Erfinde nichts. Steht kein Preis da, lass ihn leer. Steht keine Kennzeichnung da, lass das Feld leer.",
  "Gib die VOLLSTÄNDIGE Karte zurück, auch wenn sie lang ist.",
].join("\n");

export interface StructureResult {
  items: ParsedMenuItem[];
  allergenLegend?: Record<string, string>;
  /** Für das Protokoll: welches Modell, wie viele Token. */
  hinweis: string;
}

interface RohGericht {
  name?: unknown;
  preis?: unknown;
  kategorie?: unknown;
  variante_von?: unknown;
  beschreibung?: unknown;
  allergene?: unknown;
}

const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/**
 * Formt die Modellantwort in unsere Gerichte um.
 *
 * Getrennt und exportiert, damit die Umformung ohne Netz prüfbar ist — der
 * Aufruf selbst ist es nicht.
 */
export function zuGerichten(
  roh: unknown,
  idPrefix: string,
): { items: ParsedMenuItem[]; allergenLegend?: Record<string, string> } {
  const daten = roh as {
    gerichte?: unknown;
    /** Neue Form: Liste von Paaren (siehe SCHEMA). */
    allergenLegende?: unknown;
    /** Alte Form: offene Abbildung. Bleibt lesbar, siehe leseLegende. */
    allergenLegend?: unknown;
  };
  const liste = Array.isArray(daten?.gerichte) ? (daten.gerichte as RohGericht[]) : [];

  const items: ParsedMenuItem[] = [];
  for (const g of liste) {
    const name = text(g?.name);
    if (!name) continue;

    // Varianten sind keine eigenen Gerichte. Sie hängen als extras am
    // Hauptgericht — genau die Unterscheidung, an der die Regeln scheitern.
    const varianteVon = text(g?.variante_von);
    if (varianteVon) {
      const haupt = items.find((i) => i.name === varianteVon);
      if (haupt) {
        const preis = text(g?.preis);
        (haupt.extras ??= []).push({
          name,
          ...(preis ? { price: preis } : {}),
          ...(kuerzel(g?.allergene).length ? { allergens: kuerzel(g?.allergene) } : {}),
        });
        continue;
      }
      // Kein Hauptgericht gefunden – lieber als eigenes Gericht behalten als
      // stillschweigend wegwerfen.
    }

    const preis = text(g?.preis);
    const kategorie = text(g?.kategorie);
    const beschreibung = text(g?.beschreibung);
    const allergene = kuerzel(g?.allergene);

    items.push({
      id: `${idPrefix}-${items.length + 1}`,
      name,
      ...(preis ? { price: preis } : {}),
      ...(kategorie ? { category: kategorie } : {}),
      ...(beschreibung ? { description: beschreibung } : {}),
      ...(allergene.length ? { allergens: allergene } : {}),
    });
  }

  const legende =
    leseLegende(daten?.allergenLegende) ?? leseLegende(daten?.allergenLegend);
  return { items, ...(legende ? { allergenLegend: legende } : {}) };
}

/** Kürzel vereinheitlichen: kleingeschrieben, ohne Leerzeichen, ohne Dubletten. */
function kuerzel(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const raus: string[] = [];
  for (const e of v) {
    const k = text(e).toLowerCase().replace(/[^a-z0-9]/g, "");
    if (k && !raus.includes(k)) raus.push(k);
  }
  return raus;
}

/**
 * Macht aus der Paar-Liste des Modells die Abbildung, die der Rest der Anwendung
 * erwartet.
 *
 * Nimmt auch die alte Objektform an: Ältere Antworten und die Messläufe vom
 * 7.8.2026 liefern {"a1":"Weizen"}, und ein Formwechsel im Schema soll keine
 * gespeicherten Ergebnisse unlesbar machen.
 */
function leseLegende(v: unknown): Record<string, string> | undefined {
  if (!v || typeof v !== "object") return undefined;
  const raus: Record<string, string> = {};

  if (Array.isArray(v)) {
    for (const eintrag of v) {
      const k = text((eintrag as { kuerzel?: unknown })?.kuerzel).toLowerCase();
      const w = text((eintrag as { bedeutung?: unknown })?.bedeutung);
      if (k && w) raus[k] = w;
    }
  } else {
    for (const [k, w] of Object.entries(v as Record<string, unknown>)) {
      const schluessel = k.trim().toLowerCase();
      const wert = text(w);
      if (schluessel && wert) raus[schluessel] = wert;
    }
  }

  return Object.keys(raus).length ? raus : undefined;
}

/**
 * Schickt den Kartentext an das Modell. Wirft, wenn nichts Brauchbares kommt –
 * der Aufrufer fällt dann auf die Regeln zurück.
 */
export async function structureMenuText(
  kartentext: string,
  options: { idPrefix?: string; timeoutMs?: number } = {},
): Promise<StructureResult> {
  if (!menuStructureConfigured()) {
    throw new Error("ANTHROPIC_API_KEY nicht gesetzt");
  }
  const gekuerzt = kartentext.slice(0, MAX_ZEICHEN);
  if (gekuerzt.trim().length < MIN_ZEICHEN) {
    throw new Error(`Zu wenig Text zum Strukturieren (${gekuerzt.trim().length} Zeichen)`);
  }

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: options.timeoutMs ?? 180_000,
    /**
     * KEINE stillen Wiederholungen. Die Vorgabe des SDK ist 2, und
     * Zeitüberschreitungen werden mitgezählt: Eine große Karte, die knapp über
     * die Grenze läuft, würde dreimal vollständig erzeugt, dreimal bezahlt und
     * am Ende doch weggeworfen. Einmal versuchen, sonst auf die Regeln
     * zurückfallen – das kostet Qualität, aber nicht das Dreifache.
     */
    maxRetries: 0,
  });

  /**
   * Strömend, nicht als eine Antwort: Bei MAX_TOKENS in dieser Größenordnung
   * läuft eine gewöhnliche Anfrage in die HTTP-Zeitgrenze, bevor das Modell
   * fertig ist – und zwar genau bei den langen Karten, für die sich der Aufruf
   * überhaupt lohnt.
   */
  const message = await client.messages
    .stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      output_config: {
        format: { type: "json_schema", schema: SCHEMA as unknown as Record<string, unknown> },
      },
      messages: [{ role: "user", content: `${ANWEISUNG}\n\n---\n\n${gekuerzt}` }],
    })
    .finalMessage();

  // Sicherheitsklassifizierer können ablehnen; dann ist content leer.
  if ((message as { stop_reason?: string }).stop_reason === "refusal") {
    throw new Error("Anfrage wurde abgelehnt");
  }

  const roh = jsonAusAntwort(message);
  const { items, allergenLegend } = zuGerichten(roh, options.idPrefix ?? "ki");
  if (!items.length) throw new Error("Modell lieferte kein einziges Gericht");

  const u = (message as { usage?: { input_tokens?: number; output_tokens?: number } }).usage;
  const abgeschnitten =
    (message as { stop_reason?: string }).stop_reason === "max_tokens"
      ? " – ACHTUNG: an der Token-Grenze abgeschnitten, Karte womöglich unvollständig"
      : "";

  return {
    items,
    ...(allergenLegend ? { allergenLegend } : {}),
    hinweis:
      `${MODEL}: ${items.length} Gerichte aus ${gekuerzt.length} Zeichen ` +
      `(${u?.input_tokens ?? 0} Token rein, ${u?.output_tokens ?? 0} raus)${abgeschnitten}`,
  };
}

/**
 * Holt das JSON aus der Antwort.
 *
 * Bevorzugt das vom SDK geparste Feld; fällt sonst auf den Textblock zurück.
 * Getrennt und exportiert, damit beide Wege ohne Netz prüfbar sind.
 */
export function jsonAusAntwort(message: unknown): unknown {
  const m = message as { parsed_output?: unknown; content?: unknown };
  if (m?.parsed_output && typeof m.parsed_output === "object") return m.parsed_output;

  const content = Array.isArray(m?.content) ? m.content : [];
  const roh = content
    .map((b: any) => (b?.type === "text" && typeof b.text === "string" ? b.text : ""))
    .join("")
    .trim();
  if (!roh) throw new Error("Antwort ohne Inhalt");
  try {
    return JSON.parse(roh);
  } catch {
    throw new Error(`Antwort war kein JSON: ${roh.slice(0, 120)}`);
  }
}
