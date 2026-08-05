// @vitest-environment node
/**
 * Feldzugriffe des Stripe-Webhooks (`server/webhooks/stripe.ts`).
 *
 * Anlass: Der Webhook ist scharf geschaltet, typprüfte aber nicht. Drei
 * Feldzugriffe zielten auf Stellen, die das installierte SDK (stripe 20.3.1,
 * API-Version 2026-01-28.clover) nicht mehr kennt. Alle drei sind stumm — der
 * Code hätte ohne Absturz falsche oder gar keine Daten geschrieben:
 *
 *  1. `subscription.current_period_start/-end` gibt es nicht mehr; die Werte
 *     sitzen seit der API-Version 2025-03-31.basil auf den Positionen. Der alte
 *     Zugriff lieferte undefined, `undefined * 1000` ist NaN, und
 *     `new Date(NaN)` ist ein Invalid Date — das wäre so in die Datenbank
 *     gegangen.
 *  2. `invoice.paid_at` gibt es nicht; der Zeitpunkt steht unter
 *     `status_transitions.paid_at` und ist eine Unix-Zeit in SEKUNDEN. Der alte
 *     Code reichte den Rohwert an `new Date()` weiter, das Millisekunden
 *     erwartet.
 *  3. `customers.retrieve()` kann einen gelöschten Kunden liefern, der keine
 *     Metadaten trägt. Ohne userId darf nichts geschrieben werden.
 *
 * Gemockt sind nur die Außengrenzen: das Stripe-SDK und Prisma. Die geprüfte
 * Logik — Ereignisweiche, Feldauswahl, Umrechnung — läuft echt. Der Webhook
 * wird direkt aufgerufen statt über eine Express-App, weil die Zustellung hier
 * nicht das Prüfobjekt ist.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { stripeMock, prismaMock } = vi.hoisted(() => {
  // Das Modul entscheidet BEIM IMPORT anhand von STRIPE_SECRET_KEY, ob es einen
  // Client baut. Ohne Schlüssel antwortet der Webhook pauschal mit 501 und keine
  // einzige Zeile Logik liefe. vi.hoisted() läuft vor den Imports.
  process.env.STRIPE_SECRET_KEY = "sk_test_attrappe";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_attrappe";

  return {
    stripeMock: {
      constructEvent: vi.fn(),
      retrieve: vi.fn(),
    },
    prismaMock: {
      subscription: {
        upsert: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        findUnique: vi.fn(),
      },
      billingEvent: { create: vi.fn() },
    },
  };
});

vi.mock("stripe", () => ({
  default: class StripeAttrappe {
    webhooks = { constructEvent: stripeMock.constructEvent };
    customers = { retrieve: stripeMock.retrieve };
  },
}));

vi.mock("../db/prisma", () => ({ default: prismaMock, prisma: prismaMock }));

import { handleStripeWebhook } from "../webhooks/stripe";

/** Minimale Request-/Response-Attrappen für den direkten Handler-Aufruf. */
function fakeRequest() {
  return {
    headers: { "stripe-signature": "sig_attrappe" },
    body: Buffer.from("{}"),
  } as any;
}

function fakeResponse() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
  };
  return res;
}

/** Lässt den Webhook das übergebene Ereignis verarbeiten. */
async function deliver(event: unknown) {
  stripeMock.constructEvent.mockReturnValue(event);
  const res = fakeResponse();
  await handleStripeWebhook(fakeRequest(), res);
  return res;
}

/** Ein aktiver Kunde mit hinterlegter userId. */
function activeCustomer() {
  return { id: "cus_1", object: "customer", metadata: { userId: "user_1" } };
}

// 1. Januar 2026, 00:00:00 UTC bzw. 31 Tage später — in Unix-SEKUNDEN, so wie
// Stripe sie liefert.
const PERIOD_START_SECONDS = 1767225600;
const PERIOD_END_SECONDS = 1769904000;

function subscriptionEvent(items: unknown[]) {
  return {
    type: "customer.subscription.updated",
    data: {
      object: {
        id: "sub_1",
        customer: "cus_1",
        items: { data: items },
      },
    },
  };
}

describe("Stripe-Webhook: Abrechnungszeitraum", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stripeMock.retrieve.mockResolvedValue(activeCustomer());
  });

  it("liest den Zeitraum von der Abo-Position, nicht vom Abo", async () => {
    await deliver(
      subscriptionEvent([
        {
          price: { id: "price_pro" },
          current_period_start: PERIOD_START_SECONDS,
          current_period_end: PERIOD_END_SECONDS,
        },
      ]),
    );

    expect(prismaMock.subscription.update).toHaveBeenCalledTimes(1);
    const written = prismaMock.subscription.update.mock.calls[0][0].data;

    // Der eigentliche Regressionspunkt: gültige Daten statt Invalid Date.
    expect(written.currentPeriodStart.toISOString()).toBe(
      "2026-01-01T00:00:00.000Z",
    );
    expect(written.currentPeriodEnd.toISOString()).toBe(
      "2026-02-01T00:00:00.000Z",
    );
    expect(written.plan).toBe("pro");
  });

  it("schreibt keinen Zeitraum, wenn das Abo keine Position hat", async () => {
    await deliver(subscriptionEvent([]));

    const written = prismaMock.subscription.update.mock.calls[0][0].data;

    // Kein Schlüssel heißt für Prisma "unverändert lassen". Ein gesetzter
    // Schlüssel mit Invalid Date oder null würde einen korrekten Bestandswert
    // überschreiben.
    expect(written).not.toHaveProperty("currentPeriodStart");
    expect(written).not.toHaveProperty("currentPeriodEnd");
    expect(written.plan).toBe("free");
  });
});

describe("Stripe-Webhook: gelöschter Kunde", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("schreibt nichts, wenn der Kunde gelöscht ist", async () => {
    // So sieht Stripe.DeletedCustomer aus: kein metadata, nur deleted.
    stripeMock.retrieve.mockResolvedValue({
      id: "cus_1",
      object: "customer",
      deleted: true,
    });

    const res = await deliver(
      subscriptionEvent([{ price: { id: "price_pro" } }]),
    );

    expect(prismaMock.subscription.update).not.toHaveBeenCalled();
    expect(prismaMock.billingEvent.create).not.toHaveBeenCalled();
    // Der Webhook quittiert trotzdem mit 200, sonst wiederholt Stripe endlos
    // eine Zustellung, die nie gelingen kann.
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true });
  });
});

describe("Stripe-Webhook: bezahlte Rechnung", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stripeMock.retrieve.mockResolvedValue(activeCustomer());
  });

  it("rechnet status_transitions.paid_at von Sekunden in Millisekunden um", async () => {
    await deliver({
      type: "invoice.paid",
      data: {
        object: {
          id: "in_1",
          customer: "cus_1",
          currency: "eur",
          amount_paid: 2900,
          total: 2900,
          status_transitions: { paid_at: PERIOD_START_SECONDS },
        },
      },
    });

    expect(prismaMock.billingEvent.create).toHaveBeenCalledTimes(1);
    const written = prismaMock.billingEvent.create.mock.calls[0][0].data;

    // Ohne die Umrechnung stünde hier 1970-01-21 — der Rohwert als
    // Millisekunden gelesen.
    expect(written.metadata.paidAt).toBe("2026-01-01T00:00:00.000Z");
    expect(written.amount).toBe(2900);
    expect(written.currency).toBe("EUR");
  });
});
