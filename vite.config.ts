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
    // Removed hmr config - let Vite use sensible defaults
    // The HMR race condition is better handled by removing custom invalidate logic
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
    include: [
      "react",
      "react-dom",
      "react-i18next",
      "i18next",
      // Include frequently used dependencies
      "@tanstack/react-query",
      "react-router-dom"
    ],
    exclude: ["lucide-react"], // Dynamically import icons for smaller initial bundle
  },
  build: {
    outDir: "dist/spa", // Set the output directory for the built files
    sourcemap: false, // Disable sourcemaps for production
    minify: "esbuild", // Use esbuild for faster minification
    target: "esnext", // Target modern browsers
    chunkSizeWarningLimit: 1000, // Increase warning limit for larger chunks
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor chunk for third-party libraries
          vendor: [
            "react",
            "react-dom",
            "react-router-dom",
          ],
          // Query chunk for data fetching
          query: [
            "@tanstack/react-query"
          ],
          // Auth chunk for authentication
          auth: [
            "@clerk/clerk-react"
          ],
          // UI components chunk
          ui: [
            "@radix-ui/react-toast",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-dialog",
            "@radix-ui/react-select"
          ],
          // Icons chunk (lazy loaded)
          icons: ["lucide-react"],
          // Utils chunk
          utils: ["clsx", "tailwind-merge"]
        },
        // Optimize chunk file names for caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '') || 'chunk'
            : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) return 'assets/[name]-[hash][extname]';

          const info = assetInfo.name.split('.');
          const extType = info[info.length - 1];

          if (/\.(css)$/.test(assetInfo.name)) {
            return 'css/[name]-[hash][extname]';
          } else if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico|webp|avif)$/i.test(assetInfo.name)) {
            return 'images/[name]-[hash][extname]';
          } else if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
            return 'fonts/[name]-[hash][extname]';
          }
          return `assets/[name]-[hash][extname]`;
        }
      }
    }
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
      react: path.resolve(__dirname, "./node_modules/react"),
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
      };
    },
  };
}
