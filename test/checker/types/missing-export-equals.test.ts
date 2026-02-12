import { describe, it, expect, vi, beforeEach } from "vitest";
import { missingExportEqualsRule } from "../../../src/checker/rules/types/missing-export-equals.js";

vi.mock("../../../src/checker/rules/utils/format-detection.js", () => ({
  readFileSafe: vi.fn(),
  hasCJSSyntax: vi.fn(),
  getExpectedFormat: vi.fn(),
  getCodeFormat: vi.fn(),
}));

import { readFileSafe } from "../../../src/checker/rules/utils/format-detection.js";

const baseCtx = { dir: "/tmp", compilerOptions: null, hasBuildOutput: true, distFiles: [], allJsFiles: [], hasUnresolvedExtends: false };

beforeEach(() => {
  vi.mocked(readFileSafe).mockReturnValue(null);
});

describe("types/missing-export-equals", () => {
  it("reports info when JS uses module.exports but types lack export =", async () => {
    vi.mocked(readFileSafe).mockImplementation((path: string) => {
      if (path.endsWith(".d.ts")) return "export declare function main(): void;";
      if (path.endsWith(".cjs")) return "module.exports = function main() {};";
      return null;
    });
    const results = await missingExportEqualsRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": {
            types: "./dist/index.d.ts",
            require: "./dist/index.cjs",
          },
        },
      },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe("info");
    expect(results[0]!.message).toContain("export =");
  });

  it("passes when types have export =", async () => {
    vi.mocked(readFileSafe).mockImplementation((path: string) => {
      if (path.endsWith(".d.ts")) return "declare function main(): void;\nexport = main;";
      if (path.endsWith(".cjs")) return "module.exports = function main() {};";
      return null;
    });
    const results = await missingExportEqualsRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": {
            types: "./dist/index.d.ts",
            require: "./dist/index.cjs",
          },
        },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("skips when JS doesn't use module.exports =", async () => {
    vi.mocked(readFileSafe).mockImplementation((path: string) => {
      if (path.endsWith(".d.ts")) return "export declare function main(): void;";
      if (path.endsWith(".cjs")) return "exports.main = function main() {};";
      return null;
    });
    const results = await missingExportEqualsRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": {
            types: "./dist/index.d.ts",
            require: "./dist/index.cjs",
          },
        },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("skips import conditions", async () => {
    vi.mocked(readFileSafe).mockReturnValue("module.exports = {};");
    const results = await missingExportEqualsRule.check({
      ...baseCtx,
      pkg: {
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
});
