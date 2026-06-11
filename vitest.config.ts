import { defineConfig } from "vitest/config";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

export default defineConfig({
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
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"]
  }
});
