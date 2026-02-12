import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { esmMainNoExportsRule } from "../../../src/checker/rules/exports/esm-main-no-exports.js";

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), "tspub-test-esm-main-" + Date.now());
  await mkdir(join(testDir, "dist"), { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

const baseCtx = {
  compilerOptions: null,
  distFiles: [],
  allJsFiles: [],
  hasUnresolvedExtends: false,
};

describe("exports/esm-main-no-exports check (extended)", () => {
  it("returns empty when exports field exists", async () => {
    const results = await esmMainNoExportsRule.check({
      ...baseCtx,
      hasBuildOutput: false,
      dir: "/tmp",
      pkg: { main: "./dist/index.mjs", exports: { ".": "./dist/index.mjs" } },
    });
    expect(results).toHaveLength(0);
  });

  it("returns empty when no main field", async () => {
    const results = await esmMainNoExportsRule.check({
      ...baseCtx,
      hasBuildOutput: false,
      dir: "/tmp",
      pkg: {},
    });
    expect(results).toHaveLength(0);
  });

  it("warns when main is .mjs with no exports (extension-based)", async () => {
    const results = await esmMainNoExportsRule.check({
      ...baseCtx,
      hasBuildOutput: false,
      dir: "/tmp",
      pkg: { main: "./dist/index.mjs" },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe("warning");
    expect(results[0]!.message).toContain("ESM");
    expect(results[0]!.message).toContain("add an exports field");
  });

  it("warns when main is .js with type=module (extension-based)", async () => {
    const results = await esmMainNoExportsRule.check({
      ...baseCtx,
      hasBuildOutput: false,
      dir: "/tmp",
      pkg: { main: "./dist/index.js", type: "module" },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.message).toContain("ESM");
  });

  it("passes when main is .cjs (CJS extension)", async () => {
    const results = await esmMainNoExportsRule.check({
      ...baseCtx,
      hasBuildOutput: false,
      dir: "/tmp",
      pkg: { main: "./dist/index.cjs" },
    });
    expect(results).toHaveLength(0);
  });

  it("passes when main is .js with no type field (defaults to CJS)", async () => {
    const results = await esmMainNoExportsRule.check({
      ...baseCtx,
      hasBuildOutput: false,
      dir: "/tmp",
      pkg: { main: "./dist/index.js" },
    });
    // CJS by extension, so no warning from getExpectedFormat
    // And hasBuildOutput is false so content check is skipped
    expect(results).toHaveLength(0);
  });

  it("returns early for extension-based ESM detection (does not continue to content check)", async () => {
    const results = await esmMainNoExportsRule.check({
      ...baseCtx,
      hasBuildOutput: true,
      dir: testDir,
      pkg: { main: "./dist/index.mjs" },
    });
    // Extension-based detection returns immediately
    expect(results).toHaveLength(1);
    expect(results[0]!.message).toContain("(ESM)");
  });

  it("checks content when extension is ambiguous and hasBuildOutput", async () => {
    await writeFile(
      join(testDir, "dist", "index.js"),
      "export const x = 42; export default x;",
    );
    const results = await esmMainNoExportsRule.check({
      ...baseCtx,
      hasBuildOutput: true,
      dir: testDir,
      pkg: { main: "./dist/index.js" },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe("warning");
    expect(results[0]!.message).toContain("ESM syntax");
    expect(results[0]!.message).toContain("add an exports field");
  });

  it("passes when content is CJS and hasBuildOutput", async () => {
    await writeFile(
      join(testDir, "dist", "index.js"),
      'const x = require("foo"); module.exports = x;',
    );
    const results = await esmMainNoExportsRule.check({
      ...baseCtx,
      hasBuildOutput: true,
      dir: testDir,
      pkg: { main: "./dist/index.js" },
    });
    expect(results).toHaveLength(0);
  });

  it("skips content check when hasBuildOutput is false", async () => {
    const results = await esmMainNoExportsRule.check({
      ...baseCtx,
      hasBuildOutput: false,
      dir: testDir,
      pkg: { main: "./dist/index.js" },
    });
    // .js with no type field => CJS by extension, and no content check
    expect(results).toHaveLength(0);
  });

  it("passes when file does not exist for content check", async () => {
    // hasBuildOutput true but file doesn't exist => readFileSafe returns null
    const results = await esmMainNoExportsRule.check({
      ...baseCtx,
      hasBuildOutput: true,
      dir: testDir,
      pkg: { main: "./dist/nonexistent.js" },
    });
    expect(results).toHaveLength(0);
  });

  it("passes when content has unknown format", async () => {
    await writeFile(join(testDir, "dist", "index.js"), "// just a comment\n");
    const results = await esmMainNoExportsRule.check({
      ...baseCtx,
      hasBuildOutput: true,
      dir: testDir,
      pkg: { main: "./dist/index.js" },
    });
    expect(results).toHaveLength(0);
  });

  it("passes when content is mixed", async () => {
    await writeFile(
      join(testDir, "dist", "index.js"),
      'const x = require("foo"); export default x;',
    );
    const results = await esmMainNoExportsRule.check({
      ...baseCtx,
      hasBuildOutput: true,
      dir: testDir,
      pkg: { main: "./dist/index.js" },
    });
    // Mixed content is not "esm" so it doesn't warn
    expect(results).toHaveLength(0);
  });
});
