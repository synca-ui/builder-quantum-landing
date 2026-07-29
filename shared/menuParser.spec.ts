import { describe, it, expect } from "vitest";
import {
  parseMenuText,
  findPrices,
  cleanItemName,
  detectCategory,
  menuQuality,
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
