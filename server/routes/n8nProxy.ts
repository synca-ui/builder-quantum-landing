import type { Request, Response } from 'express';

const N8N_URL = 'https://n8n-production-1508.up.railway.app/webhook-test/b1a76bcf-936c-4ac0-9f8e-6f3cb31bf646';

export async function handleForwardN8n(req: Request, res: Response) {
  try {
    const payload = req.body || {};

    // Forward to n8n
    const resp = await fetch(N8N_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await resp.text();

    if (!resp.ok) {
      console.error('n8n proxy returned non-ok', resp.status, text);
      return res.status(resp.status).send(text);
    }

    // Try to parse JSON response, otherwise return text
    try {
      const json = JSON.parse(text);
      return res.json({ success: true, forwarded: true, response: json });
    } catch (e) {
      return res.json({ success: true, forwarded: true, response: text });
    }
  } catch (error) {
    console.error('n8n proxy error', error);
    return res.status(500).json({ error: 'Proxy failed', details: String(error) });
  }
}
