import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "server-only": path.resolve(__dirname, "tests/helpers/server-only-stub.ts"),
      "@": path.resolve(__dirname),
    },
  },
  test: {
    include: ["evals/**/*.eval.test.ts"],
    testTimeout: 60_000,
  },
});
