import { describe, it, expect } from "vitest";
import { validatePublishData } from "../routes/webapps";
import { buildPublishConfig } from "../../shared/autoPublish";
import { suggestedConfigToDraft } from "../../shared/suggestedConfig";
import { suggestSubdomain } from "../../shared/subdomain";

/**
 * Die Naht zwischen automatischem Modus und Veröffentlichen.
 *
 * Der Client baut die Konfiguration zusammen (shared/autoPublish.ts) und
 * erfährt erst beim Aufruf, ob der Server sie annimmt. Läuft eine der beiden
 * Seiten weg – ein neues Pflichtfeld in validatePublishData, ein
 * weggefallener Standardwert in buildPublishConfig – merkt das sonst zuerst
 * der Nutzer, und zwar am Ende einer Analyse, die mehrere Minuten gelaufen
 * ist.
 *
 * Deshalb wird hier nichts nachgebaut: Es läuft die echte Serverprüfung gegen
 * die echte Client-Abbildung, gefüttert mit dem, was der Deep-Scrape-Flow
 * tatsächlich liefert.
 */

/** Wie in der Datenbank beobachtet (ScraperJob.suggestedConfig, Job zu kleiner-kiepenkerl.de). */
const ECHTER_SCRAPE = {
  businessName: "Kleiner Kiepenkerl",
  primaryColor: "#660c21",
  secondaryColor: "#b8860a",
  backgroundColor: "#f1e5d0",
  phone: "0251 43416",
  email: "info@kleiner-kiepenkerl.de",
  gallery: [
    "https://kleiner-kiepenkerl.de/1.jpg",
    "https://kleiner-kiepenkerl.de/2.jpg",
  ],
  openingHours: {
    monday: { open: "11:00", close: "23:00", closed: false },
    tuesday: { open: "11:00", close: "23:00", closed: false },
  },
};

describe("Automatischer Modus: was der Client baut, nimmt der Server an", () => {
  it("die echte Scrape-Ausgabe übersteht die echte Serverprüfung", () => {
    const draft = suggestedConfigToDraft(ECHTER_SCRAPE);
    const { config } = buildPublishConfig(draft);
    const subdomain = suggestSubdomain(draft?.business.name);

    expect(config).not.toBeNull();
    expect(subdomain).toBe("kleiner-kiepenkerl");

    const result = validatePublishData(config, subdomain!);
    // Bei einem Fehlschlag sagen die Gründe direkt, welches Feld fehlt.
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("auch der magerste Scrape reicht noch – nur der Name ist Pflicht", () => {
    // Wenn eine Website nichts hergibt außer dem Namen, muss der automatische
    // Modus trotzdem veröffentlichen können. Genau dafür gibt es die
    // Standardwerte für Geschäftstyp und Vorlage.
    const draft = suggestedConfigToDraft({ businessName: "Zur Post" });
    const { config, defaulted } = buildPublishConfig(draft);
    const subdomain = suggestSubdomain("Zur Post");

    expect(defaulted).toHaveLength(2);
    expect(validatePublishData(config, subdomain!).valid).toBe(true);
  });

  it("ohne Betriebsnamen wird gar nicht erst veröffentlicht", () => {
    const draft = suggestedConfigToDraft({ primaryColor: "#660c21" });
    const { config, blocking } = buildPublishConfig(draft);

    expect(config).toBeNull();
    expect(blocking).not.toEqual([]);
    // Und die Serverprüfung wäre derselben Meinung.
    expect(validatePublishData({}, "irgendwas").valid).toBe(false);
  });

  it("Umlautnamen ergeben eine Subdomain, die der Server akzeptiert", () => {
    for (const name of ["Café Müller", "Gasthaus Schröder", "Weißes Rössl"]) {
      const draft = suggestedConfigToDraft({ businessName: name });
      const { config } = buildPublishConfig(draft);
      const subdomain = suggestSubdomain(name);
      expect(subdomain, name).not.toBeNull();
      expect(validatePublishData(config, subdomain!).valid, name).toBe(true);
    }
  });

  it("die Serverprüfung verlangt weiterhin genau die drei erwarteten Felder", () => {
    // Kommt ein viertes Pflichtfeld hinzu, schlägt dieser Test fehl – und
    // buildPublishConfig muss nachgezogen werden, bevor es jemand live merkt.
    const vollstaendig = {
      business: { name: "Zur Post", type: "restaurant" },
      design: { template: "modern" },
    };
    expect(validatePublishData(vollstaendig, "zur-post").valid).toBe(true);

    const ohneTyp = { business: { name: "Zur Post" }, design: { template: "modern" } };
    const ohneVorlage = { business: { name: "Zur Post", type: "restaurant" }, design: {} };
    expect(validatePublishData(ohneTyp, "zur-post").valid).toBe(false);
    expect(validatePublishData(ohneVorlage, "zur-post").valid).toBe(false);
  });
});
