import { describe, it, expect } from "vitest";
import { noDeprecatedSubpathRule } from "../../../src/checker/rules/exports/no-deprecated-subpath-mapping.js";

const baseCtx = { dir: "/tmp", compilerOptions: null, hasBuildOutput: true, distFiles: [], allJsFiles: [], hasUnresolvedExtends: false };

describe("exports/no-deprecated-subpath", () => {
  it("warns on trailing / in exports keys", () => {
    const results = noDeprecatedSubpathRule.check({ ...baseCtx, pkg: { exports: { ".": "./dist/index.js", "./utils/": "./dist/utils/" } } });
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain("deprecated");
  });

  it("passes with /* pattern", () => {
    const results = noDeprecatedSubpathRule.check({ ...baseCtx, pkg: { exports: { ".": "./dist/index.js", "./utils/*": "./dist/utils/*" } } });
    expect(results).toHaveLength(0);
  });

  it("skips non-object exports", () => {
    const results = noDeprecatedSubpathRule.check({ ...baseCtx, pkg: { exports: "./dist/index.js" } });
    expect(results).toHaveLength(0);
  });
});
