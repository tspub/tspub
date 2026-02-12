import { describe, it, expect } from "vitest";
import {
  isSugarForm,
  getMainExport,
  walkExports,
} from "../../../src/checker/rules/utils/exports-traversal.js";

describe("isSugarForm", () => {
  it("returns true for flat condition map with import key", () => {
    expect(isSugarForm({ import: "./dist/index.js" })).toBe(true);
  });

  it("returns true for flat condition map with types key", () => {
    expect(isSugarForm({ types: "./dist/index.d.ts", default: "./dist/index.js" })).toBe(true);
  });

  it("returns true for flat condition map with require key", () => {
    expect(isSugarForm({ require: "./dist/index.cjs" })).toBe(true);
  });

  it("returns true for condition map with module key", () => {
    expect(isSugarForm({ module: "./dist/index.mjs" })).toBe(true);
  });

  it("returns true for condition map with node key", () => {
    expect(isSugarForm({ node: "./dist/index.node.js" })).toBe(true);
  });

  it("returns true for condition map with browser key", () => {
    expect(isSugarForm({ browser: "./dist/index.browser.js" })).toBe(true);
  });

  it("returns false when keys start with './'", () => {
    expect(isSugarForm({ "./utils": "./dist/utils.js", import: "./dist/index.js" })).toBe(false);
  });

  it("returns false for empty object", () => {
    expect(isSugarForm({})).toBe(false);
  });

  it("returns false for object with only unknown keys", () => {
    expect(isSugarForm({ custom: "./dist/custom.js" })).toBe(false);
  });
});

describe("getMainExport", () => {
  it("returns dot entry when it is an object", () => {
    const exports = { ".": { import: "./dist/index.js" } };
    const result = getMainExport(exports);
    expect(result).toEqual({ import: "./dist/index.js" });
  });

  it("returns null when dot entry is a string", () => {
    const exports = { ".": "./dist/index.js" };
    const result = getMainExport(exports);
    // "." is a string, not an object, so it falls through to sugar form check
    // But the object has a key starting with ".", so isSugarForm returns false
    expect(result).toBeNull();
  });

  it("returns exports itself for sugar form", () => {
    const exports = { import: "./dist/index.js", types: "./dist/index.d.ts" };
    const result = getMainExport(exports);
    expect(result).toBe(exports);
  });

  it("returns null for subpath-only exports without condition keys", () => {
    const exports = { "./utils": "./dist/utils.js" };
    const result = getMainExport(exports);
    expect(result).toBeNull();
  });

  it("returns null when dot entry is null", () => {
    const exports = { ".": null } as unknown as Record<string, unknown>;
    const result = getMainExport(exports);
    // null is not an object per typeof check, falls to sugar form which fails
    expect(result).toBeNull();
  });

  it("returns null for empty exports", () => {
    expect(getMainExport({})).toBeNull();
  });
});

describe("walkExports", () => {
  it("handles string exports", () => {
    const result = walkExports("./dist/index.js");
    expect(result).toEqual([
      { subpath: ".", condition: "default", value: "./dist/index.js", conditionKeys: [] },
    ]);
  });

  it("handles subpath with string values", () => {
    const result = walkExports({
      ".": "./dist/index.js",
      "./utils": "./dist/utils.js",
    });
    expect(result).toHaveLength(2);
    expect(result[0]!).toEqual({
      subpath: ".",
      condition: "default",
      value: "./dist/index.js",
      conditionKeys: [],
    });
    expect(result[1]!).toEqual({
      subpath: "./utils",
      condition: "default",
      value: "./dist/utils.js",
      conditionKeys: [],
    });
  });

  it("handles subpath with condition maps", () => {
    const result = walkExports({
      ".": {
        import: "./dist/index.js",
        require: "./dist/index.cjs",
      },
    });
    expect(result).toHaveLength(2);
    expect(result[0]!.subpath).toBe(".");
    expect(result[0]!.condition).toBe("import");
    expect(result[0]!.value).toBe("./dist/index.js");
    expect(result[0]!.conditionKeys).toEqual(["import", "require"]);
    expect(result[1]!.condition).toBe("require");
  });

  it("handles sugar form (flat condition map)", () => {
    const result = walkExports({
      types: "./dist/index.d.ts",
      import: "./dist/index.js",
      default: "./dist/index.cjs",
    });
    expect(result).toHaveLength(3);
    expect(result.every((r) => r.subpath === ".")).toBe(true);
    expect(result[0]!.condition).toBe("types");
    expect(result[1]!.condition).toBe("import");
    expect(result[2]!.condition).toBe("default");
  });

  it("handles nested condition maps", () => {
    const result = walkExports({
      ".": {
        import: {
          types: "./dist/index.d.ts",
          default: "./dist/index.js",
        },
      },
    });
    expect(result).toHaveLength(2);
    expect(result[0]!.condition).toBe("types");
    expect(result[0]!.value).toBe("./dist/index.d.ts");
    expect(result[1]!.condition).toBe("default");
    expect(result[1]!.value).toBe("./dist/index.js");
  });

  it("handles fallback arrays at subpath level", () => {
    const result = walkExports({
      ".": ["./dist/index.mjs", "./dist/index.cjs"],
    });
    expect(result).toHaveLength(2);
    expect(result[0]!.isFallbackArray).toBe(true);
    expect(result[0]!.condition).toBe("default");
    expect(result[0]!.value).toBe("./dist/index.mjs");
    expect(result[1]!.isFallbackArray).toBe(true);
    expect(result[1]!.value).toBe("./dist/index.cjs");
  });

  it("handles fallback arrays with object items at subpath level", () => {
    const result = walkExports({
      ".": [
        { import: "./dist/index.mjs" },
        "./dist/index.cjs",
      ],
    });
    expect(result).toHaveLength(2);
    expect(result[0]!.condition).toBe("import");
    expect(result[0]!.value).toBe("./dist/index.mjs");
    expect(result[0]!.isFallbackArray).toBeUndefined();
    expect(result[1]!.isFallbackArray).toBe(true);
    expect(result[1]!.value).toBe("./dist/index.cjs");
  });

  it("handles fallback arrays in condition values", () => {
    const result = walkExports({
      ".": {
        import: ["./dist/index.mjs", "./dist/index.js"],
      },
    });
    expect(result).toHaveLength(2);
    expect(result[0]!.subpath).toBe(".");
    expect(result[0]!.condition).toBe("import");
    expect(result[0]!.isFallbackArray).toBe(true);
    expect(result[0]!.value).toBe("./dist/index.mjs");
  });

  it("handles arrays with nested objects in condition values", () => {
    const result = walkExports({
      ".": {
        import: [
          { node: "./dist/index.node.js" },
          "./dist/index.js",
        ],
      },
    });
    expect(result).toHaveLength(2);
    expect(result[0]!.condition).toBe("node");
    expect(result[0]!.value).toBe("./dist/index.node.js");
    expect(result[1]!.condition).toBe("import");
    expect(result[1]!.isFallbackArray).toBe(true);
  });

  it("returns empty array for object with no subpaths and no condition keys", () => {
    const result = walkExports({ custom: "./dist/custom.js" });
    expect(result).toHaveLength(0);
  });

  it("handles deeply nested condition maps", () => {
    const result = walkExports({
      ".": {
        node: {
          import: {
            types: "./dist/index.d.ts",
            default: "./dist/index.js",
          },
        },
      },
    });
    expect(result).toHaveLength(2);
    expect(result[0]!.condition).toBe("types");
    expect(result[1]!.condition).toBe("default");
  });

  it("handles multiple subpaths with different structures", () => {
    const result = walkExports({
      ".": { import: "./dist/index.js", require: "./dist/index.cjs" },
      "./utils": "./dist/utils.js",
      "./types": { types: "./dist/types.d.ts" },
    });
    expect(result).toHaveLength(4);
    const subpaths = result.map((r) => r.subpath);
    expect(subpaths).toContain(".");
    expect(subpaths).toContain("./utils");
    expect(subpaths).toContain("./types");
  });

  it("handles subpath with nested object value", () => {
    const result = walkExports({
      "./feature": {
        import: { types: "./dist/feature.d.ts", default: "./dist/feature.js" },
      },
    });
    expect(result).toHaveLength(2);
    expect(result[0]!.subpath).toBe("./feature");
    expect(result[0]!.condition).toBe("types");
    expect(result[1]!.condition).toBe("default");
  });
});
