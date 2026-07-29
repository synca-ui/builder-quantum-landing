/**
 * Erkennt eine Speisekarte – aus einer Adresse oder aus einer hochgeladenen
 * Datei – und liefert einzelne Gerichte.
 *
 * Das ist der wichtigste Schritt des automatischen Modus. Ohne Karte ist die
 * erzeugte Web-App für ein Restaurant weitgehend wertlos; alles andere (Name,
 * Farben, Öffnungszeiten) ist Beiwerk.
 *
 * Drei Quellen, drei Wege:
 *   HTML  -> erst strukturierte Daten (schema.org/Menu), sonst Text schälen
 *   Bild  -> Gemini-Texterkennung
 *   PDF   -> erst der eingebettete Text (kostenlos und genau), und nur wenn der
 *            nichts hergibt, Gemini. Viele Karten sind abfotografiert und
 *            enthalten gar keinen Text – dann führt nur die Erkennung zum Ziel.
 */
import { parseMenuText, menuQuality, type ParsedMenuItem } from "../../shared/menuParser";
import { safeFetch, SafeFetchError } from "./safeFetch";
import { transcribeDocument, geminiConfigured, MAX_DOCUMENT_BYTES } from "./gemini";

export type MenuSource =
  | "html_jsonld"
  | "html_text"
  | "pdf_text"
  | "pdf_ocr"
  | "image_ocr"
  | "none";

export interface MenuExtractionResult {
  items: ParsedMenuItem[];
  source: MenuSource;
  /** Für die Fehlersuche und die Anzeige: was ist tatsächlich passiert. */
  diagnostics: string[];
}

/** Speisekarten sind selten größer; darüber ist etwas anderes verlinkt. */
const MAX_MENU_BYTES = MAX_DOCUMENT_BYTES;

const ALLOWED_CONTENT_TYPES = [
  "text/html",
  "application/xhtml",
  "application/pdf",
  "image/",
  "text/plain",
];

/**
 * Der Content-Type ist nicht verlässlich – manche Server liefern PDFs als
 * application/octet-stream. Deshalb zusätzlich an den ersten Bytes erkennen.
 */
export function sniffType(
  buffer: Buffer,
  contentType: string,
): "pdf" | "image" | "html" | "unknown" {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString("latin1") === "%PDF-") {
    return "pdf";
  }
  // JPEG FF D8 FF | PNG 89 50 4E 47 | GIF 47 49 46 | WEBP "RIFF"…"WEBP" | BMP "BM"
  const head = buffer.subarray(0, 12);
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "image";
  if (head[0] === 0x89 && head.subarray(1, 4).toString("latin1") === "PNG") return "image";
  if (head.subarray(0, 3).toString("latin1") === "GIF") return "image";
  if (
    head.subarray(0, 4).toString("latin1") === "RIFF" &&
    head.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return "image";
  }

  if (contentType.startsWith("application/pdf")) return "pdf";
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("text/html") || contentType.startsWith("application/xhtml")) {
    return "html";
  }
  // Sieht der Anfang nach Markup aus, ist es HTML – auch ohne passenden Kopf.
  if (/^\s*(<!doctype html|<html|<\?xml)/i.test(buffer.subarray(0, 200).toString("utf8"))) {
    return "html";
  }
  return "unknown";
}

/**
 * Zieht Gerichte aus schema.org/Menu-Daten im HTML.
 *
 * Das ist der mit Abstand beste Weg, wenn er greift: Namen, Beschreibungen,
 * Preise und Kategorien stehen dort bereits getrennt, nichts muss geraten
 * werden. WordPress-Restaurantthemes liefern das häufig mit.
 */
export function parseJsonLdMenu(html: string): ParsedMenuItem[] {
  const items: ParsedMenuItem[] = [];
  const seen = new Set<string>();
  const blocks = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );

  const pushItem = (name: string, category: string, entry: any) => {
    const clean = String(name).trim();
    if (!clean) return;
    const key = clean.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const offers = Array.isArray(entry?.offers) ? entry.offers[0] : entry?.offers;
    const price = offers?.price ?? offers?.lowPrice;
    const item: ParsedMenuItem = {
      id: `jsonld-${items.length}-${key.replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "item"}`,
      name: clean,
      category,
    };
    if (entry?.description) item.description = String(entry.description).trim();
    if (price !== undefined && price !== null && price !== "") {
      item.price = String(price).replace(",", ".");
    }
    items.push(item);
  };

  const walkMenu = (menu: any) => {
    const sections = menu?.hasMenuSection;
    for (const section of Array.isArray(sections) ? sections : sections ? [sections] : []) {
      const category = String(section?.name || "Hauptgerichte").trim();
      const entries = section?.hasMenuItem;
      for (const entry of Array.isArray(entries) ? entries : entries ? [entries] : []) {
        if (entry?.name) pushItem(entry.name, category, entry);
      }
      // Unterabschnitte kommen vor: "Getränke" -> "Weine" -> Positionen.
      if (section?.hasMenuSection) walkMenu(section);
    }
    const direct = menu?.hasMenuItem;
    for (const entry of Array.isArray(direct) ? direct : direct ? [direct] : []) {
      if (entry?.name) pushItem(entry.name, "Hauptgerichte", entry);
    }
  };

  for (const block of blocks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(block[1].trim());
    } catch {
      continue;
    }
    // @graph, Arrays und Einzelobjekte kommen alle vor.
    const candidates: any[] = [];
    const collect = (node: any) => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) return node.forEach(collect);
      candidates.push(node);
      if (Array.isArray(node["@graph"])) node["@graph"].forEach(collect);
      if (node.hasMenu) collect(node.hasMenu);
    };
    collect(parsed);

    for (const node of candidates) {
      const type = node?.["@type"];
      const types = Array.isArray(type) ? type : [type];
      if (types.includes("Menu")) walkMenu(node);
    }
  }

  return items;
}

/** Entfernt Markup und macht aus dem Rest zeilenweisen Text. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    // Blockelemente werden zu Zeilenumbrüchen, sonst klebt die ganze Karte
    // in einer Zeile und der Parser findet keine Struktur mehr.
    .replace(/<\/?(br|p|div|li|tr|h[1-6]|section|article|td)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&auml;/gi, "ä")
    .replace(/&ouml;/gi, "ö")
    .replace(/&uuml;/gi, "ü")
    .replace(/&Auml;/g, "Ä")
    .replace(/&Ouml;/g, "Ö")
    .replace(/&Uuml;/g, "Ü")
    .replace(/&szlig;/gi, "ß")
    .replace(/&euro;/gi, "€")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n\s*\n\s*/g, "\n")
    .trim();
}

/**
 * Holt den eingebetteten Text aus einem PDF, ohne fremde Bibliothek.
 *
 * Bewusst schlicht: Es geht nur um die Frage, ob überhaupt Text drinsteckt.
 * Liefert das zu wenig, übernimmt die Texterkennung – und die ist bei
 * abfotografierten Karten ohnehin der einzige Weg.
 *
 * Nur unkomprimierte Textblöcke werden gelesen (FlateDecode bräuchte zlib über
 * dem ganzen Objektbaum). Das ist Absicht: ein halbgares Ergebnis wäre
 * schlimmer als gar keines, weil dann die Erkennung übersprungen würde.
 */
export function extractPdfText(pdf: Buffer): string {
  const raw = pdf.toString("latin1");
  const chunks: string[] = [];

  for (const block of raw.matchAll(/BT([\s\S]*?)ET/g)) {
    const content = block[1];
    for (const m of content.matchAll(/\(((?:\\.|[^\\()])*)\)\s*Tj/g)) {
      chunks.push(m[1]);
    }
    for (const m of content.matchAll(/\[((?:[^\]\\]|\\.)*)\]\s*TJ/g)) {
      const parts = [...m[1].matchAll(/\(((?:\\.|[^\\()])*)\)/g)].map((p) => p[1]);
      if (parts.length) chunks.push(parts.join(""));
    }
    chunks.push("\n");
  }

  return chunks
    .join(" ")
    .replace(/\\([nr])/g, "\n")
    .replace(/\\([0-7]{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\(.)/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/** Erkennt eine Karte aus bereits vorliegenden Bytes. */
export async function extractMenuFromBuffer(
  buffer: Buffer,
  contentType: string,
): Promise<MenuExtractionResult> {
  const diagnostics: string[] = [];
  const kind = sniffType(buffer, contentType);
  diagnostics.push(`Typ erkannt: ${kind} (${contentType}, ${buffer.length} Bytes)`);

  if (kind === "html") {
    const html = buffer.toString("utf8");
    const structured = parseJsonLdMenu(html);
    if (structured.length) {
      diagnostics.push(`${structured.length} Gerichte aus strukturierten Daten`);
      return { items: structured, source: "html_jsonld", diagnostics };
    }
    const items = parseMenuText(htmlToText(html), { idPrefix: "web" });
    diagnostics.push(`${items.length} Gerichte aus dem Seitentext`);
    return {
      items,
      source: items.length ? "html_text" : "none",
      diagnostics,
    };
  }

  if (kind === "pdf") {
    const text = extractPdfText(buffer);
    const fromText = parseMenuText(text, { idPrefix: "pdf" });
    diagnostics.push(
      `PDF-Text: ${text.length} Zeichen, daraus ${fromText.length} Gerichte`,
    );
    if (menuQuality(fromText).usable) {
      return { items: fromText, source: "pdf_text", diagnostics };
    }

    // Zu wenig herausgekommen -> die Karte ist vermutlich abfotografiert.
    if (!geminiConfigured()) {
      diagnostics.push(
        "Texterkennung übersprungen: GEMINI_API_KEY ist nicht gesetzt",
      );
      return {
        items: fromText,
        source: fromText.length ? "pdf_text" : "none",
        diagnostics,
      };
    }

    const transcript = await transcribeDocument(buffer, "application/pdf");
    const fromOcr = parseMenuText(transcript, { idPrefix: "pdfocr" });
    diagnostics.push(
      `Texterkennung: ${transcript.length} Zeichen, daraus ${fromOcr.length} Gerichte`,
    );
    // Das jeweils bessere Ergebnis gewinnt.
    return fromOcr.length >= fromText.length
      ? { items: fromOcr, source: fromOcr.length ? "pdf_ocr" : "none", diagnostics }
      : { items: fromText, source: "pdf_text", diagnostics };
  }

  if (kind === "image") {
    if (!geminiConfigured()) {
      diagnostics.push(
        "Bild kann ohne GEMINI_API_KEY nicht gelesen werden",
      );
      return { items: [], source: "none", diagnostics };
    }
    const mime = contentType.startsWith("image/") ? contentType : "image/jpeg";
    const transcript = await transcribeDocument(buffer, mime);
    const items = parseMenuText(transcript, { idPrefix: "ocr" });
    diagnostics.push(
      `Texterkennung: ${transcript.length} Zeichen, daraus ${items.length} Gerichte`,
    );
    return { items, source: items.length ? "image_ocr" : "none", diagnostics };
  }

  diagnostics.push("Unbekanntes Dateiformat – keine Erkennung möglich");
  return { items: [], source: "none", diagnostics };
}

/** Erkennt eine Karte, die hinter einer Adresse liegt. */
export async function extractMenuFromUrl(
  url: string,
): Promise<MenuExtractionResult> {
  let downloaded;
  try {
    downloaded = await safeFetch(url, {
      maxBytes: MAX_MENU_BYTES,
      timeoutMs: 30_000,
      allowedContentTypes: ALLOWED_CONTENT_TYPES,
    });
  } catch (err) {
    const reason =
      err instanceof SafeFetchError ? `${err.reason}: ${err.message}` : String(err);
    return {
      items: [],
      source: "none",
      diagnostics: [`Speisekarte nicht abrufbar (${reason})`],
    };
  }

  const result = await extractMenuFromBuffer(
    downloaded.buffer,
    downloaded.contentType,
  );
  result.diagnostics.unshift(`Geladen von ${downloaded.finalUrl}`);
  return result;
}
