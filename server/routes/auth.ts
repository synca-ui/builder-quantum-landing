import { Router } from "express";

export const authRouter = Router();

authRouter.get("/signup", (_req, res) => {
  return res
    .status(405)
    .json({ error: "Use POST /api/auth/signup with JSON { email, password }" });
});

// === DER ENTSCHEIDENDE DIAGNOSE-TEST ===
// Der ursprüngliche Code ist auskommentiert. Wir senden nur zurück, was wir empfangen.
authRouter.post("/signup", async (req, res) => {
  console.log("BODY EMPFANGEN IN EXPRESS-ROUTE:", req.body);

  // Sendet den empfangenen Body direkt als Antwort zurück.
  // Wenn req.body leer ist, wird hier ein leeres Objekt gesendet.
  return res.status(200).json({
    message: "Body received by Express",
    receivedBody: req.body,
  });
});

authRouter.post("/login", async (req, res) => {
  // Der Login ist für diesen Test vorübergehend deaktiviert.
  return res.status(503).json({ error: "Login is temporarily disabled for testing." });
});