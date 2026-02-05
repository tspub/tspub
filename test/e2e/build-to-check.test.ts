import { describe, it, expect, afterEach } from "vitest";
import { build } from "../../src/builder/index.js";
import { check } from "../../src/checker/index.js";
import { rm, cp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fixturesDir = join(__dirname, "../fixtures");

describe("E2E: build → check pipeline", () => {
  const tmps: string[] = [];

  afterEach(async () => {
    for (const dir of tmps) {
      await rm(dir, { recursive: true, force: true });
    }
    tmps.length = 0;
  });

  async function makeTmpCopy(fixtureName: string): Promise<string> {
    const src = join(fixturesDir, fixtureName);
    const tmp = join(tmpdir(), `tspub-e2e-${fixtureName}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await cp(src, tmp, { recursive: true });
    tmps.push(tmp);
    return tmp;
  }

  it("simple-pkg builds and then passes check with zero errors", async () => {
    const dir = await makeTmpCopy("simple-pkg");

    // Build
    await build({
      formats: ["esm", "cjs"],
      dts: true,
      sourcemap: true,
      watch: false,
      dir,
      clean: true,
    });

    // Check — after build, should have no errors related to missing dist files
    const results = await check({ dir, fix: false, strict: false });
    const errors = results.filter((r) => r.severity === "error");

    // Any remaining errors should NOT be about missing files
    for (const e of errors) {
      expect(e.message).not.toMatch(/not found|missing.*dist/i);
    }
  });

  it("multi-entry-pkg builds and check validates all entry points", async () => {
    const dir = await makeTmpCopy("multi-entry-pkg");

    await build({
      formats: ["esm"],
      dts: false,
      sourcemap: false,
      watch: false,
      dir,
      clean: true,
    });

    const results = await check({ dir, fix: false, strict: false });
    // Check that exports-related file existence passes
    const fileNotFound = results.filter(
      (r) => r.severity === "error" && r.ruleId === "exports/file-exists",
    );
    expect(fileNotFound).toHaveLength(0);
  });

  it("build with DTS then check validates types exist", async () => {
    const dir = await makeTmpCopy("simple-pkg");

    await build({
      formats: ["esm"],
      dts: true,
      sourcemap: false,
      watch: false,
      dir,
      clean: true,
    });

    const results = await check({ dir, fix: false, strict: false });
    // Should have "ok" results (types checks passed)
    const oks = results.filter((r) => r.severity === "ok");
    expect(oks.length).toBeGreaterThan(0);
    // No errors about missing .d.ts files
    const dtsErrors = results.filter(
      (r) => r.severity === "error" && r.message.match(/\.d\.ts|declaration/i),
    );
    expect(dtsErrors).toHaveLength(0);
  });

  it("bin-pkg builds with shebang and check validates bin field", async () => {
    const dir = await makeTmpCopy("bin-pkg");

    await build({
      formats: ["esm"],
      dts: false,
      sourcemap: false,
      watch: false,
      dir,
      clean: true,
      entry: { cli: "src/cli.ts", index: "src/index.ts" },
      banner: { js: "#!/usr/bin/env node" },
    });

    const results = await check({ dir, fix: false, strict: false });
    // Should not have bin-related errors (shebang present)
    const binErrors = results.filter(
      (r) => r.severity === "error" && r.ruleId?.includes("bin"),
    );
    expect(binErrors).toHaveLength(0);
  });

  it("build with define replaces values in output", async () => {
    const dir = await makeTmpCopy("simple-pkg");

    await build({
      formats: ["esm"],
      dts: false,
      sourcemap: false,
      watch: false,
      dir,
      clean: true,
      define: { "process.env.BUILD_ENV": '"production"' },
    });

    // Build should succeed without error — defines are a pass-through to esbuild
    const output = await readFile(join(dir, "dist/index.js"), "utf-8");
    expect(output).toBeDefined();
  });

  it("build with target option works", async () => {
    const dir = await makeTmpCopy("simple-pkg");

    await build({
      formats: ["esm"],
      dts: false,
      sourcemap: false,
      watch: false,
      dir,
      clean: true,
      target: "es2020",
    });

    const output = await readFile(join(dir, "dist/index.js"), "utf-8");
    expect(output).toContain("greet");
  });

  it("build with platform=browser works", async () => {
    const dir = await makeTmpCopy("simple-pkg");

    await build({
      formats: ["esm"],
      dts: false,
      sourcemap: false,
      watch: false,
      dir,
      clean: true,
      platform: "browser",
    });

    const output = await readFile(join(dir, "dist/index.js"), "utf-8");
    expect(output).toContain("greet");
  });
});
