/**
 * Netlify serverless entry point
 * Exports createServer and disconnectPrisma for the Netlify function
 */

export { createServer } from "./index";
export { disconnectPrisma } from "./db/prisma";
