import { describe, it, expect, vi, beforeEach } from "vitest";
import { falseExportDefaultRule } from "../../../src/checker/rules/types/false-export-default.js";

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

describe("types/false-export-default", () => {
  it("warns when types have export default but JS uses module.exports without __esModule", () => {
    vi.mocked(readFileSafe).mockImplementation((path: string) => {
      if (path.endsWith(".d.ts")) return "export default function foo(): void;";
      if (path.endsWith(".cjs")) return "module.exports = function foo() {};";
      return null;
    });
    const results = falseExportDefaultRule.check({
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
    expect(results[0]!.severity).toBe("warning");
    expect(results[0]!.message).toContain("export default");
    expect(results[0]!.message).toContain("module.exports");
  });

  it("passes when JS has __esModule flag", () => {
    vi.mocked(readFileSafe).mockImplementation((path: string) => {
      if (path.endsWith(".d.ts")) return "export default function foo(): void;";
      if (path.endsWith(".cjs")) return 'Object.defineProperty(exports, "__esModule", { value: true });\nmodule.exports = function foo() {};';
      return null;
    });
    const results = falseExportDefaultRule.check({
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

  it("passes when types don't have export default", () => {
    vi.mocked(readFileSafe).mockImplementation((path: string) => {
      if (path.endsWith(".d.ts")) return "export declare function foo(): void;";
      if (path.endsWith(".cjs")) return "module.exports = function foo() {};";
      return null;
    });
    const results = falseExportDefaultRule.check({
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

  it("skips when no build output", () => {
    const results = falseExportDefaultRule.check({
      ...baseCtx,
      hasBuildOutput: false,
      pkg: {
        exports: {
          ".": { types: "./dist/index.d.ts", require: "./dist/index.cjs" },
        },
      },
    });
    expect(results).toHaveLength(0);
  });
});
