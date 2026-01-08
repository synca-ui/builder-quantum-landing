import serverless from "serverless-http";

// TRICK: Wir importieren ALLES (* as ...) statt nur einen Namen.
// Das verhindert den "SyntaxError: does not provide an export named..."
import * as serverBuild from "../../dist/server/node-build.mjs";

// Hilfsfunktion: Sucht die createServer Funktion, egal wo sie versteckt ist
function getCreateServer() {
  // Fall 1: Es ist ein direkter Named Export (Wie im Quellcode)
  if (typeof serverBuild.createServer === 'function') {
    return serverBuild.createServer;
  }

  // Fall 2: Vite hat es in ein 'default' Objekt gepackt (Sehr wahrscheinlich hier der Fall!)
  // @ts-ignore - TypeScript kennt die Struktur des Builds nicht, ist zur Laufzeit aber okay
  if (serverBuild.default && typeof serverBuild.default.createServer === 'function') {
    // @ts-ignore
    return serverBuild.default.createServer;
  }

  // Fall 3: Der Default Export IST die Funktion
  if (typeof serverBuild.default === 'function') {
    // @ts-ignore
    return serverBuild.default;
  }

  throw new Error("FATAL: createServer function not found in build artifact!");
}

// Funktion abrufen
const createServer = getCreateServer();

// Serverless Handler starten
export const handler = serverless(createServer());