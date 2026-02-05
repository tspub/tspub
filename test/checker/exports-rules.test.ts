import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { buildContext } from "../../src/checker/framework/context.js";
import { valueInvalidRule } from "../../src/checker/rules/exports/value-invalid.js";
import { defaultLastRule } from "../../src/checker/rules/exports/default-last.js";
import { moduleBeforeRequireRule } from "../../src/checker/rules/exports/module-before-require.js";
import { importsFieldRule } from "../../src/checker/rules/exports/imports-field.js";
import { jsxExtensionsRule } from "../../src/checker/rules/exports/jsx-extensions.js";
import { formatMismatchRule } from "../../src/checker/rules/exports/format-mismatch.js";
import { moduleEsmOnlyRule } from "../../src/checker/rules/exports/module-esm-only.js";
import { fallbackArrayRule } from "../../src/checker/rules/exports/fallback-array.js";
import { typesFormatRule } from "../../src/checker/rules/exports/types-format.js";
import { fileExistsRule } from "../../src/checker/rules/exports/file-exists.js";
import { conditionTypesRule } from "../../src/checker/rules/exports/condition-types.js";
import type { PackageJson } from "../../src/shared/package-json.js";

const fixturesDir = join(import.meta.dirname, "..", "fixtures");

describe("exports/value-invalid", () => {
  it("passes when all values start with ./", async () => {
    const pkg: PackageJson = {
      exports: {
        ".": { import: "./dist/index.js", require: "./dist/index.cjs" },
      },
    };
    const ctx = await buildContext(pkg, fixturesDir);
    const diags = valueInvalidRule.check(ctx);
    expect(diags).toHaveLength(0);
  });

  it("errors when value missing ./ prefix", async () => {
    const pkg: PackageJson = {
      exports: {
        ".": { import: "dist/index.js" },
      },
    };
    const ctx = await buildContext(pkg, fixturesDir);
    const diags = valueInvalidRule.check(ctx);
    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0].message).toContain('must start with "./"');
  });

  it("skips when no exports", async () => {
    const ctx = await buildContext({}, fixturesDir);
    const diags = valueInvalidRule.check(ctx);
    expect(diags).toHaveLength(0);
  });
});

describe("exports/default-last", () => {
  it("passes when default is last", async () => {
    const pkg: PackageJson = {
      exports: {
        ".": { import: "./dist/index.js", default: "./dist/index.cjs" },
      },
    };
    const ctx = await buildContext(pkg, fixturesDir);
    const diags = defaultLastRule.check(ctx);
    expect(diags).toHaveLength(0);
  });

  it("errors when default is not last", async () => {
    const pkg: PackageJson = {
      exports: {
        ".": { default: "./dist/index.cjs", import: "./dist/index.js" },
      },
    };
    const ctx = await buildContext(pkg, fixturesDir);
    const diags = defaultLastRule.check(ctx);
    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0].message).toContain('"default" must be the last');
  });

  it("fix reorders default to last", () => {
    const pkg: PackageJson = {
      exports: {
        ".": { default: "./dist/index.cjs", import: "./dist/index.js" },
      },
    };
    const result = defaultLastRule.fix!({ pkg, dir: fixturesDir, distFiles: [] });
    expect(result.pkgModified).toBe(true);
    const keys = Object.keys(
      (pkg.exports as Record<string, Record<string, unknown>>)["."],
    );
    expect(keys[keys.length - 1]).toBe("default");
  });

  it("skips string shorthand", async () => {
    const pkg: PackageJson = { exports: "./dist/index.js" as unknown as Record<string, unknown> };
    const ctx = await buildContext(pkg, fixturesDir);
    const diags = defaultLastRule.check(ctx);
    expect(diags).toHaveLength(0);
  });
});

describe("exports/module-before-require", () => {
  it("passes when module is before require", async () => {
    const pkg: PackageJson = {
      exports: {
        ".": { module: "./dist/index.mjs", require: "./dist/index.cjs" },
      },
    };
    const ctx = await buildContext(pkg, fixturesDir);
    const diags = moduleBeforeRequireRule.check(ctx);
    expect(diags).toHaveLength(0);
  });

  it("warns when require comes before module", async () => {
    const pkg: PackageJson = {
      exports: {
        ".": { require: "./dist/index.cjs", module: "./dist/index.mjs" },
      },
    };
    const ctx = await buildContext(pkg, fixturesDir);
    const diags = moduleBeforeRequireRule.check(ctx);
    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0].message).toContain('"module" should come before "require"');
  });

  it("fix reorders module before require", () => {
    const pkg: PackageJson = {
      exports: {
        ".": { require: "./dist/index.cjs", module: "./dist/index.mjs" },
      },
    };
    const result = moduleBeforeRequireRule.fix!({ pkg, dir: fixturesDir, distFiles: [] });
    expect(result.pkgModified).toBe(true);
    const keys = Object.keys(
      (pkg.exports as Record<string, Record<string, unknown>>)["."],
    );
    expect(keys.indexOf("module")).toBeLessThan(keys.indexOf("require"));
  });
});

describe("exports/imports-field", () => {
  it("passes with valid # keys and ./ values", async () => {
    const pkg: PackageJson = {
      imports: { "#utils": "./src/utils.js" },
    };
    const ctx = await buildContext(pkg, fixturesDir);
    const diags = importsFieldRule.check(ctx);
    expect(diags).toHaveLength(0);
  });

  it("errors when key missing #", async () => {
    const pkg: PackageJson = {
      imports: { utils: "./src/utils.js" },
    };
    const ctx = await buildContext(pkg, fixturesDir);
    const diags = importsFieldRule.check(ctx);
    expect(diags.some((d) => d.message.includes('must start with "#"'))).toBe(true);
  });

  it("errors when value is bare specifier", async () => {
    const pkg: PackageJson = {
      imports: { "#utils": "lodash" },
    };
    const ctx = await buildContext(pkg, fixturesDir);
    const diags = importsFieldRule.check(ctx);
    expect(diags.some((d) => d.message.includes('must start with "./" or "#"'))).toBe(true);
  });

  it("allows # value (self-referencing)", async () => {
    const pkg: PackageJson = {
      imports: { "#internal": "#other" },
    };
    const ctx = await buildContext(pkg, fixturesDir);
    const diags = importsFieldRule.check(ctx);
    expect(diags).toHaveLength(0);
  });

  it("skips when no imports field", async () => {
    const ctx = await buildContext({}, fixturesDir);
    const diags = importsFieldRule.check(ctx);
    expect(diags).toHaveLength(0);
  });
});

describe("exports/jsx-extensions", () => {
  it("passes with normal extensions", async () => {
    const pkg: PackageJson = {
      exports: {
        ".": { import: "./dist/index.js", types: "./dist/index.d.ts" },
      },
    };
    const ctx = await buildContext(pkg, fixturesDir);
    const diags = jsxExtensionsRule.check(ctx);
    expect(diags).toHaveLength(0);
  });

  it("errors on .mjsx extension", async () => {
    const pkg: PackageJson = {
      exports: { ".": { import: "./dist/index.mjsx" } },
    };
    const ctx = await buildContext(pkg, fixturesDir);
    const diags = jsxExtensionsRule.check(ctx);
    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0].message).toContain(".mjsx");
  });

  it("errors on .ctsx extension", async () => {
    const pkg: PackageJson = {
      exports: { ".": { require: "./dist/index.ctsx" } },
    };
    const ctx = await buildContext(pkg, fixturesDir);
    const diags = jsxExtensionsRule.check(ctx);
    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0].message).toContain(".ctsx");
  });
});

describe("exports/format-mismatch", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), "tspub-test-format-" + Date.now());
    await mkdir(join(testDir, "dist"), { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("warns when import condition has CJS content", async () => {
    await writeFile(
      join(testDir, "dist", "index.js"),
      'const x = require("foo"); module.exports = x;',
    );
    const pkg: PackageJson = {
      type: "module",
      exports: { ".": { import: "./dist/index.js" } },
    };
    const ctx = await buildContext(pkg, testDir);
    const diags = formatMismatchRule.check(ctx);
    expect(diags.some((d) => d.message.includes("CJS syntax, expected ESM"))).toBe(true);
  });

  it("warns when require condition has ESM content", async () => {
    await writeFile(
      join(testDir, "dist", "index.cjs"),
      'export const x = 42; export default x;',
    );
    const pkg: PackageJson = {
      exports: { ".": { require: "./dist/index.cjs" } },
    };
    const ctx = await buildContext(pkg, testDir);
    const diags = formatMismatchRule.check(ctx);
    expect(diags.some((d) => d.message.includes("ESM syntax, expected CJS"))).toBe(true);
  });

  it("skips when no build output", async () => {
    await rm(testDir, { recursive: true, force: true });
    await mkdir(testDir, { recursive: true });
    const pkg: PackageJson = {
      exports: { ".": { import: "./dist/index.js" } },
    };
    const ctx = await buildContext(pkg, testDir);
    const diags = formatMismatchRule.check(ctx);
    expect(diags).toHaveLength(0);
  });

  it("passes when formats match", async () => {
    await writeFile(
      join(testDir, "dist", "index.js"),
      'export const x = 42;',
    );
    const pkg: PackageJson = {
      type: "module",
      exports: { ".": { import: "./dist/index.js" } },
    };
    const ctx = await buildContext(pkg, testDir);
    const diags = formatMismatchRule.check(ctx);
    expect(diags).toHaveLength(0);
  });
});

describe("exports/module-esm-only", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), "tspub-test-module-esm-" + Date.now());
    await mkdir(join(testDir, "dist"), { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("warns when module condition has CJS content", async () => {
    await writeFile(
      join(testDir, "dist", "index.js"),
      'const x = require("foo"); module.exports = x;',
    );
    const pkg: PackageJson = {
      exports: { ".": { module: "./dist/index.js", require: "./dist/index.cjs" } },
    };
    const ctx = await buildContext(pkg, testDir);
    const diags = moduleEsmOnlyRule.check(ctx);
    expect(diags.some((d) => d.message.includes("CJS syntax, expected ESM"))).toBe(true);
  });

  it("passes when module condition has ESM content", async () => {
    await writeFile(
      join(testDir, "dist", "index.js"),
      'export const x = 42;',
    );
    const pkg: PackageJson = {
      exports: { ".": { module: "./dist/index.js" } },
    };
    const ctx = await buildContext(pkg, testDir);
    const diags = moduleEsmOnlyRule.check(ctx);
    expect(diags).toHaveLength(0);
  });

  it("skips when no build output", async () => {
    await rm(testDir, { recursive: true, force: true });
    await mkdir(testDir, { recursive: true });
    const pkg: PackageJson = {
      exports: { ".": { module: "./dist/index.js" } },
    };
    const ctx = await buildContext(pkg, testDir);
    const diags = moduleEsmOnlyRule.check(ctx);
    expect(diags).toHaveLength(0);
  });
});

describe("exports/fallback-array", () => {
  it("warns when exports use fallback arrays", async () => {
    const pkg: PackageJson = {
      exports: {
        ".": { import: ["./dist/index.mjs", "./dist/index.js"] },
      },
    };
    const ctx = await buildContext(pkg, fixturesDir);
    const diags = fallbackArrayRule.check(ctx);
    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0].message).toContain("fallback array");
  });

  it("passes when no fallback arrays", async () => {
    const pkg: PackageJson = {
      exports: { ".": { import: "./dist/index.js" } },
    };
    const ctx = await buildContext(pkg, fixturesDir);
    const diags = fallbackArrayRule.check(ctx);
    expect(diags).toHaveLength(0);
  });
});

describe("exports/types-format", () => {
  it("warns when dual-publish uses .d.ts in import types", async () => {
    const pkg: PackageJson = {
      exports: {
        ".": {
          import: { types: "./dist/index.d.ts", default: "./dist/index.js" },
          require: { types: "./dist/index.d.cts", default: "./dist/index.cjs" },
        },
      },
    };
    const ctx = await buildContext(pkg, fixturesDir);
    const diags = typesFormatRule.check(ctx);
    expect(diags.some((d) => d.message.includes(".d.mts"))).toBe(true);
  });

  it("passes for ESM-only package with .d.ts", async () => {
    const pkg: PackageJson = {
      exports: {
        ".": {
          import: { types: "./dist/index.d.ts", default: "./dist/index.js" },
        },
      },
    };
    const ctx = await buildContext(pkg, fixturesDir);
    const diags = typesFormatRule.check(ctx);
    expect(diags).toHaveLength(0);
  });

  it("passes when using split .d.mts/.d.cts", async () => {
    const pkg: PackageJson = {
      exports: {
        ".": {
          import: { types: "./dist/index.d.mts", default: "./dist/index.js" },
          require: { types: "./dist/index.d.cts", default: "./dist/index.cjs" },
        },
      },
    };
    const ctx = await buildContext(pkg, fixturesDir);
    const diags = typesFormatRule.check(ctx);
    expect(diags).toHaveLength(0);
  });

  it("warns on top-level types with both import and require", async () => {
    const pkg: PackageJson = {
      exports: {
        ".": {
          types: "./dist/index.d.ts",
          import: "./dist/index.js",
          require: "./dist/index.cjs",
        },
      },
    };
    const ctx = await buildContext(pkg, fixturesDir);
    const diags = typesFormatRule.check(ctx);
    expect(diags.some((d) => d.message.includes("ambiguous"))).toBe(true);
  });
});

describe("exports/file-exists", () => {
  it("warns when export file doesn't exist", async () => {
    const testDir = join(tmpdir(), "tspub-test-fe-warn-" + Date.now());
    await mkdir(join(testDir, "dist"), { recursive: true });
    // Create dist folder but NOT the referenced files
    await writeFile(join(testDir, "dist", "other.js"), "// placeholder");
    const pkg: PackageJson = {
      exports: {
        ".": {
          import: {
            types: "./dist/nonexistent.d.ts",
            default: "./dist/nonexistent.js",
          },
        },
      },
    };
    const ctx = await buildContext(pkg, testDir);
    const diags = await fileExistsRule.check(ctx);
    expect(diags.some((d) => d.message.includes("not found"))).toBe(true);
    await rm(testDir, { recursive: true, force: true });
  });

  it("passes when export files exist", async () => {
    const testDir = join(tmpdir(), "tspub-test-fe-pass-" + Date.now());
    await mkdir(join(testDir, "dist"), { recursive: true });
    await writeFile(join(testDir, "dist", "index.js"), "export const x = 1;");
    await writeFile(join(testDir, "dist", "index.d.ts"), "export declare const x: number;");
    const pkg: PackageJson = {
      exports: {
        ".": {
          import: {
            types: "./dist/index.d.ts",
            default: "./dist/index.js",
          },
        },
      },
    };
    const ctx = await buildContext(pkg, testDir);
    const diags = await fileExistsRule.check(ctx);
    expect(diags).toHaveLength(0);
    await rm(testDir, { recursive: true, force: true });
  });

  it("skips when no build output", async () => {
    const testDir = join(tmpdir(), "tspub-test-fe-skip-" + Date.now());
    await mkdir(testDir, { recursive: true });
    const pkg: PackageJson = {
      exports: {
        ".": { import: { default: "./dist/index.js" } },
      },
    };
    const ctx = await buildContext(pkg, testDir);
    const diags = await fileExistsRule.check(ctx);
    expect(diags).toHaveLength(0);
    await rm(testDir, { recursive: true, force: true });
  });

  it("warns when main field points to missing file", async () => {
    const testDir = join(tmpdir(), "tspub-test-fe-main-" + Date.now());
    await mkdir(join(testDir, "dist"), { recursive: true });
    // Create dist folder but NOT the main file
    await writeFile(join(testDir, "dist", "other.js"), "// placeholder");
    const pkg: PackageJson = { main: "./dist/nonexistent.js" };
    const ctx = await buildContext(pkg, testDir);
    const diags = await fileExistsRule.check(ctx);
    expect(diags.some((d) => d.message.includes('"main"'))).toBe(true);
    await rm(testDir, { recursive: true, force: true });
  });
});

describe("publishConfig merging", () => {
  it("applies publishConfig.exports to pkg", async () => {
    const pkg: PackageJson = {
      main: "./src/index.ts",
      publishConfig: {
        main: "./dist/index.js",
        exports: { ".": { import: "./dist/index.js" } },
      },
    };
    const ctx = await buildContext(pkg, fixturesDir);
    expect(ctx.pkg.main).toBe("./dist/index.js");
    expect(ctx.pkg.exports).toEqual({ ".": { import: "./dist/index.js" } });
  });

  it("does not override when publishConfig is absent", async () => {
    const pkg: PackageJson = { main: "./src/index.ts" };
    const ctx = await buildContext(pkg, fixturesDir);
    expect(ctx.pkg.main).toBe("./src/index.ts");
  });

  it("only copies known fields from publishConfig", async () => {
    const pkg: PackageJson = {
      publishConfig: {
        registry: "https://npm.pkg.github.com",
        main: "./dist/index.js",
      } as Record<string, unknown>,
    };
    const ctx = await buildContext(pkg, fixturesDir);
    expect(ctx.pkg.main).toBe("./dist/index.js");
    expect((ctx.pkg as Record<string, unknown>).registry).toBeUndefined();
  });
});

describe("exports/condition-types", () => {
  it("warns when JS condition has no types sibling", async () => {
    const pkg: PackageJson = {
      exports: {
        ".": {
          import: "./dist/index.js",
          require: "./dist/index.cjs",
        },
      },
    };
    const ctx = await buildContext(pkg, fixturesDir);
    const diags = conditionTypesRule.check(ctx);
    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0].message).toContain("no \"types\" condition");
  });

  it("passes when types sibling exists", async () => {
    const pkg: PackageJson = {
      exports: {
        ".": {
          types: "./dist/index.d.ts",
          import: "./dist/index.js",
        },
      },
    };
    const ctx = await buildContext(pkg, fixturesDir);
    const diags = conditionTypesRule.check(ctx);
    expect(diags).toHaveLength(0);
  });

  it("warns on nested condition missing types", async () => {
    const pkg: PackageJson = {
      exports: {
        ".": {
          import: { default: "./dist/index.js" },
          require: { types: "./dist/index.d.cts", default: "./dist/index.cjs" },
        },
      },
    };
    const ctx = await buildContext(pkg, fixturesDir);
    const diags = conditionTypesRule.check(ctx);
    expect(diags.some((d) => d.message.includes("import"))).toBe(true);
  });

  it("passes with nested types in all conditions", async () => {
    const pkg: PackageJson = {
      exports: {
        ".": {
          import: { types: "./dist/index.d.mts", default: "./dist/index.js" },
          require: { types: "./dist/index.d.cts", default: "./dist/index.cjs" },
        },
      },
    };
    const ctx = await buildContext(pkg, fixturesDir);
    const diags = conditionTypesRule.check(ctx);
    expect(diags).toHaveLength(0);
  });

  it("skips string exports", async () => {
    const pkg: PackageJson = {
      exports: "./dist/index.js" as unknown as Record<string, unknown>,
    };
    const ctx = await buildContext(pkg, fixturesDir);
    const diags = conditionTypesRule.check(ctx);
    expect(diags).toHaveLength(0);
  });

  it("checks sugar-form condition map", async () => {
    const pkg: PackageJson = {
      exports: {
        import: "./dist/index.js",
        require: "./dist/index.cjs",
      },
    };
    const ctx = await buildContext(pkg, fixturesDir);
    const diags = conditionTypesRule.check(ctx);
    expect(diags.length).toBeGreaterThan(0);
  });
});
