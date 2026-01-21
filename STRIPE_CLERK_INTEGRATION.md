# Clerk + Stripe Subscription Integration Guide

## Overview

The Gastronomy OS integrates Clerk for authentication with Stripe for subscription management. This document describes the complete flow and how to set it up.

## Architecture

### Components

1. **Clerk** - User authentication and management
2. **Stripe** - Payment processing and subscription billing
3. **Database (Prisma)** - Subscription and billing event storage
4. **Webhooks** - Event synchronization between Stripe and our backend

### Data Models

#### User (Clerk + Database)

```typescript
// Clerk User (external)
{
  id: "user_xxx"
  email: "user@example.com"
  firstName: "John"
  lastName: "Doe"
}

// Our Database User
{
  id: "uuid"
  clerkId: "user_xxx" (matches Clerk)
  email: "user@example.com"
  fullName: "John Doe"
}
```

#### Subscription

```typescript
{
  id: "uuid"
  userId: "uuid" (FK to User)

  // Stripe References
  stripeCustomerId: "cus_xxx"
  stripeSubscriptionId: "sub_xxx"

  // Plan Info
  plan: "free" | "basic" | "pro" | "enterprise"
  status: "active" | "paused" | "canceled" | "past_due"

  // Feature Limits
  maxSites: 1 | 3 | 10 | unlimited
  maxUsers: 1 | 2 | 5 | unlimited

  // Billing Period
  currentPeriodStart: Date
  currentPeriodEnd: Date
  canceledAt?: Date
}
```

#### BillingEvent (Audit Trail)

```typescript
{
  id: "uuid"
  userId: "uuid"
  eventType: "subscription_created" | "subscription_updated" | "payment_succeeded" | ...
  amount?: number (in cents)
  stripeEventId: "evt_xxx" (prevents duplicates)
  metadata: {}
  createdAt: Date
}
```

## Setup Instructions

### 1. Configure Stripe

#### Create Stripe Account

1. Go to [stripe.com](https://stripe.com)
2. Sign up and create a project
3. Enable Stripe Billing/Subscriptions

#### Create Products & Prices

```
Product: "Maitr Free"
  Price: FREE (no recurring charge)

Product: "Maitr Basic"
  Price: €9.99/month (recurring)

Product: "Maitr Pro"
  Price: €29.99/month (recurring)

Product: "Maitr Enterprise"
  Price: custom (contact sales)
```

#### Get Credentials

```
STRIPE_SECRET_KEY=sk_live_xxx (secret, never expose in frontend)
STRIPE_PUBLISHABLE_KEY=pk_live_xxx (public, safe for browser)
STRIPE_WEBHOOK_SECRET=whsec_xxx (webhook signing secret)
```

### 2. Configure Webhooks

#### Create Webhook Endpoint

1. Go to Stripe Dashboard → Developers → Webhooks
2. Create a webhook endpoint pointing to: `https://your-domain.com/api/webhooks/stripe`
3. Select events:
   - `customer.created`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `payment_intent.succeeded`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `charge.refunded`

4. Copy the webhook secret and set `STRIPE_WEBHOOK_SECRET`

### 3. Set Environment Variables

```bash
# .env or DevServerControl
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### 4. Update Stripe Plan Mapping

In `server/webhooks/stripe.ts`, update the `PLAN_MAP` with your actual Stripe price IDs:

```typescript
const PLAN_MAP: Record<
  string,
  { name: string; maxSites: number; maxUsers: number }
> = {
  price_xxx_free: { name: "free", maxSites: 1, maxUsers: 1 },
  price_xxx_basic: { name: "basic", maxSites: 3, maxUsers: 2 },
  price_xxx_pro: { name: "pro", maxSites: 10, maxUsers: 5 },
  price_xxx_enterprise: { name: "enterprise", maxSites: -1, maxUsers: -1 },
};
```

## User Flows

### 1. User Signs Up (Clerk)

```
1. User fills signup form
2. Clerk creates user account
3. Webhook: clerk.user.created
   ↓
4. We create User record in database
5. We create Subscription with plan="free"
```

**Implementation:** `server/webhooks/clerk.ts`

### 2. User Upgrades to Paid Plan

```
1. User clicks "Upgrade" button
2. Frontend initializes Stripe.js
3. Frontend redirects to Stripe Checkout
4. User pays with card
5. Stripe creates Customer (cus_xxx)
6. Stripe creates Subscription (sub_xxx)
7. Webhook: customer.subscription.created
   ↓
8. We update User.Subscription:
   - stripeCustomerId = "cus_xxx"
   - stripeSubscriptionId = "sub_xxx"
   - plan = "basic" (from price ID)
   - status = "active"
   - currentPeriodEnd = (from Stripe)
   ↓
9. We create BillingEvent for audit
10. User can now publish 3 sites (maxSites=3)
```

**Implementation:** `server/webhooks/stripe.ts` → `handleSubscriptionCreated()`

### 3. Monthly Recurring Payment

```
1. Stripe collects payment automatically
2. Payment succeeds
3. Webhook: invoice.paid
   ↓
4. We create BillingEvent (for accounting)
   (Subscription status already active)
```

**Implementation:** `server/webhooks/stripe.ts` → `handleInvoicePaid()`

### 4. Payment Fails

```
1. Stripe tries to charge customer
2. Card declined
3. Webhook: invoice.payment_failed
   ↓
4. We update Subscription.status = "past_due"
5. We create BillingEvent with error details
6. We send email to user (TODO: implement email service)
   ↓
7. If payment fails 3 times:
   - Subscription automatically cancels
   - Webhook: customer.subscription.deleted
```

**Implementation:** `server/webhooks/stripe.ts` → `handleInvoicePaymentFailed()`

### 5. User Cancels Subscription

```
1. User clicks "Cancel Plan" in dashboard
2. Frontend calls: DELETE /api/subscriptions/:id
3. We call Stripe API: subscriptions.del(stripeSubscriptionId)
4. Stripe cancels subscription
5. Webhook: customer.subscription.deleted
   ↓
6. We update Subscription:
   - plan = "free"
   - status = "canceled"
   - canceledAt = now()
7. User downgraded to free plan
8. Can now only publish 1 site
9. If >1 site is published, others are hidden
```

**Implementation:** `server/webhooks/stripe.ts` → `handleSubscriptionDeleted()`

## API Endpoints

### Authentication (Clerk)

```
POST /api/auth/login - Via Clerk widget
POST /api/auth/logout - Via Clerk widget
GET /api/auth/user - Get current user info
```

### Subscriptions (Stripe)

```
GET /api/subscriptions/current
  Returns: { plan, status, maxSites, maxUsers, currentPeriodEnd, ... }

POST /api/subscriptions/upgrade
  Body: { priceId: "price_xxx" }
  Returns: { checkoutSessionId: "cs_xxx" }
  (Redirects to Stripe Checkout)

DELETE /api/subscriptions/:id
  Cancels subscription

GET /api/billing/events
  Returns: BillingEvent[] (audit trail)
```

### Configurations (with Subscription Limits)

```
POST /api/configurations/:id/publish
  Checks: count(published) < subscription.maxSites
  If exceeded: 403 "Subscription limit exceeded"
```

## Security Considerations

### 1. Row-Level Security (RLS)

- Every query filters by `userId`
- Users can only see their own subscriptions
- Enforced in middleware: `requireAuth`

### 2. Webhook Verification

- All Stripe webhooks are signed with a secret
- We verify signature before processing event
- Prevents malicious webhook injection

### 3. Idempotency

- Each Stripe event has unique `event.id`
- We store `BillingEvent.stripeEventId` to prevent duplicates
- If same event received twice, we skip processing

### 4. PCI Compliance

- We NEVER store credit card data
- We use Stripe Hosted Checkout (SAQ A compliant)
- We use Stripe.js (PCI compliant)

## Testing

### Test Mode Credentials

```
Stripe provides test mode keys:
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx

Use Stripe test cards:
- 4242 4242 4242 4242 (success)
- 4000 0000 0000 0002 (card declined)
- 4000 0025 0000 3155 (3D Secure)
```

### Test Webhook

```bash
curl -X POST http://localhost:3000/api/webhooks/stripe/test \
  -H "Content-Type: application/json" \
  -d '{"message":"Test webhook"}'
```

### Manual Webhook Testing

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click on your endpoint
3. Click "Send test event"
4. Select event type (e.g., `customer.subscription.created`)
5. Check logs: `tail -f logs/stripe.log`

## Troubleshooting

### "Neither apiKey nor config.authenticator provided"

- Solution: Set `STRIPE_SECRET_KEY` environment variable
- The app gracefully handles missing key (returns 501 on webhook)

### Webhook signature verification failed

- Check: `STRIPE_WEBHOOK_SECRET` is set correctly
- Check: Webhook request includes `stripe-signature` header
- Check: Raw body is passed to verification (not stringified)

### Duplicate charges

- Check: BillingEvent table for duplicate `stripeEventId`
- Stripe retries webhooks up to 3 days
- We prevent duplicates by checking stripeEventId first

### Subscription not updating

- Check: User's `clerkId` matches Stripe customer metadata
- Check: Price ID is in `PLAN_MAP`
- Check: Webhook endpoint is receiving events

## Next Steps

1. **Setup Production Stripe Account** (migrate from test mode)
2. **Implement Email Notifications** (payment failed, receipt, etc.)
3. **Add Usage Tracking** (analytics for billing)
4. **Implement Invoicing** (generate and send invoices)
5. **Add Dunning Management** (automatic retry failed payments)
6. **Analytics Dashboard** (MRR, churn, etc.)

## Related Files

- `server/webhooks/stripe.ts` - Webhook handlers
- `server/routes/subscriptions.ts` - API endpoints (TODO)
- `prisma/schema.prisma` - Data models (Subscription, BillingEvent, etc.)
- `server/middleware/auth.ts` - Auth middleware (Clerk integration)
