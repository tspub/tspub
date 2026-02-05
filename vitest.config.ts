import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    exclude: ["test/ecosystem/**"],
    coverage: {
      thresholds: {
        statements: 80,
      },
    },
  },
});
