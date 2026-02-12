import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { tsconfigExistsRule } from "../../../src/checker/rules/types/tsconfig-exists.js";
import type { CheckContext } from "../../../src/checker/framework/types.js";
import type { PackageJson } from "../../../src/shared/package-json.js";

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), "tspub-test-tsconfig-" + Date.now());
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

function makeCtx(
  pkg: PackageJson,
  overrides?: Partial<CheckContext>,
): CheckContext {
  return {
    pkg,
    dir: testDir,
    compilerOptions: null,
    hasBuildOutput: false,
    distFiles: [],
    allJsFiles: [],
    hasUnresolvedExtends: false,
    ...overrides,
  };
}

describe("types/tsconfig-exists", () => {
  it("has correct metadata", () => {
    expect(tsconfigExistsRule.meta.id).toBe("types/tsconfig-exists");
    expect(tsconfigExistsRule.meta.category).toBe("types");
    expect(tsconfigExistsRule.meta.defaultSeverity).toBe("warning");
    expect(tsconfigExistsRule.meta.fixable).toBe(false);
  });

  it("is not fixable", () => {
    expect(tsconfigExistsRule.fix).toBeUndefined();
  });

  // ---- Early return: compilerOptions is present ----

  it("returns empty when compilerOptions is not null (tsconfig parsed successfully)", async () => {
    const diags = await tsconfigExistsRule.check(
      makeCtx({}, { compilerOptions: { strict: true } }),
    );
    expect(diags).toHaveLength(0);
  });

  // ---- tsconfig.json does not exist ----

  it("returns info when tsconfig.json not found and no special conditions", async () => {
    const diags = await tsconfigExistsRule.check(makeCtx({}));
    expect(diags).toHaveLength(1);
    expect(diags[0]!.severity).toBe("info");
    expect(diags[0]!.message).toBe("tsconfig.json not found");
  });

  it("returns info about hand-written declarations when pkg.types points to existing file", async () => {
    // Create the types file that pkg.types points to
    await writeFile(join(testDir, "index.d.ts"), "export declare const x: number;");
    const diags = await tsconfigExistsRule.check(
      makeCtx({ types: "index.d.ts" }),
    );
    expect(diags).toHaveLength(1);
    expect(diags[0]!.severity).toBe("info");
    expect(diags[0]!.message).toContain("hand-written declarations");
  });

  it("does not report hand-written declarations when pkg.types file does not exist", async () => {
    const diags = await tsconfigExistsRule.check(
      makeCtx({ types: "nonexistent.d.ts" }),
    );
    expect(diags).toHaveLength(1);
    expect(diags[0]!.severity).toBe("info");
    // Should not say hand-written; should fall through to other checks
    expect(diags[0]!.message).not.toContain("hand-written");
  });

  it("returns info about published package when hasBuildOutput is true", async () => {
    const diags = await tsconfigExistsRule.check(
      makeCtx({}, { hasBuildOutput: true }),
    );
    expect(diags).toHaveLength(1);
    expect(diags[0]!.severity).toBe("info");
    expect(diags[0]!.message).toContain("published package");
  });

  it("returns info about published package when distFiles has entries", async () => {
    const diags = await tsconfigExistsRule.check(
      makeCtx({}, { distFiles: ["dist/index.js"] }),
    );
    expect(diags).toHaveLength(1);
    expect(diags[0]!.severity).toBe("info");
    expect(diags[0]!.message).toContain("published package");
  });

  it("returns plain info when no build output and no dist files and no types field", async () => {
    const diags = await tsconfigExistsRule.check(
      makeCtx({}, { hasBuildOutput: false, distFiles: [] }),
    );
    expect(diags).toHaveLength(1);
    expect(diags[0]!.severity).toBe("info");
    expect(diags[0]!.message).toBe("tsconfig.json not found");
  });

  // ---- tsconfig.json exists but couldn't be parsed ----

  it("returns warning when tsconfig.json exists but compilerOptions is null (parse failure)", async () => {
    // Create a tsconfig.json that exists but compilerOptions is null
    // (rule trusts ctx.compilerOptions being null + file existing = parse error)
    await writeFile(join(testDir, "tsconfig.json"), "{ invalid json");
    const diags = await tsconfigExistsRule.check(makeCtx({}));
    expect(diags).toHaveLength(1);
    expect(diags[0]!.severity).toBe("warning");
    expect(diags[0]!.message).toContain("Could not parse tsconfig.json");
  });

  it("returns warning for a valid-JSON but malformed tsconfig.json", async () => {
    await writeFile(join(testDir, "tsconfig.json"), '{"compilerOptions": "not-an-object"}');
    const diags = await tsconfigExistsRule.check(makeCtx({}));
    expect(diags).toHaveLength(1);
    expect(diags[0]!.severity).toBe("warning");
    expect(diags[0]!.message).toContain("Could not parse");
  });

  // ---- Priority: hand-written declarations check comes before published package check ----

  it("prefers hand-written declarations message over published package message", async () => {
    await writeFile(join(testDir, "index.d.ts"), "export declare const x: number;");
    const diags = await tsconfigExistsRule.check(
      makeCtx({ types: "index.d.ts" }, { hasBuildOutput: true, distFiles: ["dist/index.js"] }),
    );
    expect(diags).toHaveLength(1);
    expect(diags[0]!.message).toContain("hand-written declarations");
  });
});
