import { describe, it, expect } from "vitest";
import { useExportsBrowserRule } from "../../../src/checker/rules/metadata/use-exports-browser.js";

const baseCtx = { dir: "/tmp", compilerOptions: null, hasBuildOutput: true, distFiles: [], allJsFiles: [], hasUnresolvedExtends: false };

describe("metadata/use-exports-browser", () => {
  it("suggests browser condition when browser field exists without exports browser", () => {
    const results = useExportsBrowserRule.check({ ...baseCtx, pkg: { browser: "./dist/browser.js", exports: { ".": { import: "./dist/index.js" } } } });
    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe("info");
  });

  it("passes when exports already has browser condition", () => {
    const results = useExportsBrowserRule.check({ ...baseCtx, pkg: { browser: "./dist/browser.js", exports: { ".": { browser: "./dist/browser.js", import: "./dist/index.js" } } } });
    expect(results).toHaveLength(0);
  });

  it("passes when no browser field", () => {
    const results = useExportsBrowserRule.check({ ...baseCtx, pkg: { exports: { ".": "./dist/index.js" } } });
    expect(results).toHaveLength(0);
  });
});
