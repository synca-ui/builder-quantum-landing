import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { deflateSync } from "node:zlib";
import {
  sniffType,
  parseJsonLdMenu,
  htmlToText,
  extractPdfText,
  readPdfText,
  findMenuLinks,
  extractMenuFromBuffer,
} from "../services/menuExtraction";
import { chooseUploadStrategy, extractTextFromResponse } from "../services/ocr";
import { menuJobAntwort } from "../routes/menu";

/**
 * Alles hier läuft ohne Netz. Geprüft wird das, woran die Erkennung in der
 * Praxis scheitert: falsch angekündigte Dateitypen, HTML ohne Struktur,
 * PDFs ohne Text – und die Frage, welcher Übertragungsweg für welche Größe gilt.
 *
 * Die Schlüssel werden dafür AKTIV entfernt, nicht bloß vorausgesetzt.
 * Seit die Erkennung über ein Sprachmodell strukturiert (menuStructure.ts),
 * ruft extractMenuFromBuffer bei gesetztem ANTHROPIC_API_KEY eine
 * kostenpflichtige Schnittstelle auf. Die Zusage "ohne Netz" hing damit an der
 * Umgebung dessen, der die Tests startet: Auf einem Rechner mit gesetztem
 * Schlüssel wären sie langsam, wackelig und kostenpflichtig geworden – und
 * hätten je nach Antwort andere Ergebnisse geliefert als in der Fertigung.
 */
const gesicherteSchluessel: Record<string, string | undefined> = {};
beforeAll(() => {
  for (const name of ["ANTHROPIC_API_KEY", "GEMINI_API_KEY"]) {
    gesicherteSchluessel[name] = process.env[name];
    delete process.env[name];
  }
});
afterAll(() => {
  for (const [name, wert] of Object.entries(gesicherteSchluessel)) {
    if (wert === undefined) delete process.env[name];
    else process.env[name] = wert;
  }
});

const pdfHeader = (rest = "") => Buffer.from(`%PDF-1.7\n${rest}`, "latin1");
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const png = Buffer.concat([
  Buffer.from([0x89]),
  Buffer.from("PNG\r\n\x1a\n", "latin1"),
  Buffer.alloc(4),
]);

/**
 * Baut ein gültiges PDF, dessen Textstrom FlateDecode-komprimiert ist.
 *
 * Das ist der Normalfall bei echten Speisekarten – jede der sieben PDF-Karten
 * im Messkorpus sieht so aus. Ein Test mit unkomprimiertem Text bewiese hier
 * nichts: Den las auch die alte Fassung, und trotzdem kam bei jeder echten
 * Karte null heraus.
 *
 * Bewusst von Hand statt mit einer Bibliothek, samt korrekter xref-Tabelle:
 * Ein Testgerüst, das selbst eine PDF-Bibliothek braucht, prüft am Ende die
 * Bibliothek und nicht uns.
 */
function komprimiertesPdf(inhalt: string): Buffer {
  const zeilen = inhalt ? inhalt.split("\n") : [];
  const strom = zeilen
    .map((zeile, i) => {
      const sicher = zeile.replace(/([\\()])/g, "\\$1");
      return `BT /F1 12 Tf 50 ${760 - i * 20} Td (${sicher}) Tj ET`;
    })
    .join("\n");
  const gepackt = deflateSync(Buffer.from(strom, "latin1"));

  const objekte = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]" +
      "/Resources<</Font<</F1 5 0 R>>>>/Contents 4 0 R>>",
    null, // 4 = der Strom, unten gesondert
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
  ];

  const teile: Buffer[] = [Buffer.from("%PDF-1.4\n", "latin1")];
  const versatz: number[] = [];
  let laenge = teile[0].length;

  objekte.forEach((koerper, i) => {
    versatz.push(laenge);
    const stueck =
      koerper === null
        ? Buffer.concat([
            Buffer.from(
              `4 0 obj\n<</Length ${gepackt.length}/Filter/FlateDecode>>\nstream\n`,
              "latin1",
            ),
            gepackt,
            Buffer.from("\nendstream\nendobj\n", "latin1"),
          ])
        : Buffer.from(`${i + 1} 0 obj\n${koerper}\nendobj\n`, "latin1");
    teile.push(stueck);
    laenge += stueck.length;
  });

  const xrefAb = laenge;
  const xref =
    "xref\n0 6\n0000000000 65535 f \n" +
    versatz.map((v) => `${String(v).padStart(10, "0")} 00000 n \n`).join("") +
    `trailer\n<</Size 6/Root 1 0 R>>\nstartxref\n${xrefAb}\n%%EOF\n`;
  teile.push(Buffer.from(xref, "latin1"));

  return Buffer.concat(teile);
}

describe("sniffType", () => {
  it("erkennt ein PDF an den ersten Bytes, auch wenn der Server etwas anderes behauptet", () => {
    // Manche Server liefern PDFs als application/octet-stream aus. Verließe man
    // sich auf den Kopf, ginge die Karte verloren.
    expect(sniffType(pdfHeader(), "application/octet-stream")).toBe("pdf");
    expect(sniffType(pdfHeader(), "text/html")).toBe("pdf");
  });

  it("erkennt Bilder an ihrer Signatur", () => {
    expect(sniffType(jpeg, "application/octet-stream")).toBe("image");
    expect(sniffType(png, "")).toBe("image");
  });

  it("erkennt HTML am Inhalt, wenn der Kopf nichts hergibt", () => {
    const html = Buffer.from("<!DOCTYPE html><html><body>Karte</body></html>");
    expect(sniffType(html, "application/octet-stream")).toBe("html");
  });

  it("fällt auf den Content-Type zurück, wenn die Bytes nichts verraten", () => {
    expect(sniffType(Buffer.from("Speisekarte"), "text/html")).toBe("html");
    expect(sniffType(Buffer.from("x"), "application/pdf")).toBe("pdf");
    expect(sniffType(Buffer.from("x"), "image/webp")).toBe("image");
  });

  it("gibt bei Unbekanntem ehrlich unknown zurück", () => {
    expect(sniffType(Buffer.from("\x00\x01\x02"), "application/zip")).toBe("unknown");
  });
});

describe("parseJsonLdMenu", () => {
  it("liest Gerichte aus schema.org/Menu", () => {
    const html = `<html><head><script type="application/ld+json">
    {"@type":"Menu","hasMenuSection":[
      {"name":"Vorspeisen","hasMenuItem":[
        {"@type":"MenuItem","name":"Tomatensuppe","description":"mit Basilikum","offers":{"price":"5.50"}}
      ]},
      {"name":"Hauptgerichte","hasMenuItem":[
        {"@type":"MenuItem","name":"Wiener Schnitzel","offers":[{"price":"18.90"}]}
      ]}
    ]}
    </script></head><body></body></html>`;

    const items = parseJsonLdMenu(html);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      name: "Tomatensuppe",
      description: "mit Basilikum",
      price: "5.50",
      category: "Vorspeisen",
    });
    expect(items[1]).toMatchObject({
      name: "Wiener Schnitzel",
      price: "18.90",
      category: "Hauptgerichte",
    });
  });

  it("findet das Menü auch in einem @graph", () => {
    const html = `<script type="application/ld+json">
    {"@context":"https://schema.org","@graph":[
      {"@type":"Restaurant","name":"Zur Post"},
      {"@type":"Menu","hasMenuSection":[{"name":"Pizza","hasMenuItem":[{"name":"Margherita","offers":{"price":"8.50"}}]}]}
    ]}</script>`;
    expect(parseJsonLdMenu(html)[0]).toMatchObject({
      name: "Margherita",
      price: "8.50",
      category: "Pizza",
    });
  });

  it("steigt in Unterabschnitte ab", () => {
    const html = `<script type="application/ld+json">
    {"@type":"Menu","hasMenuSection":[
      {"name":"Getränke","hasMenuSection":[
        {"name":"Weine","hasMenuItem":[{"name":"Riesling","offers":{"price":"6.50"}}]}
      ]}
    ]}</script>`;
    const items = parseJsonLdMenu(html);
    expect(items.map((i) => i.name)).toContain("Riesling");
    expect(items.find((i) => i.name === "Riesling")?.category).toBe("Weine");
  });

  it("übersteht kaputtes JSON, ohne alles zu verlieren", () => {
    const html = `
    <script type="application/ld+json">{ das ist kein json </script>
    <script type="application/ld+json">{"@type":"Menu","hasMenuItem":[{"name":"Pommes","offers":{"price":"4.00"}}]}</script>`;
    expect(parseJsonLdMenu(html)).toHaveLength(1);
  });

  it("liefert nichts, wenn kein Menü ausgezeichnet ist", () => {
    const html = `<script type="application/ld+json">{"@type":"Restaurant","name":"Zur Post"}</script>`;
    expect(parseJsonLdMenu(html)).toEqual([]);
  });
});

describe("htmlToText", () => {
  it("macht aus Blockelementen Zeilenumbrüche", () => {
    // Ohne das klebt die ganze Karte in einer Zeile und der Parser findet
    // weder Überschriften noch einzelne Gerichte.
    const text = htmlToText("<li>Schnitzel 18,90</li><li>Gulasch 16,50</li>");
    expect(text.split("\n").filter(Boolean)).toHaveLength(2);
  });

  it("löst deutsche Umlaut-Entities auf", () => {
    expect(htmlToText("<p>K&auml;sesp&auml;tzle &euro; 12</p>")).toBe(
      "Käsespätzle € 12",
    );
  });

  it("wirft Skripte und Stile weg", () => {
    const text = htmlToText(
      "<script>var preis = 999;</script><style>.a{}</style><p>Suppe 5,50</p>",
    );
    expect(text).not.toContain("999");
    expect(text).toContain("Suppe 5,50");
  });
});

describe("extractPdfText", () => {
  it("liest unkomprimierte Textblöcke", () => {
    const pdf = pdfHeader(
      "BT (Wiener Schnitzel 18,90) Tj ET\nBT [(Gulasch )(16,50)] TJ ET\n",
    );
    const text = extractPdfText(pdf);
    expect(text).toContain("Wiener Schnitzel 18,90");
    expect(text).toContain("Gulasch 16,50");
  });

  it("liefert leeren Text, wenn nichts Lesbares drin ist", () => {
    // Genau das ist der Fall bei abfotografierten Karten – danach muss die
    // Texterkennung übernehmen.
    expect(extractPdfText(pdfHeader("nur binaerer Muell"))).toBe("");
  });

  it("kommt an KOMPRIMIERTEN Text nicht heran – deshalb gibt es readPdfText", () => {
    // Der Grund für diesen Test steht in menuExtraction.ts: An genau dieser
    // Stelle scheiterten alle sieben echten PDF-Karten des Messkorpus. Bleibt
    // diese Erwartung eines Tages nicht mehr leer, hat jemand den Notnagel
    // erweitert – dann darf readPdfText darauf zurückfallen.
    expect(extractPdfText(komprimiertesPdf("Wiener Schnitzel 18,90"))).toBe("");
  });
});

describe("readPdfText", () => {
  it("liest komprimierten Text – der Fall, an dem der Notnagel scheitert", async () => {
    const pdf = komprimiertesPdf(
      "AUS DEM SUPPENTOPF\nTAGESSUPPE 5,50 EUR\nWiener Schnitzel 18,90 EUR",
    );
    const { text, via } = await readPdfText(pdf);
    expect(via).toBe("pdfjs");
    expect(text).toContain("Wiener Schnitzel");
    expect(text).toContain("18,90");
  });

  it("fällt auf den Notnagel zurück, wenn pdf.js die Datei nicht öffnen kann", async () => {
    // Kein gültiges PDF-Gerüst, aber ein lesbarer unkomprimierter Textblock.
    const { text, via } = await readPdfText(
      pdfHeader("BT (Gulasch 16,50) Tj ET\n"),
    );
    expect(via).toBe("roh");
    expect(text).toContain("Gulasch 16,50");
  });

  it("liefert leeren Text bei einem PDF ohne jeden Text", async () => {
    // Abfotografierte Karte: hier MUSS die Texterkennung übernehmen dürfen.
    const { text } = await readPdfText(komprimiertesPdf(""));
    expect(text).toBe("");
  });
});

describe("findMenuLinks", () => {
  const basis = "https://gasthof.example/de/restaurant/speisekarten.html";

  it("findet die verlinkte Karte und löst den relativen Pfad auf", () => {
    // Genau dieser Fall kostete die erste echte Karte des Korpus 28 Gerichte:
    // Die Seite hat 813 Zeichen Text und verlinkt das PDF mit "./files/".
    const html = `<a href="./files/aktuelle_speisekarte_.pdf">Aktuelle Speisekarte</a>`;
    expect(findMenuLinks(html, basis)).toEqual([
      "https://gasthof.example/de/restaurant/files/aktuelle_speisekarte_.pdf",
    ]);
  });

  it("stellt die Karte vor andere PDFs auf derselben Seite", () => {
    // Ohne Bewertung folgt die Erkennung dem erstbesten PDF – und das ist auf
    // halben Websites die Anfahrtsskizze.
    const html = `
      <a href="/anfahrt.pdf">Anfahrt</a>
      <a href="/dl/hausprospekt.pdf">Prospekt</a>
      <a href="/dl/speisekarte.pdf">Unsere Karte</a>`;
    const links = findMenuLinks(html, basis);
    expect(links[0]).toBe("https://gasthof.example/dl/speisekarte.pdf");
  });

  it("lässt Impressum und Datenschutz liegen, auch als PDF", () => {
    const html = `<a href="/impressum.pdf">Impressum</a><a href="/datenschutz.pdf">Datenschutz</a>`;
    expect(findMenuLinks(html, basis)).toEqual([]);
  });

  it("nimmt Bilder nur, wenn sie nach Karte klingen", () => {
    // Ein Bild ohne Hinweis ist fast immer ein Foto der Terrasse.
    const html = `<a href="/bilder/terrasse.jpg">Bild</a><a href="/tageskarte.jpg">Tageskarte</a>`;
    expect(findMenuLinks(html, basis)).toEqual([
      "https://gasthof.example/tageskarte.jpg",
    ]);
  });

  it("ignoriert Anker, mailto und tel", () => {
    const html = `<a href="#karte">Karte</a><a href="mailto:a@b.de">Speisekarte</a><a href="tel:123">Menü</a>`;
    expect(findMenuLinks(html, basis)).toEqual([]);
  });

  it("nennt dieselbe Datei nur einmal", () => {
    const html = `<a href="/speisekarte.pdf">Karte</a><a href="/speisekarte.pdf">Speisekarte ansehen</a>`;
    expect(findMenuLinks(html, basis)).toHaveLength(1);
  });
});

describe("extractMenuFromBuffer", () => {
  it("bevorzugt strukturierte Daten vor dem Seitentext", () => {
    const html = Buffer.from(`<html><body>
      <script type="application/ld+json">{"@type":"Menu","hasMenuSection":[{"name":"Suppen","hasMenuItem":[{"name":"Tomatensuppe","offers":{"price":"5.50"}}]}]}</script>
      <p>Irgendein anderer Preis 99,00</p>
    </body></html>`);
    return extractMenuFromBuffer(html, "text/html").then((r) => {
      expect(r.source).toBe("html_jsonld");
      expect(r.items).toHaveLength(1);
      expect(r.items[0].name).toBe("Tomatensuppe");
    });
  });

  it("schält den Text, wenn keine strukturierten Daten da sind", async () => {
    const html = Buffer.from(`<html><body>
      <h2>Hauptgerichte</h2>
      <li>Wiener Schnitzel 18,90</li>
      <li>Rumpsteak 26,50</li>
      <li>Gulasch 16,90</li>
    </body></html>`);
    const r = await extractMenuFromBuffer(html, "text/html");
    expect(r.source).toBe("html_text");
    expect(r.items.map((i) => i.name)).toEqual([
      "Wiener Schnitzel",
      "Rumpsteak",
      "Gulasch",
    ]);
    expect(r.items[0].category).toBe("Hauptgerichte");
  });

  it("nimmt den PDF-Text, wenn er genug hergibt", async () => {
    const pdf = pdfHeader(`
BT (Hauptgerichte) Tj ET
BT (Wiener Schnitzel 18,90) Tj ET
BT (Rumpsteak 26,50) Tj ET
BT (Gulasch 16,90) Tj ET
`);
    const r = await extractMenuFromBuffer(pdf, "application/pdf");
    expect(r.source).toBe("pdf_text");
    expect(r.items).toHaveLength(3);
  });

  it("sagt es, statt zu raten, wenn ohne Schlüssel nichts geht", async () => {
    // Bildkarte ohne GEMINI_API_KEY: ehrlich leer, mit Begründung.
    delete process.env.GEMINI_API_KEY;
    const r = await extractMenuFromBuffer(jpeg, "image/jpeg");
    expect(r.items).toEqual([]);
    expect(r.source).toBe("none");
    expect(r.diagnostics.join(" ")).toMatch(/OCR-Anbieter/);
  });

  it("hält ein unbekanntes Format aus", async () => {
    const r = await extractMenuFromBuffer(Buffer.from("PK\x03\x04"), "application/zip");
    expect(r.source).toBe("none");
    expect(r.diagnostics.join(" ")).toMatch(/Unbekannt/i);
  });
});

describe("OCR-Anbieter: Entscheidungen ohne Netz", () => {
  it("schickt kleine Dateien eingebettet und große über die Files-API", () => {
    expect(chooseUploadStrategy(500_000)).toBe("inline");
    expect(chooseUploadStrategy(5 * 1024 * 1024)).toBe("inline");
    // Die Karte, an der es ursprünglich scheiterte: 21.259.996 Bytes.
    expect(chooseUploadStrategy(21_259_996)).toBe("files_api");
  });

  it("lehnt erst ab, was auch die Files-API nicht mehr nimmt", () => {
    // Deren Grenze liegt bei 2 GB – eine Speisekarte erreicht das nie, aber
    // die Prüfung soll an der echten Grenze hängen und nicht an einer geratenen.
    expect(chooseUploadStrategy(500 * 1024 * 1024)).toBe("files_api");
    expect(chooseUploadStrategy(3 * 1024 * 1024 * 1024)).toBe("too_large");
  });

  it("setzt eine in mehrere Teile zerlegte Antwort zusammen", () => {
    // Bei langen Karten teilt Gemini den Text auf mehrere parts auf; nur den
    // ersten zu lesen schnitte die halbe Speisekarte ab.
    const text = extractTextFromResponse({
      candidates: [{ content: { parts: [{ text: "Vorspeisen\n" }, { text: "Suppe 5,50" }] } }],
    });
    expect(text).toBe("Vorspeisen\nSuppe 5,50");
  });

  it("kommt mit einer leeren oder unerwarteten Antwort klar", () => {
    expect(extractTextFromResponse({})).toBe("");
    expect(extractTextFromResponse({ candidates: [] })).toBe("");
    expect(extractTextFromResponse(null)).toBe("");
    expect(extractTextFromResponse({ candidates: [{ content: {} }] })).toBe("");
  });
});

/**
 * Die Antwort des Erkennungsauftrags.
 *
 * Der Anlass ist ein Loch, das eine Durchsicht am 7.8.2026 gefunden hat: Die
 * Kürzel-Legende wurde aus der Karte gelesen, im MenuExtractionResult
 * mitgeführt — und in res.json() schlicht nicht aufgeführt. Am Gericht kamen
 * beim Wirt nur "a1" und "f" an, und was die bedeuten, legt jede Karte selbst
 * fest. Der Fehler war unsichtbar: Gerichte, Preise und Kategorien stimmten.
 */
describe("menuJobAntwort", () => {
  const basis = {
    items: [{ id: "x", name: "Wiener Schnitzel", price: "18.90", allergens: ["a1", "f"] }],
    source: "pdf_text" as const,
    diagnostics: ["gelesen"],
  };

  it("reicht die Legende mit durch", () => {
    const antwort = menuJobAntwort({
      ...basis,
      allergenLegend: { a1: "Weizen", f: "Milch/Laktose" },
    });
    expect(antwort.allergenLegend).toEqual({ a1: "Weizen", f: "Milch/Laktose" });
  });

  it("übersteht den Weg über die Leitung", () => {
    // Genau die Stelle, an der es verlorenging: JSON.stringify/parse bildet
    // ab, was der Client tatsächlich bekommt.
    const antwort = menuJobAntwort({
      ...basis,
      allergenLegend: { a1: "Weizen" },
    });
    const beimClient = JSON.parse(JSON.stringify(antwort));
    expect(beimClient.allergenLegend.a1).toBe("Weizen");
    expect(beimClient.items[0].allergens).toEqual(["a1", "f"]);
  });

  it("lässt das Feld weg, wenn die Karte keine Legende hat", () => {
    // Ein leeres Objekt läse sich wie "geprüft, nichts gefunden". Die
    // Oberfläche zeigt dann das rohe Kürzel, statt eines zu erfinden.
    expect(menuJobAntwort(basis)).not.toHaveProperty("allergenLegend");
    expect(
      menuJobAntwort({ ...basis, allergenLegend: {} }),
    ).not.toHaveProperty("allergenLegend");
  });

  it("nennt die Zahl der Gerichte, nicht die der Zeilen", () => {
    expect(menuJobAntwort(basis).count).toBe(1);
  });
});
