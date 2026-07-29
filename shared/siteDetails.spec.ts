import { describe, it, expect } from "vitest";
import {
  extractSiteDetails,
  formatAddress,
  absolutize,
  collectJsonLd,
  describeSiteDetails,
} from "./siteDetails";

/**
 * Diese Angaben fehlen dem Scrape nachweislich. Gegen Ausführung 632 gemessen
 * lieferte er für einen echten Betrieb address = '' und gar kein Logo – und
 * beides ist für die Web-App eines Restaurants keine Beigabe.
 */

const BASE = "https://kleiner-kiepenkerl.de/";

describe("absolutize", () => {
  it("macht relative Adressen absolut", () => {
    expect(absolutize("/wp-content/logo.png", BASE)).toBe(
      "https://kleiner-kiepenkerl.de/wp-content/logo.png",
    );
    expect(absolutize("bild.jpg", "https://x.test/unter/seite.html")).toBe(
      "https://x.test/unter/bild.jpg",
    );
  });

  it("lässt absolute Adressen unverändert", () => {
    expect(absolutize("https://cdn.test/a.png", BASE)).toBe("https://cdn.test/a.png");
  });

  it("verwirft Data-URIs", () => {
    // Die lassen sich nicht in den eigenen Speicher übernehmen und blähen die
    // Konfiguration auf.
    expect(absolutize("data:image/png;base64,AAAA", BASE)).toBeUndefined();
  });

  it("kommt mit Unbrauchbarem klar", () => {
    expect(absolutize("", BASE)).toBeUndefined();
    expect(absolutize(undefined, BASE)).toBeUndefined();
  });
});

describe("formatAddress", () => {
  it("setzt eine deutsche Adresse in üblicher Reihenfolge zusammen", () => {
    expect(
      formatAddress({
        streetAddress: "Spiekerhof 45",
        postalCode: "48143",
        addressLocality: "Münster",
      }),
    ).toBe("Spiekerhof 45, 48143 Münster");
  });

  it("lässt fehlende Teile aus, statt leere Kommas zu erzeugen", () => {
    // ", 48143 " sähe nach einem Fehler aus.
    expect(formatAddress({ postalCode: "48143", addressLocality: "Münster" })).toBe(
      "48143 Münster",
    );
    expect(formatAddress({ streetAddress: "Spiekerhof 45" })).toBe("Spiekerhof 45");
  });

  it("nimmt eine bereits fertige Zeichenkette an", () => {
    expect(formatAddress("Spiekerhof 45, 48143 Münster")).toBe(
      "Spiekerhof 45, 48143 Münster",
    );
  });

  it("liefert nichts bei leerer Eingabe", () => {
    expect(formatAddress(null)).toBeUndefined();
    expect(formatAddress({})).toBeUndefined();
  });
});

describe("collectJsonLd", () => {
  it("übersteht kaputte Auszeichnung, ohne die übrigen zu verlieren", () => {
    const html = `
      <script type="application/ld+json">{ kaputt </script>
      <script type="application/ld+json">{"@type":"Restaurant","name":"A"}</script>`;
    expect(collectJsonLd(html)).toHaveLength(1);
  });

  it("steigt in @graph ab", () => {
    const html = `<script type="application/ld+json">
      {"@graph":[{"@type":"WebSite"},{"@type":"Restaurant","name":"A"}]}</script>`;
    expect(collectJsonLd(html).some((n) => n["@type"] === "Restaurant")).toBe(true);
  });
});

describe("extractSiteDetails", () => {
  it("holt Adresse, Logo und soziale Netze aus strukturierten Daten", () => {
    const html = `<html><head><script type="application/ld+json">
    {"@context":"https://schema.org","@type":"Restaurant",
     "name":"Kleiner Kiepenkerl",
     "slogan":"Westfälisch seit 1900",
     "logo":{"url":"/wp-content/uploads/logo.png"},
     "address":{"@type":"PostalAddress","streetAddress":"Spiekerhof 45","postalCode":"48143","addressLocality":"Münster"},
     "sameAs":["https://www.instagram.com/kleinerkiepenkerl/","https://www.facebook.com/kiepenkerl"]}
    </script></head><body></body></html>`;

    const d = extractSiteDetails(html, BASE);
    expect(d.address).toBe("Spiekerhof 45, 48143 Münster");
    expect(d.logoUrl).toBe("https://kleiner-kiepenkerl.de/wp-content/uploads/logo.png");
    expect(d.slogan).toBe("Westfälisch seit 1900");
    expect(d.social?.instagram).toContain("instagram.com");
    expect(d.social?.facebook).toContain("facebook.com");
  });

  it("fällt für das Logo auf og:image zurück", () => {
    const html = `<html><head>
      <meta property="og:image" content="https://x.test/vorschau.jpg">
    </head><body></body></html>`;
    expect(extractSiteDetails(html, BASE).logoUrl).toBe("https://x.test/vorschau.jpg");
  });

  it("erkennt ein Symbol im Kopf der Seite", () => {
    const html = `<html><head>
      <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
    </head></html>`;
    expect(extractSiteDetails(html, BASE).logoUrl).toBe(
      "https://kleiner-kiepenkerl.de/icons/apple-touch-icon.png",
    );
  });

  it("erkennt ein Bild, das sich selbst Logo nennt", () => {
    const html = `<body><img class="site-logo" src="/img/logo-kiepenkerl.svg" alt="Logo"></body>`;
    expect(extractSiteDetails(html, BASE).logoUrl).toBe(
      "https://kleiner-kiepenkerl.de/img/logo-kiepenkerl.svg",
    );
  });

  it("findet das Logo auch bei Lazy-Loading in data-src", () => {
    // Viele WordPress-Themes lassen src leer und füllen erst per Skript.
    const html = `<img class="logo" src="platzhalter.gif" data-src="/echtes-logo.png" alt="Logo">`;
    expect(extractSiteDetails(html, BASE).logoUrl).toBe(
      "https://kleiner-kiepenkerl.de/echtes-logo.png",
    );
  });

  it("zieht soziale Netze notfalls aus gewöhnlichen Links", () => {
    const html = `<footer>
      <a href="https://www.instagram.com/kleinerkiepenkerl/">Instagram</a>
      <a href="https://www.facebook.com/kiepenkerl">Facebook</a>
      <a href="/impressum">Impressum</a>
    </footer>`;
    const d = extractSiteDetails(html, BASE);
    expect(d.social?.instagram).toBe("https://www.instagram.com/kleinerkiepenkerl/");
    expect(d.social?.facebook).toBe("https://www.facebook.com/kiepenkerl");
  });

  it("bevorzugt strukturierte Daten vor der Heuristik", () => {
    // Sonst gewänne ein beliebiges Bild mit "logo" im Namen über die saubere
    // Angabe im Markup.
    const html = `
      <script type="application/ld+json">
      {"@type":"Restaurant","logo":"https://x.test/richtig.png"}</script>
      <img class="logo" src="/falsch.png">`;
    expect(extractSiteDetails(html, BASE).logoUrl).toBe("https://x.test/richtig.png");
  });

  it("nimmt die Beschreibung aus og:description, wenn keine strukturierte da ist", () => {
    const html = `<meta name="description" content="Westfälische Küche in Münster">`;
    expect(extractSiteDetails(html, BASE).description).toBe(
      "Westfälische Küche in Münster",
    );
  });

  it("liefert ein leeres Ergebnis, wenn die Seite nichts hergibt", () => {
    const d = extractSiteDetails("<html><body><p>Hallo</p></body></html>", BASE);
    expect(d.logoUrl).toBeUndefined();
    expect(d.address).toBeUndefined();
    expect(describeSiteDetails(d)).toEqual([]);
  });
});

describe("describeSiteDetails", () => {
  it("benennt, was gefunden wurde", () => {
    const lines = describeSiteDetails({
      logoUrl: "https://x/l.png",
      address: "Spiekerhof 45, 48143 Münster",
      social: { instagram: "https://instagram.com/x" },
    });
    expect(lines).toContain("Logo");
    expect(lines.join(" ")).toMatch(/Spiekerhof/);
    expect(lines).toContain("Instagram");
  });
});
