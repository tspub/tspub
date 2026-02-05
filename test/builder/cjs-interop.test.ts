import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { rm, readFile } from "node:fs/promises";
import { buildWithEsbuild } from "../../src/builder/esbuild-builder.js";

const FIXTURE_DIR = join(__dirname, "../fixtures/simple-pkg");
const OUT_DIR = "dist-cjs-interop";
const OUT_PATH = join(FIXTURE_DIR, OUT_DIR);

beforeEach(async () => {
  await rm(OUT_PATH, { recursive: true, force: true });
});

afterEach(async () => {
  await rm(OUT_PATH, { recursive: true, force: true });
});

describe("cjs-interop", () => {
  it("appends interop code when default export exists (metafile-based)", async () => {
    await buildWithEsbuild({
      dir: FIXTURE_DIR,
      entry: ["src/index.ts"],
      formats: ["cjs"],
      outDir: OUT_DIR,
      dts: false,
      sourcemap: false,
      watch: false,
      cjsInterop: true,
    });

    const content = await readFile(join(OUT_PATH, "index.cjs"), "utf-8");
    expect(content).toContain("CJS interop");
    expect(content).toContain("module.exports = _default");
  });

  it("skips interop when disabled", async () => {
    await buildWithEsbuild({
      dir: FIXTURE_DIR,
      entry: ["src/index.ts"],
      formats: ["cjs"],
      outDir: OUT_DIR,
      dts: false,
      sourcemap: false,
      watch: false,
      cjsInterop: false,
    });

    const content = await readFile(join(OUT_PATH, "index.cjs"), "utf-8");
    expect(content).not.toContain("CJS interop");
  });

  it("preserves named exports alongside default", async () => {
    await buildWithEsbuild({
      dir: FIXTURE_DIR,
      entry: ["src/index.ts"],
      formats: ["cjs"],
      outDir: OUT_DIR,
      dts: false,
      sourcemap: false,
      watch: false,
      cjsInterop: true,
    });

    const content = await readFile(join(OUT_PATH, "index.cjs"), "utf-8");
    expect(content).toContain("greet");
    expect(content).toContain("module.exports = _default");
  });
});
