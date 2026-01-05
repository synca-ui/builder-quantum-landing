import type { Request, Response } from "express";

// Read N8N webhook URL from environment variable
// If not set, log a warning but don't crash on import (validation happens at startup)
let N8N_URL = process.env.N8N_WEBHOOK_URL;

if (!N8N_URL) {
  console.warn(
    "⚠️  N8N_WEBHOOK_URL not set in environment. n8n forwarding will fail at runtime."
  );
}

export async function handleForwardN8n(req: Request, res: Response) {
  // Safety check: if N8N_URL not configured, return error
  if (!N8N_URL) {
    return res.status(500).json({
      error: "n8n webhook not configured",
      details: "N8N_WEBHOOK_URL environment variable is missing",
    });
  }

  try {
    const payload = req.body || {};

    // Forward to n8n
    const resp = await fetch(N8N_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await resp.text();

    if (!resp.ok) {
      console.error("n8n proxy returned non-ok", resp.status, text);
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
    console.error("n8n proxy error", error);
    return res
      .status(500)
      .json({ error: "Proxy failed", details: String(error) });
  }
}
