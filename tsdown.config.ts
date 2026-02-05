import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "bin/tspub": "bin/tspub.ts",
    "type-tester/assertions": "src/type-tester/assertions.ts",
  },
  format: "esm",
  dts: true,
  sourcemap: true,
  clean: true,
  external: [/^node:/, "commander", "chalk", "prompts", "typescript"],
});
