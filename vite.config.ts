// Load .env files FIRST before any other imports that might use env variables
import dotenv from 'dotenv';
import path from "path";
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

import { defineConfig, Plugin, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import { createServer } from "./server";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::", // Expose the server to all addresses (IPv6)
    port: 8080, // Set the port for the dev server
    fs: {
      // Allow Vite to access specific directories
      allow: [
        path.resolve(__dirname, "client"),   // Allow 'client' directory
        path.resolve(__dirname, "shared"),   // Allow 'shared' directory
      ],
      deny: [
        ".env",
        ".env.*",
        "*.{crt,pem}",
        "**/.git/**",
        "server/**", // Deny server folder
      ],
    },
    // Optional: You can proxy API requests to your backend if needed
    // proxy: {
    //   '/api': 'http://localhost:3000', // Forward API requests to your backend server
    // },
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
      "@": path.resolve(__dirname, "./client"),   // Alias for 'client' directory
      "@shared": path.resolve(__dirname, "./shared"), // Alias for 'shared' directory
    },
  },
}));

// Custom plugin for integrating Express into Vite's dev server
function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    configureServer(server) {
      const app = createServer(); // Import the Express server

      // Add the Express app as middleware to Vite dev server
      server.middlewares.use(app);
    },
  };
}
