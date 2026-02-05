import { describe, it, expect } from "vitest";
import { esmDynamicOnlyRule } from "../../../src/checker/rules/types/esm-dynamic-only.js";

const baseCtx = { dir: "/tmp", compilerOptions: null, hasBuildOutput: false, distFiles: [], allJsFiles: [], hasUnresolvedExtends: false };

describe("types/esm-dynamic-only", () => {
  it("warns when only require condition exists", () => {
    const results = esmDynamicOnlyRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": { require: "./dist/index.cjs" },
        },
      },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe("warning");
    expect(results[0]!.message).toContain("dynamic import()");
  });

  it("passes when import condition exists alongside require", () => {
    const results = esmDynamicOnlyRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": { import: "./dist/index.js", require: "./dist/index.cjs" },
        },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("passes when default condition exists alongside require", () => {
    const results = esmDynamicOnlyRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": { require: "./dist/index.cjs", default: "./dist/index.js" },
        },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("handles sugar form (no subpaths)", () => {
    const results = esmDynamicOnlyRule.check({
      ...baseCtx,
      pkg: {
        exports: { require: "./dist/index.cjs" },
      },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.message).toContain('"."');
  });

  it("passes when exports is a string", () => {
    const results = esmDynamicOnlyRule.check({
      ...baseCtx,
      pkg: { exports: "./dist/index.js" },
    });
    expect(results).toHaveLength(0);
  });

  it("passes when no exports", () => {
    const results = esmDynamicOnlyRule.check({
      ...baseCtx,
      pkg: {},
    });
    expect(results).toHaveLength(0);
  });

  it("warns per subpath independently", () => {
    const results = esmDynamicOnlyRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": { import: "./dist/index.js", require: "./dist/index.cjs" },
          "./utils": { require: "./dist/utils.cjs" },
        },
      },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.message).toContain("./utils");
  });
});
