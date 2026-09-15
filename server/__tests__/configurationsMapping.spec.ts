/**
 * Wächter: Jedes Feld, das mapConfigToDatabase an Prisma gibt, muss im
 * Modell `Configuration` existieren.
 *
 * Anlass (Live-Test 12.09.2026): `reservationEmail` stand seit Mai im Mapping,
 * aber nie im Prisma-Schema. Prisma warf bei create() UND updateMany()
 * "Unknown argument `reservationEmail`", jedes Speichern aus dem manuellen
 * Konfigurator endete mit HTTP 500 — und die Oberfläche zeigte nichts, weil
 * der Client den Fehler nur in die Konsole schrieb. Veröffentlichen läuft
 * über webapps/publish mit eigenem Mapping und blieb heil; darum fiel es
 * vier Monate nicht auf.
 *
 * Der Test liest das Schema als Text statt den generierten Client zu
 * befragen: So läuft er ohne `prisma generate` und ohne Datenbank.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { mapConfigToDatabase } from "../routes/configurations";

function prismaFelder(model: string): Set<string> {
  const schema = readFileSync(
    resolve(process.cwd(), "prisma/schema.prisma"),
    "utf8",
  );
  const block = schema.match(
    new RegExp(`\\nmodel ${model} \\{([\\s\\S]*?)\\n\\}`),
  );
  if (!block) throw new Error(`Modell ${model} nicht im Schema`);
  return new Set(
    block[1]
      .split("\n")
      .map((zeile) => zeile.trim())
      .filter(
        (zeile) => zeile && !zeile.startsWith("//") && !zeile.startsWith("@@"),
      )
      .map((zeile) => zeile.split(/\s+/)[0]),
  );
}

/** Kleinste Konfiguration, die durch das Mapping kommt. */
function konfiguration(features: Record<string, unknown> = {}) {
  return {
    business: { name: "Probe", type: "restaurant", domain: {} },
    design: { template: "modern" },
    content: { menuItems: [], gallery: [], openingHours: {} },
    features: { reservationsEnabled: false, maxGuests: 10, ...features },
    contact: { contactMethods: [], socialMedia: {} },
    pages: { selectedPages: [], customPages: [] },
    payments: { paymentOptions: [], offers: [] },
  } as any;
}

describe("mapConfigToDatabase", () => {
  test("gibt nur Felder weiter, die das Prisma-Modell Configuration kennt", () => {
    const felder = prismaFelder("Configuration");
    const unbekannt = Object.keys(
      mapConfigToDatabase(konfiguration({ reservationEmail: "" }), "modern"),
    ).filter((schluessel) => !felder.has(schluessel));
    expect(unbekannt).toEqual([]);
  });

  test("die Adresse aus dem Reservierungs-Schritt landet in reservationNotificationEmail", () => {
    const zeile = mapConfigToDatabase(
      konfiguration({ reservationEmail: "wirt@example.de" }),
      "modern",
    );
    expect(zeile.reservationNotificationEmail).toBe("wirt@example.de");
    expect("reservationEmail" in zeile).toBe(false);
  });

  test("leere Adresse wird nicht gesetzt (undefined), damit nichts überschrieben wird", () => {
    const zeile = mapConfigToDatabase(
      konfiguration({ reservationEmail: "", reservationNotificationEmail: "" }),
      "modern",
    );
    expect(zeile.reservationNotificationEmail).toBeUndefined();
  });
});
