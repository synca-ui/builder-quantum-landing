import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
    root: ".",
    plugins: [react()],
    server: {
        port: 8082,
        host: "::",
        proxy: {
            // Forward n8n API calls to the main app server
            "/api": {
                target: "http://localhost:8081",
                changeOrigin: true,
            },
        },
    },
    build: {
        outDir: "../dist/check",
        emptyOutDir: true,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
