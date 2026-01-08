import serverless from "serverless-http";
import { createServer } from "../../dist/server/netlify.mjs";

const app = createServer();

// Wrap with serverless-http
const handlerBase = serverless(app);

// Middleware to disconnect Prisma after each request
export const handler = async (event: any, context: any) => {
  try {
    const response = await handlerBase(event, context);
    return response;
  } finally {
    // Disconnect Prisma after request to avoid hanging connections
    const { disconnectPrisma } = await import("../../dist/server/index-InGuMpTn.js");
    await disconnectPrisma?.();
  }
};
