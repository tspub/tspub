import { describe, it, expect } from "vitest";
import { cjsResolvesToEsmRule } from "../../../src/checker/rules/types/cjs-resolves-esm.js";

const baseCtx = {
  dir: "/tmp",
  compilerOptions: null,
  hasBuildOutput: false,
  distFiles: [],
  allJsFiles: [],
  hasUnresolvedExtends: false,
};

describe("types/cjs-resolves-esm", () => {
  // --- String exports ---

  it("passes when type:module with string exports (intentional ESM-only)", async () => {
    const results = await cjsResolvesToEsmRule.check({
      ...baseCtx,
      pkg: { type: "module", exports: "./source/index.js" },
    });
    expect(results).toHaveLength(0);
  });

  it("passes when type:module with string exports pointing to .mjs (intentional ESM-only)", async () => {
    const results = await cjsResolvesToEsmRule.check({
      ...baseCtx,
      pkg: { type: "module", exports: "./index.mjs" },
    });
    expect(results).toHaveLength(0);
  });

  it("errors when no type:module with string exports pointing to .mjs", async () => {
    const results = await cjsResolvesToEsmRule.check({
      ...baseCtx,
      pkg: { exports: "./index.mjs" },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe("error");
  });

  it("passes when type:commonjs with string exports", async () => {
    const results = await cjsResolvesToEsmRule.check({
      ...baseCtx,
      pkg: { exports: "./dist/index.js" },
    });
    expect(results).toHaveLength(0);
  });

  it("passes when type:module with string exports pointing to .cjs", async () => {
    const results = await cjsResolvesToEsmRule.check({
      ...baseCtx,
      pkg: { type: "module", exports: "./dist/index.cjs" },
    });
    expect(results).toHaveLength(0);
  });

  // --- No exports, main field ---

  it("passes when type:module with main (intentional ESM-only)", async () => {
    const results = await cjsResolvesToEsmRule.check({
      ...baseCtx,
      pkg: { type: "module", main: "./dist/index.js" },
    });
    expect(results).toHaveLength(0);
  });

  it("passes when no type with main pointing to .js", async () => {
    const results = await cjsResolvesToEsmRule.check({
      ...baseCtx,
      pkg: { main: "./dist/index.js" },
    });
    expect(results).toHaveLength(0);
  });

  it("passes when no exports and no main", async () => {
    const results = await cjsResolvesToEsmRule.check({
      ...baseCtx,
      pkg: { type: "module" },
    });
    expect(results).toHaveLength(0);
  });

  // --- Exports map: require condition ---

  it("errors when require condition points to .mjs", async () => {
    const results = await cjsResolvesToEsmRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": { require: "./dist/index.mjs", import: "./dist/index.js" },
        },
      },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe("error");
    expect(results[0]!.message).toContain("require");
    expect(results[0]!.message).toContain(".mjs");
  });

  it("errors when type:module and require condition points to .js", async () => {
    const results = await cjsResolvesToEsmRule.check({
      ...baseCtx,
      pkg: {
        type: "module",
        exports: {
          ".": { require: "./dist/index.js", import: "./dist/index.js" },
        },
      },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe("error");
  });

  it("passes when require condition points to .cjs", async () => {
    const results = await cjsResolvesToEsmRule.check({
      ...baseCtx,
      pkg: {
        type: "module",
        exports: {
          ".": { require: "./dist/index.cjs", import: "./dist/index.js" },
        },
      },
    });
    expect(results).toHaveLength(0);
  });

  // --- Exports map: default fallback ---

  it("passes when type:module with no require condition (intentional ESM-only)", async () => {
    const results = await cjsResolvesToEsmRule.check({
      ...baseCtx,
      pkg: {
        type: "module",
        exports: {
          ".": { import: "./dist/index.js", default: "./dist/index.js" },
        },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("warns when no type:module and no require condition and default points to ESM", async () => {
    const results = await cjsResolvesToEsmRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": { import: "./dist/index.mjs", default: "./dist/index.mjs" },
        },
      },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe("warning");
    expect(results[0]!.message).toContain("default");
  });

  it("does not warn on default when require condition exists", async () => {
    const results = await cjsResolvesToEsmRule.check({
      ...baseCtx,
      pkg: {
        type: "module",
        exports: {
          ".": {
            import: "./dist/index.js",
            require: "./dist/index.cjs",
            default: "./dist/index.js",
          },
        },
      },
    });
    expect(results).toHaveLength(0);
  });

  // --- Subpath direct string values ---

  it("passes on subpath string value when type:module (intentional ESM-only)", async () => {
    const results = await cjsResolvesToEsmRule.check({
      ...baseCtx,
      pkg: {
        type: "module",
        exports: {
          ".": { require: "./dist/index.cjs", import: "./dist/index.js" },
          "./utils": "./dist/utils.js",
        },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("errors on subpath string value pointing to .mjs without type:module", async () => {
    const results = await cjsResolvesToEsmRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": { require: "./dist/index.cjs", import: "./dist/index.js" },
          "./utils": "./dist/utils.mjs",
        },
      },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.message).toContain("./utils");
  });

  // --- Sugar form ---

  it("passes sugar form when type:module (intentional ESM-only)", async () => {
    const results = await cjsResolvesToEsmRule.check({
      ...baseCtx,
      pkg: {
        type: "module",
        exports: { import: "./dist/index.js", default: "./dist/index.js" },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("warns sugar form when no type:module and default points to .mjs", async () => {
    const results = await cjsResolvesToEsmRule.check({
      ...baseCtx,
      pkg: {
        exports: { import: "./dist/index.mjs", default: "./dist/index.mjs" },
      },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.message).toContain('"."');
  });

  // --- Multiple subpaths ---

  it("reports per subpath independently", async () => {
    const results = await cjsResolvesToEsmRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": { require: "./dist/index.mjs" },
          "./foo": { require: "./dist/foo.cjs", import: "./dist/foo.js" },
          "./bar": { require: "./dist/bar.mjs" },
        },
      },
    });
    expect(results).toHaveLength(2);
    expect(results[0]!.message).toContain('"."');
    expect(results[1]!.message).toContain("./bar");
  });

  // --- Edge cases ---

  it("passes with no exports", async () => {
    const results = await cjsResolvesToEsmRule.check({
      ...baseCtx,
      pkg: {},
    });
    expect(results).toHaveLength(0);
  });

  it("passes when all conditions properly use .cjs for CJS", async () => {
    const results = await cjsResolvesToEsmRule.check({
      ...baseCtx,
      pkg: {
        type: "module",
        exports: {
          ".": {
            types: "./dist/index.d.ts",
            import: "./dist/index.js",
            require: "./dist/index.cjs",
          },
        },
      },
    });
    expect(results).toHaveLength(0);
  });
});
