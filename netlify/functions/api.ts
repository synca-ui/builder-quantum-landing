import serverless from "serverless-http";
import { createServer } from "../../dist/server/netlify.mjs";

// Create Express app and wrap with serverless
export const handler = serverless(createServer());
