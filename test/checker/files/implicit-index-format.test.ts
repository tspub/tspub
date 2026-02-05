import { describe, it, expect, vi, beforeEach } from "vitest";
import { implicitIndexFormatRule } from "../../../src/checker/rules/files/implicit-index-format.js";

vi.mock("../../../src/checker/rules/utils/format-detection.js", () => ({
  readFileSafe: vi.fn(),
  getCodeFormat: vi.fn(),
}));

import { readFileSafe, getCodeFormat } from "../../../src/checker/rules/utils/format-detection.js";

const baseCtx = { dir: "/tmp", compilerOptions: null, hasBuildOutput: false, distFiles: [], allJsFiles: [], hasUnresolvedExtends: false };

beforeEach(() => {
  vi.mocked(readFileSafe).mockReturnValue(null);
  vi.mocked(getCodeFormat).mockReturnValue("unknown");
});

describe("files/implicit-index-format", () => {
  it("warns when index.js is ESM but package type is commonjs", () => {
    vi.mocked(readFileSafe).mockReturnValue("export const x = 1;");
    vi.mocked(getCodeFormat).mockReturnValue("esm");
    const results = implicitIndexFormatRule.check({
      ...baseCtx,
      pkg: {},
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe("warning");
    expect(results[0]!.message).toContain("ESM");
    expect(results[0]!.message).toContain("commonjs");
  });

  it("warns when index.js is CJS but package type is module", () => {
    vi.mocked(readFileSafe).mockReturnValue("module.exports = {};");
    vi.mocked(getCodeFormat).mockReturnValue("cjs");
    const results = implicitIndexFormatRule.check({
      ...baseCtx,
      pkg: { type: "module" },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.message).toContain("CJS");
    expect(results[0]!.message).toContain("module");
  });

  it("passes when index.js matches package type", () => {
    vi.mocked(readFileSafe).mockReturnValue("module.exports = {};");
    vi.mocked(getCodeFormat).mockReturnValue("cjs");
    const results = implicitIndexFormatRule.check({
      ...baseCtx,
      pkg: {},
    });
    expect(results).toHaveLength(0);
  });

  it("skips when main field exists", () => {
    const results = implicitIndexFormatRule.check({
      ...baseCtx,
      pkg: { main: "./dist/index.js" },
    });
    expect(results).toHaveLength(0);
  });

  it("skips when exports field exists", () => {
    const results = implicitIndexFormatRule.check({
      ...baseCtx,
      pkg: { exports: { ".": "./dist/index.js" } },
    });
    expect(results).toHaveLength(0);
  });

  it("skips when index.js not found", () => {
    vi.mocked(readFileSafe).mockReturnValue(null);
    const results = implicitIndexFormatRule.check({
      ...baseCtx,
      pkg: {},
    });
    expect(results).toHaveLength(0);
  });
});
