import { describe, it, expect, vi, beforeEach } from "vitest";
import { falseCjsEsmRule } from "../../../src/checker/rules/types/false-cjs-esm.js";

vi.mock("../../../src/checker/rules/utils/format-detection.js", () => ({
  getExpectedFormat: vi.fn(),
  readFileSafe: vi.fn(),
  getCodeFormat: vi.fn(),
}));

import { readFileSafe, getCodeFormat } from "../../../src/checker/rules/utils/format-detection.js";

const baseCtx = { dir: "/tmp", compilerOptions: null, hasBuildOutput: true, distFiles: [], allJsFiles: [], hasUnresolvedExtends: false };

beforeEach(() => {
  vi.mocked(readFileSafe).mockReturnValue(null);
  vi.mocked(getCodeFormat).mockReturnValue("unknown");
});

describe("types/false-cjs-esm", () => {
  it("detects FalseCJS — types declare CJS but JS is ESM", async () => {
    vi.mocked(readFileSafe).mockReturnValue("export const x = 1;");
    vi.mocked(getCodeFormat).mockReturnValue("esm");
    const results = await falseCjsEsmRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": {
            types: "./dist/index.d.cts",
            require: "./dist/index.cjs",
          },
        },
      },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe("error");
    expect(results[0]!.message).toContain("FalseCJS");
  });

  it("detects FalseESM — types declare ESM but JS is CJS", async () => {
    vi.mocked(readFileSafe).mockReturnValue("module.exports = {};");
    vi.mocked(getCodeFormat).mockReturnValue("cjs");
    const results = await falseCjsEsmRule.check({
      ...baseCtx,
      pkg: {
        type: "module",
        exports: {
          ".": {
            types: "./dist/index.d.ts",
            import: "./dist/index.js",
          },
        },
      },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe("error");
    expect(results[0]!.message).toContain("FalseESM");
  });

  it("passes when formats match", async () => {
    vi.mocked(readFileSafe).mockReturnValue("export const x = 1;");
    vi.mocked(getCodeFormat).mockReturnValue("esm");
    const results = await falseCjsEsmRule.check({
      ...baseCtx,
      pkg: {
        type: "module",
        exports: {
          ".": {
            types: "./dist/index.d.ts",
            import: "./dist/index.js",
          },
        },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("skips when no build output", async () => {
    const results = await falseCjsEsmRule.check({
      ...baseCtx,
      hasBuildOutput: false,
      pkg: {
        exports: {
          ".": { types: "./dist/index.d.cts", require: "./dist/index.cjs" },
        },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("skips unknown format", async () => {
    vi.mocked(readFileSafe).mockReturnValue("// nothing");
    vi.mocked(getCodeFormat).mockReturnValue("unknown");
    const results = await falseCjsEsmRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": { types: "./dist/index.d.cts", require: "./dist/index.cjs" },
        },
      },
    });
    expect(results).toHaveLength(0);
  });
});
