import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts"],
    root: "./",
  },
  plugins: [
    swc.vite({
      module: { type: "es6" },
    }),
  ],
});
