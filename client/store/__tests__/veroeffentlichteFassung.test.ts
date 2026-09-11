/**
 * `applyPublishedConfig` — der Zustand nach dem automatischen Veröffentlichen.
 *
 * ANLASS: Der automatische Modus übernahm bisher den ENTWURF in den Store
 * (`applyScrapedDraft`), veröffentlicht wurde aber die Fassung aus
 * `buildPublishConfig`. Wer danach etwas anpasste und über die Kopfzeile erneut
 * veröffentlichte, überschrieb seine Seite mit einer anderen: grüne Preisfarbe,
 * weiße Kopfzeile, erfundene Öffnungstage, verlorener Buchungslink.
 *
 * Diese Datei prüft deshalb nicht die Aktion für sich, sondern die Zusage:
 * Was `buildPublishConfig` liefert, muss aus `getFullConfiguration()` wieder
 * herauskommen. Beides läuft hier gegen den ECHTEN Publish-Bauer, nicht gegen
 * ein nachgestelltes Objekt — sonst prüfte der Test nur meine Annahme darüber.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useConfiguratorStore } from "../configuratorStore";
import { buildPublishConfig } from "@shared/autoPublish";
import { suggestedConfigToDraft } from "@shared/suggestedConfig";

/**
 * Das echte Scrape-Ergebnis von haus-toeller.de (04.09.2026, Execution des
 * Deep-Scrape-Flows): eine Palette aus einer einzigen Farbe, Sonntag als
 * Ruhetag in schema.org-Schreibweise, keine Gerichte.
 */
const TOELLER = {
  businessName: "Haus Töller",
  businessType: "bar",
  slogan: "Traditionelles Kölsches Brauhaus",
  description: "Kölsch vom Holzfass, hausgemachte rheinische Küche.",
  location: "Weyerstraße 96, 50676 Köln",
  phone: "0221 2589316",
  email: "info@haus-toeller.de",
  primaryColor: "#0a1b2e",
  secondaryColor: "#0a1b2e",
  backgroundColor: "#0a1b2e",
  fontFamily: "sans-serif",
  template: "bold",
  gallery: ["https://www.haus-toeller.de/assets/img/og-image.jpg"],
  openingHours: {
    monday: { open: "17:00", close: "23:59", closed: false },
    saturday: { open: "17:00", close: "23:59", closed: false },
    sunday: { open: "00:00", close: "00:00", closed: false },
  },
  socialMedia: {
    instagram: "https://www.instagram.com/haustoeller/",
  },
};

function veroeffentlichteFassung(
  optionen: Parameters<typeof buildPublishConfig>[1] = {},
) {
  const draft = suggestedConfigToDraft(TOELLER as any);
  const plan = buildPublishConfig(draft, optionen);
  if (!plan.config) throw new Error("buildPublishConfig lieferte keine Fassung");
  return plan.config;
}

beforeEach(() => {
  useConfiguratorStore.getState().resetConfig();
});

describe("applyPublishedConfig: der Store trägt die veröffentlichte Seite", () => {
  it("liefert aus getFullConfiguration() wieder dieselben Farben und Inhalte", () => {
    const config = veroeffentlichteFassung();
    useConfiguratorStore
      .getState()
      .applyPublishedConfig(config, { subdomain: "haus-toeller" });

    const voll = useConfiguratorStore.getState().getFullConfiguration();
    // Jedes Feld, das die Fassung setzt, steht danach unverändert im Store.
    for (const [feld, wert] of Object.entries(config.design)) {
      expect(voll.design[feld], `design.${feld}`).toEqual(wert);
    }
    expect(voll.business.name).toBe("Haus Töller");
    expect(voll.business.slogan).toBe("Traditionelles Kölsches Brauhaus");
    expect(voll.business.location).toBe("Weyerstraße 96, 50676 Köln");
    expect(voll.contact.phone).toBe("0221 2589316");
    expect(voll.contact.socialMedia.instagram).toContain("haustoeller");
    expect(voll.content.gallery).toEqual(config.content.gallery);
  });

  it("übernimmt die abgeleiteten Farben statt der Store-Vorgaben", () => {
    // Die Vorgaben, gegen die das lief: priceColor #059669 (grün),
    // headerBackgroundColor #FFFFFF. Beide sind markenfremd.
    const config = veroeffentlichteFassung();
    useConfiguratorStore.getState().applyPublishedConfig(config);

    const design = useConfiguratorStore.getState().design;
    expect(design.priceColor).toBe(config.design.priceColor);
    expect(design.priceColor).not.toBe("#059669");
    expect(design.headerBackgroundColor).toBe(config.design.headerBackgroundColor);
    expect(design.headerBackgroundColor).not.toBe("#FFFFFF");
    // Der abgesetzte Hintergrund der zusammengefallenen Palette überlebt.
    expect(design.backgroundColor).toBe(config.design.backgroundColor);
    expect(design.backgroundColor).not.toBe(design.primaryColor);
  });

  it("macht aus einem Ruhetag keinen Öffnungstag", () => {
    const config = veroeffentlichteFassung();
    useConfiguratorStore.getState().applyPublishedConfig(config);

    const hours = useConfiguratorStore.getState().content.openingHours as any;
    expect(hours.monday).toEqual({ open: "17:00", close: "23:59", closed: false });
    // Sonntag kam als 00:00–00:00 (schema.org-Ruhetag) und ist geschlossen.
    expect(hours.sunday.closed).toBe(true);
    // Tage, die der Betrieb gar nicht genannt hat, sind Ruhetage — NICHT
    // "09:00–22:00 geöffnet", wie der Entwurfspfad sie unterschob.
    expect(hours.tuesday.closed).toBe(true);
    expect(hours.wednesday.closed).toBe(true);
  });

  it("nimmt das erkannte Buchungssystem mit", () => {
    const config = veroeffentlichteFassung({
      enableReservations: true,
      reservation: {
        provider: "OpenTable",
        url: "https://www.opentable.de/haus-toeller",
      },
    });
    useConfiguratorStore.getState().applyPublishedConfig(config);

    const features = useConfiguratorStore.getState().features;
    expect(features.reservationsEnabled).toBe(true);
    expect(features.reservationUrl).toBe("https://www.opentable.de/haus-toeller");
    expect(features.reservationProvider).toBe("OpenTable");
  });

  it("lässt die Reservierung des vorigen Betriebs nicht stehen", () => {
    // Der Fehler des Entwurfspfads: `features` blieben unangetastet, also
    // erbte der neue Betrieb die Einstellung des alten.
    useConfiguratorStore.getState().updateFeatureFlags({
      reservationsEnabled: true,
      reservationUrl: "https://alt.example.com/buchen",
    });
    useConfiguratorStore.getState().applyPublishedConfig(veroeffentlichteFassung());

    const features = useConfiguratorStore.getState().features;
    expect(features.reservationsEnabled).toBe(false);
    expect(features.reservationUrl).toBeUndefined();
  });

  it("schreibt Adresse und Veröffentlichungsstand fest", () => {
    useConfiguratorStore.getState().applyPublishedConfig(veroeffentlichteFassung(), {
      subdomain: "haus-toeller",
      publishedUrl: "https://haus-toeller.maitr.de",
      previewUrl: "https://maitr.de/site/haus-toeller",
      publishedAt: "2026-09-04T13:40:00.000Z",
    });

    const state = useConfiguratorStore.getState();
    // Ohne die Adresse leitete der Kopfzeilen-Publish beim nächsten Mal eine
    // neue aus dem Betriebsnamen ab, statt dieselbe Seite zu aktualisieren.
    expect(state.business.domain?.selectedDomain).toBe("haus-toeller");
    expect(state.publishing.status).toBe("published");
    expect(state.publishing.publishedUrl).toBe("https://haus-toeller.maitr.de");
    expect(state.publishing.publishedAt).toBe("2026-09-04T13:40:00.000Z");
  });

  it("behauptet ohne Adresse keine Veröffentlichung", () => {
    // Der Weg "erst anpassen": übernommen wird dieselbe Fassung, online ist
    // aber noch nichts.
    useConfiguratorStore.getState().applyPublishedConfig(veroeffentlichteFassung());
    expect(useConfiguratorStore.getState().publishing.status).toBe("draft");
    expect(
      useConfiguratorStore.getState().publishing.publishedUrl,
    ).toBeUndefined();
  });
  it("gibt dem Reservierungsknopf die Markenfarbe statt des Store-Blaus", () => {
    // Der Server schiebt keine Ersatzfarbe mehr unter, der Renderer nimmt die
    // Primaerfarbe. Der Store muss dasselbe tun - sonst wanderte beim naechsten
    // Veroeffentlichen das Blau #2563EB auf die Seite.
    const config = veroeffentlichteFassung({ enableReservations: true });
    useConfiguratorStore.getState().applyPublishedConfig(config);
    const features = useConfiguratorStore.getState().features;
    expect(features.reservationButtonColor).toBe(config.design.primaryColor);
    expect(features.reservationButtonColor).not.toBe("#2563EB");
    expect(features.reservationButtonTextColor).toBe("#FFFFFF");
  });
});
