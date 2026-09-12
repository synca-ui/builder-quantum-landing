/**
 * DishList — die geteilte Gerichte-Liste der Templates mit eigenem Layout.
 *
 * Geprüft wird, was die Entwürfe zeigen und was ein Bestands-Template nie
 * hatte: laufende Nummern im Register, der Zähler „01 — 03 / 05“, Rahmen-
 * kästen im 2×2-Raster mit Füllzelle bei ungerader Zahl, Punktlinien-Zeilen
 * ohne Euro-Zeichen, kursive Kategorie-Überschriften in Kobalt.
 */
import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { DishList } from "../DishList";
import {
  EIGENE_TEMPLATES,
  getTemplateLayout,
  waehleHighlights,
} from "@/lib/templateLayout";
import type { MenuItem } from "@/types/domain";

const ITEMS: MenuItem[] = [
  {
    id: "m1",
    name: "Karaage",
    description: "Yuzu-Mayo",
    price: 8.5,
    category: "Kleine Teller",
  },
  {
    id: "m2",
    name: "Nasu Dengaku",
    description: "Miso, Aubergine",
    price: 7,
    category: "Kleine Teller",
    isHighlight: true,
  },
  {
    id: "m3",
    name: "Gyoza, 6 Stk.",
    description: "Schwein, Lauch",
    price: 7.5,
    category: "Kleine Teller",
  },
  {
    id: "m4",
    name: "Highball",
    description: "Toki, Soda",
    price: 9,
    category: "Getränke",
  },
  {
    id: "m5",
    name: "Sake Junmai",
    description: "0,1 l",
    price: 6,
    category: "Getränke",
  },
] as MenuItem[];

const FARBEN = {
  fontColor: "#1E1B16",
  priceColor: "#1E1B16",
  primaryColor: "#9C2B22",
  secondaryColor: "#D8CFBE",
  backgroundColor: "#F5F0E6",
};

function highlights(template: string, anzahl: number) {
  return render(
    <DishList
      template={template}
      modus="highlights"
      alle={ITEMS}
      anzeigen={waehleHighlights(ITEMS, anzahl)}
      categories={["Kleine Teller", "Getränke"]}
      onAlle={() => {}}
      {...FARBEN}
    />,
  );
}

function karte(template: string) {
  return render(
    <DishList
      template={template}
      modus="karte"
      alle={ITEMS}
      anzeigen={ITEMS}
      categories={["Kleine Teller", "Getränke"]}
      gruppieren
      {...FARBEN}
    />,
  );
}

describe("kiosk — numeriertes Register", () => {
  test("Leiste mit Zähler, Nummern aus der ganzen Karte, Preise mit Komma", () => {
    const { container, getByText, getByLabelText } = highlights("kiosk", 3);
    expect(getByText("Register")).toBeInTheDocument();
    // Highlights: m2 (markiert) zuerst, dann m1, m3 → Positionen 02, 01, 03
    expect(
      getByLabelText("Ganze Karte anzeigen").textContent?.replace(/\s+/g, " "),
    ).toBe("01 — 03 / 05");
    const zeilen = container.querySelectorAll('[data-dish-variant="register"]');
    expect(zeilen).toHaveLength(3);
    expect(zeilen[0].textContent).toContain("02");
    expect(zeilen[0].textContent).toContain("7,00");
    expect(zeilen[1].textContent).toContain("01");
    expect(zeilen[1].textContent).toContain("8,50");
    expect(container.textContent).not.toContain("€");
  });

  test("Speisekarte gruppiert mit Zähler je Kategorie", () => {
    const { container, getByText } = karte("kiosk");
    expect(getByText("Kleine Teller")).toBeInTheDocument();
    expect(getByText("Getränke")).toBeInTheDocument();
    expect(
      container.querySelectorAll('[data-dish-variant="register"]'),
    ).toHaveLength(5);
    // Nummern folgen der Position in der ganzen Karte: Highball ist Nr. 04
    const highball = Array.from(container.querySelectorAll("article")).find(
      (a) => a.textContent?.includes("Highball"),
    );
    expect(highball?.textContent).toContain("04");
  });
});

describe("izakaya — Rahmenkästen 2×2", () => {
  test("vier Highlights im Raster, Leiste „Heute 4 von 5“", () => {
    const { container, getByText, getByLabelText } = highlights("izakaya", 4);
    expect(getByText("Heute")).toBeInTheDocument();
    expect(getByLabelText("Ganze Karte anzeigen").textContent).toBe("4 von 5");
    expect(
      container.querySelectorAll('[data-dish-variant="box"]'),
    ).toHaveLength(4);
    // gerade Anzahl → keine Füllzelle
    expect(
      container.querySelectorAll('section [aria-hidden="true"]:not(img)')
        .length,
    ).toBe(
      // Bildplatzhalter (4 Kästen ohne Bild) — aber keine leere Füllzelle:
      4,
    );
    expect(container.querySelector(".grid.grid-cols-2")).not.toBeNull();
  });

  test("ungerade Kategorie bekommt eine Füllzelle, damit das Raster schließt", () => {
    const { container } = karte("izakaya");
    const raster = container.querySelectorAll(".grid.grid-cols-2");
    expect(raster).toHaveLength(2); // je Kategorie ein Raster
    // „Kleine Teller“ hat 3 Kästen → 3 Kästen + 1 Füllzelle = 4 Kinder
    expect(raster[0].children).toHaveLength(4);
    // „Getränke“ hat 2 Kästen → keine Füllzelle
    expect(raster[1].children).toHaveLength(2);
  });
});

describe("presse — Punktlinien", () => {
  test("Kategorie-Kapitälchen, ganze Beträge ohne Nachkommastellen, kein Euro", () => {
    const { container, getByText } = karte("presse");
    expect(getByText("Kleine Teller").className).toContain("uppercase");
    const zeilen = container.querySelectorAll('[data-dish-variant="leader"]');
    expect(zeilen).toHaveLength(5);
    const highball = Array.from(zeilen).find((a) =>
      a.textContent?.includes("Highball"),
    );
    expect(highball?.textContent).toContain("9");
    expect(highball?.textContent).not.toContain("9,00");
    expect(highball?.querySelector(".border-dotted")).not.toBeNull();
    expect(container.textContent).not.toContain("€");
  });

  test("Highlights stehen unter Kategorie-Überschriften und führen zur Karte", () => {
    const { getByText } = highlights("presse", 3);
    expect(getByText("Kleine Teller")).toBeInTheDocument();
    expect(getByText("Zur Karte")).toBeInTheDocument();
  });
});

describe("morgen — Linienkarte", () => {
  test("kursive Kobalt-Überschrift mit Linie, Preise in Primärfarbe", () => {
    const { container, getByText } = karte("morgen");
    const kopf = getByText("Kleine Teller");
    expect(kopf.className).toContain("italic");
    expect((kopf as HTMLElement).style.color).toBe("rgb(156, 43, 34)"); // primaryColor
    expect(
      container.querySelectorAll('[data-dish-variant="ruled"]'),
    ).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// Zweite Runde
// ---------------------------------------------------------------------------

describe("vitrine — Fotokacheln", () => {
  test("ohne ein einziges Bild: schlichte Liste statt Platzhalter-Raster, Leiste „Empfehlungen“", () => {
    const { container, getByText, getByLabelText } = highlights("vitrine", 4);
    expect(getByText("Empfehlungen").className).toContain("text-[17px]");
    expect(
      getByLabelText("Ganze Karte anzeigen").textContent?.replace(/\s+/g, " "),
    ).toBe("Alle 5 →");
    expect(container.querySelector(".grid.grid-cols-2")).toBeNull();
    const zeilen = container.querySelectorAll(
      '[data-dish-variant="foto"][data-form="zeile"]',
    );
    expect(zeilen).toHaveLength(4);
    expect(zeilen[0].querySelector('[aria-hidden="true"]')?.textContent).toBe(
      "N",
    );
    expect(container.textContent).not.toContain("€");
  });

  test("mit Bildern: offenes 2er-Raster aus Kacheln, Gerichte ohne Bild bekommen den Anfangsbuchstaben", () => {
    const mitBild = ITEMS.map((it, i) =>
      i === 0 ? { ...it, imageUrl: "https://bilder.example/karaage.jpg" } : it,
    );
    const { container } = render(
      <DishList
        template="vitrine"
        modus="karte"
        alle={mitBild}
        anzeigen={mitBild}
        categories={["Kleine Teller", "Getränke"]}
        gruppieren
        {...FARBEN}
      />,
    );
    expect(container.querySelector(".grid.grid-cols-2.gap-3")).not.toBeNull();
    const kacheln = container.querySelectorAll(
      '[data-dish-variant="foto"][data-form="kachel"]',
    );
    expect(kacheln).toHaveLength(5);
    expect(kacheln[0].querySelector("img")?.getAttribute("src")).toContain(
      "karaage.jpg",
    );
    expect(kacheln[1].querySelector("img")).toBeNull();
    expect(kacheln[1].querySelector('[aria-hidden="true"]')?.textContent).toBe(
      "N",
    );
  });
});

describe("gelato — Sticker", () => {
  test("Leiste „Lieblinge“ mit zwei Kugeln", () => {
    const { getByText, getByLabelText } = highlights("gelato", 3);
    const kopf = getByText("Lieblinge").closest("h3")!;
    expect(kopf.querySelectorAll(".rounded-full")).toHaveLength(2);
    expect(getByLabelText("Ganze Karte anzeigen").className).toContain(
      "rounded-full",
    );
  });

  test("getönte Karte, Kreis mit Zeichen, Preis in der Pille", () => {
    const { container } = karte("gelato");
    const zeile = container.querySelector(
      '[data-dish-variant="sticker"]',
    ) as HTMLElement;
    expect(zeile.style.borderRadius).toContain("--radius-card");
    expect(zeile.querySelector(".rounded-full")).not.toBeNull();
    const pille = Array.from(zeile.querySelectorAll("span")).find(
      (el) => el.textContent === "8,50",
    );
    expect(pille?.className).toContain("rounded-full");
    expect((pille as HTMLElement).style.backgroundColor).toBe(
      "rgb(30, 27, 22)",
    ); // priceColor
  });
});

describe("brauhaus — Strichlinien und Ornament", () => {
  test("gestrichelte Linie zum Preis, Rauten in der Kategorie-Überschrift", () => {
    const { container, getByText } = karte("brauhaus");
    expect(
      container.querySelectorAll('[data-dish-variant="strich"]'),
    ).toHaveLength(5);
    expect(container.querySelector(".border-dashed")).not.toBeNull();
    const kopf = getByText("Kleine Teller").closest("h3")!;
    expect(kopf.textContent).toContain("◆");
  });

  test("Emojis werden in keiner Form gerendert — auch nicht als Platzhalter", () => {
    const mitEmoji = [{ ...ITEMS[0], emoji: "🍗" }] as MenuItem[];
    for (const t of EIGENE_TEMPLATES.concat("minimalist", "modern")) {
      const { container, unmount } = render(
        <DishList
          template={t}
          modus="karte"
          alle={mitEmoji}
          anzeigen={mitEmoji}
          {...FARBEN}
        />,
      );
      expect(container.textContent, t).not.toContain("🍗");
      expect(container.querySelector("h3")?.textContent, t).toContain(
        "Karaage",
      );
      unmount();
    }
  });
});

describe("ramen — Haarlinie und Siegel", () => {
  test("kurzer Strich in der Primärfarbe unter jedem Namen, Quadrat vor der Kategorie", () => {
    const { container, getByText } = karte("ramen");
    const zeilen = container.querySelectorAll('[data-dish-variant="hairline"]');
    expect(zeilen).toHaveLength(5);
    const strich = zeilen[0].querySelector(".w-4.h-px") as HTMLElement;
    expect(strich.style.backgroundColor).toBe("rgb(156, 43, 34)"); // primaryColor
    const quadrat = getByText("Kleine Teller")
      .closest("h3")!
      .querySelector(".w-2.h-2") as HTMLElement;
    expect(quadrat.style.backgroundColor).toBe("rgb(156, 43, 34)");
  });

  test("Highlights führen über „Zur Karte“", () => {
    const { getByText } = highlights("ramen", 3);
    expect(getByText("Zur Karte")).toBeInTheDocument();
  });
});

describe("imbiss — Schild", () => {
  test("Leiste als schwarzer Balken mit „Ganze Karte“", () => {
    const { getByText, getByLabelText } = highlights("imbiss", 3);
    const balken = getByText("Highlights").parentElement as HTMLElement;
    expect(balken.style.backgroundColor).toBe("rgb(30, 27, 22)");
    expect(getByLabelText("Ganze Karte anzeigen").textContent).toContain(
      "Ganze Karte",
    );
  });

  test("gefüllter Kategorie-Balken, Preis als Schild, Linie unter der letzten Zeile", () => {
    const { container, getByText } = karte("imbiss");
    const kopf = getByText("Kleine Teller");
    expect(kopf.className).toContain("uppercase");
    expect(kopf.style.backgroundColor).toBe("rgb(30, 27, 22)"); // fontColor als Fläche
    const zeilen = container.querySelectorAll('[data-dish-variant="schild"]');
    expect(zeilen).toHaveLength(5);
    const schild = Array.from(zeilen[0].querySelectorAll("span")).find(
      (el) => el.textContent === "8,50",
    ) as HTMLElement;
    expect(schild.style.backgroundColor).toBe("rgb(30, 27, 22)");
    // Die Liste selbst trägt die Linie unter der letzten Zeile
    expect(
      (zeilen[0].parentElement as HTMLElement).style.borderBottom,
    ).toContain("2px solid");
  });
});

describe("konditorei — Mittelachse", () => {
  test("zentrierte Zeilen, Preis 16 px in der Serife, Beschreibung 15 px/500, „Zur Karte“ mittig", () => {
    const { container } = karte("konditorei");
    const zeile = container.querySelector('[data-dish-variant="zentriert"]')!;
    expect(zeile.className).toContain("text-center");
    const preis = Array.from(zeile.querySelectorAll("span")).find(
      (el) => el.textContent === "8,50",
    ) as HTMLElement;
    expect(preis.className).toContain("text-[16px]");
    expect(preis.className).not.toContain("uppercase");
    expect(preis.style.fontFamily).toContain("font-template-display");
    const beschreibung = zeile.querySelector("p") as HTMLElement;
    expect(beschreibung.className).toContain("text-[15px]");
    expect(beschreibung.style.fontWeight).toBe("500");
    const { getByText } = highlights("konditorei", 3);
    expect(getByText("Zur Karte").closest("button")!.className).toContain(
      "mx-auto",
    );
  });
});

describe("roesterei — Etiketten als Band", () => {
  test("Highlights wischen im Band, jedes Etikett trägt Nummer und Rubrik, Leiste zählt", () => {
    const { container, getByText, getByLabelText } = highlights("roesterei", 4);
    expect(getByText("Auswahl")).toBeInTheDocument();
    expect(
      getByLabelText("Ganze Karte anzeigen").textContent?.replace(/\s+/g, " "),
    ).toBe("04 / 05 →");
    const band = container.querySelector(".overflow-x-auto") as HTMLElement;
    expect(band).not.toBeNull();
    const etiketten = band.querySelectorAll('[data-dish-variant="etikett"]');
    expect(etiketten).toHaveLength(4);
    expect(etiketten[0].className).toContain("w-[220px]");
    // Erstes Highlight ist m2 (markiert) → Nummer 02, Rubrik „Kleine Teller“
    expect(etiketten[0].textContent).toContain("N° 02");
    expect(etiketten[0].textContent).toContain("Kleine Teller");
  });

  test("auf der Karte kein Band, sondern eine Spalte mit Luft", () => {
    const { container } = karte("roesterei");
    expect(container.querySelector(".overflow-x-auto")).toBeNull();
    expect(container.querySelector(".flex.flex-col.gap-2")).not.toBeNull();
  });
});

describe("markt — Preisschild zuerst", () => {
  test("Leiste „Frisch heute“ mit Zähler", () => {
    const { getByText, getByLabelText } = highlights("markt", 3);
    expect(getByText("Frisch heute")).toBeInTheDocument();
    expect(
      getByLabelText("Ganze Karte anzeigen").textContent?.replace(/\s+/g, " "),
    ).toBe("3 von 5 →");
  });

  test("das erste Kind jeder Zeile ist der Preis, gefüllt in der Preisfarbe", () => {
    const { container } = karte("markt");
    const zeile = container.querySelector(
      '[data-dish-variant="preisschild"]',
    ) as HTMLElement;
    const erstes = zeile.firstElementChild as HTMLElement;
    expect(erstes.textContent).toBe("8,50");
    expect(erstes.style.backgroundColor).toBe("rgb(30, 27, 22)");
    const kopf = container.querySelector("h3") as HTMLElement;
    expect(kopf.style.borderBottom).toContain("rgb(156, 43, 34)"); // primaryColor
  });
});

describe("aperitivo — Kreisbild im Raster", () => {
  test("vier Highlights als getönte Karten mit Kreis in der Primärfarbe, Leiste im Marker", () => {
    const { container, getByText, getByLabelText } = highlights("aperitivo", 4);
    expect(getByText("Unsere Favoriten").className).toContain("rounded-md");
    expect(getByLabelText("Ganze Karte anzeigen").textContent).toContain(
      "Zur Karte",
    );
    expect(container.querySelector(".grid.grid-cols-2.gap-3")).not.toBeNull();
    const karten = container.querySelectorAll('[data-dish-variant="kreis"]');
    expect(karten).toHaveLength(4);
    const kreis = karten[0].querySelector(".rounded-full") as HTMLElement;
    expect(kreis.style.backgroundColor).toBe("rgb(156, 43, 34)");
  });
});

describe("hofladen — Karteikarten", () => {
  test("gestrichelter Rahmen, kursive Überschrift mit kurzem Strich", () => {
    const { container, getByText } = karte("hofladen");
    const zeile = container.querySelector(
      '[data-dish-variant="karteikarte"]',
    ) as HTMLElement;
    expect(zeile.style.border).toContain("dashed");
    const kopf = getByText("Kleine Teller");
    expect(kopf.className).toContain("italic");
    expect(kopf.parentElement!.querySelector(".w-6")).not.toBeNull();
  });
});

describe("Kennzeichnung — Kürzel, Labels, Legende", () => {
  const GEKENNZEICHNET: MenuItem[] = [
    {
      id: "k1",
      name: "Karaage",
      price: 8.5,
      category: "Kleine Teller",
      allergens: ["a", "c"],
      labels: ["scharf"],
    },
    {
      id: "k2",
      name: "Gemüse-Gyoza",
      price: 7,
      category: "Kleine Teller",
      allergens: ["A", "f"],
      labels: ["vegan", "glutenfrei"],
    },
    {
      id: "k3",
      name: "Highball",
      price: 9,
      category: "Getränke",
      allergens: ["2"],
    },
  ] as MenuItem[];
  const LEGENDE = {
    a: "Glutenhaltiges Getreide",
    c: "Eier",
    "2": "mit Farbstoff",
    g: "Milch",
  };

  // ALLE Formen, nicht fünf: Ein Copy-Paste-Fehler in einer der elf anderen
  // fiel vorher nicht auf (Prüfung Runde 8, M6).
  test.each(EIGENE_TEMPLATES.concat("minimalist", "modern"))(
    "'%s': Kürzel hinter dem Namen, Labels als Zeile, Legende nur mit erklärten Kürzeln",
    (t) => {
      const { container } = render(
        <DishList
          template={t}
          modus="karte"
          alle={GEKENNZEICHNET}
          anzeigen={GEKENNZEICHNET}
          categories={["Kleine Teller", "Getränke"]}
          gruppieren
          allergenLegend={LEGENDE}
          {...FARBEN}
        />,
      );
      const kuerzel = Array.from(
        container.querySelectorAll("[data-kuerzel]"),
      ).map((el) => el.textContent);
      expect(kuerzel).toEqual(["A, C", "A, F", "2"]);
      const labels = Array.from(
        container.querySelectorAll("[data-labels]"),
      ).map((el) => el.textContent);
      expect(labels).toEqual(["scharf", "vegan · glutenfrei"]);
      const legende = container.querySelector("[data-legende]") as HTMLElement;
      expect(legende).not.toBeNull();
      const dt = Array.from(legende.querySelectorAll("dt")).map(
        (el) => el.textContent,
      );
      // „f“ ist nicht erklärt → fehlt; „g“ wird nicht verwendet → fehlt
      expect(dt).toEqual(["A", "C", "2"]);
      expect(legende.textContent).toContain("Glutenhaltiges Getreide");
      expect(legende.textContent).not.toContain("Milch");
    },
  );

  test("ohne Legende keine Legende — und auf der Startseite nie", () => {
    const ohne = render(
      <DishList
        template="ramen"
        modus="karte"
        alle={GEKENNZEICHNET}
        anzeigen={GEKENNZEICHNET}
        {...FARBEN}
      />,
    );
    expect(ohne.container.querySelector("[data-legende]")).toBeNull();
    // Die Kürzel stehen trotzdem am Gericht — sichtbar ist besser als versteckt.
    expect(ohne.container.querySelectorAll("[data-kuerzel]")).toHaveLength(3);
    ohne.unmount();
    const start = render(
      <DishList
        template="ramen"
        modus="highlights"
        alle={GEKENNZEICHNET}
        anzeigen={GEKENNZEICHNET}
        allergenLegend={LEGENDE}
        onAlle={() => {}}
        {...FARBEN}
      />,
    );
    expect(start.container.querySelector("[data-legende]")).toBeNull();
  });

  test("Gerichte ohne Kennzeichnung tragen weder Kürzel noch Label-Zeile", () => {
    const { container } = karte("presse");
    expect(container.querySelector("[data-kuerzel]")).toBeNull();
    expect(container.querySelector("[data-labels]")).toBeNull();
  });
});

describe("Zuordnung", () => {
  test("jede Liste trägt ihr Template als Datenattribut — Anker für den Paritätstest", () => {
    for (const t of EIGENE_TEMPLATES) {
      const { container, unmount } = karte(t);
      expect(
        container.querySelector(`[data-template-list="${t}"]`),
      ).not.toBeNull();
      expect(
        container.querySelector(
          `[data-dish-variant="${getTemplateLayout(t).dish}"]`,
        ),
      ).not.toBeNull();
      unmount();
    }
  });
});
