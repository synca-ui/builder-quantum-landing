import { describe, it, expect } from "vitest";
import {
  parseSchemaOpeningHours,
  parseHoursLine,
  expandDays,
  normalizeDay,
  normalizeTime,
  hoursQuality,
} from "./openingHours";

/**
 * Der Anlass ist der schwerwiegendste Fehler der ersten Veröffentlichung:
 * Die Seite zeigte 12:00–22:00, geöffnet ist 11:30–23:00. Ein Gast um 11:45
 * liest "geschlossen", obwohl offen ist.
 */

describe("normalizeDay", () => {
  it("versteht deutsche und englische Schreibweisen", () => {
    for (const t of ["Monday", "Mon", "Mo", "Montag", "MONTAG", " monday "]) {
      expect(normalizeDay(t), t).toBe("monday");
    }
    expect(normalizeDay("Sonntag")).toBe("sunday");
    expect(normalizeDay("Sonnabend")).toBe("saturday");
  });

  it("versteht die schema.org-Adressform", () => {
    expect(normalizeDay("https://schema.org/Wednesday")).toBe("wednesday");
    expect(normalizeDay("http://schema.org/Friday")).toBe("friday");
  });

  it("lehnt ab, was kein Tag ist", () => {
    expect(normalizeDay("Feiertag")).toBeNull();
    expect(normalizeDay("")).toBeNull();
  });
});

describe("normalizeTime", () => {
  it("vereinheitlicht die Schreibweise", () => {
    expect(normalizeTime("11:30")).toBe("11:30");
    expect(normalizeTime("11.30")).toBe("11:30");
    expect(normalizeTime("9:05")).toBe("09:05");
  });

  it("lehnt Unmögliches ab", () => {
    expect(normalizeTime("25:00")).toBeNull();
    expect(normalizeTime("11:75")).toBeNull();
    expect(normalizeTime("elf")).toBeNull();
  });
});

describe("expandDays", () => {
  it("löst Kommalisten auf – die Form, an der es scheiterte", () => {
    expect(
      expandDays("Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday"),
    ).toEqual([
      "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    ]);
  });

  it("löst Bereiche auf", () => {
    expect(expandDays("Mo-Fr")).toEqual([
      "monday", "tuesday", "wednesday", "thursday", "friday",
    ]);
    expect(expandDays("Montag bis Mittwoch")).toEqual([
      "monday", "tuesday", "wednesday",
    ]);
  });

  it("kommt über das Wochenende hinweg", () => {
    expect(expandDays("Fr-Mo")).toEqual(["friday", "saturday", "sunday", "monday"]);
  });

  it("versteht 'und'", () => {
    expect(expandDays("Samstag und Sonntag")).toEqual(["saturday", "sunday"]);
  });

  it("übergeht Unverständliches, statt zu raten", () => {
    expect(expandDays("An Feiertagen")).toEqual([]);
  });
});

describe("parseHoursLine", () => {
  it("liest die Zeile, an der die erste Veröffentlichung scheiterte", () => {
    const h = parseHoursLine(
      "Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday 11:30-23:00",
    );
    expect(Object.keys(h)).toHaveLength(7);
    expect(h.monday).toEqual({ open: "11:30", close: "23:00", closed: false });
    expect(h.sunday.close).toBe("23:00");
  });

  it("liest die abgekürzte Bereichsform", () => {
    const h = parseHoursLine("Mo-Fr 11:00-14:30");
    expect(Object.keys(h)).toHaveLength(5);
    expect(h.friday.open).toBe("11:00");
  });

  it("liest die deutsche Langform mit Gedankenstrich", () => {
    const h = parseHoursLine("Montag bis Sonntag 11:30 – 23:00 Uhr");
    expect(Object.keys(h)).toHaveLength(7);
    expect(h.wednesday).toEqual({ open: "11:30", close: "23:00", closed: false });
  });

  it("erfindet NICHTS, wenn die Tagesangabe fehlt", () => {
    // "11:30-23:00" allein könnte für einen Tag oder die Woche gelten.
    // Raten wäre genau der Fehler, der die erste Seite unbrauchbar machte.
    expect(parseHoursLine("11:30-23:00")).toEqual({});
  });

  it("erfindet nichts bei fehlender Zeitangabe", () => {
    expect(parseHoursLine("Montag bis Sonntag")).toEqual({});
  });
});

describe("parseSchemaOpeningHours", () => {
  it("liest die Zeichenketten-Form der echten Seite", () => {
    const h = parseSchemaOpeningHours({
      openingHours: [
        "Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday 11:30-23:00",
      ],
    });
    expect(Object.keys(h)).toHaveLength(7);
    expect(h.monday.open).toBe("11:30");
  });

  it("liest die strukturierte Form", () => {
    const h = parseSchemaOpeningHours({
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday"],
          opens: "17:00",
          closes: "23:30",
        },
        { dayOfWeek: "https://schema.org/Sunday", opens: "12:00", closes: "22:00" },
      ],
    });
    expect(h.monday).toEqual({ open: "17:00", close: "23:30", closed: false });
    expect(h.sunday.open).toBe("12:00");
  });

  it("gibt der strukturierten Form den Vorrang", () => {
    // Sie ist genauer als eine Textzeile.
    const h = parseSchemaOpeningHours({
      openingHoursSpecification: [
        { dayOfWeek: "Monday", opens: "17:00", closes: "23:00" },
      ],
      openingHours: ["Mo-So 11:30-23:00"],
    });
    expect(h.monday.open).toBe("17:00");
    // Die übrigen Tage kommen weiterhin aus der Textzeile.
    expect(h.tuesday.open).toBe("11:30");
  });

  it("kommt mit fehlenden oder unbrauchbaren Angaben klar", () => {
    expect(parseSchemaOpeningHours(null)).toEqual({});
    expect(parseSchemaOpeningHours({})).toEqual({});
    expect(parseSchemaOpeningHours({ openingHours: ["Ganzjährig geöffnet"] })).toEqual({});
  });
});

describe("hoursQuality", () => {
  it("hält eine ganze Woche für brauchbar", () => {
    const h = parseSchemaOpeningHours({ openingHours: ["Mo-So 11:30-23:00"] });
    expect(hoursQuality(h)).toEqual({ days: 7, usable: true });
  });

  it("hält einen einzelnen Tag für zu wenig", () => {
    // Meist ein Fehlgriff, keine Woche.
    expect(hoursQuality({ monday: { open: "1", close: "2", closed: false } }).usable).toBe(false);
  });
});
