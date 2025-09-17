import serverless from "serverless-http";
import { createServer } from "../../server";

const app = createServer();
const handler = serverless(app);

export const handler = async (event: any, context: any) => {
  // === DIE FINALE KORREKTUR ===
  // Die Logs beweisen, dass 'event.body' ein JSON-String ist. Wir parsen ihn hier manuell
  // und ersetzen den String durch das resultierende JavaScript-Objekt.
  // Damit zwingen wir serverless-http, die bereits korrekten Daten zu verwenden.
  if (event.body && typeof event.body === 'string') {
    try {
      event.body = JSON.parse(event.body);
    } catch (e) {
      console.error("Manuelles Parsen des Body in der Netlify-Funktion ist fehlgeschlagen:", e);
      // Falls etwas schiefgeht, übergeben wir ein leeres Objekt, um einen Absturz zu verhindern.
      event.body = {};
    }
  }

  // Führen Sie den normalen Handler mit dem nun korrigierten Body aus.
  return handler(event, context);
};