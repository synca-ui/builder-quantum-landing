import serverless from "serverless-http";

// WICHTIG: Pfad auf den "dist"-Ordner und die .mjs Datei ändern!
// Vorher: import { createServer } from "../../server/index";
import { createServer } from "../../dist/server/node-build.mjs";

// Die Funktion startet einfach nur den Server.
export const handler = serverless(createServer());