import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version)
  },
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
