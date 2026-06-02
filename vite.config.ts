import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@app": "/src/app",
      "@core": "/src/core",
      "@domain": "/src/domain",
      "@features": "/src/features",
      "@shared": "/src/shared",
      "@styles": "/src/styles"
    }
  },
  server: {
    port: 5173
  }
});
