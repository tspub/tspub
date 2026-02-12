import { describe, it, expect } from "vitest";
import { typesNotExportedRule } from "../../../src/checker/rules/exports/types-not-exported.js";

const baseCtx = { dir: "/tmp", compilerOptions: null, hasBuildOutput: false, distFiles: [], allJsFiles: [], hasUnresolvedExtends: false };

describe("exports/types-not-exported", () => {
  it("warns when types field exists but exports has no types condition", async () => {
    const results = await typesNotExportedRule.check({
      ...baseCtx,
      pkg: {
        types: "./dist/index.d.ts",
        exports: {
          ".": { import: "./dist/index.js", require: "./dist/index.cjs" },
        },
      },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe("warning");
    expect(results[0]!.message).toContain("types");
  });

  it("passes when exports includes types condition", async () => {
    const results = await typesNotExportedRule.check({
      ...baseCtx,
      pkg: {
        types: "./dist/index.d.ts",
        exports: {
          ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
        },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("passes when no types field at all", async () => {
    const results = await typesNotExportedRule.check({
      ...baseCtx,
      pkg: {
        exports: { ".": { import: "./dist/index.js" } },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("passes when no exports field", async () => {
    const results = await typesNotExportedRule.check({
      ...baseCtx,
      pkg: { types: "./dist/index.d.ts" },
    });
    expect(results).toHaveLength(0);
  });

  it("warns when typings field exists but no types condition", async () => {
    const results = await typesNotExportedRule.check({
      ...baseCtx,
      pkg: {
        typings: "./dist/index.d.ts",
        exports: {
          ".": { import: "./dist/index.js" },
        },
      },
    });
    expect(results).toHaveLength(1);
  });
});
