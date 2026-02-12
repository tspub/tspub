import { describe, it, expect } from "vitest";
import { browserValueConflictRule } from "../../../src/checker/rules/exports/browser-value-conflict.js";

const baseCtx = { dir: "/tmp", compilerOptions: null, hasBuildOutput: true, distFiles: [], allJsFiles: [], hasUnresolvedExtends: false };

describe("exports/browser-value-conflict", () => {
  it("warns when exports value is remapped by browser object field", async () => {
    const results = await browserValueConflictRule.check({
      ...baseCtx,
      pkg: {
        browser: { "./dist/index.js": "./dist/browser.js" },
        exports: { ".": "./dist/index.js" },
      },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.message).toContain("remapped by browser field");
    expect(results[0]!.message).toContain("./dist/browser.js");
  });

  it("warns when browser remaps to false (disabled)", async () => {
    const results = await browserValueConflictRule.check({
      ...baseCtx,
      pkg: {
        browser: { "./dist/server.js": false },
        exports: { "./server": "./dist/server.js" },
      },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.message).toContain("false (disabled)");
  });

  it("detects conflicts in nested condition exports", async () => {
    const results = await browserValueConflictRule.check({
      ...baseCtx,
      pkg: {
        browser: { "./dist/worker.js": "./dist/browser-worker.js" },
        exports: {
          ".": {
            import: "./dist/index.js",
            require: "./dist/index.cjs",
          },
          "./worker": {
            import: "./dist/worker.js",
            require: "./dist/worker.cjs",
          },
        },
      },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.message).toContain("./worker");
    expect(results[0]!.message).toContain("./dist/worker.js");
  });

  it("reports multiple conflicts", async () => {
    const results = await browserValueConflictRule.check({
      ...baseCtx,
      pkg: {
        browser: {
          "./dist/index.js": "./dist/browser-index.js",
          "./dist/utils.js": "./dist/browser-utils.js",
        },
        exports: {
          ".": "./dist/index.js",
          "./utils": "./dist/utils.js",
        },
      },
    });
    expect(results).toHaveLength(2);
  });

  it("passes when browser is a string (not object remap)", async () => {
    const results = await browserValueConflictRule.check({
      ...baseCtx,
      pkg: {
        browser: "./dist/browser.js",
        exports: { ".": "./dist/index.js" },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("passes when no browser field", async () => {
    const results = await browserValueConflictRule.check({
      ...baseCtx,
      pkg: { exports: { ".": "./dist/index.js" } },
    });
    expect(results).toHaveLength(0);
  });

  it("passes when no exports field", async () => {
    const results = await browserValueConflictRule.check({
      ...baseCtx,
      pkg: { browser: { "./dist/index.js": "./dist/browser.js" } },
    });
    expect(results).toHaveLength(0);
  });

  it("passes when browser object has no matching exports values", async () => {
    const results = await browserValueConflictRule.check({
      ...baseCtx,
      pkg: {
        browser: { "./dist/other.js": "./dist/browser-other.js" },
        exports: { ".": "./dist/index.js" },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("handles sugar form exports", async () => {
    const results = await browserValueConflictRule.check({
      ...baseCtx,
      pkg: {
        browser: { "./dist/index.js": "./dist/browser.js" },
        exports: {
          import: "./dist/index.js",
          require: "./dist/index.cjs",
        },
      },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.message).toContain("./dist/index.js");
  });
});
