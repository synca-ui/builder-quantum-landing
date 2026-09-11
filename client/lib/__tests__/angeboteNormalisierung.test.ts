// @vitest-environment node
/**
 * Der Weg der Angebote von der öffentlichen API in den AppRenderer.
 *
 * `GET /api/sites/:subdomain` liefert eine FLACHE Feldliste; HostAwareRoot
 * schickt sie durch normalizeConfig, und AppRenderer liest anschließend
 * `payments.offers`, `payments.offerBanner` und `payments.offerPageEnabled`.
 * Der letzte Schlüssel fehlte in der Normalisierung komplett — der
 * Navigationspunkt „Angebote" hing damit allein am Banner, und wer im
 * Konfigurator nur die Angebote-Seite einschaltete, bekam keinen Tab.
 */
import { describe, expect, it } from "vitest";
import normalizeConfig from "../normalizeConfig";

const ANGEBOT = {
  id: "1787219553161",
  name: "Mittagstisch",
  price: "9,99",
  image: "https://cdn.example/mittagstisch.jpg",
  description: "hier gibts Mittag",
};

describe("normalizeConfig – Angebote", () => {
  it("übernimmt Angebote, Banner und Tab-Schalter aus der flachen API-Antwort", () => {
    const config = normalizeConfig({
      businessName: "Bella",
      offers: [ANGEBOT],
      offerBanner: { enabled: true, size: "large", backgroundColor: "#000000" },
      offerPageEnabled: true,
    });

    expect(config.payments.offers).toEqual([ANGEBOT]);
    expect(config.payments.offerBanner).toMatchObject({
      enabled: true,
      size: "large",
    });
    expect(config.payments.offerPageEnabled).toBe(true);
  });

  it("übernimmt sie ebenso aus der verschachtelten Konfigurator-Form", () => {
    const config = normalizeConfig({
      business: { name: "Bella" },
      payments: {
        offers: [ANGEBOT],
        offerBanner: { enabled: false },
        offerPageEnabled: true,
      },
    });

    expect(config.payments.offers).toEqual([ANGEBOT]);
    expect(config.payments.offerPageEnabled).toBe(true);
  });

  it("bleibt ohne Angebote bei leeren Vorgaben", () => {
    const config = normalizeConfig({ businessName: "Bella" });

    expect(config.payments.offers).toEqual([]);
    expect(config.payments.offerBanner).toMatchObject({ enabled: false });
    expect(config.payments.offerPageEnabled).toBe(false);
  });
});
