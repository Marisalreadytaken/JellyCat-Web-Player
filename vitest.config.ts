import { defineConfig } from "vitest/config";

export default defineConfig({
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
