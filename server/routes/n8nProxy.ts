import type { Request, Response } from "express";

export async function handleForwardN8n(req: Request, res: Response) {
  // Variable IM Handler lesen, um immer den aktuellsten Wert aus Railway zu haben
  const N8N_URL = process.env.N8N_WEBHOOK_URL;

  if (!N8N_URL) {
    console.error("❌ N8N_WEBHOOK_URL ist in Railway nicht definiert!");
    return res.status(500).json({
      error: "n8n webhook not configured",
    });
  }

  try {
    const payload = req.body || {};
    console.log(`📤 Weiterleitung an n8n: ${N8N_URL}`);

    const resp = await fetch(N8N_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await resp.text();

    if (!resp.ok) {
      // Wenn hier 404 kommt, ist der Workflow in n8n nicht "Active" oder der Pfad falsch
      console.error(`⚠️ n8n antwortete mit Status ${resp.status}:`, text);
      return res.status(resp.status).send(text);
    }

    try {
      const json = JSON.parse(text);
      return res.json({ success: true, response: json });
    } catch (e) {
      return res.json({ success: true, response: text });
    }
  } catch (error) {
    console.error("❌ Kritischer Proxy-Fehler:", error);
    return res.status(500).json({ error: "Proxy failed", details: String(error) });
  }
}