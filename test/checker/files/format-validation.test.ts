import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatValidationRule } from "../../../src/checker/rules/files/format-validation.js";

vi.mock("../../../src/checker/rules/utils/format-detection.js", () => ({
  readFileSafe: vi.fn(),
  getExpectedFormat: vi.fn(),
  getCodeFormat: vi.fn(),
}));

import { readFileSafe, getExpectedFormat, getCodeFormat } from "../../../src/checker/rules/utils/format-detection.js";

const baseCtx = { dir: "/tmp", compilerOptions: null, hasBuildOutput: true, distFiles: [], allJsFiles: [], hasUnresolvedExtends: false };

beforeEach(() => {
  vi.mocked(readFileSafe).mockReturnValue(null);
  vi.mocked(getExpectedFormat).mockReturnValue("esm");
  vi.mocked(getCodeFormat).mockReturnValue("esm");
});

describe("files/format-validation", () => {
  it("warns when .mjs main contains CJS", () => {
    vi.mocked(readFileSafe).mockReturnValue("module.exports = {};");
    vi.mocked(getExpectedFormat).mockReturnValue("esm");
    vi.mocked(getCodeFormat).mockReturnValue("cjs");
    const results = formatValidationRule.check({
      ...baseCtx,
      pkg: { main: "./dist/index.mjs" },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe("warning");
    expect(results[0]!.message).toContain("ESM");
    expect(results[0]!.message).toContain("CJS");
  });

  it("passes when .mjs contains ESM", () => {
    vi.mocked(readFileSafe).mockReturnValue("export const x = 1;");
    vi.mocked(getExpectedFormat).mockReturnValue("esm");
    vi.mocked(getCodeFormat).mockReturnValue("esm");
    const results = formatValidationRule.check({
      ...baseCtx,
      pkg: { main: "./dist/index.mjs" },
    });
    expect(results).toHaveLength(0);
  });

  it("skips .js files (not explicit format extension)", () => {
    const results = formatValidationRule.check({
      ...baseCtx,
      pkg: { main: "./dist/index.js" },
    });
    expect(results).toHaveLength(0);
  });

  it("checks bin files too", () => {
    vi.mocked(readFileSafe).mockReturnValue("export const x = 1;");
    vi.mocked(getExpectedFormat).mockReturnValue("cjs");
    vi.mocked(getCodeFormat).mockReturnValue("esm");
    const results = formatValidationRule.check({
      ...baseCtx,
      pkg: { bin: { cli: "./dist/cli.cjs" } },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.message).toContain("cli");
  });

  it("skips when no build output", () => {
    const results = formatValidationRule.check({
      ...baseCtx,
      hasBuildOutput: false,
      pkg: { main: "./dist/index.mjs" },
    });
    expect(results).toHaveLength(0);
  });
});
