import { describe, it, expect } from "vitest";
import { localDependencyRule } from "../../../src/checker/rules/files/local-dependency.js";

const baseCtx = { dir: "/tmp", compilerOptions: null, hasBuildOutput: true, distFiles: [], allJsFiles: [], hasUnresolvedExtends: false };

describe("files/local-dependency", () => {
  it("errors on file: protocol", () => {
    const results = localDependencyRule.check({ ...baseCtx, pkg: { dependencies: { "my-lib": "file:../my-lib" } } });
    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe("error");
  });

  it("errors on link: protocol", () => {
    const results = localDependencyRule.check({ ...baseCtx, pkg: { devDependencies: { "my-lib": "link:../my-lib" } } });
    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe("error");
  });

  it("warns on workspace: protocol", () => {
    const results = localDependencyRule.check({ ...baseCtx, pkg: { dependencies: { "my-lib": "workspace:^1.0.0" } } });
    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe("warning");
  });

  it("passes with normal versions", () => {
    const results = localDependencyRule.check({ ...baseCtx, pkg: { dependencies: { "lodash": "^4.0.0" } } });
    expect(results).toHaveLength(0);
  });
});
