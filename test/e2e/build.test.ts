import { describe, it, expect, afterEach } from "vitest";
import { build } from "../../src/builder/index.js";
import { rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fixture, makeTmpCopy, fileExists } from "./_helpers.js";

describe("E2E: Build Features", () => {
  const cleanups: string[] = [];

  afterEach(async () => {
    for (const dir of cleanups) {
      await rm(dir, { recursive: true, force: true });
    }
    cleanups.length = 0;
  });

  function trackDist(fixtureDir: string) {
    const dist = join(fixtureDir, "dist");
    cleanups.push(dist);
    return dist;
  }

  it("build ESM-only produces valid ESM and no CJS", async () => {
    const dir = await makeTmpCopy("simple-pkg");
    cleanups.push(dir);
    const dist = join(dir, "dist");
    await build({ formats: ["esm"], dts: false, sourcemap: false, watch: false, dir, clean: true });

    const esm = await readFile(join(dist, "index.js"), "utf-8");
    expect(esm).toMatch(/export\s*\{|export\s+(function|default|const|let|var)\b/);
    expect(esm).toMatch(/greet/);
    expect(await fileExists(join(dist, "index.cjs"))).toBe(false);
    expect(await fileExists(join(dist, "index.d.ts"))).toBe(false);
  });

  it("build CJS-only produces valid CJS and no ESM", async () => {
    const dir = await makeTmpCopy("simple-pkg");
    cleanups.push(dir);
    const dist = join(dir, "dist");
    await build({ formats: ["cjs"], dts: false, sourcemap: false, watch: false, dir, clean: true });

    const cjs = await readFile(join(dist, "index.cjs"), "utf-8");
    expect(cjs).toMatch(/module\.exports|exports\.\w+|Object\.defineProperty\(exports/);
    expect(cjs).toMatch(/greet/);
    expect(await fileExists(join(dist, "index.js"))).toBe(false);
  });

  it("build dual ESM+CJS produces both formats with correct content", async () => {
    const dir = fixture("simple-pkg");
    const dist = trackDist(dir);
    await build({ formats: ["esm", "cjs"], dts: false, sourcemap: false, watch: false, dir, clean: true });

    const esm = await readFile(join(dist, "index.js"), "utf-8");
    const cjs = await readFile(join(dist, "index.cjs"), "utf-8");

    expect(esm).toMatch(/export\s*\{|export\s+(function|default|const|let|var)\b/);
    expect(cjs).toMatch(/module\.exports|exports\.\w+|Object\.defineProperty\(exports/);
    expect(esm).toContain("greet");
    expect(cjs).toContain("greet");
    expect(esm).not.toBe(cjs);
  });

  it("build with DTS generates correct type declarations", async () => {
    const dir = await makeTmpCopy("simple-pkg");
    cleanups.push(dir);
    await build({ formats: ["esm"], dts: true, sourcemap: false, watch: false, dir, clean: true });

    const dts = await readFile(join(dir, "dist", "index.d.ts"), "utf-8");
    expect(dts).toMatch(/greet\s*\(\s*name\s*:\s*string\s*\)\s*:\s*string/);
    expect(dts).toMatch(/export\s+(default|=)/);
  });

  it("build with DTS bundle inlines all declarations into one file", async () => {
    const dir = await makeTmpCopy("simple-pkg");
    cleanups.push(dir);
    await build({ formats: ["esm"], dts: true, dtsBundle: true, sourcemap: false, watch: false, dir, clean: true });

    const dts = await readFile(join(dir, "dist", "index.d.ts"), "utf-8");
    expect(dts).toMatch(/greet/);
    expect(dts).not.toMatch(/from\s+["']\.\//);
    expect(dts).toMatch(/add|sum/);
    expect(await fileExists(join(dir, "dist", "utils.d.ts"))).toBe(false);
  });

  it("build IIFE format produces self-executing function with globalName", async () => {
    const dir = fixture("iife-pkg");
    const dist = trackDist(dir);
    await build({
      formats: ["iife"],
      dts: false,
      sourcemap: false,
      watch: false,
      dir,
      clean: true,
      globalName: "IifePkg",
    });

    const iife = await readFile(join(dist, "index.global.js"), "utf-8");
    expect(iife).toContain("IifePkg");
    expect(iife).toMatch(/\(.*(?:function|\(\)|=>)/s);
    expect(iife).toContain("multiply");
    expect(iife).not.toMatch(/^export\s/m);
    expect(await fileExists(join(dist, "index.global.js"))).toBe(true);
  });

  it("build with sourcemaps produces valid source map", async () => {
    const dir = fixture("simple-pkg");
    const dist = trackDist(dir);
    await build({ formats: ["esm"], dts: false, sourcemap: true, watch: false, dir, clean: true });

    const mapPath = join(dist, "index.js.map");
    expect(await fileExists(mapPath)).toBe(true);

    const map = JSON.parse(await readFile(mapPath, "utf-8"));
    expect(map.version).toBe(3);
    expect(map.mappings).toBeDefined();
    expect(typeof map.mappings).toBe("string");
    expect(map.mappings.length).toBeGreaterThan(0);
    expect(map.sources).toBeDefined();
    expect(Array.isArray(map.sources)).toBe(true);
    expect(map.sources.length).toBeGreaterThan(0);

    const js = await readFile(join(dist, "index.js"), "utf-8");
    expect(js).toContain("//# sourceMappingURL=");
  });

  it("build multi-entry produces separate outputs with correct content", async () => {
    const dir = fixture("multi-entry-pkg");
    const dist = trackDist(dir);
    await build({ formats: ["esm"], dts: false, sourcemap: false, watch: false, dir, clean: true });

    const index = await readFile(join(dist, "index.js"), "utf-8");
    const utils = await readFile(join(dist, "utils.js"), "utf-8");

    expect(index).toMatch(/export/);
    expect(utils).toMatch(/export/);
    expect(index).not.toBe(utils);
  });

  it("build with bin/shebang puts shebang on first line", async () => {
    const dir = fixture("bin-pkg");
    const dist = trackDist(dir);
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

    const cli = await readFile(join(dist, "cli.js"), "utf-8");
    expect(cli.startsWith("#!/usr/bin/env node")).toBe(true);
    expect(cli).toContain("greet");

    const index = await readFile(join(dist, "index.js"), "utf-8");
    expect(index).toMatch(/export/);
    expect(index).toContain("greet");
  });

  it("build with CJS interop adds default export wrapper", async () => {
    const dir = fixture("simple-pkg");
    const dist = trackDist(dir);
    await build({
      formats: ["cjs"],
      dts: false,
      sourcemap: false,
      watch: false,
      dir,
      clean: true,
      cjsInterop: true,
    });

    const cjs = await readFile(join(dist, "index.cjs"), "utf-8");
    expect(cjs).toContain("module.exports");
    expect(cjs).toMatch(/__esModule/);
    expect(cjs).toContain("greet");
  });

  it("build with minify produces smaller but functional output", async () => {
    const dir = fixture("simple-pkg");
    const dist = trackDist(dir);

    await build({ formats: ["esm"], dts: false, sourcemap: false, watch: false, dir, clean: true });
    const unminified = await readFile(join(dist, "index.js"), "utf-8");

    await build({ formats: ["esm"], dts: false, sourcemap: false, watch: false, dir, clean: true, minify: true });
    const minified = await readFile(join(dist, "index.js"), "utf-8");

    expect(minified.length).toBeLessThan(unminified.length);
    expect(minified).toMatch(/export/);
    const unminifiedNewlines = (unminified.match(/\n/g) || []).length;
    const minifiedNewlines = (minified.match(/\n/g) || []).length;
    expect(minifiedNewlines).toBeLessThanOrEqual(unminifiedNewlines);
  });

  it("build with inject embeds injected code in output", async () => {
    const dir = fixture("simple-pkg");
    const dist = trackDist(dir);
    await build({
      formats: ["esm"],
      dts: false,
      sourcemap: false,
      watch: false,
      dir,
      clean: true,
      inject: ["src/inject-polyfill.ts"],
    });

    const output = await readFile(join(dist, "index.js"), "utf-8");
    expect(output).toContain("__INJECTED__");
    expect(output).toContain("globalThis");
    expect(output).toContain("greet");
  });

  it("build with publicDir copies assets to dist and preserves content", async () => {
    const dir = fixture("simple-pkg");
    const dist = trackDist(dir);
    await build({
      formats: ["esm"],
      dts: false,
      sourcemap: false,
      watch: false,
      dir,
      clean: true,
      publicDir: "public",
    });

    const readmePath = join(dist, "readme.txt");
    expect(await fileExists(readmePath)).toBe(true);
    const original = await readFile(join(dir, "public/readme.txt"), "utf-8");
    const copied = await readFile(readmePath, "utf-8");
    expect(copied).toBe(original);
    expect(await fileExists(join(dist, "index.js"))).toBe(true);
  });

  it("build clean removes prior output across formats", async () => {
    const dir = fixture("simple-pkg");
    const dist = trackDist(dir);

    await build({ formats: ["esm"], dts: false, sourcemap: false, watch: false, dir, clean: true });
    expect(await fileExists(join(dist, "index.js"))).toBe(true);
    expect(await fileExists(join(dist, "index.cjs"))).toBe(false);

    await build({ formats: ["cjs"], dts: false, sourcemap: false, watch: false, dir, clean: true });
    expect(await fileExists(join(dist, "index.cjs"))).toBe(true);
    expect(await fileExists(join(dist, "index.js"))).toBe(false);
  });

  it("build externalizes dependencies from package.json", async () => {
    const dir = fixture("simple-pkg");
    const dist = trackDist(dir);
    await build({ formats: ["esm"], dts: false, sourcemap: false, watch: false, dir, clean: true });

    const output = await readFile(join(dist, "index.js"), "utf-8");
    expect(output).not.toContain("ansi256");
    expect(output).not.toContain("\\x1B[");
  });
});
