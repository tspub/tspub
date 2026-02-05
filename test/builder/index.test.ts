import { describe, it, expect, afterEach } from "vitest";
import { build } from "../../src/builder/index.js";
import { rm, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fixtureDir = join(__dirname, "../fixtures/simple-pkg");
const distDir = join(fixtureDir, "dist");

afterEach(async () => {
  await rm(distDir, { recursive: true, force: true });
});

describe("build() E2E", () => {
  it("produces ESM and CJS outputs", async () => {
    await build({
      formats: ["esm", "cjs"],
      dts: false,
      sourcemap: false,
      watch: false,
      dir: fixtureDir,
      clean: true,
    });

    const esm = await readFile(join(distDir, "index.js"), "utf-8");
    expect(esm).toContain("export");

    const cjs = await readFile(join(distDir, "index.cjs"), "utf-8");
    expect(cjs).toMatch(/require|module\.exports|exports\./);
  });

  it("generates .d.ts with expected content when dts is enabled", async () => {
    await build({
      formats: ["esm"],
      dts: true,
      sourcemap: false,
      watch: false,
      dir: fixtureDir,
      clean: true,
    });

    const dtsContent = await readFile(join(distDir, "index.d.ts"), "utf-8");
    expect(dtsContent).toContain("greet");
  });

  it("builds IIFE format with globalName", async () => {
    const iifeDir = join(__dirname, "../fixtures/iife-pkg");
    const iifeDist = join(iifeDir, "dist");
    try {
      await build({
        formats: ["iife"],
        dts: false,
        sourcemap: false,
        watch: false,
        dir: iifeDir,
        clean: true,
        globalName: "MyLib",
      });
      const output = await readFile(join(iifeDist, "index.global.js"), "utf-8");
      expect(output).toContain("MyLib");
    } finally {
      await rm(iifeDist, { recursive: true, force: true });
    }
  });

  it("produces minified output", async () => {
    await build({
      formats: ["esm"],
      dts: false,
      sourcemap: false,
      watch: false,
      dir: fixtureDir,
      clean: true,
    });
    const normal = await readFile(join(distDir, "index.js"), "utf-8");

    await build({
      formats: ["esm"],
      dts: false,
      sourcemap: false,
      watch: false,
      dir: fixtureDir,
      clean: true,
      minify: true,
    });
    const minified = await readFile(join(distDir, "index.js"), "utf-8");
    expect(minified.length).toBeLessThan(normal.length);
  });

  it("generates sourcemaps when enabled", async () => {
    await build({
      formats: ["esm"],
      dts: false,
      sourcemap: true,
      watch: false,
      dir: fixtureDir,
      clean: true,
    });
    const mapPath = join(distDir, "index.js.map");
    expect((await stat(mapPath)).isFile()).toBe(true);
    const map = JSON.parse(await readFile(mapPath, "utf-8"));
    expect(map).toHaveProperty("mappings");
  });

  it("respects inject option", async () => {
    await build({
      formats: ["esm"],
      dts: false,
      sourcemap: false,
      watch: false,
      dir: fixtureDir,
      clean: true,
      inject: ["src/inject-polyfill.ts"],
    });
    const output = await readFile(join(distDir, "index.js"), "utf-8");
    expect(output).toContain("__INJECTED__");
  });

  it("marks dependencies as external by default", async () => {
    await build({
      formats: ["esm"],
      dts: false,
      sourcemap: false,
      watch: false,
      dir: fixtureDir,
      clean: true,
    });
    const output = await readFile(join(distDir, "index.js"), "utf-8");
    // chalk is a dependency and should be externalized
    expect(output).not.toContain("ansi256");
  });

  it("clean mode removes files from prior build", async () => {
    // First build: ESM only
    await build({
      formats: ["esm"],
      dts: false,
      sourcemap: false,
      watch: false,
      dir: fixtureDir,
      clean: true,
    });

    const esmPath = join(distDir, "index.js");
    expect((await stat(esmPath)).isFile()).toBe(true);

    // Second build: CJS only with clean — ESM file should be gone
    await build({
      formats: ["cjs"],
      dts: false,
      sourcemap: false,
      watch: false,
      dir: fixtureDir,
      clean: true,
    });

    const cjsPath = join(distDir, "index.cjs");
    expect((await stat(cjsPath)).isFile()).toBe(true);

    // ESM output from first build must not survive clean
    await expect(stat(esmPath)).rejects.toThrow();
  });
});
