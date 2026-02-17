import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "site",
    assetsDir: "app-assets",
    emptyOutDir: false,
    rollupOptions: {
      output: {
        entryFileNames: "app-assets/[name].js",
        chunkFileNames: "app-assets/[name].js",
        assetFileNames: "app-assets/[name][extname]"
      }
    }
  }
});
