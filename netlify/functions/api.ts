import serverless from "serverless-http";
import { createServer } from "../../server";

const app = createServer();
const baseHandler = serverless(app);

// Dieser neue Wrapper ist unser Diagnose-Tool
export const handler = async (event: any, context: any) => {
  // === START DER DIAGNOSE ===
  // Diese Zeile ist der Schlüssel: Wir protokollieren den gesamten Body, den Netlify an die Funktion übergibt.
  console.log("NETLIFY FUNCTION RAW BODY:", event.body);
  console.log("IS BODY BASE64 ENCODED?:", event.isBase64Encoded);
  // === ENDE DER DIAGNOSE ===

  // Führen Sie den normalen Handler aus, um die Anfrage an Express weiterzuleiten
  return baseHandler(event, context);
};