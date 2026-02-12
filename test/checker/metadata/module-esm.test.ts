import { describe, it, expect, vi } from "vitest";

vi.mock("../../../src/checker/rules/utils/format-detection.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../src/checker/rules/utils/format-detection.js")>();
  return {
    ...actual,
    readFileSafe: (path: string) => {
      if (path.includes("esm-file")) return 'export const x = 42;';
      if (path.includes("cjs-file")) return 'module.exports = { x: 42 };';
      if (path.includes("empty-file")) return '';
      return null;
    },
  };
});

import { moduleEsmRule } from "../../../src/checker/rules/metadata/module-esm.js";
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

describe("metadata/module-esm", () => {
  it("has correct metadata", () => {
    expect(moduleEsmRule.meta.id).toBe("metadata/module-esm");
    expect(moduleEsmRule.meta.category).toBe("metadata");
    expect(moduleEsmRule.meta.defaultSeverity).toBe("warning");
    expect(moduleEsmRule.meta.fixable).toBe(false);
  });

  it("is not fixable", () => {
    expect(moduleEsmRule.fix).toBeUndefined();
  });

  it("returns empty when hasBuildOutput is false", async () => {
    const diags = await moduleEsmRule.check(
      makeCtx({ module: "./cjs-file.js" }, { hasBuildOutput: false }),
    );
    expect(diags).toHaveLength(0);
  });

  it("returns empty when module field is not present", async () => {
    const diags = await moduleEsmRule.check(makeCtx({}));
    expect(diags).toHaveLength(0);
  });

  it("returns empty when module field is not a string", async () => {
    const pkg = { module: 123 } as unknown as PackageJson;
    const diags = await moduleEsmRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(0);
  });

  it("returns empty when the file cannot be read", async () => {
    const diags = await moduleEsmRule.check(makeCtx({ module: "./nonexistent.js" }));
    expect(diags).toHaveLength(0);
  });

  it("warns when module field points to CJS content", async () => {
    const diags = await moduleEsmRule.check(makeCtx({ module: "./cjs-file.js" }));
    expect(diags).toHaveLength(1);
    expect(diags[0]!.severity).toBe("warning");
    expect(diags[0]!.message).toContain("CJS syntax");
    expect(diags[0]!.message).toContain("expected ESM");
    expect(diags[0]!.message).toContain("cjs-file.js");
  });

  it("returns empty when module field points to ESM content", async () => {
    const diags = await moduleEsmRule.check(makeCtx({ module: "./esm-file.js" }));
    expect(diags).toHaveLength(0);
  });

  it("returns empty when module field points to empty file (unknown format)", async () => {
    const diags = await moduleEsmRule.check(makeCtx({ module: "./empty-file.js" }));
    expect(diags).toHaveLength(0);
  });
});
