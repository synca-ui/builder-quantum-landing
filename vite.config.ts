// Load .env files FIRST before any other imports that might use env variables
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, ".env"), override: true });

import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::", // Expose the server to all addresses (IPv6)
    port: 8081, // Set the port for the dev server
    fs: {
      // Allow Vite to access specific directories
      allow: [
        path.resolve(__dirname, "client"), // Allow 'client' directory
        path.resolve(__dirname, "shared"), // Allow 'shared' directory
      ],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**"],
    },
  },
  // Deduplicate React to avoid multiple instance issues
  optimizeDeps: {
    include: ["react", "react-dom", "react-i18next", "i18next"],
  },
  build: {
    outDir: "dist/spa", // Set the output directory for the built files
  },
  plugins: [
    react(), // Use the React plugin for handling React files with SWC for fast compilation
    expressPlugin(), // Integrate Express with Vite for custom server-side logic
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"), // Alias for 'client' directory
      "@shared": path.resolve(__dirname, "./shared"), // Alias for 'shared' directory
      // Force single React instance to prevent duplicate React issues
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
    dedupe: ["react", "react-dom"],
  },
}));

// Custom plugin for integrating Express into Vite's dev server
function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    configureServer(server) {
      // WICHTIG: Das 'return async () =>' sorgt dafür, dass dieser Code erst NACH
      // den Vite-Standards (Frontend) ausgeführt wird.
      return async () => {
        // Dynamically import the server only during dev server startup
        const { createServer } = await import("./server");
        const app = createServer();

        // Add the Express app as middleware to Vite dev server
        server.middlewares.use(app);
      }
    }
  };
}
