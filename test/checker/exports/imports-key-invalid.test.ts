import { describe, it, expect } from "vitest";
import { importsKeyInvalidRule } from "../../../src/checker/rules/exports/imports-key-invalid.js";

const baseCtx = { dir: "/tmp", compilerOptions: null, hasBuildOutput: true, distFiles: [], allJsFiles: [], hasUnresolvedExtends: false };

describe("exports/imports-key-invalid", () => {
  it("errors on keys not starting with #", () => {
    const results = importsKeyInvalidRule.check({ ...baseCtx, pkg: { imports: { "lodash": "./shim.js", "#internal": "./src/internal.js" } } });
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain("lodash");
  });

  it("passes with valid # keys", () => {
    const results = importsKeyInvalidRule.check({ ...baseCtx, pkg: { imports: { "#utils": "./src/utils.js" } } });
    expect(results).toHaveLength(0);
  });

  it("skips when no imports field", () => {
    const results = importsKeyInvalidRule.check({ ...baseCtx, pkg: {} });
    expect(results).toHaveLength(0);
  });
});
