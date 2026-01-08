import serverless from "serverless-http";
import { createServer, disconnectPrisma } from "../../dist/server/netlify.mjs";

const app = createServer();

// Wrap with serverless-http
const handlerBase = serverless(app);

// Handler wrapper to ensure Prisma disconnects after each request
export const handler = async (event: any, context: any) => {
  try {
    const response = await handlerBase(event, context);
    return response;
  } finally {
    // Disconnect Prisma after request to avoid hanging connections in serverless
    await disconnectPrisma();
  }
};
