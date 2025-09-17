import serverless from "serverless-http";
import { createServer } from "../../server";

const app = createServer();
// 1. We rename the original handler to avoid a name conflict.
const baseHandler = serverless(app);

// 2. We export our new wrapper function as 'handler', which is what Netlify expects.
export const handler = async (event: any, context: any) => {
  // This is our manual body-parsing logic from before.
  if (event.body && typeof event.body === 'string') {
    try {
      event.body = JSON.parse(event.body);
    } catch (e) {
      console.error("Manual JSON parsing in function handler failed:", e);
      event.body = {};
    }
  }

  // 3. We call the original handler to run the Express app.
  return baseHandler(event, context);
};