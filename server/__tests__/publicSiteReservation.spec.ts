// @vitest-environment node
/**
 * Das bestehende Buchungssystem des Betriebs muss die öffentliche Sicht
 * ÜBERLEBEN.
 *
 * Nachgewiesen am Echtfall krawummel.de (21.08.2026): Der Publish speicherte
 * `reservationUrl` + `reservationProvider` („Wix Reservierungen“) korrekt in
 * configData — aber oeffentlicheSiteFelder ließ beide Felder fallen. Die
 * Live-Seite bekam null und stellte das EIGENE Reservierungsformular neben
 * das des Betriebs: genau das Doppelbuchungs-Szenario, das die Erkennung
 * verhindern soll.
 */
import { describe, expect, it } from "vitest";
import { oeffentlicheSiteFelder } from "../utils/publicSiteView";

const kontext = {
  id: "app-1",
  publishedAt: new Date("2026-08-21T06:00:00Z"),
  updatedAt: new Date("2026-08-21T06:00:00Z"),
};

describe("oeffentlicheSiteFelder – bestehendes Buchungssystem", () => {
  it("reicht reservationUrl und reservationProvider durch (flach)", () => {
    const felder = oeffentlicheSiteFelder(
      {
        businessName: "Krawummel",
        reservationsEnabled: true,
        reservationUrl: "https://www.krawummel.de/",
        reservationProvider: "Wix Reservierungen",
      },
      kontext,
    );
    expect(felder.reservationUrl).toBe("https://www.krawummel.de/");
    expect(felder.reservationProvider).toBe("Wix Reservierungen");
  });

  it("reicht sie auch aus dem verschachtelten features-Objekt durch", () => {
    const felder = oeffentlicheSiteFelder(
      {
        business: { name: "Krawummel" },
        features: {
          reservationsEnabled: true,
          reservationUrl: "https://www.krawummel.de/",
          reservationProvider: "Wix Reservierungen",
        },
      },
      kontext,
    );
    expect(felder.reservationUrl).toBe("https://www.krawummel.de/");
    expect(felder.reservationProvider).toBe("Wix Reservierungen");
  });

  it("liefert undefined, wenn kein bestehendes System bekannt ist", () => {
    const felder = oeffentlicheSiteFelder({ businessName: "Krawummel" }, kontext);
    expect(felder.reservationUrl).toBeUndefined();
    expect(felder.reservationProvider).toBeUndefined();
  });
});
