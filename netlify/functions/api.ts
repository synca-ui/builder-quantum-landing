import serverless from "serverless-http";
import { createServer } from "../../server/index";

// Die Funktion startet einfach nur den Server. Keine weitere Logik hier.
export const handler = serverless(createServer());
