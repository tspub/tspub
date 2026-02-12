import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    exclude: ["test/ecosystem/**"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/cli/**",
        "src/scaffold/templates/**",
        "src/**/index.ts",
      ],
      reporter: ["text", "text-summary", "json-summary"],
      reportsDirectory: "coverage",
      thresholds: {
        statements: 75,
      },
    },
  },
});
