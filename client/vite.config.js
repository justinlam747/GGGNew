import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "terser",
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          vendor: ["react", "react-dom", "react-router-dom"],
          ui: ["lucide-react"],
          admin: [
            "./src/components/admin/Dashboard.jsx",
            "./src/components/admin/DetailedGames.jsx",
            "./src/components/admin/DetailedGroups.jsx"
          ],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  base: "/",
});
