/**
 * Angebote im Speichern-Schema.
 *
 * Der Konfigurator erzeugt Angebote als {id, name, price, image, description}
 * (FeatureConfigStep → OffersStep). Das Schema verlangte früher ein
 * Pflichtfeld "title" — eine Konfiguration mit einem einzigen Angebot fiel
 * damit beim Cloud-Speichern KOMPLETT durch (HTTP 400), und weil der Client
 * den Fehler nur loggt, blieb das unbemerkt. Diese Tests nageln die
 * Konfigurator-Form fest.
 */
import { describe, expect, it } from "vitest";
import { PaymentAndOffersSchema } from "../schemas/configuration";

describe("PaymentAndOffersSchema", () => {
  it("akzeptiert Angebote in der Form, die der Konfigurator erzeugt", () => {
    const parsed = PaymentAndOffersSchema.safeParse({
      offers: [
        {
          id: "1787219553161",
          name: "Happy Hour",
          price: "6,50",
          image: null,
          description: "Alle Cocktails bis 19 Uhr",
        },
      ],
      offerBanner: {
        enabled: true,
        backgroundColor: "#000000",
        textColor: "#FFFFFF",
        buttonColor: "#FFFFFF",
        size: "large",
      },
      offerPageEnabled: true,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      // Zod darf die Konfigurator-Felder nicht wegstrippen — sonst kommen
      // Angebote ohne Preis und Bild auf der veröffentlichten Seite an.
      expect(parsed.data.offers?.[0]).toMatchObject({
        name: "Happy Hour",
        price: "6,50",
      });
      expect(parsed.data.offerPageEnabled).toBe(true);
      expect(parsed.data.offerBanner?.size).toBe("large");
    }
  });

  it("akzeptiert weiterhin die Alt-Form mit title/discount", () => {
    const parsed = PaymentAndOffersSchema.safeParse({
      offers: [{ id: "1", title: "Lunch Special", discount: 10 }],
    });
    expect(parsed.success).toBe(true);
  });
});
