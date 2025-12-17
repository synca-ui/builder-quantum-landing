import { Request, Response } from 'express';
import crypto from 'crypto';

/**
 * Stripe Webhook Handler
 * Receives Stripe events and logs order events for social proof tracking
 * 
 * Events handled:
 * - payment_intent.succeeded - Payment completed
 * - charge.refunded - Refund processed
 * - order.created - Order placed (custom event)
 */

// Types for Stripe webhook data
interface StripePaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'requires_capture' | 'canceled' | 'succeeded';
  customer?: string;
  metadata?: Record<string, string>;
  created: number;
  description?: string;
}

interface StripeEvent {
  id: string;
  type: string;
  created: number;
  data: {
    object: any;
    previous_attributes?: Record<string, any>;
  };
}

interface OrderEventData {
  webAppId: string;
  menuItemId?: string;
  menuItemName?: string;
  orderSource: 'stripe' | 'pos' | 'manual' | 'other';
  amount?: number;
  currency?: string;
  userAvatarUrl?: string;
  userEmail?: string;
  customerId?: string;
  metadata?: Record<string, string>;
}

/**
 * Verify Stripe webhook signature
 * Ensures the webhook is from Stripe and hasn't been tampered with
 */
function verifyStripeSignature(
  rawBody: string,
  signature: string | undefined,
  webhookSecret: string
): boolean {
  if (!signature || !webhookSecret) {
    console.error('Missing signature or webhook secret');
    return false;
  }

  try {
    // Stripe signs webhooks with HMAC-SHA256
    const hash = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const [timestamp, signedHash] = signature.split(',').map(part => part.split('=')[1]);

    // Verify signature matches
    const isValid = signedHash === hash;

    // Optional: Check timestamp to prevent replay attacks (5 minute window)
    const webhookTime = parseInt(timestamp, 10);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDifference = Math.abs(currentTime - webhookTime);

    if (timeDifference > 300) {
      console.warn('Webhook timestamp too old (possible replay attack):', timeDifference);
      return false;
    }

    return isValid;
  } catch (error) {
    console.error('Error verifying Stripe signature:', error);
    return false;
  }
}

/**
 * Extract order details from Stripe payment intent
 */
function extractOrderDetailsFromPaymentIntent(intent: StripePaymentIntent): Partial<OrderEventData> {
  const metadata = intent.metadata || {};

  return {
    webAppId: metadata.web_app_id,
    menuItemId: metadata.menu_item_id,
    menuItemName: metadata.menu_item_name,
    amount: intent.amount,
    currency: intent.currency,
    customerId: intent.customer,
    metadata: metadata
  };
}

/**
 * Extract order details from Stripe charge
 */
function extractOrderDetailsFromCharge(charge: any): Partial<OrderEventData> {
  const metadata = charge.metadata || {};

  return {
    webAppId: metadata.web_app_id,
    menuItemId: metadata.menu_item_id,
    menuItemName: metadata.menu_item_name,
    amount: charge.amount,
    currency: charge.currency,
    customerId: charge.customer,
    metadata: metadata
  };
}

/**
 * Log order event to database
 * Called whenever an order is successfully paid
 */
async function logOrderEvent(orderData: OrderEventData): Promise<boolean> {
  try {
    // Validate required fields
    if (!orderData.webAppId) {
      console.warn('Missing webAppId in order data');
      return false;
    }

    // Call the order creation endpoint
    const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000'}/api/orders/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Source': 'stripe'
      },
      body: JSON.stringify({
        webAppId: orderData.webAppId,
        menuItemId: orderData.menuItemId,
        menuItemName: orderData.menuItemName || 'Unknown Item',
        orderSource: orderData.orderSource || 'stripe',
        amount: orderData.amount,
        currency: orderData.currency,
        userAvatarUrl: orderData.userAvatarUrl,
        userEmail: orderData.userEmail,
        customerId: orderData.customerId,
        metadata: orderData.metadata
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to log order event:', error);
      return false;
    }

    console.log(`Order event logged for webapp ${orderData.webAppId}, item: ${orderData.menuItemName}`);
    return true;
  } catch (error) {
    console.error('Error logging order event:', error);
    return false;
  }
}

/**
 * Main Stripe webhook handler
 * 
 * Usage:
 * ```
 * app.post('/api/webhooks/stripe', express.raw({type: 'application/json'}), handleStripeWebhook);
 * ```
 */
export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers['stripe-signature'] as string | undefined;

  // Verify webhook authenticity
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  
  if (!verifyStripeSignature(rawBody, signature, webhookSecret || '')) {
    console.warn('Invalid Stripe webhook signature');
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  let event: StripeEvent;

  try {
    event = JSON.parse(rawBody);
  } catch (error) {
    console.error('Failed to parse webhook body:', error);
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  console.log(`Received Stripe webhook: ${event.type}`);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as StripePaymentIntent;
        const orderData: OrderEventData = {
          ...extractOrderDetailsFromPaymentIntent(paymentIntent),
          orderSource: 'stripe',
          userEmail: paymentIntent.metadata?.customer_email
        } as OrderEventData;

        await logOrderEvent(orderData);
        break;
      }

      case 'charge.succeeded': {
        const charge = event.data.object;
        const orderData: OrderEventData = {
          ...extractOrderDetailsFromCharge(charge),
          orderSource: 'stripe',
          userEmail: charge.billing_details?.email
        } as OrderEventData;

        await logOrderEvent(orderData);
        break;
      }

      case 'charge.refunded': {
        // Optional: Handle refunds (could mark as refunded in database)
        const charge = event.data.object;
        console.log(`Refund processed for charge ${charge.id}`);
        // Could log refund event for analytics
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        // Optional: Handle subscription changes
        console.log(`Subscription event: ${event.type}`);
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    // Acknowledge receipt of webhook
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

/**
 * Test webhook handler (for development)
 * Can be called manually to test webhook processing
 */
export async function handleWebhookTest(req: Request, res: Response): Promise<void> {
  try {
    const { webAppId, menuItemName, amount } = req.body;

    if (!webAppId) {
      res.status(400).json({ error: 'Missing webAppId' });
      return;
    }

    const success = await logOrderEvent({
      webAppId,
      menuItemName: menuItemName || 'Test Item',
      amount: amount || 1000,
      orderSource: 'manual',
      currency: 'USD'
    });

    if (success) {
      res.status(200).json({ message: 'Test order event logged' });
    } else {
      res.status(500).json({ error: 'Failed to log order event' });
    }
  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({ error: String(error) });
  }
}

export default handleStripeWebhook;
