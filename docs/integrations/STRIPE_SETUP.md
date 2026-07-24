# Stripe Integration Setup Guide

This document explains how to set up Stripe webhook handling for order tracking and social proof badges.

## Overview

The Stripe webhook handler logs order events whenever a payment is successfully processed. These events are used to display social proof badges on menu items ("Ordered X mins ago").

## Setup Steps

### 1. Get Your Stripe Keys

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **API Keys**
3. Copy your **Secret Key** (starts with `sk_`)
4. Save it for later use

### 2. Set Environment Variables

Add the following to your `.env` file or environment variables:

```env
# Stripe Integration
STRIPE_SECRET_KEY=sk_test_xxxxx  # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # You'll get this from webhook setup
API_BASE_URL=https://yourdomain.com  # Base URL for order API calls (optional)
```

### 3. Configure Webhook Endpoint in Stripe

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen for:
   - `payment_intent.succeeded` - When a payment completes
   - `charge.succeeded` - Alternative payment completion event
   - `charge.refunded` - Optional: for refund tracking
5. Click **Create endpoint**
6. Copy the **Signing secret** and add it to your `.env`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

### 4. Test the Webhook

#### Using the Stripe CLI (Recommended)

```bash
# Install Stripe CLI
# Follow: https://stripe.com/docs/stripe-cli

# Forward webhook events to your local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# This will display your webhook signing secret
# Copy and add to .env as STRIPE_WEBHOOK_SECRET
```

#### Using Manual Test Endpoint

While in development, you can manually trigger order events:

```bash
curl -X POST http://localhost:3000/api/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{
    "webAppId": "your-web-app-id",
    "menuItemName": "Pasta Carbonara",
    "amount": 2500
  }'
```

### 5. Verify Integration

1. Process a test payment in Stripe Test Mode
2. Check that order events appear in your database:
   ```sql
   SELECT * FROM public.order_events
   WHERE web_app_id = 'your-web-app-id'
   ORDER BY created_at DESC;
   ```
3. Visit your published site and confirm social proof badges appear
4. Badges should show "Ordered X mins ago" under menu items

## Data Flow

```
1. Customer makes payment on Stripe
           ↓
2. Payment successful (payment_intent.succeeded event)
           ↓
3. Stripe sends POST to /api/webhooks/stripe
           ↓
4. Webhook handler verifies signature
           ↓
5. Webhook handler extracts order details from metadata
           ↓
6. Webhook handler calls POST /api/orders/create
           ↓
7. Order event logged to database (order_events table)
           ↓
8. Frontend polls /api/orders/:webAppId/menu-stats
           ↓
9. Social proof badges updated on menu items
```

## Stripe Metadata Format

When creating Stripe Payment Intents, include metadata to link orders to your site:

```json
{
  "amount": 2500,
  "currency": "usd",
  "metadata": {
    "web_app_id": "your-web-app-id",
    "menu_item_id": "item-123",
    "menu_item_name": "Pasta Carbonara",
    "customer_email": "customer@example.com"
  }
}
```

## Webhook Signature Verification

The webhook handler automatically verifies that requests come from Stripe:

- Uses HMAC-SHA256 hashing
- Checks `stripe-signature` header
- Validates timestamp (prevents replay attacks within 5-minute window)
- Rejects unsigned or tampered requests

## Common Issues

### "Invalid Signature" Error

**Problem**: Webhook is rejected with invalid signature

- Verify `STRIPE_WEBHOOK_SECRET` is correctly set
- Check that you're using the signing secret (starts with `whsec_`)
- Not the secret API key

**Solution**:

1. Get fresh signing secret from Stripe Dashboard
2. Update `.env` with correct value
3. Restart your server

### Webhooks Not Received

**Problem**: Webhook endpoint never receives events

**Solutions**:

1. Verify endpoint URL is publicly accessible (not localhost)
2. Check firewall/security group allows inbound traffic
3. Review Stripe Dashboard → Webhooks → Event log for delivery attempts
4. Check your application logs for errors

### Order Events Not Created

**Problem**: Webhook is received but orders aren't logged

**Solutions**:

1. Verify `webAppId` in metadata matches actual web app ID
2. Check database connection is working
3. Review server logs for SQL errors
4. Ensure `order_events` table exists and has correct schema

## Testing Checklist

- [ ] Environment variables set correctly
- [ ] Webhook endpoint is publicly accessible
- [ ] Stripe sends test events successfully
- [ ] Signature verification passes
- [ ] Order events appear in database
- [ ] Social proof badges display on published site
- [ ] Badges update within 30 seconds (polling interval)

## Troubleshooting

### View Webhook Deliveries

In Stripe Dashboard:

1. Go to **Developers** → **Webhooks**
2. Click your endpoint
3. Scroll to **Events** to see delivery history
4. Click event to see request/response details

### Enable Debug Logging

Set environment variable to enable detailed logs:

```env
DEBUG=stripe:*
```

### Check Database

```sql
-- View all order events
SELECT * FROM order_events ORDER BY created_at DESC;

-- View menu stats for a web app
SELECT menu_item_name, COUNT(*) as count, MAX(created_at) as last_ordered
FROM order_events
WHERE web_app_id = 'your-web-app-id'
GROUP BY menu_item_name
ORDER BY last_ordered DESC;
```

## Next Steps

After setting up Stripe webhooks:

1. **Test Live Mode** (when ready for production)
   - Generate live API keys in Stripe
   - Update `.env` with live keys
   - Add production webhook endpoint
   - Switch Stripe SDK to live mode

2. **Monitor Orders**
   - Track order event rates
   - Monitor database growth
   - Set up cleanup to remove events older than 7 days

3. **Customize**
   - Add custom metadata fields
   - Integrate with inventory system
   - Send order notifications to restaurant

## Support

For issues:

1. Check Stripe Dashboard event logs
2. Review server application logs
3. Verify database connection
4. See [Stripe Webhook Documentation](https://stripe.com/docs/webhooks)
