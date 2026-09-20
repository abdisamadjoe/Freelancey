import { resolve } from "path";
import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

// Integration specs (*.int.spec.ts) hit a real Postgres. They are excluded
// unless TEST_DATABASE_URL is set, and src/test/setup.ts guarantees no spec
// can fall back to the DATABASE_URL in backend/.env.
const integration = process.env.RUN_INTEGRATION === "true";

export default defineConfig({
  resolve: {
    alias: { "@": resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    include: integration ? ["src/**/*.int.spec.ts"] : ["src/**/*.spec.ts"],
    exclude: integration ? [] : ["**/*.int.spec.ts", "**/node_modules/**"],
    setupFiles: ["./src/test/setup.ts"],
    testTimeout: integration ? 30000 : 5000,
    hookTimeout: integration ? 60000 : 10000,
    root: "./",
  },
  plugins: [
    swc.vite({
      module: { type: "es6" },
    }),
  ],
});
