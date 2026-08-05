import { Request, Response } from "express";
import Stripe from "stripe";
import prisma from "../db/prisma";

// Initialize Stripe only if API key is available
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// ============================================
// PLAN MAPPINGs
// ============================================

const PLAN_MAP: Record<
  string,
  { name: string; maxSites: number; maxUsers: number }
> = {
  price_free: { name: "free", maxSites: 1, maxUsers: 1 },
  price_basic: { name: "basic", maxSites: 3, maxUsers: 2 },
  price_pro: { name: "pro", maxSites: 10, maxUsers: 5 },
  price_enterprise: { name: "enterprise", maxSites: -1, maxUsers: -1 },
};

// ============================================
// SDK-HELFER
// ============================================

/**
 * Ermittelt die interne userId zu einer Stripe-Kundennummer.
 *
 * WARUM eine eigene Funktion: stripe.customers.retrieve() liefert laut
 * installiertem SDK ein Stripe.Response<Customer | DeletedCustomer>. Auf
 * DeletedCustomer (node_modules/stripe/types/Customers.d.ts, Zeilen 309-324)
 * existieren nur id, object und deleted - kein metadata. Der Zugriff musste
 * deshalb an sieben Stellen identisch abgesichert werden.
 *
 * Nebenbei geschlossen: fuenf der sieben Aufrufer griffen ohne Pruefung auf
 * stripe zu, obwohl die Variable ohne STRIPE_SECRET_KEY null ist. tsconfig.json
 * hat strictNullChecks auf false, der Compiler deckt das also nicht auf - zur
 * Laufzeit waere es ein TypeError gewesen, den nur der catch-Block aufgefangen
 * haette.
 */
async function resolveUserIdFromCustomer(
  customerId: string,
): Promise<string | null> {
  if (!stripe) {
    console.error("[Stripe] Stripe not initialized");
    return null;
  }

  const customer = await stripe.customers.retrieve(customerId);

  // Geloeschte Kunden tragen keine Metadaten mehr - ohne userId kein Datensatz.
  // Der Vergleich auf === true ist nicht kosmetisch: Stripe.Customer deklariert
  // deleted als optionales void (Customers.d.ts, Zeile 65), Stripe.DeletedCustomer
  // als true (Zeile 323). Ein blosses if (customer.deleted) engt die Union nicht
  // ein - der Zugriff auf metadata darunter bleibt dann ein Typfehler. Mit einem
  // Vergleich auf true trennt TypeScript die beiden Faelle sauber.
  if (customer.deleted === true) {
    console.warn("[Stripe] Customer is deleted, no metadata:", customerId);
    return null;
  }

  return customer.metadata?.userId || null;
}

/**
 * Liest den aktuellen Abrechnungszeitraum eines Abos.
 *
 * WARUM diese Umleitung: current_period_start/-end lagen frueher direkt auf dem
 * Subscription-Objekt. Seit der Stripe-API-Version 2025-03-31.basil sitzen sie
 * auf den einzelnen Positionen, weil ein Abo Positionen mit unterschiedlichen
 * Zeitraeumen haben kann. Im installierten SDK (stripe 20.3.1, API-Version
 * 2026-01-28.clover laut node_modules/stripe/types/apiVersion.d.ts) gilt:
 *   Subscriptions.d.ts     -> kein current_period_* mehr vorhanden
 *   SubscriptionItems.d.ts -> current_period_end (Zeile 53), _start (Zeile 58)
 *
 * Wir lesen dieselbe Position, aus der auch Preis und Plan stammen (data[0]),
 * damit Plan und Zeitraum zueinander passen. Fehlt die Position, geben wir ein
 * leeres Objekt zurueck statt new Date(NaN) - so bleibt ein bereits
 * gespeicherter Zeitraum bei einem update erhalten.
 */
function readBillingPeriod(subscription: Stripe.Subscription): {
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
} {
  const item = subscription.items?.data?.[0];

  if (!item) {
    console.warn(
      "[Stripe] Subscription without items, billing period unknown:",
      subscription.id,
    );
    return {};
  }

  return {
    currentPeriodStart: new Date(item.current_period_start * 1000),
    currentPeriodEnd: new Date(item.current_period_end * 1000),
  };
}

// ============================================
// EVENT HANDLERS
// ============================================

/**
 * ✅ Handle: customer.subscription.created
 * When user upgrades to a paid plan
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  if (!customerId) {
    console.error("[Stripe] No customerId in subscription");
    return;
  }

  try {
    // Retrieve customer to get userId from metadata
    const userId = await resolveUserIdFromCustomer(customerId);

    if (!userId) {
      console.warn("[Stripe] No userId in customer metadata for", customerId);
      return;
    }

    // Get plan info
    const priceId = subscription.items.data[0]?.price?.id as string;
    const plan = PLAN_MAP[priceId] || PLAN_MAP.price_free;
    const period = readBillingPeriod(subscription);

    // Create or update subscription
    await prisma.subscription.upsert({
      where: { userId },
      update: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        plan: plan.name,
        status: "active",
        maxSites: plan.maxSites,
        maxUsers: plan.maxUsers,
        ...period,
      },
      create: {
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        plan: plan.name,
        status: "active",
        maxSites: plan.maxSites,
        maxUsers: plan.maxUsers,
        ...period,
      },
    });

    // Log billing event
    await prisma.billingEvent.create({
      data: {
        userId,
        eventType: "subscription_created",
        stripeEventId: subscription.id,
        metadata: {
          plan: plan.name,
          customerId,
        },
      },
    });

    console.log("[Stripe] Subscription created:", {
      userId,
      plan: plan.name,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    console.error("[Stripe] Error handling subscription.created:", error);
  }
}

/**
 * ✅ Handle: customer.subscription.updated
 * When user changes plan or updates subscription
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  if (!customerId) return;

  try {
    const userId = await resolveUserIdFromCustomer(customerId);

    if (!userId) return;

    const priceId = subscription.items.data[0]?.price?.id as string;
    const plan = PLAN_MAP[priceId] || PLAN_MAP.price_free;

    // Update subscription with new plan
    await prisma.subscription.update({
      where: { userId },
      data: {
        plan: plan.name,
        maxSites: plan.maxSites,
        maxUsers: plan.maxUsers,
        ...readBillingPeriod(subscription),
      },
    });

    // Log event
    await prisma.billingEvent.create({
      data: {
        userId,
        eventType: "subscription_updated",
        stripeEventId: subscription.id,
        metadata: {
          newPlan: plan.name,
          customerId,
        },
      },
    });

    console.log("[Stripe] Subscription updated:", {
      userId,
      newPlan: plan.name,
    });
  } catch (error) {
    console.error("[Stripe] Error handling subscription.updated:", error);
  }
}

/**
 * ✅ Handle: customer.subscription.deleted
 * When user cancels subscription
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  if (!customerId) return;

  try {
    const userId = await resolveUserIdFromCustomer(customerId);

    if (!userId) return;

    // Downgrade to free plan
    await prisma.subscription.update({
      where: { userId },
      data: {
        plan: "free",
        status: "canceled",
        maxSites: 1,
        maxUsers: 1,
        canceledAt: new Date(),
      },
    });

    // Log event
    await prisma.billingEvent.create({
      data: {
        userId,
        eventType: "subscription_canceled",
        stripeEventId: subscription.id,
        metadata: {
          customerId,
        },
      },
    });

    console.log("[Stripe] Subscription canceled:", { userId });
  } catch (error) {
    console.error("[Stripe] Error handling subscription.deleted:", error);
  }
}

/**
 * ✅ Handle: payment_intent.succeeded
 * When one-time payment succeeds
 */
async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
) {
  const customerId = paymentIntent.customer as string;

  if (!customerId) {
    console.warn("[Stripe] No customerId in payment_intent.succeeded");
    return;
  }

  try {
    const userId = await resolveUserIdFromCustomer(customerId);

    if (!userId) return;

    // Log payment event
    await prisma.billingEvent.create({
      data: {
        userId,
        eventType: "payment_succeeded",
        amount: paymentIntent.amount,
        currency: paymentIntent.currency.toUpperCase(),
        stripeEventId: paymentIntent.id,
        metadata: {
          paymentIntentId: paymentIntent.id,
          customerId,
        },
      },
    });

    console.log("[Stripe] Payment succeeded:", {
      userId,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    });
  } catch (error) {
    console.error("[Stripe] Error handling payment_intent.succeeded:", error);
  }
}

/**
 * ✅ Handle: charge.refunded
 * When refund is issued
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  const customerId = charge.customer as string | null;

  if (!customerId) {
    console.warn("[Stripe] No customerId in charge.refunded");
    return;
  }

  try {
    const userId = await resolveUserIdFromCustomer(customerId);

    if (!userId) return;

    // Log refund event
    await prisma.billingEvent.create({
      data: {
        userId,
        eventType: "payment_refunded",
        amount: charge.amount_refunded,
        currency: charge.currency.toUpperCase(),
        stripeEventId: charge.id,
        metadata: {
          chargeId: charge.id,
          customerId,
        },
      },
    });

    console.log("[Stripe] Refund processed:", {
      userId,
      amount: charge.amount_refunded,
    });
  } catch (error) {
    console.error("[Stripe] Error handling charge.refunded:", error);
  }
}

/**
 * ✅ Handle: invoice.payment_failed
 * When recurring payment fails
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  if (!customerId) {
    console.warn("[Stripe] No customerId in invoice.payment_failed");
    return;
  }

  try {
    const userId = await resolveUserIdFromCustomer(customerId);

    if (!userId) return;

    // Mark subscription as past_due
    await prisma.subscription.update({
      where: { userId },
      data: {
        status: "past_due",
      },
    });

    // Log event
    await prisma.billingEvent.create({
      data: {
        userId,
        eventType: "payment_failed",
        amount: invoice.amount_due,
        currency: invoice.currency?.toUpperCase() || "EUR",
        stripeEventId: invoice.id,
        metadata: {
          invoiceId: invoice.id,
          customerId,
          reason: invoice.attempt_count
            ? `Attempt ${invoice.attempt_count}`
            : "Initial attempt",
        },
      },
    });

    console.log("[Stripe] Payment failed:", {
      userId,
      amount: invoice.amount_due,
      attemptCount: invoice.attempt_count,
    });

    // TODO: Send email to user about failed payment
    // await sendPaymentFailureEmail(user.email, invoice.amount_due);
  } catch (error) {
    console.error("[Stripe] Error handling invoice.payment_failed:", error);
  }
}

/**
 * ✅ Handle: invoice.paid
 * When recurring invoice is paid successfully
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  if (!customerId) {
    console.warn("[Stripe] No customerId in invoice.paid");
    return;
  }

  try {
    const userId = await resolveUserIdFromCustomer(customerId);

    if (!userId) return;

    // Mark subscription as active (in case it was past_due)
    await prisma.subscription.update({
      where: { userId },
      data: {
        status: "active",
      },
    });

    // invoice.paid_at gibt es im installierten SDK nicht; der Zeitpunkt steht
    // unter status_transitions.paid_at (node_modules/stripe/types/Invoices.d.ts,
    // Zeile 1508, Typ number | null) und ist eine Unix-Zeit in SEKUNDEN. Der
    // alte Code reichte den Wert ungerechnet an new Date() weiter, das
    // Millisekunden erwartet - selbst wenn es das Feld gaebe, waere das Ergebnis
    // ein Datum kurz nach 1970 gewesen. Fehlt der Zeitpunkt, nehmen wir den
    // Empfangszeitpunkt, damit das Feld nicht leer bleibt.
    const paidAtSeconds = invoice.status_transitions?.paid_at;
    const paidAt = paidAtSeconds ? new Date(paidAtSeconds * 1000) : new Date();

    // Log event
    await prisma.billingEvent.create({
      data: {
        userId,
        eventType: "invoice_paid",
        amount: invoice.amount_paid || invoice.total,
        currency: invoice.currency?.toUpperCase() || "EUR",
        stripeEventId: invoice.id,
        metadata: {
          invoiceId: invoice.id,
          customerId,
          paidAt: paidAt.toISOString(),
        },
      },
    });

    console.log("[Stripe] Invoice paid:", {
      userId,
      amount: invoice.amount_paid || invoice.total,
    });
  } catch (error) {
    console.error("[Stripe] Error handling invoice.paid:", error);
  }
}

/**
 * ✅ Handle: customer.created
 * When customer is first created (optional, for cleanup)
 */
async function handleCustomerCreated(customer: Stripe.Customer) {
  const userId = customer.metadata?.userId as string;

  if (!userId) {
    console.warn("[Stripe] No userId in customer.created metadata");
    return;
  }

  try {
    // Ensure subscription record exists
    const existing = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!existing) {
      await prisma.subscription.create({
        data: {
          userId,
          stripeCustomerId: customer.id,
          plan: "free",
          status: "active",
          maxSites: 1,
          maxUsers: 1,
        },
      });

      console.log("[Stripe] Created subscription record for new customer:", {
        userId,
        customerId: customer.id,
      });
    }
  } catch (error) {
    console.error("[Stripe] Error handling customer.created:", error);
  }
}

// ============================================
// MAIN WEBHOOK HANDLER
// ============================================

/**
 * ✅ POST /api/webhooks/stripe
 * Main webhook receiver for all Stripe events
 */
export async function handleStripeWebhook(
  req: Request,
  res: Response,
): Promise<void> {
  // Check if Stripe is configured
  if (!stripe) {
    console.warn(
      "[Stripe] Stripe is not configured (missing STRIPE_SECRET_KEY)",
    );
    res.status(501).json({ error: "Stripe not configured" });
    return;
  }

  const signature = req.headers["stripe-signature"] as string | undefined;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Verify signature
  if (!signature || !webhookSecret) {
    console.warn("[Stripe] Missing signature or webhook secret");
    res.status(400).json({ error: "Invalid webhook setup" });
    return;
  }

  let event: Stripe.Event;

  try {
    // req.body is a Buffer here because this route is registered with
    // express.raw({ type: "*/*" }) before express.json() — see server/index.ts.
    const rawBody =
      Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));

    // Construct event from Stripe
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("[Stripe] Webhook signature verification failed:", error);
    res.status(400).json({
      error: "Invalid signature",
    });
    return;
  }

  try {
    console.log(`[Stripe] Received event: ${event.type}`);

    // Route to appropriate handler
    switch (event.type) {
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreated(subscription);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(charge);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case "customer.created": {
        const customer = event.data.object as Stripe.Customer;
        await handleCustomerCreated(customer);
        break;
      }

      default:
        console.log(`[Stripe] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("[Stripe] Webhook processing error:", error);
    res.status(500).json({
      error: "Webhook processing failed",
    });
  }
}

/**
 * ✅ POST /api/webhooks/stripe/test - Test webhook (for development)
 */
export async function handleWebhookTest(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    console.log("[Stripe] Test webhook received");
    res.json({ success: true, message: "Test webhook received" });
  } catch (error) {
    console.error("[Stripe] Test webhook error:", error);
    res.status(500).json({ error: "Test webhook failed" });
  }
}

export default handleStripeWebhook;
