/**
 * Subscription Management API Routes
 *
 * Integrates with Stripe for subscription management
 * All endpoints require authentication
 *
 * Routes:
 * - GET /api/subscriptions/current - Get current user's subscription
 * - GET /api/subscriptions/plans - Get available subscription plans
 * - POST /api/subscriptions/checkout - Create checkout session
 * - POST /api/subscriptions/cancel - Cancel subscription
 * - GET /api/subscriptions/billing-events - Get billing event history
 */

import { Router, Request, Response } from "express";
import prisma from "../db/prisma";
import { requireAuth } from "../middleware/auth";
import { createAuditLogger } from "../utils/audit";

const router = Router();

// ============================================
// CONSTANTS
// ============================================

const SUBSCRIPTION_PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    currency: "EUR",
    interval: null,
    maxSites: 1,
    maxUsers: 1,
    features: [
      "1 website",
      "Basic templates",
      "Community support",
    ],
  },
  {
    id: "basic",
    name: "Basic",
    price: 999, // €9.99 in cents
    currency: "EUR",
    interval: "month",
    maxSites: 3,
    maxUsers: 2,
    features: [
      "3 websites",
      "All templates",
      "Custom domain",
      "Email support",
      "Analytics",
    ],
    stripePriceId: "price_basic", // TODO: Update with actual Stripe price ID
  },
  {
    id: "pro",
    name: "Professional",
    price: 2999, // €29.99 in cents
    currency: "EUR",
    interval: "month",
    maxSites: 10,
    maxUsers: 5,
    features: [
      "10 websites",
      "All templates",
      "Custom domains",
      "Priority support",
      "Advanced analytics",
      "API access",
      "Team collaboration",
    ],
    stripePriceId: "price_pro", // TODO: Update with actual Stripe price ID
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null, // Contact sales
    currency: "EUR",
    interval: null,
    maxSites: -1, // Unlimited
    maxUsers: -1, // Unlimited
    features: [
      "Unlimited websites",
      "All templates",
      "Dedicated support",
      "Custom integrations",
      "Advanced security",
      "SLA guarantee",
      "Custom training",
    ],
    stripePriceId: null,
  },
];

// ============================================
// HELPERS
// ============================================

/**
 * ✅ Get audit logger helper
 */
function getAuditLogger(req: Request) {
  return createAuditLogger({
    userId: req.user!.id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
}

/**
 * ✅ Format subscription response
 */
function formatSubscription(sub: any) {
  return {
    id: sub.id,
    plan: sub.plan,
    status: sub.status,
    maxSites: sub.maxSites,
    maxUsers: sub.maxUsers,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    canceledAt: sub.canceledAt,
    stripeCustomerId: sub.stripeCustomerId,
    stripeSubscriptionId: sub.stripeSubscriptionId,
  };
}

// ============================================
// HANDLERS
// ============================================

/**
 * ✅ GET /api/subscriptions/current
 * Get current user's subscription details
 *
 * Response: { success: boolean; data: Subscription }
 */
export async function getCurrentSubscription(req: Request, res: Response) {
  const userId = req.user!.id;

  try {
    let subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    // Create default free subscription if doesn't exist
    if (!subscription) {
      subscription = await prisma.subscription.create({
        data: {
          userId,
          plan: "free",
          status: "active",
          maxSites: 1,
          maxUsers: 1,
        },
      });
    }

    return res.json({
      success: true,
      data: formatSubscription(subscription),
    });
  } catch (error) {
    console.error("[Subscriptions] Get current error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch subscription",
      message: error instanceof Error ? error.message : undefined,
    });
  }
}

/**
 * ✅ GET /api/subscriptions/plans
 * Get all available subscription plans (public endpoint)
 *
 * Response: { success: boolean; data: SubscriptionPlan[] }
 */
export async function getSubscriptionPlans(req: Request, res: Response) {
  try {
    return res.json({
      success: true,
      data: SUBSCRIPTION_PLANS,
    });
  } catch (error) {
    console.error("[Subscriptions] Get plans error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch plans",
    });
  }
}

/**
 * ✅ POST /api/subscriptions/checkout
 * Create Stripe checkout session
 *
 * Request Body:
 * {
 *   planId: string (e.g., "basic", "pro")
 *   successUrl?: string (redirect after success)
 *   cancelUrl?: string (redirect after cancel)
 * }
 *
 * Response: { success: boolean; checkoutUrl: string }
 */
export async function createCheckoutSession(req: Request, res: Response) {
  const userId = req.user!.id;
  const audit = getAuditLogger(req);

  try {
    const { planId, successUrl, cancelUrl } = req.body;

    // Validate plan
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
    if (!plan || !plan.stripePriceId) {
      return res.status(400).json({
        success: false,
        error: "Invalid plan",
        message: `Plan "${planId}" is not available or requires contacting sales`,
      });
    }

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      await audit(
        "checkout_failed",
        planId,
        false,
        "Stripe not configured",
      );

      return res.status(501).json({
        success: false,
        error: "Payment processing not configured",
        message: "Please try again later",
      });
    }

    // TODO: Create Stripe checkout session
    // const session = await stripe.checkout.sessions.create({
    //   customer_email: user.email,
    //   payment_method_types: ["card"],
    //   line_items: [
    //     {
    //       price: plan.stripePriceId,
    //       quantity: 1,
    //     },
    //   ],
    //   mode: "subscription",
    //   success_url: successUrl || `${process.env.SITE_URL}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}`,
    //   cancel_url: cancelUrl || `${process.env.SITE_URL}/dashboard/billing`,
    //   metadata: {
    //     userId,
    //   },
    // });

    // For now, return a placeholder response
    await audit("checkout_initiated", planId, true);

    return res.json({
      success: true,
      message: "Checkout session created",
      // checkoutUrl: session.url,
      checkoutUrl: null, // TODO: Update when Stripe is configured
    });
  } catch (error) {
    console.error("[Subscriptions] Checkout error:", error);
    await audit(
      "checkout_error",
      req.body.planId || "unknown",
      false,
      error instanceof Error ? error.message : "Unknown error",
    );

    return res.status(500).json({
      success: false,
      error: "Failed to create checkout session",
      message: error instanceof Error ? error.message : undefined,
    });
  }
}

/**
 * ✅ POST /api/subscriptions/cancel
 * Cancel current subscription
 *
 * Response: { success: boolean; data: Subscription }
 */
export async function cancelSubscription(req: Request, res: Response) {
  const userId = req.user!.id;
  const audit = getAuditLogger(req);

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: "Subscription not found",
      });
    }

    if (subscription.plan === "free") {
      return res.status(400).json({
        success: false,
        error: "Cannot cancel free plan",
      });
    }

    if (subscription.status === "canceled") {
      return res.status(400).json({
        success: false,
        error: "Subscription already canceled",
      });
    }

    // TODO: Cancel Stripe subscription
    // if (subscription.stripeSubscriptionId) {
    //   await stripe.subscriptions.del(subscription.stripeSubscriptionId);
    // }

    // Update local subscription record
    const updated = await prisma.subscription.update({
      where: { userId },
      data: {
        plan: "free",
        status: "canceled",
        maxSites: 1,
        maxUsers: 1,
        canceledAt: new Date(),
      },
    });

    // Log audit
    await audit("subscription_canceled", subscription.id, true);

    return res.json({
      success: true,
      message: "Subscription canceled successfully",
      data: formatSubscription(updated),
    });
  } catch (error) {
    console.error("[Subscriptions] Cancel error:", error);
    await audit(
      "subscription_cancel_error",
      "unknown",
      false,
      error instanceof Error ? error.message : "Unknown error",
    );

    return res.status(500).json({
      success: false,
      error: "Failed to cancel subscription",
      message: error instanceof Error ? error.message : undefined,
    });
  }
}

/**
 * ✅ GET /api/subscriptions/billing-events
 * Get billing event history for current user
 *
 * Query Parameters:
 * - limit: number (default: 50, max: 100)
 * - offset: number (default: 0)
 * - type: string (optional, filter by event type)
 *
 * Response: { success: boolean; data: BillingEvent[]; total: number }
 */
export async function getBillingEvents(req: Request, res: Response) {
  const userId = req.user!.id;

  try {
    const { limit = 50, offset = 0, type } = req.query;

    const limitNum = Math.min(parseInt(String(limit), 10) || 50, 100);
    const offsetNum = parseInt(String(offset), 10) || 0;

    const events = await prisma.billingEvent.findMany({
      where: {
        userId,
        ...(typeof type === "string" ? { eventType: type } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limitNum,
      skip: offsetNum,
    });

    const total = await prisma.billingEvent.count({
      where: {
        userId,
        ...(typeof type === "string" ? { eventType: type } : {}),
      },
    });

    return res.json({
      success: true,
      data: events,
      total,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (error) {
    console.error("[Subscriptions] Billing events error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch billing events",
    });
  }
}

// ============================================
// ROUTER
// ============================================

router.get("/current", requireAuth, getCurrentSubscription);
router.get("/plans", getSubscriptionPlans); // Public endpoint
router.post("/checkout", requireAuth, createCheckoutSession);
router.post("/cancel", requireAuth, cancelSubscription);
router.get("/billing-events", requireAuth, getBillingEvents);

export default router;
