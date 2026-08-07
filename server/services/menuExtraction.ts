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
 *   Bild  -> Texterkennung über die Anbieterkette (server/services/ocr)
 *   PDF   -> erst der eingebettete Text (kostenlos und genau), und nur wenn der
 *            nichts hergibt, die Texterkennung. Viele Karten sind abfotografiert
 *            und enthalten gar keinen Text – dann führt nur sie zum Ziel.
 */
import {
  parseMenuText,
  menuQuality,
  parseAllergenLegend,
  type ParsedMenuItem,
} from "../../shared/menuParser";
import { safeFetch, SafeFetchError } from "./safeFetch";
import { transcribeDocument, ocrConfigured, MAX_DOCUMENT_BYTES } from "./ocr";
import { structureMenuText, menuStructureConfigured } from "./menuStructure";

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
  /**
   * Was die Kürzel an den Gerichten bedeuten — so, wie DIESE Karte es angibt:
   * { "a1": "Weizen", "f": "Milch/Laktose" }.
   *
   * Ohne sie steht in der Web-App "(a1, f)", und das ist für einen Gast mit
   * einer Unverträglichkeit wertlos. Eine feste Tabelle scheidet aus: Die
   * Zuordnung ist je Karte verschieden — beim Landgasthof zum Löwen ist "f"
   * die Milch, bei der Kneipe am Kirchplatz ist Milch "g".
   */
  allergenLegend?: Record<string, string>;
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
 * Notnagel: liest NUR unkomprimierte Textblöcke, ohne fremde Bibliothek.
 *
 * Das war bis zum 7.8.2026 der einzige Weg – und der Grund, aus dem KEINE
 * einzige echte PDF-Speisekarte erkannt wurde. Gemessen an 7 echten Karten von
 * deutschen Gasthof-Websites: alle sieben ergaben null Gerichte, weil ihr Text
 * FlateDecode-komprimiert ist (das ist bei realen PDFs die Regel, nicht die
 * Ausnahme). Anschließend rief die Kette bezahltes OCR – für Text, der lokal
 * vollständig lesbar war.
 *
 * Steht nur noch als Rückfall hinter readPdfText, für den Fall, dass pdf.js
 * ein PDF gar nicht öffnen kann.
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

/**
 * Liest den Text eines PDFs – der Weg, der bei echten Karten trägt.
 *
 * Nimmt pdf.js (über unpdf). Das ist keine Bequemlichkeit, sondern das
 * Ergebnis eines gescheiterten Eigenbaus: Ein selbst geschriebener Leser
 * bekommt zwar die Streams mit zlib ausgepackt und die Zeilen über die
 * Tm-Koordinaten zusammengesetzt, verliert aber jeden Textlauf, der in einer
 * zweiten Schrift mit eigener Kodierung steht. Auf der ersten echten Karte
 * fehlten dadurch genau der Restaurantname ("„ZUR POST“"), jedes Gericht mit
 * Anführungszeichen im Namen und die Endung jedes Preises – aus "12,90 €"
 * wurde "12,9". Schriftkodierungen und ToUnicode-Tabellen sauber aufzulösen
 * ist die Arbeit, die pdf.js seit Jahren macht.
 *
 * Gegenprobe an 7 echten Karten: identische Ausbeute wie `pdftotext -layout`
 * (auf ±1 Gericht), zusammen 299 statt 0 Gerichten.
 *
 * Wirft nie. Kann pdf.js die Datei nicht öffnen, bleibt der alte Notnagel –
 * und wenn auch der nichts hergibt, übernimmt weiter unten die Texterkennung.
 */
export async function readPdfText(
  pdf: Buffer,
): Promise<{ text: string; via: "pdfjs" | "roh" }> {
  try {
    // Erst hier laden: unpdf bringt pdf.js mit, und der Server soll dafür nicht
    // bei jedem Start ein paar Megabyte auswerten, die die meisten Anfragen
    // nie brauchen.
    const { extractText, getDocumentProxy } = await import("unpdf");
    const doc = await getDocumentProxy(new Uint8Array(pdf));
    const { text } = await extractText(doc, { mergePages: true });
    const clean = String(text ?? "").trim();
    if (clean) return { text: clean, via: "pdfjs" };
  } catch (err) {
    // Nicht still: ein PDF, das pdf.js nicht öffnen kann, ist ein Hinweis –
    // sonst sieht man später nur "0 Gerichte" ohne Grund.
    console.warn(
      `[Speisekarte] pdf.js konnte das PDF nicht lesen: ${String(err)}`,
    );
  }
  return { text: extractPdfText(pdf), via: "roh" };
}

/**
 * Liest die Kürzel-Legende aus demselben Text und gibt sie nur zurück, wenn
 * überhaupt ein Gericht gekennzeichnet ist.
 *
 * Eine Legende ohne gekennzeichnete Gerichte ist eine Tabelle, die niemand
 * aufschlägt — und im Konfigurator eine Zeile mehr, die der Wirt wegklicken
 * muss. Umgekehrt sind Kürzel ohne Legende zwar unschön, aber immer noch die
 * Information, die auf der Karte steht.
 */
function legendeAus(
  text: string,
  items: ParsedMenuItem[],
): { allergenLegend?: Record<string, string> } {
  if (!items.some((i) => i.allergens?.length)) return {};
  const legende = parseAllergenLegend(text);
  return Object.keys(legende).length ? { allergenLegend: legende } : {};
}

/**
 * Macht aus ausgelesenem Kartentext Gerichte — Modell zuerst, Regeln als
 * Rückfall.
 *
 * Diese eine Stelle bedient alle drei Wege (Website, PDF-Text, Texterkennung),
 * damit eine Verbesserung nicht an zwei von drei Stellen vergessen wird.
 *
 * Warum das Modell zuerst und nicht die Regeln: gemessen am 7.8.2026 auf der
 * Prüfmenge findet es 98 % der Gerichte gegen 54 %, bei 1 % statt 39 %
 * Erfundenem — die Zahlen und die Gegenprüfung stehen in menuStructure.ts.
 *
 * Die Regeln fallen NICHT weg. Ohne Schlüssel, bei Netzstörung oder wenn das
 * Modell nichts liefert, greifen sie — eine halb erkannte Karte ist besser als
 * eine leere. Beides steht in den diagnostics, damit im Zweifel nachvollziehbar
 * ist, welcher Weg gelaufen ist.
 */
async function gerichteAus(
  kartentext: string,
  idPrefix: string,
  diagnostics: string[],
): Promise<{ items: ParsedMenuItem[]; allergenLegend?: Record<string, string> }> {
  const mitRegeln = () => {
    const items = parseMenuText(kartentext, { idPrefix });
    diagnostics.push(`Regeln: ${items.length} Gerichte`);
    return { items, ...legendeAus(kartentext, items) };
  };

  if (!menuStructureConfigured()) {
    diagnostics.push(
      "Strukturierung übersprungen: ANTHROPIC_API_KEY nicht gesetzt — nur Regeln",
    );
    return mitRegeln();
  }

  try {
    const s = await structureMenuText(kartentext, { idPrefix });
    diagnostics.push(`Strukturierung – ${s.hinweis}`);
    // Die Legende des Modells hat Vorrang; sonst aus dem Text schälen. Beides
    // stammt von DIESER Karte — eine allgemeine Tabelle wäre falsch, nicht nur
    // unvollständig.
    return {
      items: s.items,
      ...(s.allergenLegend
        ? { allergenLegend: s.allergenLegend }
        : legendeAus(kartentext, s.items)),
    };
  } catch (err) {
    diagnostics.push(`Strukturierung fehlgeschlagen (${String(err)}) — Regeln als Rückfall`);
    return mitRegeln();
  }
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
    const seitentext = htmlToText(html);
    const { items, allergenLegend } = await gerichteAus(seitentext, "web", diagnostics);
    diagnostics.push(`${items.length} Gerichte aus dem Seitentext`);
    return {
      items,
      source: items.length ? "html_text" : "none",
      diagnostics,
      ...(allergenLegend ? { allergenLegend } : {}),
    };
  }

  if (kind === "pdf") {
    const { text, via } = await readPdfText(buffer);
    // menuQuality entscheidet hier NUR, ob das PDF überhaupt eine Textebene
    // hat — dafür taugt es. Als Qualitätsurteil taugt es nicht: Es prüft
    // lediglich, ob drei Preise gefunden wurden, und ließ in der Messung vom
    // 7.8.2026 alle 14 Prüfkarten durch, auch die mit 8 von 118 Gerichten.
    // Deshalb strukturiert unten das Modell, nicht dieses Tor.
    const textprobe = parseMenuText(text, { idPrefix: "pdf" });
    diagnostics.push(
      `PDF-Text (${via}): ${text.length} Zeichen, Textebene ${menuQuality(textprobe).usable ? "vorhanden" : "leer oder unbrauchbar"}`,
    );

    if (menuQuality(textprobe).usable) {
      const { items, allergenLegend } = await gerichteAus(text, "pdf", diagnostics);
      return {
        items,
        source: "pdf_text",
        diagnostics,
        ...(allergenLegend ? { allergenLegend } : {}),
      };
    }

    // Keine brauchbare Textebene -> die Karte ist vermutlich abfotografiert.
    if (!ocrConfigured()) {
      diagnostics.push(
        "Texterkennung übersprungen: kein OCR-Anbieter eingerichtet (GEMINI_API_KEY oder ANTHROPIC_API_KEY setzen)",
      );
      return {
        items: textprobe,
        source: textprobe.length ? "pdf_text" : "none",
        diagnostics,
        ...legendeAus(text, textprobe),
      };
    }

    const ocr = await transcribeDocument(buffer, "application/pdf");
    diagnostics.push(`Texterkennung (${ocr.provider}): ${ocr.text.length} Zeichen`);
    diagnostics.push(...ocr.attempts.map((a) => `Versuch – ${a}`));
    const ausOcr = await gerichteAus(ocr.text, "pdfocr", diagnostics);
    // Das jeweils bessere Ergebnis gewinnt.
    return ausOcr.items.length >= textprobe.length
      ? {
          items: ausOcr.items,
          source: ausOcr.items.length ? "pdf_ocr" : "none",
          diagnostics,
          ...(ausOcr.allergenLegend ? { allergenLegend: ausOcr.allergenLegend } : {}),
        }
      : {
          items: textprobe,
          source: "pdf_text",
          diagnostics,
          ...legendeAus(text, textprobe),
        };
  }

  if (kind === "image") {
    if (!ocrConfigured()) {
      diagnostics.push(
        "Bild kann ohne eingerichteten OCR-Anbieter nicht gelesen werden",
      );
      return { items: [], source: "none", diagnostics };
    }
    const mime = contentType.startsWith("image/") ? contentType : "image/jpeg";
    const ocr = await transcribeDocument(buffer, mime);
    diagnostics.push(`Texterkennung (${ocr.provider}): ${ocr.text.length} Zeichen`);
    diagnostics.push(...ocr.attempts.map((a) => `Versuch – ${a}`));
    const { items, allergenLegend } = await gerichteAus(ocr.text, "ocr", diagnostics);
    return {
      items,
      source: items.length ? "image_ocr" : "none",
      diagnostics,
      ...(allergenLegend ? { allergenLegend } : {}),
    };
  }

  diagnostics.push("Unbekanntes Dateiformat – keine Erkennung möglich");
  return { items: [], source: "none", diagnostics };
}

/**
 * Sucht auf einer Seite die Verweise, hinter denen die eigentliche Karte liegt.
 *
 * Der Anlass ist der Normalfall, nicht ein Sonderfall: Der Wirt gibt im
 * Konfigurator die Adresse seiner Speisekarten-SEITE an. Auf sehr vielen
 * Gasthof-Websites steht dort aber gar keine Karte, sondern nur ein Link auf
 * ein PDF ("Aktuelle Speisekarte"). Gemessen an der ersten echten Karte des
 * Korpus: Die Seite hat 813 Zeichen Text und null Gerichte, das verlinkte PDF
 * dahinter 28.
 *
 * Bewertet wird jeder Verweis, der auf eine Datei zeigen könnte. Höher zählt,
 * was im Dateinamen oder im Linktext nach Speisekarte klingt — sonst folgt die
 * Erkennung dem erstbesten PDF, und das ist auf halben Websites die
 * Anfahrtsskizze oder das Impressum.
 */
export function findMenuLinks(html: string, baseUrl: string): string[] {
  const KLINGT_NACH_KARTE =
    /speise|speisekarte|men(u|ue|ü)|karte|tageskarte|abendkarte|getr(ae|ä)nke|wochenkarte|mittagstisch/i;
  const NIE = /impressum|datenschutz|agb|anfahrt|lageplan|formular|anmeld|gutschein|hygiene/i;

  const treffer = new Map<string, number>();
  const anker = html.matchAll(
    /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
  );

  for (const m of anker) {
    const roh = m[1].trim();
    const text = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!roh || /^(#|javascript:|mailto:|tel:)/i.test(roh)) continue;

    let ziel: URL;
    try {
      ziel = new URL(roh, baseUrl);
    } catch {
      continue;
    }
    if (ziel.protocol !== "http:" && ziel.protocol !== "https:") continue;

    const pfad = decodeURIComponent(ziel.pathname);
    if (NIE.test(pfad) || NIE.test(text)) continue;

    const istPdf = /\.pdf(\?|$)/i.test(pfad);
    const istBild = /\.(jpe?g|png|webp)(\?|$)/i.test(pfad);
    if (!istPdf && !istBild) continue;

    // Punkte: Dateityp, Benennung im Pfad, Benennung im Linktext.
    let punkte = istPdf ? 2 : 1;
    if (KLINGT_NACH_KARTE.test(pfad)) punkte += 3;
    if (KLINGT_NACH_KARTE.test(text)) punkte += 2;
    // Ein Bild ohne jeden Hinweis auf eine Karte ist fast immer ein Foto der
    // Terrasse. Nur PDFs sind auch ohne sprechenden Namen einen Versuch wert.
    if (istBild && punkte < 3) continue;

    const bisher = treffer.get(ziel.href) ?? 0;
    if (punkte > bisher) treffer.set(ziel.href, punkte);
  }

  return [...treffer.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([href]) => href);
}

/** Wie viele verlinkte Dateien höchstens nachgeladen werden. */
const MAX_VERFOLGTE_LINKS = 3;

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

  // Auf der Seite selbst stand nichts Brauchbares — liegt die Karte verlinkt
  // dahinter? Nur bei HTML, und nur wenn die Seite nichts hergab: Wer schon
  // eine brauchbare Karte hat, soll sie nicht gegen ein altes PDF tauschen.
  const istHtml = sniffType(downloaded.buffer, downloaded.contentType) === "html";
  if (!istHtml || menuQuality(result.items).usable) return result;

  const links = findMenuLinks(
    downloaded.buffer.toString("utf8"),
    downloaded.finalUrl,
  );
  if (!links.length) {
    result.diagnostics.push("Keine verlinkte Speisekarte auf der Seite gefunden");
    return result;
  }
  result.diagnostics.push(
    `${links.length} mögliche verlinkte Karte(n), davon werden bis zu ${MAX_VERFOLGTE_LINKS} geprüft`,
  );

  let bestes = result;
  for (const link of links.slice(0, MAX_VERFOLGTE_LINKS)) {
    try {
      const datei = await safeFetch(link, {
        maxBytes: MAX_MENU_BYTES,
        timeoutMs: 30_000,
        allowedContentTypes: ALLOWED_CONTENT_TYPES,
      });
      const versuch = await extractMenuFromBuffer(datei.buffer, datei.contentType);
      bestes.diagnostics.push(
        `Verlinkt: ${link} → ${versuch.items.length} Gerichte (${versuch.source})`,
      );
      if (versuch.items.length > bestes.items.length) {
        bestes = { ...versuch, diagnostics: bestes.diagnostics.concat(versuch.diagnostics) };
      }
      // Reicht das schon, muss nicht weiter geladen werden — jede weitere
      // Datei kostet Zeit und, wenn OCR anspringt, Geld.
      if (menuQuality(bestes.items).usable) break;
    } catch (err) {
      const grund =
        err instanceof SafeFetchError ? `${err.reason}: ${err.message}` : String(err);
      bestes.diagnostics.push(`Verlinkt: ${link} nicht abrufbar (${grund})`);
    }
  }

  return bestes;
}
