import { describe, it, expect } from "vitest";
import {
  parseMenuText,
  findPrices,
  cleanItemName,
  detectCategory,
  menuQuality,
  refineCategories,
  extractAllergenCodes,
  parseAllergenLegend,
  extractLabels,
} from "./menuParser";

/**
 * Die Speisekarte entscheidet über den automatischen Modus. Deshalb prüft
 * dieser Block nicht nur die Randfälle, sondern ganze Karten in genau der Form,
 * in der Gemini-OCR und PDF-Textextraktion sie liefern.
 */

describe("findPrices", () => {
  it("erkennt Preise mit Nachkommastellen, mit Komma wie mit Punkt", () => {
    expect(findPrices("Schnitzel 18,90")[0].value).toBe("18.90");
    expect(findPrices("Schnitzel 18.90")[0].value).toBe("18.90");
  });

  it("erkennt die deutsche Strich-Schreibweise – daran scheiterte die alte Fassung", () => {
    // "12,-" heißt zwölf Euro. Auf deutschen Karten die übliche Schreibweise.
    expect(findPrices("Currywurst 9,-")[0].value).toBe("9.00");
    expect(findPrices("Currywurst 9,–")[0].value).toBe("9.00");
    expect(findPrices("Currywurst 9,—")[0].value).toBe("9.00");
  });

  it("erkennt ganze Zahlen nur mit Währungszeichen", () => {
    expect(findPrices("Kaffee € 3")[0].value).toBe("3.00");
    expect(findPrices("Kaffee 3 €")[0].value).toBe("3.00");
    expect(findPrices("Kaffee 3 EUR")[0].value).toBe("3.00");
  });

  it("hält eine nackte Zahl NICHT für einen Preis", () => {
    // Sonst kostet "Pizza mit 4 Sorten Käse" vier Euro.
    expect(findPrices("Pizza mit 4 Sorten Käse")).toHaveLength(0);
    expect(findPrices("Burger mit 2 Patties")).toHaveLength(0);
  });

  it("verwechselt Uhrzeiten nicht mit Preisen", () => {
    expect(findPrices("Küche von 12.00 Uhr bis 22.00 Uhr")).toHaveLength(0);
    expect(findPrices("Mittagstisch 11:30 - 14:30 Uhr")).toHaveLength(0);
  });

  it("verwechselt Telefonnummern nicht mit Preisen", () => {
    expect(findPrices("0251 43416")).toHaveLength(0);
  });

  it("wirft Werte außerhalb eines plausiblen Preisbereichs weg", () => {
    expect(findPrices("Jahrgang 1998,00")).toHaveLength(0); // zu groß
    expect(findPrices("Aufschlag 0,10")).toHaveLength(0); // zu klein
  });

  it("findet mehrere Preise und liefert sie in Lesereihenfolge", () => {
    const hits = findPrices("Pizza Margherita klein 8,50 groß 12,50");
    expect(hits.map((h) => h.value)).toEqual(["8.50", "12.50"]);
  });

  it("zählt einen Preis mit Währungszeichen nicht doppelt", () => {
    expect(findPrices("Schnitzel 18,90 €")).toHaveLength(1);
    expect(findPrices("Schnitzel € 18,90")).toHaveLength(1);
  });
});

describe("cleanItemName", () => {
  it("entfernt Führungspunkte", () => {
    expect(cleanItemName("Wiener Schnitzel ..........")).toBe("Wiener Schnitzel");
    expect(cleanItemName("Rumpsteak – – – – –")).toBe("Rumpsteak");
  });

  it("entfernt Allergenkennzeichnung am Ende", () => {
    expect(cleanItemName("Schnitzel (1,2,3)")).toBe("Schnitzel");
    expect(cleanItemName("Käsespätzle (A, C)")).toBe("Käsespätzle");
    expect(cleanItemName("Pommes*")).toBe("Pommes");
    expect(cleanItemName("Salat¹²")).toBe("Salat");
  });

  it("lässt Klammern mitten im Namen stehen", () => {
    // Nur die Kennzeichnung am ENDE ist Rauschen, eine echte Angabe nicht.
    expect(cleanItemName("Pasta (hausgemacht) mit Pesto")).toBe(
      "Pasta (hausgemacht) mit Pesto",
    );
  });

  it("räumt Aufzählungszeichen ab", () => {
    expect(cleanItemName("• Tomatensuppe")).toBe("Tomatensuppe");
    expect(cleanItemName("- Gulaschsuppe")).toBe("Gulaschsuppe");
  });
});

describe("detectCategory", () => {
  it("erkennt bekannte Überschriften", () => {
    expect(detectCategory("Vorspeisen")).toBe("Vorspeisen");
    expect(detectCategory("Unsere Suppen")).toBe("Suppen");
    expect(detectCategory("Desserts & Süßes")).toBe("Desserts");
  });

  it("übernimmt eigene Großbuchstaben-Überschriften", () => {
    expect(detectCategory("UNSERE EMPFEHLUNGEN")).toBe("Unsere Empfehlungen");
  });

  it("hält eine Zeile mit Preis nie für eine Überschrift", () => {
    expect(detectCategory("Suppe des Tages 5,50")).toBeNull();
  });

  it("hält Fließtext nicht für eine Überschrift", () => {
    expect(
      detectCategory(
        "Wir verwenden ausschließlich frische Zutaten aus der Region und legen großen Wert",
      ),
    ).toBeNull();
  });
});

describe("detectCategory: Strenge gegen OCR-Fließtext", () => {
  it("hält eine Beschreibungszeile mit Stichwort NICHT für eine Überschrift", () => {
    // Genau daran zerbrach die erste echte Karte: "…auf Toast" kippte die
    // laufende Kategorie auf Sandwiches, "…dazu Salat und Brot" auf Salate –
    // danach war die halbe Einsortierung falsch.
    expect(detectCategory("Frische Pfifferlinge auf Toast")).toBeNull();
    expect(detectCategory("dazu Salat und Brot")).toBeNull();
    expect(detectCategory("serviert mit Kaffee")).toBeNull();
  });

  it("hält einen Gerichtnamen mit Kategorie-Silbe nicht für eine Überschrift", () => {
    // "Hochzeitssuppe" enthält "suppe" – ist aber ein Gericht, keine Rubrik.
    expect(detectCategory("Münsterländer Hochzeitssuppe")).toBeNull();
  });

  it("erkennt echte Überschriften weiterhin", () => {
    expect(detectCategory("Suppen")).toBe("Suppen");
    // Geprüft wird nur das Kernwort hinter dem Einleitungswort – "Getränke"
    // statt "Heißgetränke" ist der bewusste Preis für die Strenge oben.
    expect(detectCategory("Warme Getränke")).toBe("Getränke");
    expect(detectCategory("Heißgetränke")).toBe("Heißgetränke");
    expect(detectCategory("Vom Grill")).toBe("Vom Grill");
    expect(detectCategory("Fisch & Meeresfrüchte")).toBe("Fisch");
  });
});

describe("cleanItemName: Mengen-Reste der Texterkennung", () => {
  it("trägt Größen- und Preisfolgen am Ende ab", () => {
    // Die erste echte Karte lieferte "Bier vom Fass 0,31 4,10 0,4 1" – die
    // Texterkennung verliest das Liter-l als 1.
    expect(cleanItemName("Bier vom Fass 0,31 4,10 0,4 1")).toBe("Bier vom Fass");
    expect(cleanItemName("Weinschorle - Weiß/Rot/Rosé 0,21")).toBe(
      "Weinschorle - Weiß/Rot/Rosé",
    );
    expect(cleanItemName("Pfirsich Eistee 0,3 1")).toBe("Pfirsich Eistee");
  });

  it("lässt Zahlen stehen, die zum Namen gehören", () => {
    expect(cleanItemName("Restaurant 1900")).toBe("Restaurant 1900");
  });
});

describe("refineCategories: Nachkorrektur am Gerichtnamen", () => {
  const item = (name, category) => ({ id: name, name, category });

  it("holt Nachtisch aus den Getränken und Getränke aus dem Nachtisch", () => {
    // Beides stand so auf der ersten veröffentlichten Seite.
    const out = refineCategories([
      item("Kaiserschmarrn", "Weine"),
      item("Pfirsich Eistee", "Desserts"),
    ]);
    expect(out[0].category).toBe("Desserts");
    expect(out[1].category).toBe("Getränke");
  });

  it("respektiert die Überschrift innerhalb einer Gruppe", () => {
    // Tomatensuppe unter Vorspeisen ist die Entscheidung des Wirts.
    const out = refineCategories([
      item("Tomatensuppe", "Vorspeisen"),
      item("Wiener Schnitzel", "Hauptgerichte"),
    ]);
    expect(out[0].category).toBe("Vorspeisen");
    expect(out[1].category).toBe("Hauptgerichte");
  });

  it("holt Suppen aus dem Auffangwert heraus", () => {
    // Hauptgerichte heißt oft nur "keine Überschrift gesehen".
    const out = refineCategories([item("Pfifferling-Rahmsuppe", "Hauptgerichte")]);
    expect(out[0].category).toBe("Suppen");
  });

  it("lässt die Weinschorle nicht bei den Weinen landen", () => {
    // Reihenfolge der Regeln: Schorle vor Wein.
    const out = refineCategories([item("Weinschorle", "Cocktails")]);
    expect(out[0].category).toBe("Cocktails"); // beides Getränke – kein Eingriff
  });

  it("fasst Unbekanntes nicht an", () => {
    const out = refineCategories([item("Land und Meer", "Biere")]);
    expect(out[0].category).toBe("Biere"); // kein Stichwort im Namen
  });
});

describe("parseMenuText: ganze Karten", () => {
  it("liest eine gewöhnliche Karte mit Überschriften und Beschreibungen", () => {
    const text = `
Vorspeisen

Tomatensuppe 5,50
mit frischem Basilikum und Croutons

Rindercarpaccio 12,90
mit Rucola und Parmesan

Hauptgerichte

Wiener Schnitzel 18,90
vom Kalb, mit Bratkartoffeln und Preiselbeeren

Rumpsteak 26,50
`.trim();

    const items = parseMenuText(text);
    expect(items).toHaveLength(4);

    expect(items[0]).toMatchObject({
      name: "Tomatensuppe",
      price: "5.50",
      category: "Vorspeisen",
      description: "mit frischem Basilikum und Croutons",
    });
    expect(items[2]).toMatchObject({
      name: "Wiener Schnitzel",
      price: "18.90",
      category: "Hauptgerichte",
    });
    expect(items[3]).toMatchObject({ name: "Rumpsteak", price: "26.50" });
    expect(items[3].description).toBeUndefined();
  });

  it("liest Karten mit Führungspunkten", () => {
    const text = `
Klassiker
Currywurst mit Pommes ................ 9,50
Schweinshaxe ......................... 16,90
`.trim();
    const items = parseMenuText(text);
    expect(items.map((i) => i.name)).toEqual([
      "Currywurst mit Pommes",
      "Schweinshaxe",
    ]);
    expect(items.map((i) => i.price)).toEqual(["9.50", "16.90"]);
  });

  it("liest eine zweispaltige Karte, bei der die OCR den Preis in die nächste Zeile setzt", () => {
    // Genau so sieht eine zweispaltige Karte nach der Texterkennung aus –
    // die alte Fassung fand hier NICHTS, weil sie nur dieselbe Zeile ansah.
    const text = `
Hauptgerichte
Gulasch vom Rind
16,90
Käsespätzle
13,50
Forelle Müllerin
19,80
`.trim();
    const items = parseMenuText(text);
    expect(items.map((i) => i.name)).toEqual([
      "Gulasch vom Rind",
      "Käsespätzle",
      "Forelle Müllerin",
    ]);
    expect(items.map((i) => i.price)).toEqual(["16.90", "13.50", "19.80"]);
  });

  it("nimmt in zweispaltigen Karten die Beschreibung ZWISCHEN Name und Preis", () => {
    const text = `
Hauptgerichte
Gulasch vom Rind
mit hausgemachten Semmelknödeln
16,90
Käsespätzle
13,50
`.trim();
    const items = parseMenuText(text);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      name: "Gulasch vom Rind",
      description: "mit hausgemachten Semmelknödeln",
      price: "16.90",
    });
    // Und das nächste Gericht darf dabei nicht verloren gehen.
    expect(items[1]).toMatchObject({ name: "Käsespätzle", price: "13.50" });
  });

  it("liest die deutsche Strich-Schreibweise in einer ganzen Karte", () => {
    const text = `
Getränke
Pils 0,3l 3,50
Weizen 0,5l 4,-
Apfelschorle 0,4l 3,80
Espresso 2,-
`.trim();
    const items = parseMenuText(text);
    expect(items).toHaveLength(4);
    expect(items.find((i) => i.name.includes("Weizen"))?.price).toBe("4.00");
    expect(items.find((i) => i.name.includes("Espresso"))?.price).toBe("2.00");
  });

  it("wirft Fußzeilen und Hinweise weg", () => {
    const text = `
Hauptgerichte
Schnitzel 15,90
Alle Preise inkl. 19% MwSt.
Öffnungszeiten: Mo-Fr 11.00 - 22.00 Uhr
Allergene entnehmen Sie bitte unserer Kennzeichnung
Tel. 0251 43416
Seite 2
Rouladen 17,50
`.trim();
    const items = parseMenuText(text);
    expect(items.map((i) => i.name)).toEqual(["Schnitzel", "Rouladen"]);
  });

  it("führt Doppelungen zusammen", () => {
    // Karten wiederholen Positionen (Tagesempfehlung + Hauptteil). Zweimal
    // dasselbe Gericht sieht in der Web-App nach einem Fehler aus.
    const text = `
Empfehlung des Tages
Wiener Schnitzel 18,90
Hauptgerichte
Wiener Schnitzel 18,90
Rumpsteak 26,50
`.trim();
    const items = parseMenuText(text);
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.name)).toEqual(["Wiener Schnitzel", "Rumpsteak"]);
  });

  it("vergibt stabile IDs – gleicher Text, gleiche IDs", () => {
    // Die alte Fassung benutzte Date.now()+Math.random(): Bei jedem erneuten
    // Scrape galten dieselben Gerichte als neu.
    const text = "Hauptgerichte\nWiener Schnitzel 18,90\nRumpsteak 26,50";
    const a = parseMenuText(text);
    const b = parseMenuText(text);
    expect(a.map((i) => i.id)).toEqual(b.map((i) => i.id));
    expect(a[0].id).toContain("wiener-schnitzel");
  });

  it("nimmt keine Beschreibung, die in Wahrheit die nächste Überschrift ist", () => {
    const text = `
Vorspeisen
Suppe 5,50
Hauptgerichte
Schnitzel 15,90
`.trim();
    const items = parseMenuText(text);
    expect(items[0].description).toBeUndefined();
    expect(items[1].category).toBe("Hauptgerichte");
  });

  it("erzeugt kein Gericht aus einem Namen ohne Buchstaben", () => {
    const items = parseMenuText("Hauptgerichte\n0,5 l 4,50");
    expect(items.every((i) => /[A-Za-zÄÖÜäöüß]/.test(i.name))).toBe(true);
  });

  it("kommt mit leerer und unbrauchbarer Eingabe klar", () => {
    expect(parseMenuText("")).toEqual([]);
    expect(parseMenuText("   \n \n ")).toEqual([]);
    expect(parseMenuText(undefined as unknown as string)).toEqual([]);
    expect(parseMenuText("Lorem ipsum dolor sit amet")).toEqual([]);
  });

  it("nimmt den ersten Preis, wenn eine Zeile mehrere trägt", () => {
    const items = parseMenuText("Pizza\nPizza Margherita klein 8,50 groß 12,50");
    expect(items[0].price).toBe("8.50");
  });
});

describe("menuQuality", () => {
  it("hält drei Gerichte mit Preis für brauchbar", () => {
    const items = parseMenuText(
      "Hauptgerichte\nSchnitzel 15,90\nRouladen 17,50\nGulasch 14,90",
    );
    const q = menuQuality(items);
    expect(q.count).toBe(3);
    expect(q.withPrice).toBe(3);
    expect(q.usable).toBe(true);
  });

  it("hält ein einzelnes Gericht für zu wenig", () => {
    // Ein Treffer aus einer zwölfseitigen Karte heißt: Erkennung gescheitert.
    // Dann lieber noch einmal anders lesen als so ausliefern.
    const q = menuQuality(parseMenuText("Hauptgerichte\nSchnitzel 15,90"));
    expect(q.usable).toBe(false);
  });

  it("hält gar nichts für nicht brauchbar", () => {
    expect(menuQuality([]).usable).toBe(false);
  });
});

/**
 * A1.2 aus dem Feedback vom 6.8.2026: "Zusatzpunkte einer Speise (Beilagen,
 * Varianten, 'dazu…') als Teil des Gerichts darstellen, nicht als eigenes
 * Gericht."
 *
 * Am Messkorpus vom 7.8.2026 gemessen war das der teuerste Einzelfehler: Sehr
 * viele deutsche Karten brechen den Gerichtnamen um und setzen den Preis ans
 * Ende der zweiten Zeile. Der Parser nahm dann die zweite Zeile als Namen und
 * warf die erste weg — beim Gasthof Rössle 9 von 11 Gerichten.
 */
describe("Gerichtname über zwei Zeilen (A1.2)", () => {
  const karte = [
    "Selbstgemachte schwäbische Maultaschen mit Zwiebelschmelze,",
    "dazu Kartoffelsalat - 11,50 €",
    "Rahmhackbraten mit Champignonrahmsoße,",
    "dazu Butterspätzle - 8,90 €",
  ].join("\n");

  it("nimmt den Namen aus der ersten Zeile, nicht die Beilage aus der zweiten", () => {
    const items = parseMenuText(karte);
    expect(items).toHaveLength(2);
    expect(items[0].name).toBe(
      "Selbstgemachte schwäbische Maultaschen mit Zwiebelschmelze",
    );
    expect(items[0].price).toBe("11.50");
    expect(items[1].name).toBe("Rahmhackbraten mit Champignonrahmsoße");
  });

  it("macht aus der Beilagenzeile die Beschreibung", () => {
    const items = parseMenuText(karte);
    expect(items[0].description).toBe("dazu Kartoffelsalat");
    expect(items[1].description).toBe("dazu Butterspätzle");
  });

  it("erzeugt kein Gericht namens 'dazu …'", () => {
    // Die Gegenprobe zum Fehlerbild: genau so hieß es vorher in der Web-App.
    const namen = parseMenuText(karte).map((i) => i.name.toLowerCase());
    expect(namen.some((n) => n.startsWith("dazu"))).toBe(false);
  });

  it("erkennt die Fortsetzung auch ohne Komma am Zeilenende", () => {
    const items = parseMenuText(
      "Wiener Schnitzel vom Kalb\nmit Pommes und Salat 18,90 €",
    );
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Wiener Schnitzel vom Kalb");
    expect(items[0].description).toBe("mit Pommes und Salat");
  });

  it("hält zwei getrennte Gerichte weiterhin auseinander", () => {
    // Die Gegenrichtung: Ohne Fortsetzungszeichen darf nichts zusammenfallen.
    const items = parseMenuText("Tomatensuppe 5,50 €\nGulasch 16,50 €");
    expect(items).toHaveLength(2);
    expect(items[0].name).toBe("Tomatensuppe");
    expect(items[1].name).toBe("Gulasch");
  });
});

describe("Kategorien auf durchgehend großgeschriebenen Karten (A1.1)", () => {
  it("macht aus einer Beilagenzeile keine Rubrik", () => {
    // Auf der Karte "Zur Post" ergab das 19 Kategorien statt 7, darunter
    // "Mit Pommes Und Beilagensalat" und "Dazu Pommes".
    expect(detectCategory("MIT POMMES UND BEILAGENSALAT")).toBeNull();
    expect(detectCategory("DAZU POMMES")).toBeNull();
    expect(detectCategory("MIT BÖHMISCHEN KNÖDELN UND PREISELBEEREN")).toBeNull();
  });

  it("verwirft den Rest eines umbrochenen Satzes", () => {
    // "AUS DEM GARTEN DER SAISON" wird beim Umbruch zu "DER SAISON".
    expect(detectCategory("DER SAISON")).toBeNull();
  });

  it("erkennt echte Großbuchstaben-Rubriken weiterhin", () => {
    expect(detectCategory("AUS DEM SUPPENTOPF")).toBe("Aus Dem Suppentopf");
    expect(detectCategory("AUS DER PFANNE")).toBe("Aus Der Pfanne");
    // "Klassiker" ist ein bekanntes Stichwort und gewinnt vor der Eigenrubrik.
    expect(detectCategory("UNSERE KLASSIKER")).toBe("Hauptgerichte");
    expect(detectCategory("ZEHNTSTUBE")).toBe("Zehntstube");
    expect(detectCategory("BROTZEITEN")).toBe("Brotzeiten");
  });

  it("wirft Kopfzeilen weg, die auf jeder Seite wiederkehren", () => {
    // Der Betriebsname stand auf jeder der vier Seiten und wurde zur Rubrik,
    // unter der dann die halbe Karte einsortiert war.
    const karte = [
      "„ZUR POST“ HOTEL",
      "VORSPEISEN",
      "Forelle 12,90 €",
      "„ZUR POST“ HOTEL",
      "Schnitzel 15,90 €",
      "„ZUR POST“ HOTEL",
      "Gulasch 16,90 €",
    ].join("\n");
    const kategorien = new Set(parseMenuText(karte).map((i) => i.category));
    expect(kategorien.has("„zur Post“ Hotel")).toBe(false);
    expect(parseMenuText(karte)).toHaveLength(3);
  });
});

/**
 * A1.3 aus dem Feedback vom 6.8.2026: "Labels und Allergene je Gericht
 * erkennen — Erkennung darauf trainieren."
 *
 * Vorher gab es dafür kein Feld: Auf den 12 vermessenen Karten standen 87
 * Kennzeichnungen, erkannt wurden 0. Die Kürzel wurden sogar aktiv entfernt.
 *
 * Der springende Punkt, an zwei echten Karten belegt: Die Zuordnung
 * Kürzel -> Stoff ist JE KARTE VERSCHIEDEN. Beim Landgasthof zum Löwen ist "f"
 * die Milch, bei der Kneipe am Kirchplatz ist Milch "g". Eine fest verdrahtete
 * Tabelle wäre nicht unvollständig, sondern falsch — und bei einer
 * Kennzeichnungspflicht ist eine falsche Angabe schlimmer als keine.
 */
describe("Allergene (A1.3)", () => {
  describe("extractAllergenCodes", () => {
    it("liest die geklammerte Schreibweise", () => {
      expect(extractAllergenCodes("Gemüsecremesuppe (a1, j, f) 6,50")).toEqual([
        "a1",
        "j",
        "f",
      ]);
      expect(extractAllergenCodes("Rösti (o) 14,50")).toEqual(["o"]);
    });

    it("hält eine Mengenangabe NICHT für eine Kennzeichnung", () => {
      // "(ca. 250 g)" enthält ein "g" — und das heißt je nach Karte Sesam oder
      // Milch. Ein Hüftsteak mit erfundener Milchangabe ist der teuerste
      // denkbare Fehler dieser Funktion.
      expect(extractAllergenCodes("Hüftsteak (ca. 250 g) 24,80")).toEqual([]);
      expect(extractAllergenCodes("Schweinemedaillons (durchgegart)")).toEqual([]);
      expect(extractAllergenCodes("Penne (scharf) 12,90")).toEqual([]);
    });

    it("liest hochgestellte Ziffern", () => {
      expect(extractAllergenCodes("Wiener Schnitzel¹² 18,90")).toEqual(["1", "2"]);
    });

    it("liest die ungeklammerte Schreibweise NUR mit Legende", () => {
      const zeile = "würzige Lauch-Käse-Cremesuppe   a, g";
      // Ohne Legende: kein Risiko eingehen.
      expect(extractAllergenCodes(zeile)).toEqual([]);
      // Mit Legende: eindeutig.
      expect(extractAllergenCodes(zeile, new Set(["a", "g"]))).toEqual(["a", "g"]);
    });

    it("hält ein Wortende nicht für ein Kürzel", () => {
      // "…und Ei" endet auf zwei Buchstaben wie ein Kürzel. Weil "ei" nicht in
      // der Legende steht, bleibt es ein Wort.
      expect(
        extractAllergenCodes("Rösti mit Speck und Ei", new Set(["a", "g"])),
      ).toEqual([]);
    });
  });

  describe("parseAllergenLegend", () => {
    it("liest die Schreibweise 'Name=Kürzel'", () => {
      const legende = parseAllergenLegend(
        "Allergene:\nWeizen=a1, Roggen=a2,\nMilch/Laktose=f,\nSenf=k, Soja=l,",
      );
      expect(legende.a1).toBe("Weizen");
      expect(legende.f).toBe("Milch/Laktose");
      expect(legende.l).toBe("Soja");
    });

    it("liest die Schreibweise 'Kürzel: Name'", () => {
      const legende = parseAllergenLegend(
        "Liste der Allergene:\na: Glutenhaltiges Getreide\ng: Milch und daraus gewonnene Erzeugnisse\n1: mit Farbstoff",
      );
      expect(legende.a).toBe("Glutenhaltiges Getreide");
      expect(legende.g).toBe("Milch und daraus gewonnene Erzeugnisse");
      expect(legende["1"]).toBe("mit Farbstoff");
    });

    it("verwechselt eine Gerichtszeile nicht mit einer Legende", () => {
      // "Tagesempfehlung: Rinderroulade" sieht aus wie "Kürzel: Name" — ohne
      // den Legendenkopf davor darf das nicht greifen.
      const legende = parseAllergenLegend("Tagesempfehlung: Rinderroulade 18,90");
      expect(Object.keys(legende)).toHaveLength(0);
    });

    it("liefert nichts, wenn es keine Legende gibt", () => {
      expect(parseAllergenLegend("Schnitzel 18,90\nGulasch 16,50")).toEqual({});
      expect(parseAllergenLegend("")).toEqual({});
    });
  });

  describe("im ganzen Durchlauf", () => {
    const karte = [
      "Suppen",
      "Gemüsecremesuppe (a1, j, f) 6,50",
      "Hüftsteak (ca. 250 g)",
      "mit frischen Pfifferlingen in Rahm (f, o) 24,80",
      "Allergene:",
      "Weizen=a1, Milch/Laktose=f, Lupinen=j, Knoblauch=o,",
    ].join("\n");

    it("hängt die Kennzeichnung ans Gericht", () => {
      const items = parseMenuText(karte);
      const suppe = items.find((i) => i.name.includes("Gemüsecremesuppe"));
      expect(suppe?.allergens).toEqual(["a1", "j", "f"]);
    });

    it("nimmt auch die Kennzeichnung von der Fortsetzungszeile mit", () => {
      // Beim Hüftsteak steht sie an der zweiten Zeile, nicht am Namen.
      const steak = parseMenuText(karte).find((i) => i.name.includes("Hüftsteak"));
      expect(steak?.allergens).toEqual(["f", "o"]);
    });

    it("lässt die Kürzel nicht im Namen stehen", () => {
      const namen = parseMenuText(karte).map((i) => i.name);
      expect(namen.some((n) => n.includes("(a1"))).toBe(false);
      expect(namen.some((n) => n.includes("(f,"))).toBe(false);
    });

    it("setzt kein leeres Feld, wenn nichts gekennzeichnet ist", () => {
      // Ein leeres Array liest sich wie "geprüft, nichts enthalten" — das hat
      // niemand behauptet.
      const items = parseMenuText("Schnitzel 18,90");
      expect(items[0].allergens).toBeUndefined();
    });
  });
});

describe("Labels (A1.3)", () => {
  it("erkennt die gebräuchlichen Ernährungs-Labels", () => {
    expect(extractLabels("Gemüsecurry (vegan)")).toEqual(["vegan"]);
    expect(extractLabels("Walnussknödel vegetarisch")).toEqual(["vegetarisch"]);
    expect(extractLabels("Penne Spezial (scharf)")).toEqual(["scharf"]);
    expect(extractLabels("Reisbowl vegan, glutenfrei")).toEqual([
      "vegan",
      "glutenfrei",
    ]);
  });

  it("hält Werbesprache nicht für ein Label", () => {
    // Am Korpus geprüft: "hausgemacht" und "regional" stehen in fast jedem
    // zweiten Gerichtnamen. Ein Label, das überall steht, sagt nichts.
    expect(extractLabels("Reinerts hausgemachte Rinderkraftbrühe")).toEqual([]);
    expect(extractLabels("Regionale Zutaten aus dem Umland")).toEqual([]);
  });

  it("hängt das Label ans Gericht, nicht an die Rubrik", () => {
    // Unter der Rubrik "Vegetarisch" darf nicht jedes Gericht das Label
    // erben — dort steht auch mal etwas mit Speck daneben.
    const items = parseMenuText(
      "Vegetarisch\nGemüsecurry (vegan) 12,50\nBauernomelett mit Speck 11,00",
    );
    expect(items[0].labels).toEqual(["vegan"]);
    expect(items[1].labels).toBeUndefined();
  });
});

/**
 * Die folgenden Fälle stammen alle aus dem Messkorpus vom 7.8.2026 — jeder
 * hat auf einer echten Karte Gerichte gekostet. Sie stehen hier, damit sie
 * nicht zurückkommen.
 */
describe("Muster echter Karten", () => {
  it("hält einen Namen über vier Zeilen zusammen", () => {
    // Landgasthof zum Löwen: Name, drei Beschreibungszeilen, Preis am Ende.
    // Vorher hieß das Gericht "Spiegelei und Salat" — jede weitere
    // Beschreibungszeile überschrieb den Namen.
    const items = parseMenuText(
      [
        "Löwentoast",
        "kleines Schnitzel auf Toast,",
        "mit frischen Champignons,",
        "Spiegelei und Salat 14,40",
      ].join("\n"),
    );
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Löwentoast");
    expect(items[0].price).toBe("14.40");
    expect(items[0].description).toContain("kleines Schnitzel auf Toast");
    expect(items[0].description).toContain("Spiegelei und Salat");
  });

  it("verschluckt den nächsten Gerichtnamen nicht als Beschreibung", () => {
    // Der Preis des zweiten Gerichts steht zwei Zeilen weiter — ein Blick von
    // nur einer Zeile reichte nicht.
    const items = parseMenuText(
      [
        "Gemüsecremesuppe 6,50",
        "Hüftsteak (ca. 250 g)",
        "mit frischen Pfifferlingen in Rahm",
        "und eine Beilage nach Wahl 24,80",
      ].join("\n"),
    );
    expect(items).toHaveLength(2);
    expect(items[1].name).toBe("Hüftsteak (ca. 250 g)");
    expect(items[1].price).toBe("24.80");
  });

  it("erkennt den Preis hinter einer Beschriftung", () => {
    // Landgasthaus zum Schwarzbachtal: "à la carte 27,00". Ohne diese Regel
    // hieß das Gericht "à la carte" — und "à" fiel zusätzlich durch die
    // Kleinbuchstaben-Prüfung, die nur a-z kannte.
    const items = parseMenuText(
      ["Rumpsteak", "mit Kräuterbutter,", "à la carte 27,00 €"].join("\n"),
    );
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Rumpsteak");
    expect(items[0].price).toBe("27.00");
  });

  it("lässt sich von 'zzgl. Beilage' nicht das Gericht wegnehmen", () => {
    // Gasthof Pesterwitz: "16,95 € zzgl. Beilage Ihrer Wahl". Die Rauschregel
    // für "zzgl." war für die Mehrwertsteuer gedacht und traf hier die
    // Preiszeile — 27 von 56 Gerichten gingen dadurch verloren.
    const items = parseMenuText(
      ["Zanderfilet", "Gebraten nach Müllerin Art", "16,95 € zzgl. Beilage Ihrer Wahl"].join("\n"),
    );
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Zanderfilet");
    expect(items[0].price).toBe("16.95");
  });

  it("wirft eine Steuerzeile weiterhin weg", () => {
    // Die Gegenrichtung: Der ursprüngliche Zweck der Regel muss erhalten bleiben.
    expect(parseMenuText("Alle Preise zzgl. MwSt. 19,00")).toHaveLength(0);
    expect(parseMenuText("Preise inkl. 19 % MwSt. 19,00")).toHaveLength(0);
  });

  it("macht aus einem Urlaubshinweis keine Gerichte", () => {
    // Rotes Roß: "Urlaub vom 02.08.26 bis einschl. 14.08.26" ergab zwei
    // Gerichte zu 2,08 € und 14,08 €.
    expect(
      parseMenuText("Urlaub vom 02.08.26 bis einschl.14.08.26"),
    ).toHaveLength(0);
  });

  it("hält ein Datum nicht für einen Preis", () => {
    expect(findPrices("Aktion am 02.08.26")).toHaveLength(0);
    // Ein echter Preis in derselben Schreibweise bleibt einer.
    expect(findPrices("Schnitzel 18,90")[0].value).toBe("18.90");
  });
});

/**
 * A1.2, zweiter Teil: Aufpreise und Größen gehören AN das Gericht.
 * Vorher stand auf der Karte des Landgasthofs zum Löwen ein eigenständiges
 * Gericht namens "Käse" für 1,20 € neben dem Rumpsteak.
 */
describe("Varianten und Aufpreise (A1.2)", () => {
  const karte = [
    "Salatteller 7,90",
    "Käse + 1,20",
    "Ei + 1,20",
    "3 Riesengarnelen + 5,40",
  ].join("\n");

  it("macht aus Aufpreisen keine eigenen Gerichte", () => {
    const items = parseMenuText(karte);
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Salatteller");
  });

  it("hängt sie als Varianten ans Gericht", () => {
    const extras = parseMenuText(karte)[0].extras ?? [];
    expect(extras.map((e) => e.name)).toEqual(["Käse", "Ei", "3 Riesengarnelen"]);
    expect(extras[0].price).toBe("1.20");
    expect(extras[2].price).toBe("5.40");
  });

  it("erkennt Größen und Portionen", () => {
    const items = parseMenuText(
      ["Café Crème 3,50", "Tasse 3,50", "Pott 4,50", "kleine Portion 10,00"].join("\n"),
    );
    expect(items).toHaveLength(1);
    expect((items[0].extras ?? []).map((e) => e.name)).toEqual([
      "Tasse",
      "Pott",
      "kleine Portion",
    ]);
  });

  it("gibt der Variante ihre eigene Kennzeichnung", () => {
    // Ein "Käse +" bringt Milch mit, das Schnitzel darunter nicht. Sie
    // hochzureichen hieße, dem Grundgericht ein Allergen anzudichten.
    const items = parseMenuText(
      ["Allergene:", "Milch=f", "Schnitzel 15,90", "Käse + (f) 1,20"].join("\n"),
    );
    expect(items[0].allergens).toBeUndefined();
    expect(items[0].extras?.[0].allergens).toEqual(["f"]);
  });

  it("lässt eine Variante ohne Gericht davor nicht verschwinden", () => {
    // Lieber eine unschöne Position als eine verschwundene.
    const items = parseMenuText("Käse + 1,20");
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Käse +");
  });
});

/**
 * Der Mittagstisch: Wochentag als Überschrift, Gerichte darunter, der Preis
 * einmal für alles. Eine der häufigsten Strukturen auf deutschen Gastro-Seiten
 * — und bis zum 7.8.2026 vollständig unsichtbar, weil ein Gericht nur dort
 * entstand, wo ein Preis stand.
 */
describe("Mittagstisch nach Wochentagen", () => {
  const karte = [
    "Unser Tagesessen mit Suppe und Hauptgang für 12,00€",
    "Montag",
    "Spanferkel-Rollbraten mit Serviettenknödel und Salat",
    "Hausgemachtes Tiramisu",
    "Donnerstag",
    "Gemüsecremesuppe",
    "Fleischküchle mit Pfefferrahmsauce",
  ].join("\n");

  it("erkennt die Gerichte auch ohne eigenen Preis", () => {
    const namen = parseMenuText(karte).map((i) => i.name);
    expect(namen).toContain("Spanferkel-Rollbraten mit Serviettenknödel und Salat");
    expect(namen).toContain("Hausgemachtes Tiramisu");
    expect(namen).toContain("Gemüsecremesuppe");
  });

  it("nimmt den Wochentag als Kategorie", () => {
    const items = parseMenuText(karte);
    const tiramisu = items.find((i) => i.name.includes("Tiramisu"));
    expect(tiramisu?.category).toBe("Montag");
    const suppe = items.find((i) => i.name === "Gemüsecremesuppe");
    expect(suppe?.category).toBe("Donnerstag");
  });

  it("macht aus einer Öffnungszeiten-Tabelle keine Speisekarte", () => {
    // Die Gegenprobe. Ohne die Zeitprüfung stünde hier ein Gericht namens
    // "11:30 - 14:00 Uhr" unter der Kategorie "Montag".
    const items = parseMenuText(
      ["Öffnungszeiten", "Montag", "11:30 - 14:00 Uhr", "Dienstag", "Ruhetag"].join("\n"),
    );
    expect(items).toHaveLength(0);
  });

  it("hört beim nächsten Abschnitt auf", () => {
    const items = parseMenuText(
      ["Montag", "Rinderroulade mit Klößen", "Vorspeisen", "Forelle 12,90"].join("\n"),
    );
    expect(items.map((i) => i.name)).toEqual([
      "Rinderroulade mit Klößen",
      "Forelle",
    ]);
    expect(items[1].category).toBe("Vorspeisen");
  });

  it("hält einen Datumsbereich nicht für einen Preis", () => {
    // "Tagesessen 03.08.- 07.08.2026" ergab ein Gericht "Tagesessen" zu 3,08 €.
    expect(findPrices("Tagesessen 03.08.- 07.08.2026")).toHaveLength(0);
    expect(parseMenuText("Tagesessen 03.08.- 07.08.2026")).toHaveLength(0);
  });
});

/**
 * Der teuerste denkbare Fehler dieser Datei: eine Allergenangabe, die auf der
 * Karte nicht steht. Jemand mit einer Unverträglichkeit trifft danach eine
 * Entscheidung — deshalb ist eine fehlende Angabe besser als eine erfundene.
 */
describe("Erfundene Allergene", () => {
  it("hält Füllmengen und Herkunftskürzel nicht für Kennzeichnungen", () => {
    expect(extractAllergenCodes("Weißbier (0,5l) 4,90")).toEqual([]);
    expect(extractAllergenCodes("Rindersteak (DE) 27,50")).toEqual([]);
    expect(extractAllergenCodes("Apfelsaft (BIO) 3,50")).toEqual([]);
    expect(extractAllergenCodes("Hüftsteak (ca. 250 g) 24,80")).toEqual([]);
  });

  it("nimmt ohne Legende nur die klassischen Kürzelformen", () => {
    // Ziffer, Buchstabe, Buchstabe+Ziffer — mehr ist ohne Legende nicht sicher.
    expect(extractAllergenCodes("Schnitzel (1,2) 18,90")).toEqual(["1", "2"]);
    expect(extractAllergenCodes("Suppe (f) 5,50")).toEqual(["f"]);
    expect(extractAllergenCodes("Brot (a1) 3,00")).toEqual(["a1"]);
  });

  it("richtet sich nach der Legende, wenn die Karte eine hat", () => {
    const bekannt = new Set(["a", "g"]);
    // In der Legende: wird genommen.
    expect(extractAllergenCodes("Suppe (a, g) 6,50", bekannt)).toEqual(["a", "g"]);
    // Nicht in der Legende: bleibt liegen, auch wenn die Form passt.
    expect(extractAllergenCodes("Suppe (z) 6,50", bekannt)).toEqual([]);
  });

  it("erzeugt aus einer ganzen Karte keine Kennzeichnung, die nicht dasteht", () => {
    // Gegenprobe über den ganzen Durchlauf, ohne Legende.
    const items = parseMenuText(
      ["Weißbier (0,5l) 4,90", "Rindersteak (DE) 27,50"].join("\n"),
    );
    expect(items.every((i) => !i.allergens)).toBe(true);
  });
});

/**
 * Zwei Fehler, die eine Opus-Durchsicht am 7.8.2026 ausführend nachgewiesen
 * hat. Beide trafen ausgerechnet die zweispaltige Karte — die Form, für die
 * dieser Parser überhaupt gebaut wurde. Die damals bestehenden 84 Tests
 * blieben bei beiden grün.
 */
describe("Zweispaltige Karten: Preis in der Folgezeile", () => {
  it("überlebt eine Beilagenzeile, die sich wiederholt", () => {
    // Der Seitenmöbel-Filter erklärte jede preislose Zeile ab dem dritten
    // Vorkommen zur Kopfzeile — und nahm mit clearPending() den anstehenden
    // Gerichtnamen mit. "mit Semmelknödeln und Salat" steht auf einer echten
    // Schnitzelkarte fünf- bis zehnmal. Ergebnis vorher: NULL Gerichte.
    const karte = [
      "Gulasch vom Rind",
      "mit Semmelknödeln und Salat",
      "16,90",
      "Rinderroulade",
      "mit Semmelknödeln und Salat",
      "17,90",
      "Kalbsbraten",
      "mit Semmelknödeln und Salat",
      "18,90",
    ].join("\n");
    const items = parseMenuText(karte);
    expect(items.map((i) => i.name)).toEqual([
      "Gulasch vom Rind",
      "Rinderroulade",
      "Kalbsbraten",
    ]);
    expect(items.map((i) => i.price)).toEqual(["16.90", "17.90", "18.90"]);
  });

  it("macht aus einem Gerichtnamen mit Rubrik-Stichwort keine Rubrik", () => {
    // Die Überschriftenbremse fragte setztFort mit dem Text VOR dem Preis.
    // Steht der Preis allein in der Zeile, ist dieser Text leer — und
    // setztFort gibt auf Leeres per Definition false zurück. Die Bremse griff
    // in zweispaltigen Karten also nie: "Zwiebelsuppe" wurde zur Rubrik
    // "Suppen", "Rumpsteak" zu "Vom Grill", beide Gerichte verschwanden.
    const karte = [
      "Speisen",
      "Zwiebelsuppe",
      "5,50",
      "Gulasch",
      "16,90",
      "Rumpsteak",
      "24,00",
    ].join("\n");
    const items = parseMenuText(karte);
    expect(items.map((i) => i.name)).toEqual([
      "Zwiebelsuppe",
      "Gulasch",
      "Rumpsteak",
    ]);
    expect(items.map((i) => i.price)).toEqual(["5.50", "16.90", "24.00"]);
  });

  it("erkennt echte Rubriken in zweispaltigen Karten weiterhin", () => {
    // Die Gegenrichtung: Die Bremse darf nicht ALLES durchlassen.
    const items = parseMenuText(
      ["Vorspeisen", "Forelle", "12,90", "Suppen", "Tagessuppe", "5,50"].join("\n"),
    );
    expect(items.find((i) => i.name === "Forelle")?.category).toBe("Vorspeisen");
    expect(items.find((i) => i.name === "Tagessuppe")?.category).toBe("Suppen");
  });

  it("wirft eine echte Kopfzeile weiterhin weg, ohne das Gericht zu verlieren", () => {
    // Der Betriebsname zwischen Name und Preis — in mehrseitigen PDFs die
    // Regel. Er darf verschwinden, das Gericht nicht.
    const karte = [
      "„ZUR POST“ HOTEL",
      "Forelle",
      "„ZUR POST“ HOTEL",
      "12,90",
      "Schnitzel",
      "„ZUR POST“ HOTEL",
      "15,90",
    ].join("\n");
    const items = parseMenuText(karte);
    expect(items.map((i) => i.name)).toEqual(["Forelle", "Schnitzel"]);
    expect(
      items.every((i) => !String(i.category).includes("Post")),
    ).toBe(true);
  });
});
