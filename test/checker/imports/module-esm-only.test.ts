import { describe, it, expect, vi } from "vitest";

vi.mock("../../../src/checker/rules/utils/format-detection.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../src/checker/rules/utils/format-detection.js")>();
  return {
    ...actual,
    readFileSafe: (path: string) => {
      if (path.includes("esm-file")) return 'export const x = 42;';
      if (path.includes("cjs-file")) return 'module.exports = { x: 42 };';
      if (path.includes("mixed-file")) return 'export const x = 42;\nmodule.exports = { x };';
      if (path.includes("empty-file")) return '';
      return null; // file not found
    },
  };
});

import { importsModuleEsmOnlyRule } from "../../../src/checker/rules/imports/module-esm-only.js";
import type { CheckContext } from "../../../src/checker/framework/types.js";
import type { PackageJson } from "../../../src/shared/package-json.js";

const baseCtx: Omit<CheckContext, "pkg"> = {
  dir: "/tmp",
  compilerOptions: null,
  hasBuildOutput: true,
  distFiles: [],
  allJsFiles: [],
  hasUnresolvedExtends: false,
};

function makeCtx(pkg: PackageJson, overrides?: Partial<CheckContext>): CheckContext {
  return { ...baseCtx, pkg, ...overrides };
}

describe("imports/module-esm-only", () => {
  it("has correct metadata", () => {
    expect(importsModuleEsmOnlyRule.meta.id).toBe("imports/module-esm-only");
    expect(importsModuleEsmOnlyRule.meta.category).toBe("imports");
    expect(importsModuleEsmOnlyRule.meta.defaultSeverity).toBe("warning");
    expect(importsModuleEsmOnlyRule.meta.fixable).toBe(false);
  });

  it("is not fixable", () => {
    expect(importsModuleEsmOnlyRule.fix).toBeUndefined();
  });

  // ---- Early returns ----

  it("returns empty when hasBuildOutput is false", async () => {
    const pkg: PackageJson = {
      imports: { "#utils": { module: "./cjs-file.js" } },
    };
    const diags = await importsModuleEsmOnlyRule.check(makeCtx(pkg, { hasBuildOutput: false }));
    expect(diags).toHaveLength(0);
  });

  it("returns empty when no imports field", async () => {
    const diags = await importsModuleEsmOnlyRule.check(makeCtx({}));
    expect(diags).toHaveLength(0);
  });

  it("returns empty when imports is undefined", async () => {
    const pkg: PackageJson = {};
    const diags = await importsModuleEsmOnlyRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(0);
  });

  // ---- Skips non-module conditions ----

  it("skips entries with non-module conditions", async () => {
    const pkg: PackageJson = {
      imports: {
        "#utils": { import: "./cjs-file.js", require: "./cjs-file.js" },
      },
    };
    const diags = await importsModuleEsmOnlyRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(0);
  });

  // ---- Skips non-./ paths ----

  it("skips entries whose value does not start with ./", async () => {
    const pkg: PackageJson = {
      imports: {
        "#utils": { module: "cjs-file.js" },
      },
    };
    const diags = await importsModuleEsmOnlyRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(0);
  });

  // ---- File not readable ----

  it("skips when file cannot be read", async () => {
    const pkg: PackageJson = {
      imports: {
        "#utils": { module: "./nonexistent-file.js" },
      },
    };
    const diags = await importsModuleEsmOnlyRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(0);
  });

  // ---- CJS detection ----

  it("warns when module condition points to CJS content", async () => {
    const pkg: PackageJson = {
      imports: {
        "#utils": { module: "./cjs-file.js", require: "./cjs-file.js" },
      },
    };
    const diags = await importsModuleEsmOnlyRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(1);
    expect(diags[0]!.severity).toBe("warning");
    expect(diags[0]!.message).toContain("CJS syntax");
    expect(diags[0]!.message).toContain("expected ESM");
    expect(diags[0]!.message).toContain("#utils");
    expect(diags[0]!.message).toContain("cjs-file.js");
  });

  it("warns for each imports key with CJS module condition", async () => {
    const pkg: PackageJson = {
      imports: {
        "#a": { module: "./cjs-file.js" },
        "#b": { module: "./cjs-file.js" },
      },
    };
    const diags = await importsModuleEsmOnlyRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(2);
    expect(diags[0]!.message).toContain("#a");
    expect(diags[1]!.message).toContain("#b");
  });

  // ---- ESM content passes ----

  it("returns empty when module condition points to ESM content", async () => {
    const pkg: PackageJson = {
      imports: {
        "#utils": { module: "./esm-file.js", require: "./cjs-file.js" },
      },
    };
    const diags = await importsModuleEsmOnlyRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(0);
  });

  // ---- Empty/unknown content passes ----

  it("returns empty when module condition points to empty file", async () => {
    const pkg: PackageJson = {
      imports: {
        "#utils": { module: "./empty-file.js" },
      },
    };
    const diags = await importsModuleEsmOnlyRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(0);
  });

  // ---- Mixed content is not "cjs" so it passes ----

  it("returns empty when module condition points to mixed content", async () => {
    const pkg: PackageJson = {
      imports: {
        "#utils": { module: "./mixed-file.js" },
      },
    };
    const diags = await importsModuleEsmOnlyRule.check(makeCtx(pkg));
    // getCodeFormat returns "mixed" for mixed content, not "cjs", so no warning
    expect(diags).toHaveLength(0);
  });

  // ---- Nested conditions ----

  it("detects CJS in nested module conditions", async () => {
    const pkg: PackageJson = {
      imports: {
        "#utils": {
          node: { module: "./cjs-file.js", require: "./cjs-file.js" },
        },
      },
    };
    const diags = await importsModuleEsmOnlyRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(1);
    expect(diags[0]!.message).toContain("CJS syntax");
  });

  // ---- Only checks module condition, not others ----

  it("does not warn about CJS in non-module conditions", async () => {
    const pkg: PackageJson = {
      imports: {
        "#utils": { require: "./cjs-file.js", default: "./cjs-file.js" },
      },
    };
    const diags = await importsModuleEsmOnlyRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(0);
  });
});
