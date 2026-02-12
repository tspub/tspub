import { describe, it, expect } from "vitest";
import { typesFirstRule } from "../../../src/checker/rules/exports/types-first.js";

const baseFixCtx = { dir: "/tmp", distFiles: [] as string[] };

describe("exports/types-first fix()", () => {
  it("reorders types to first in subpath exports", async () => {
    const pkg = {
      exports: {
        ".": { import: "./x.js", types: "./x.d.ts" } as Record<string, unknown>,
      },
    };
    const result = await typesFirstRule.fix!({ ...baseFixCtx, pkg });
    expect(result.pkgModified).toBe(true);
    expect(result.message).toContain("reordered");
    const dot = (pkg.exports as Record<string, Record<string, unknown>>)["."]!;
    const keys = Object.keys(dot);
    expect(keys[0]!).toBe("types");
    expect(keys[1]!).toBe("import");
  });

  it("reorders types in sugar form exports", async () => {
    const pkg = {
      exports: { import: "./x.js", types: "./x.d.ts" } as Record<string, unknown>,
    };
    const result = await typesFirstRule.fix!({ ...baseFixCtx, pkg });
    expect(result.pkgModified).toBe(true);
    const keys = Object.keys(pkg.exports as Record<string, unknown>);
    expect(keys[0]!).toBe("types");
    expect(keys[1]!).toBe("import");
  });

  it("handles nested condition maps", async () => {
    const pkg = {
      exports: {
        ".": {
          node: { types: "./n.d.ts", import: "./n.js" } as Record<string, unknown>,
          import: { default: "./x.js", types: "./x.d.ts" } as Record<string, unknown>,
        },
      },
    };
    const result = await typesFirstRule.fix!({ ...baseFixCtx, pkg });
    expect(result.pkgModified).toBe(true);
    const dot = (pkg.exports as Record<string, Record<string, Record<string, unknown>>>)["."]!;
    // Nested import condition should have types reordered to first
    const importKeys = Object.keys(dot["import"]!);
    expect(importKeys[0]!).toBe("types");
    // node condition already had types first — should remain unchanged
    const nodeKeys = Object.keys(dot["node"]!);
    expect(nodeKeys[0]!).toBe("types");
  });

  it("no-op when types already first", async () => {
    const pkg = {
      exports: {
        ".": { types: "./x.d.ts", import: "./x.js" } as Record<string, unknown>,
      },
    };
    const result = await typesFirstRule.fix!({ ...baseFixCtx, pkg });
    expect(result.pkgModified).toBe(false);
    expect(result.message).toBe("");
  });

  it("no-op when no types key", async () => {
    const pkg = {
      exports: {
        ".": { import: "./x.js", default: "./x.cjs" } as Record<string, unknown>,
      },
    };
    const result = await typesFirstRule.fix!({ ...baseFixCtx, pkg });
    expect(result.pkgModified).toBe(false);
  });

  it("handles multiple subpaths, each gets reordered", async () => {
    const pkg = {
      exports: {
        ".": { import: "./a.js", types: "./a.d.ts" } as Record<string, unknown>,
        "./utils": { require: "./b.cjs", types: "./b.d.cts" } as Record<string, unknown>,
      },
    };
    const result = await typesFirstRule.fix!({ ...baseFixCtx, pkg });
    expect(result.pkgModified).toBe(true);
    const exports = pkg.exports as Record<string, Record<string, unknown>>;
    expect(Object.keys(exports["."]!)[0]!).toBe("types");
    expect(Object.keys(exports["./utils"]!)[0]!).toBe("types");
  });

  it("works with string exports (no-op)", async () => {
    const pkg = { exports: "./dist/index.js" };
    const result = await typesFirstRule.fix!({ ...baseFixCtx, pkg });
    expect(result.pkgModified).toBe(false);
    expect(result.message).toBe("");
  });

  it("no-op when exports is undefined", async () => {
    const pkg = {};
    const result = await typesFirstRule.fix!({ ...baseFixCtx, pkg });
    expect(result.pkgModified).toBe(false);
  });
});
