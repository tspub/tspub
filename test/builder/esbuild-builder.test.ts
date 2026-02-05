import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { rm, readFile, access, readdir } from "node:fs/promises";
import { buildWithEsbuild } from "../../src/builder/esbuild-builder.js";

const FIXTURE_DIR = join(__dirname, "../fixtures/simple-pkg");
const MULTI_FIXTURE_DIR = join(__dirname, "../fixtures/multi-entry-pkg");
const OUT_DIR = "dist-esbuild";
const OUT_PATH = join(FIXTURE_DIR, OUT_DIR);
const MULTI_OUT_PATH = join(MULTI_FIXTURE_DIR, OUT_DIR);

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

beforeEach(async () => {
  await rm(OUT_PATH, { recursive: true, force: true });
  await rm(MULTI_OUT_PATH, { recursive: true, force: true });
});

afterEach(async () => {
  await rm(OUT_PATH, { recursive: true, force: true });
  await rm(MULTI_OUT_PATH, { recursive: true, force: true });
});

describe("esbuild-builder", () => {
  it("produces ESM output", async () => {
    await buildWithEsbuild({
      dir: FIXTURE_DIR,
      entry: ["src/index.ts"],
      formats: ["esm"],
      outDir: OUT_DIR,
      dts: false,
      sourcemap: false,
      watch: false,
    });

    expect(await exists(join(OUT_PATH, "index.js"))).toBe(true);
    const content = await readFile(join(OUT_PATH, "index.js"), "utf-8");
    expect(content).toContain("export");
  });

  it("produces CJS output", async () => {
    await buildWithEsbuild({
      dir: FIXTURE_DIR,
      entry: ["src/index.ts"],
      formats: ["cjs"],
      outDir: OUT_DIR,
      dts: false,
      sourcemap: false,
      watch: false,
    });

    expect(await exists(join(OUT_PATH, "index.cjs"))).toBe(true);
    const content = await readFile(join(OUT_PATH, "index.cjs"), "utf-8");
    expect(content).toContain("exports");
  });

  it("produces dual ESM + CJS output", async () => {
    await buildWithEsbuild({
      dir: FIXTURE_DIR,
      entry: ["src/index.ts"],
      formats: ["esm", "cjs"],
      outDir: OUT_DIR,
      dts: false,
      sourcemap: false,
      watch: false,
    });

    expect(await exists(join(OUT_PATH, "index.js"))).toBe(true);
    expect(await exists(join(OUT_PATH, "index.cjs"))).toBe(true);
  });

  it("minifies output", async () => {
    // Non-minified
    await buildWithEsbuild({
      dir: FIXTURE_DIR,
      entry: ["src/index.ts"],
      formats: ["esm"],
      outDir: OUT_DIR,
      dts: false,
      sourcemap: false,
      watch: false,
    });
    const normalContent = await readFile(join(OUT_PATH, "index.js"), "utf-8");

    await rm(OUT_PATH, { recursive: true, force: true });

    // Minified
    await buildWithEsbuild({
      dir: FIXTURE_DIR,
      entry: ["src/index.ts"],
      formats: ["esm"],
      outDir: OUT_DIR,
      dts: false,
      sourcemap: false,
      watch: false,
      minify: true,
    });
    const minifiedContent = await readFile(join(OUT_PATH, "index.js"), "utf-8");

    expect(minifiedContent.length).toBeLessThan(normalContent.length);
  });

  it("generates sourcemaps", async () => {
    await buildWithEsbuild({
      dir: FIXTURE_DIR,
      entry: ["src/index.ts"],
      formats: ["esm"],
      outDir: OUT_DIR,
      dts: false,
      sourcemap: true,
      watch: false,
    });

    expect(await exists(join(OUT_PATH, "index.js.map"))).toBe(true);
  });

  it("injects define constants", async () => {
    await buildWithEsbuild({
      dir: FIXTURE_DIR,
      entry: ["src/index.ts"],
      formats: ["esm"],
      outDir: OUT_DIR,
      dts: false,
      sourcemap: false,
      watch: false,
      define: { "process.env.NODE_ENV": '"production"' },
    });

    expect(await exists(join(OUT_PATH, "index.js"))).toBe(true);
  });

  it("adds banner and footer", async () => {
    await buildWithEsbuild({
      dir: FIXTURE_DIR,
      entry: ["src/index.ts"],
      formats: ["esm"],
      outDir: OUT_DIR,
      dts: false,
      sourcemap: false,
      watch: false,
      banner: { js: "/* banner */" },
      footer: { js: "/* footer */" },
    });

    const content = await readFile(join(OUT_PATH, "index.js"), "utf-8");
    expect(content).toContain("/* banner */");
    expect(content).toContain("/* footer */");
  });

  it("returns build result with timing", async () => {
    const result = await buildWithEsbuild({
      dir: FIXTURE_DIR,
      entry: ["src/index.ts"],
      formats: ["esm"],
      outDir: OUT_DIR,
      dts: false,
      sourcemap: false,
      watch: false,
    });

    expect(result.duration).toBeGreaterThan(0);
    expect(result.outputFiles.length).toBeGreaterThan(0);
  });

  it("creates shared chunks with splitting enabled", async () => {
    await buildWithEsbuild({
      dir: MULTI_FIXTURE_DIR,
      entry: ["src/index.ts", "src/utils.ts"],
      formats: ["esm"],
      outDir: OUT_DIR,
      dts: false,
      sourcemap: false,
      watch: false,
      splitting: true,
    });

    expect(await exists(join(MULTI_OUT_PATH, "index.js"))).toBe(true);
    expect(await exists(join(MULTI_OUT_PATH, "utils.js"))).toBe(true);

    const files = await readdir(MULTI_OUT_PATH);
    const chunkFiles = files.filter((f) => f.startsWith("chunk-") && f.endsWith(".js"));
    expect(chunkFiles.length).toBeGreaterThan(0);
  });

  it("auto-enables splitting for multi-entry ESM", async () => {
    await buildWithEsbuild({
      dir: MULTI_FIXTURE_DIR,
      entry: ["src/index.ts", "src/utils.ts"],
      formats: ["esm"],
      outDir: OUT_DIR,
      dts: false,
      sourcemap: false,
      watch: false,
    });

    expect(await exists(join(MULTI_OUT_PATH, "index.js"))).toBe(true);
    expect(await exists(join(MULTI_OUT_PATH, "utils.js"))).toBe(true);

    const files = await readdir(MULTI_OUT_PATH);
    const chunkFiles = files.filter((f) => f.startsWith("chunk-") && f.endsWith(".js"));
    expect(chunkFiles.length).toBeGreaterThan(0);
  });

  it("does not auto-enable splitting for single-entry ESM", async () => {
    await buildWithEsbuild({
      dir: FIXTURE_DIR,
      entry: ["src/index.ts"],
      formats: ["esm"],
      outDir: OUT_DIR,
      dts: false,
      sourcemap: false,
      watch: false,
    });

    const files = await readdir(OUT_PATH);
    const chunkFiles = files.filter((f) => f.startsWith("chunk-") && f.endsWith(".js"));
    expect(chunkFiles.length).toBe(0);
  });

  it("supports object-style entry points", async () => {
    await buildWithEsbuild({
      dir: MULTI_FIXTURE_DIR,
      entry: { index: "src/index.ts", "lib/utils": "src/utils.ts" },
      formats: ["esm"],
      outDir: OUT_DIR,
      dts: false,
      sourcemap: false,
      watch: false,
    });

    expect(await exists(join(MULTI_OUT_PATH, "index.js"))).toBe(true);
    expect(await exists(join(MULTI_OUT_PATH, "lib/utils.js"))).toBe(true);
  });

  it("tree-shakes unused exports", async () => {
    await buildWithEsbuild({
      dir: FIXTURE_DIR,
      entry: ["src/index.ts"],
      formats: ["esm"],
      outDir: OUT_DIR,
      dts: false,
      sourcemap: false,
      watch: false,
    });

    const content = await readFile(join(OUT_PATH, "index.js"), "utf-8");
    expect(content).not.toContain("this should be tree-shaken");
  });

  it("auto-injects process.env.NODE_ENV when minify is true", async () => {
    await buildWithEsbuild({
      dir: FIXTURE_DIR,
      entry: ["src/index.ts"],
      formats: ["esm"],
      outDir: OUT_DIR,
      dts: false,
      sourcemap: false,
      watch: false,
      minify: true,
    });

    const content = await readFile(join(OUT_PATH, "index.js"), "utf-8");
    expect(content).not.toContain("process.env.NODE_ENV");
  });

  it("builds for browser platform", async () => {
    await buildWithEsbuild({
      dir: FIXTURE_DIR,
      entry: ["src/index.ts"],
      formats: ["esm"],
      outDir: OUT_DIR,
      dts: false,
      sourcemap: false,
      watch: false,
      platform: "browser",
    });

    expect(await exists(join(OUT_PATH, "index.js"))).toBe(true);
  });

  it("builds for neutral platform", async () => {
    await buildWithEsbuild({
      dir: FIXTURE_DIR,
      entry: ["src/index.ts"],
      formats: ["esm"],
      outDir: OUT_DIR,
      dts: false,
      sourcemap: false,
      watch: false,
      platform: "neutral",
    });

    expect(await exists(join(OUT_PATH, "index.js"))).toBe(true);
  });

  it("preserves shebang for bin entries", async () => {
    await buildWithEsbuild({
      dir: MULTI_FIXTURE_DIR,
      entry: { "bin/cli": "bin/cli.ts", index: "src/index.ts" },
      formats: ["esm"],
      outDir: OUT_DIR,
      dts: false,
      sourcemap: false,
      watch: false,
    });

    const binContent = await readFile(join(MULTI_OUT_PATH, "bin/cli.js"), "utf-8");
    expect(binContent.startsWith("#!/usr/bin/env node")).toBe(true);
  });

  it("passes through user esbuild plugins", async () => {
    let pluginRan = false;

    await buildWithEsbuild({
      dir: FIXTURE_DIR,
      entry: ["src/index.ts"],
      formats: ["esm"],
      outDir: OUT_DIR,
      dts: false,
      sourcemap: false,
      watch: false,
      esbuildPlugins: [
        {
          name: "test-plugin",
          setup() {
            pluginRan = true;
          },
        },
      ],
    });

    expect(pluginRan).toBe(true);
  });

  it("runs renderChunk plugins on output", async () => {
    const chunks: string[] = [];

    await buildWithEsbuild({
      dir: FIXTURE_DIR,
      entry: ["src/index.ts"],
      formats: ["esm"],
      outDir: OUT_DIR,
      dts: false,
      sourcemap: false,
      watch: false,
      plugins: [
        {
          name: "test-render-chunk",
          renderChunk(code, info) {
            chunks.push(info.path);
            return undefined;
          },
        },
      ],
    });

    expect(chunks.length).toBeGreaterThan(0);
  });

  it("runs onSuccess callback after build", async () => {
    let called = false;

    await buildWithEsbuild({
      dir: FIXTURE_DIR,
      entry: ["src/index.ts"],
      formats: ["esm"],
      outDir: OUT_DIR,
      dts: false,
      sourcemap: false,
      watch: false,
      onSuccess: () => {
        called = true;
      },
    });

    expect(called).toBe(true);
  });

  it("respects treeshake: false", async () => {
    await buildWithEsbuild({
      dir: FIXTURE_DIR,
      entry: ["src/index.ts"],
      formats: ["esm"],
      outDir: OUT_DIR,
      dts: false,
      sourcemap: false,
      watch: false,
      treeshake: false,
    });

    expect(await exists(join(OUT_PATH, "index.js"))).toBe(true);
  });

  it("builds IIFE format with globalName", async () => {
    await buildWithEsbuild({
      dir: FIXTURE_DIR,
      entry: ["src/index.ts"],
      formats: ["iife"],
      outDir: OUT_DIR,
      dts: false,
      sourcemap: false,
      watch: false,
      globalName: "SimplePkg",
    });

    expect(await exists(join(OUT_PATH, "index.global.js"))).toBe(true);
    const content = await readFile(join(OUT_PATH, "index.global.js"), "utf-8");
    expect(content).toContain("SimplePkg");
  });

  it("replaces NODE_ENV via replaceNodeEnv option", async () => {
    await buildWithEsbuild({
      dir: FIXTURE_DIR,
      entry: ["src/index.ts"],
      formats: ["esm"],
      outDir: OUT_DIR,
      dts: false,
      sourcemap: false,
      watch: false,
      replaceNodeEnv: true,
    });

    const content = await readFile(join(OUT_PATH, "index.js"), "utf-8");
    expect(content).not.toContain("process.env.NODE_ENV");
  });

  it("copies publicDir to output", async () => {
    await buildWithEsbuild({
      dir: FIXTURE_DIR,
      entry: ["src/index.ts"],
      formats: ["esm"],
      outDir: OUT_DIR,
      dts: false,
      sourcemap: false,
      watch: false,
      publicDir: "public",
    });

    expect(await exists(join(OUT_PATH, "readme.txt"))).toBe(true);
    const content = await readFile(join(OUT_PATH, "readme.txt"), "utf-8");
    expect(content).toContain("static asset");
  });

  it("accepts inject option without errors", async () => {
    await buildWithEsbuild({
      dir: FIXTURE_DIR,
      entry: ["src/index.ts"],
      formats: ["esm"],
      outDir: OUT_DIR,
      dts: false,
      sourcemap: false,
      watch: false,
      inject: ["src/inject-polyfill.ts"],
    });

    expect(await exists(join(OUT_PATH, "index.js"))).toBe(true);
  });

  it("builds IIFE format without globalName", async () => {
    await buildWithEsbuild({
      dir: FIXTURE_DIR,
      entry: ["src/index.ts"],
      formats: ["iife"],
      outDir: OUT_DIR,
      dts: false,
      sourcemap: false,
      watch: false,
    });

    expect(await exists(join(OUT_PATH, "index.global.js"))).toBe(true);
  });

  it("produces triple format output", async () => {
    await buildWithEsbuild({
      dir: FIXTURE_DIR,
      entry: ["src/index.ts"],
      formats: ["esm", "cjs", "iife"],
      outDir: OUT_DIR,
      dts: false,
      sourcemap: false,
      watch: false,
      globalName: "SimplePkg",
    });

    expect(await exists(join(OUT_PATH, "index.js"))).toBe(true);
    expect(await exists(join(OUT_PATH, "index.cjs"))).toBe(true);
    expect(await exists(join(OUT_PATH, "index.global.js"))).toBe(true);
  });
});
