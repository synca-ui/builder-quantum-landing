// @vitest-environment node
/**
 * Website-Prüfung des Präsenz-Workflows (server/maitr/praesenz/website.ts).
 *
 * Jede Prüfung wird zu einem Befund in der App ("Speisekarte auffindbar",
 * "Online-Reservierung", "Mobil lesbar") und teils zu einem Score-Signal. Ein
 * falsches "fehlt" schickt den Wirt los, etwas zu reparieren, das längst da ist;
 * ein falsches "da" verschweigt ihm eine Lücke. Die HTML-Schnipsel unten sind
 * den Mustern echter Gastronomie-Seiten nachgebaut (WordPress mit Yoast-@graph,
 * Wix-Array-Typen, OpenTable-Loader wie auf kleiner-kiepenkerl.de).
 *
 * `pruefeWebsite` selbst geht über `safeFetch` (SSRF-Schranke). Hier ist
 * `safeFetch` gemockt: Geprüft wird, dass die Adresse DORTHIN geht und dass
 * dessen Fehler zu einem lesbaren "nicht erreichbar" werden - kein Netz.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { safeFetchMock } = vi.hoisted(() => ({ safeFetchMock: vi.fn() }));

vi.mock("../services/safeFetch", async (importOriginal) => {
  const echt = await importOriginal<typeof import("../services/safeFetch")>();
  return { ...echt, safeFetch: safeFetchMock };
});

import {
  bereinigterWebsiteFehler,
  pruefeWebsite,
  speisekarteVerlinkt,
  websiteNichtErreichbar,
  websitePruefungAus,
} from "../maitr/praesenz/website";
import { SafeFetchError } from "../services/safeFetch";

const KOPF_MOBIL = `<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>
    Haus Töller – Kölsches Brauhaus
  </title>
</head>`;

/** Yoast-Muster: ein @graph, der Betrieb mit Typ-ARRAY, Adresse und Zeiten. */
const JSON_LD_RESTAURANT = `<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[
  {"@type":"WebSite","@id":"https://www.haus-toeller.de/#website","name":"Haus Töller"},
  {"@type":["Restaurant","LocalBusiness"],"@id":"https://www.haus-toeller.de/#restaurant",
   "name":"Haus Töller",
   "address":{"@type":"PostalAddress","streetAddress":"Weyerstraße 96","postalCode":"50676","addressLocality":"Köln"},
   "openingHoursSpecification":[
     {"@type":"OpeningHoursSpecification","dayOfWeek":["Monday","Tuesday","Wednesday","Thursday","Friday"],"opens":"17:00","closes":"23:59"},
     {"@type":"OpeningHoursSpecification","dayOfWeek":"Saturday","opens":"12:00","closes":"23:59"},
     {"@type":"OpeningHoursSpecification","dayOfWeek":"Sunday","opens":"00:00","closes":"00:00"}
   ]}
]}
</script>`;

const OPENTABLE = `<script type="text/javascript" src="//www.opentable.de/widget/reservation/loader?rid=169746&type=standard&theme=standard&color=1&dark=false&iframe=true&domain=de&lang=de-DE&newtab=false&ot_source=Restaurant%20website"></script>`;

describe("websitePruefungAus - eine vollständige Seite", () => {
  const html = `<!doctype html><html lang="de">${KOPF_MOBIL}<body>
    <nav>
      <a href="/">Start</a>
      <a href="/unsere-kueche/" class="menu-item">Speisekarte</a>
      <a href="/anfahrt/">Anfahrtskarte</a>
    </nav>
    ${JSON_LD_RESTAURANT}
    ${OPENTABLE}
    <footer><a href="https://www.instagram.com/haustoeller/" target="_blank" rel="noopener">Instagram</a></footer>
  </body></html>`;

  const befund = websitePruefungAus(html, "https://www.haus-toeller.de/", 812);

  it("erkennt Viewport, Titel, HTTPS und die Ladezeit", () => {
    expect(befund).toMatchObject({
      url: "https://www.haus-toeller.de/",
      erreichbar: true,
      https: true,
      mobilTauglich: true,
      titel: "Haus Töller – Kölsches Brauhaus",
      ladezeitMs: 812,
    });
  });

  it("erkennt den schema.org-Betrieb auch mit @type als Array im @graph", () => {
    expect(befund.strukturierteDaten).toBe(true);
  });

  it("findet die Speisekarte über den Linktext, auch wenn das Ziel nichts verrät", () => {
    expect(befund.speisekarteVerlinkt).toBe(true);
  });

  it("erkennt die eingebettete OpenTable-Reservierung samt Buchungsadresse", () => {
    expect(befund.reservierung).toEqual({
      anbieter: "OpenTable",
      url: "https://www.opentable.de/restref/client/?rid=169746&restref=169746&lang=de-DE",
    });
  });

  it("findet Öffnungszeiten, Adresse und Instagram", () => {
    expect(befund.oeffnungszeitenGefunden).toBe(true);
    expect(befund.adresseGefunden).toBe(true);
    expect(befund.instagram).toBe("https://www.instagram.com/haustoeller/");
    expect(befund).not.toHaveProperty("facebook");
  });
});

describe("websitePruefungAus - eine karge Seite", () => {
  const html = `<!doctype html><html><head><title>Willkommen</title></head><body>
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"Willkommen"}</script>
    <a href="/anfahrt">Anfahrtskarte</a>
    <a href="https://www.google.com/maps/place/Haus+T%C3%B6ller">Karte ansehen</a>
    <p>Wir freuen uns auf Ihren Besuch!</p>
  </body></html>`;

  const befund = websitePruefungAus(html, "http://haus-toeller.de/");

  it("meldet jede Lücke als Lücke", () => {
    expect(befund).toEqual({
      url: "http://haus-toeller.de/",
      erreichbar: true,
      https: false,
      titel: "Willkommen",
      mobilTauglich: false,
      // Ein WebSite-Knoten ist kein Betrieb - Google liest daraus weder Adresse noch Zeiten.
      strukturierteDaten: false,
      // "Anfahrtskarte" und "Karte ansehen" sind keine Speisekarte.
      speisekarteVerlinkt: false,
      oeffnungszeitenGefunden: false,
      adresseGefunden: false,
    });
  });

  it("setzt keine Ladezeit, wenn keine gemessen wurde", () => {
    expect(befund).not.toHaveProperty("ladezeitMs");
    expect(befund).not.toHaveProperty("reservierung");
  });
});

describe("speisekarteVerlinkt", () => {
  it("zählt ein PDF-Ziel, auch mit nichtssagendem Linktext", () => {
    expect(speisekarteVerlinkt(`<a href="/wp-content/uploads/2026/03/karte.pdf" target="_blank">Download (PDF, 2 MB)</a>`)).toBe(
      true,
    );
    expect(speisekarteVerlinkt(`<a href="https://cdn.example.de/menu.pdf"><img src="pdf.svg" alt=""></a>`)).toBe(true);
  });

  it("zählt Getränke- und Mittagskarte, auch mit verschachteltem Markup im Linktext", () => {
    expect(speisekarteVerlinkt(`<a href="/drinks"><span class="icon"></span><span>Getränke</span></a>`)).toBe(true);
    expect(speisekarteVerlinkt(`<a href="/aktuell">Unser <strong>Mittagstisch</strong></a>`)).toBe(true);
  });

  it("zählt 'Anfahrtskarte' und ein bloßes 'Karte' NICHT", () => {
    expect(speisekarteVerlinkt(`<a href="/anfahrtskarte">Anfahrtskarte</a>`)).toBe(false);
    expect(speisekarteVerlinkt(`<a href="/kontakt#karte">Karte</a>`)).toBe(false);
    expect(speisekarteVerlinkt(`<a href="/gutscheine">Geschenkkarte</a>`)).toBe(false);
  });

  it("liest nur Links - ein Wort im Fließtext ist kein Link zur Karte", () => {
    expect(speisekarteVerlinkt(`<p>Unsere Speisekarte wechselt saisonal.</p>`)).toBe(false);
  });
});

describe("HTTPS-Erkennung", () => {
  it("richtet sich nach der Endadresse, nicht nach der eingegebenen", () => {
    // safeFetch folgt der Weiterleitung http → https; gewertet wird, wo der Gast landet.
    expect(websitePruefungAus("<html></html>", "https://www.haus-toeller.de/").https).toBe(true);
    expect(websitePruefungAus("<html></html>", "http://www.haus-toeller.de/").https).toBe(false);
    expect(websitePruefungAus("<html></html>", "HTTPS://WWW.HAUS-TOELLER.DE/").https).toBe(true);
  });
});

describe("websiteNichtErreichbar", () => {
  it("führt alle Befunde negativ und nennt den Grund", () => {
    expect(websiteNichtErreichbar("https://www.haus-toeller.de/", "timeout: nach 7000 ms abgebrochen")).toEqual({
      url: "https://www.haus-toeller.de/",
      erreichbar: false,
      https: true,
      mobilTauglich: false,
      strukturierteDaten: false,
      speisekarteVerlinkt: false,
      oeffnungszeitenGefunden: false,
      adresseGefunden: false,
      fehler: "timeout: nach 7000 ms abgebrochen",
    });
    expect(websiteNichtErreichbar("http://alt.example/", "dns").https).toBe(false);
  });
});

describe("pruefeWebsite", () => {
  beforeEach(() => {
    safeFetchMock.mockReset();
  });

  it("lädt über safeFetch mit Größen-, Zeit- und Typschranke und wertet die Endadresse aus", async () => {
    safeFetchMock.mockImplementation(async () => ({
      buffer: Buffer.from(`<html>${KOPF_MOBIL}<body></body></html>`, "utf8"),
      finalUrl: "https://www.haus-toeller.de/",
      bytes: 100,
    }));

    const befund = await pruefeWebsite("http://haus-toeller.de");

    expect(safeFetchMock).toHaveBeenCalledTimes(1);
    const [url, optionen] = safeFetchMock.mock.calls[0];
    expect(url).toBe("http://haus-toeller.de");
    expect(optionen).toMatchObject({
      maxBytes: expect.any(Number),
      timeoutMs: expect.any(Number),
      allowedContentTypes: expect.arrayContaining(["text/html"]),
    });
    // Unter der 26-s-Grenze des Netlify-Proxys, zusammen mit Places und Fotos.
    expect(optionen.timeoutMs).toBeLessThanOrEqual(7_000);

    expect(befund.url).toBe("https://www.haus-toeller.de/");
    expect(befund.https).toBe(true);
    expect(befund.erreichbar).toBe(true);
    expect(befund.mobilTauglich).toBe(true);
    expect(typeof befund.ladezeitMs).toBe("number");
  });

  /*
   * ANLASS (Prüfbefund): `fehler` war `${reason}: ${message}` aus safeFetch - mit
   * Hostname und aufgelöster Adresse. Das Feld wird gespeichert und an jedes
   * Mitglied ausgeliefert, die geprüfte Adresse ist über einen Analyse-Job
   * steuerbar: ein Orakel, ob ein interner Name existiert und worauf er zeigt.
   */
  describe("Fehlertext ohne Host und Adresse", () => {
    let warn: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    });
    afterEach(() => {
      warn.mockRestore();
    });

    it("macht aus einer SSRF-Sperre ein neutrales 'nicht erreichbar' - Details nur ins Log", async () => {
      safeFetchMock.mockImplementation(async () => {
        throw new SafeFetchError(
          "postgres.railway.internal löst auf eine nicht erlaubte Adresse auf (fd12:3456::1)",
          "blocked_address",
        );
      });
      const befund = await pruefeWebsite("http://postgres.railway.internal/");
      expect(befund).toMatchObject({
        url: "http://postgres.railway.internal/",
        erreichbar: false,
        fehler: "Die Seite ist nicht erreichbar.",
      });
      // Nichts vom Grund steht im Befund, der gespeichert und ausgeliefert wird.
      const ohneUrl = JSON.stringify({ ...befund, url: undefined });
      for (const verraeterisch of ["railway.internal", "fd12", "blocked_address", "löst auf"]) {
        expect(ohneUrl).not.toContain(verraeterisch);
      }
      // DNS-Fehler und Sperre sehen gleich aus - sonst verriete der Unterschied, ob ein Name existiert.
      safeFetchMock.mockImplementation(async () => {
        throw new SafeFetchError("Name nicht auflösbar: gibtsnicht.railway.internal", "dns");
      });
      expect((await pruefeWebsite("http://gibtsnicht.railway.internal/")).fehler).toBe(befund.fehler);
      // Der Server-Log behält den Grund.
      expect(warn.mock.calls.map((c) => String(c[0])).join("\n")).toContain("fd12:3456::1");
    });

    it("nennt harmlose Gründe als Sorte (Zeitüberschreitung), fremde Fehler als 'nicht erreichbar'", async () => {
      safeFetchMock.mockImplementation(async () => {
        throw new SafeFetchError("nach 7000 ms abgebrochen", "timeout");
      });
      await expect(pruefeWebsite("https://www.haus-toeller.de/")).resolves.toMatchObject({
        erreichbar: false,
        fehler: "Zeitüberschreitung - die Seite hat nicht rechtzeitig geantwortet.",
      });

      safeFetchMock.mockImplementation(async () => {
        throw new Error("connect ECONNREFUSED 10.0.0.5:443");
      });
      const befund = await pruefeWebsite("https://www.haus-toeller.de/");
      expect(befund).toMatchObject({ erreichbar: false, fehler: "Die Seite ist nicht erreichbar." });
      expect(JSON.stringify(befund)).not.toContain("10.0.0.5");
    });

    it("bereinigterWebsiteFehler: alte gespeicherte Texte mit Host werden beim Lesen neutral", () => {
      expect(bereinigterWebsiteFehler("blocked_address: db.internal löst auf eine nicht erlaubte Adresse auf (10.0.0.5)")).toBe(
        "Die Seite ist nicht erreichbar.",
      );
      expect(bereinigterWebsiteFehler("Zeitüberschreitung - die Seite hat nicht rechtzeitig geantwortet.")).toBe(
        "Zeitüberschreitung - die Seite hat nicht rechtzeitig geantwortet.",
      );
      expect(bereinigterWebsiteFehler(undefined)).toBeUndefined();
      expect(bereinigterWebsiteFehler("")).toBeUndefined();
    });
  });
});
