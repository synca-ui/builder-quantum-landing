import { describe, it, expect } from "vitest";
import {
  sniffType,
  parseJsonLdMenu,
  htmlToText,
  extractPdfText,
  extractMenuFromBuffer,
} from "../services/menuExtraction";
import { chooseUploadStrategy, extractTextFromResponse } from "../services/gemini";

/**
 * Alles hier läuft ohne Netz. Geprüft wird das, woran die Erkennung in der
 * Praxis scheitert: falsch angekündigte Dateitypen, HTML ohne Struktur,
 * PDFs ohne Text – und die Frage, welcher Übertragungsweg für welche Größe gilt.
 */

const pdfHeader = (rest = "") => Buffer.from(`%PDF-1.7\n${rest}`, "latin1");
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const png = Buffer.concat([
  Buffer.from([0x89]),
  Buffer.from("PNG\r\n\x1a\n", "latin1"),
  Buffer.alloc(4),
]);

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
    expect(r.diagnostics.join(" ")).toMatch(/GEMINI_API_KEY/);
  });

  it("hält ein unbekanntes Format aus", async () => {
    const r = await extractMenuFromBuffer(Buffer.from("PK\x03\x04"), "application/zip");
    expect(r.source).toBe("none");
    expect(r.diagnostics.join(" ")).toMatch(/Unbekannt/i);
  });
});

describe("Gemini: Entscheidungen ohne Netz", () => {
  it("schickt kleine Dateien eingebettet und große über die Files-API", () => {
    expect(chooseUploadStrategy(500_000)).toBe("inline");
    expect(chooseUploadStrategy(5 * 1024 * 1024)).toBe("inline");
    // Die Karte, an der es ursprünglich scheiterte: 21.259.996 Bytes.
    expect(chooseUploadStrategy(21_259_996)).toBe("files_api");
  });

  it("lehnt ab, was auch für die Files-API zu groß ist", () => {
    expect(chooseUploadStrategy(500 * 1024 * 1024)).toBe("too_large");
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
