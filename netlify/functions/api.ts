import serverless from "serverless-http";
import { createServer, disconnectPrisma } from "../../dist/server/netlify.mjs";

const app = createServer();

// Wrap with serverless-http
const handlerBase = serverless(app);

// Handler wrapper to ensure Prisma disconnects after each request
export const handler = async (event: any, context: any) => {
  // Prevent Lambda from waiting for event loop to be empty
  // This ensures the function exits immediately after responding
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    const response = await handlerBase(event, context);

    // Ensure Prisma disconnects before returning
    await disconnectPrisma();

    return response;
  } catch (error) {
    console.error("Netlify function error:", error);

    // Disconnect Prisma on error too
    await disconnectPrisma();

    // Return error response
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
