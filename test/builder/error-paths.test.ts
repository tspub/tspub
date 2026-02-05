import { describe, it, expect, afterEach } from "vitest";
import { build } from "../../src/builder/index.js";
import { rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

function tmpDir() {
  return join(tmpdir(), `tspub-err-${Date.now()}-${Math.random().toString(36).slice(2)}`);
}

describe("build error paths", () => {
  const cleanups: string[] = [];

  afterEach(async () => {
    for (const dir of cleanups) {
      await rm(dir, { recursive: true, force: true });
    }
    cleanups.length = 0;
  });

  function track(dir: string) {
    cleanups.push(dir);
    return dir;
  }

  it("fails gracefully when entry file does not exist", async () => {
    const dir = track(tmpDir());
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "package.json"), JSON.stringify({ name: "bad-entry", version: "1.0.0", type: "module" }));
    await writeFile(join(dir, "tsconfig.json"), JSON.stringify({
      compilerOptions: { target: "ES2022", module: "ESNext", moduleResolution: "bundler", outDir: "dist" },
      include: ["src"],
    }));
    // No src/index.ts exists

    await expect(
      build({ formats: ["esm"], dts: false, sourcemap: false, watch: false, dir, clean: true }),
    ).rejects.toThrow();
  });

  it("builds even when package.json has no exports field", async () => {
    const dir = track(tmpDir());
    await mkdir(join(dir, "src"), { recursive: true });
    await writeFile(join(dir, "package.json"), JSON.stringify({ name: "no-exports", version: "1.0.0" }));
    await writeFile(join(dir, "tsconfig.json"), JSON.stringify({
      compilerOptions: { target: "ES2022", module: "ESNext", moduleResolution: "bundler", outDir: "dist" },
      include: ["src"],
    }));
    await writeFile(join(dir, "src/index.ts"), "export const x = 1;\n");

    // Should succeed — entry inferred from default src/index.ts
    await build({ formats: ["esm"], dts: false, sourcemap: false, watch: false, dir, clean: true });
    const output = await readFile(join(dir, "dist/index.js"), "utf-8");
    expect(output).toContain("x");
  });

  it("builds when tsconfig.json is missing", async () => {
    const dir = track(tmpDir());
    await mkdir(join(dir, "src"), { recursive: true });
    await writeFile(join(dir, "package.json"), JSON.stringify({
      name: "no-tsconfig", version: "1.0.0", type: "module",
      exports: { ".": "./dist/index.js" },
    }));
    // No tsconfig.json
    await writeFile(join(dir, "src/index.ts"), "export const y = 2;\n");

    // esbuild can build without tsconfig — should not crash
    await build({ formats: ["esm"], dts: false, sourcemap: false, watch: false, dir, clean: true });
    const output = await readFile(join(dir, "dist/index.js"), "utf-8");
    expect(output).toContain("y");
  });

  it("clean: true works even when dist does not exist yet", async () => {
    const dir = track(tmpDir());
    await mkdir(join(dir, "src"), { recursive: true });
    await writeFile(join(dir, "package.json"), JSON.stringify({ name: "clean-no-dist", version: "1.0.0", type: "module" }));
    await writeFile(join(dir, "tsconfig.json"), JSON.stringify({
      compilerOptions: { target: "ES2022", module: "ESNext", moduleResolution: "bundler", outDir: "dist" },
      include: ["src"],
    }));
    await writeFile(join(dir, "src/index.ts"), "export const z = 3;\n");

    // Should not throw even though dist/ doesn't exist
    await build({ formats: ["esm"], dts: false, sourcemap: false, watch: false, dir, clean: true });
    const output = await readFile(join(dir, "dist/index.js"), "utf-8");
    expect(output).toContain("z");
  });

  it("handles empty source file", async () => {
    const dir = track(tmpDir());
    await mkdir(join(dir, "src"), { recursive: true });
    await writeFile(join(dir, "package.json"), JSON.stringify({ name: "empty-src", version: "1.0.0", type: "module" }));
    await writeFile(join(dir, "tsconfig.json"), JSON.stringify({
      compilerOptions: { target: "ES2022", module: "ESNext", moduleResolution: "bundler", outDir: "dist" },
      include: ["src"],
    }));
    await writeFile(join(dir, "src/index.ts"), "");

    // Empty file should build without error
    await build({ formats: ["esm"], dts: false, sourcemap: false, watch: false, dir, clean: true });
  });

  it("custom outDir creates the directory", async () => {
    const dir = track(tmpDir());
    await mkdir(join(dir, "src"), { recursive: true });
    await writeFile(join(dir, "package.json"), JSON.stringify({ name: "custom-out", version: "1.0.0", type: "module" }));
    await writeFile(join(dir, "tsconfig.json"), JSON.stringify({
      compilerOptions: { target: "ES2022", module: "ESNext", moduleResolution: "bundler", outDir: "dist" },
      include: ["src"],
    }));
    await writeFile(join(dir, "src/index.ts"), "export const w = 4;\n");

    await build({ formats: ["esm"], dts: false, sourcemap: false, watch: false, dir, clean: true, outDir: "out/nested" });
    const output = await readFile(join(dir, "out/nested/index.js"), "utf-8");
    expect(output).toContain("w");
  });

  it("multiple formats produce correct extensions", async () => {
    const dir = track(tmpDir());
    await mkdir(join(dir, "src"), { recursive: true });
    await writeFile(join(dir, "package.json"), JSON.stringify({
      name: "multi-fmt", version: "1.0.0", type: "module",
      exports: { ".": { import: "./dist/index.js", require: "./dist/index.cjs" } },
    }));
    await writeFile(join(dir, "tsconfig.json"), JSON.stringify({
      compilerOptions: { target: "ES2022", module: "ESNext", moduleResolution: "bundler", outDir: "dist" },
      include: ["src"],
    }));
    await writeFile(join(dir, "src/index.ts"), "export function hello() { return 'hi'; }\nexport default hello;\n");

    await build({ formats: ["esm", "cjs", "iife"], dts: false, sourcemap: false, watch: false, dir, clean: true, globalName: "MultiFmt" });
    const esm = await readFile(join(dir, "dist/index.js"), "utf-8");
    const cjs = await readFile(join(dir, "dist/index.cjs"), "utf-8");
    const iife = await readFile(join(dir, "dist/index.global.js"), "utf-8");

    expect(esm).toMatch(/export/);
    expect(cjs).toMatch(/exports/);
    expect(iife).toContain("MultiFmt");
  });
});
