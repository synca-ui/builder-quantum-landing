import { Webhook } from 'svix';
// WICHTIG: Wir importieren die Klasse direkt, nicht die Instanz aus ../db/prisma
import { PrismaClient } from '@prisma/client';
import type { WebhookEvent } from '@clerk/clerk-sdk-node';

// Wir erstellen hier eine eigene Instanz für den Webhook, um Import-Probleme zu umgehen
const prisma = new PrismaClient();

export async function handleClerkWebhook(req: any, res: any) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('Missing CLERK_WEBHOOK_SECRET');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const svix_id = req.headers["svix-id"] as string;
  const svix_timestamp = req.headers["svix-timestamp"] as string;
  const svix_signature = req.headers["svix-signature"] as string;

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).send('Error occured -- no svix headers');
  }

  const body = req.body.toString();
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return res.status(400).send('Error verifying webhook');
  }

  const eventType = evt.type;

  // --- USER CREATED / UPDATED ---
  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name } = evt.data;
    const email = email_addresses[0]?.email_address;
    const fullName = `${first_name || ''} ${last_name || ''}`.trim();

    try {
      // Hier stürzte es vorher ab, weil prisma null war. Jetzt ist es fix.
      await prisma.user.upsert({
        where: { clerkId: id },
        update: {
          email,
          fullName,
        },
        create: {
          clerkId: id,
          email,
          fullName,
          role: 'OWNER',
        },
      });
      console.log(`[Webhook] User synced: ${id}`);
    } catch (error) {
      console.error('[Webhook] DB Error:', error);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  // --- USER DELETED ---
  if (eventType === 'user.deleted') {
    const { id } = evt.data;
    if (id) {
      try {
        await prisma.user.delete({ where: { clerkId: id } });
        console.log(`[Webhook] User deleted: ${id}`);
      } catch (error) {
        console.error('[Webhook] Delete Error:', error);
      }
    }
  }

  return res.status(200).json({ success: true });
}