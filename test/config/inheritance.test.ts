import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfigWithInheritance } from "../../src/config/loader.js";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";

const tmpDir = join(import.meta.dirname, ".tmp-inheritance-test");

beforeEach(async () => {
  await mkdir(join(tmpDir, "packages", "a"), { recursive: true });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("loadConfigWithInheritance", () => {
  it("merges root and package configs", async () => {
    // Root config
    await writeFile(
      join(tmpDir, "tspub.config.js"),
      `export default { build: { formats: ["esm"] }, check: { severityOverrides: { "exports/file-exists": "off" } } };\n`,
    );
    await writeFile(join(tmpDir, "package.json"), JSON.stringify({ name: "root" }));

    // Package config overrides build format
    await writeFile(
      join(tmpDir, "packages", "a", "tspub.config.js"),
      `export default { build: { formats: ["cjs"] } };\n`,
    );
    await writeFile(
      join(tmpDir, "packages", "a", "package.json"),
      JSON.stringify({ name: "@test/a" }),
    );

    const config = await loadConfigWithInheritance(
      join(tmpDir, "packages", "a"),
      tmpDir,
    );

    // Package wins for build.formats
    expect(config?.build?.formats).toEqual(["cjs"]);
    // Root's severity override is inherited
    expect(config?.check?.severityOverrides?.["exports/file-exists"]).toBe("off");
  });

  it("returns root config when package has none", async () => {
    // Use package.json tspub key instead of config file to avoid import issues
    await writeFile(
      join(tmpDir, "package.json"),
      JSON.stringify({ name: "root", tspub: { build: { clean: true } } }),
    );
    await writeFile(
      join(tmpDir, "packages", "a", "package.json"),
      JSON.stringify({ name: "@test/a" }),
    );

    const config = await loadConfigWithInheritance(
      join(tmpDir, "packages", "a"),
      tmpDir,
    );

    expect(config?.build?.clean).toBe(true);
  });

  it("returns package config when root has none", async () => {
    await writeFile(join(tmpDir, "package.json"), JSON.stringify({ name: "root" }));
    await writeFile(
      join(tmpDir, "packages", "a", "package.json"),
      JSON.stringify({ name: "@test/a", tspub: { publish: { access: "restricted" } } }),
    );

    const config = await loadConfigWithInheritance(
      join(tmpDir, "packages", "a"),
      tmpDir,
    );

    expect(config?.publish?.access).toBe("restricted");
  });

  it("returns null when neither has config", async () => {
    await writeFile(join(tmpDir, "package.json"), JSON.stringify({ name: "root" }));
    await writeFile(
      join(tmpDir, "packages", "a", "package.json"),
      JSON.stringify({ name: "@test/a" }),
    );

    const config = await loadConfigWithInheritance(
      join(tmpDir, "packages", "a"),
      tmpDir,
    );

    expect(config).toBeNull();
  });

  it("concatenates plugins from root and package", async () => {
    await writeFile(
      join(tmpDir, "package.json"),
      JSON.stringify({ name: "root", tspub: { check: { plugins: ["root-plugin"] } } }),
    );
    await writeFile(
      join(tmpDir, "packages", "a", "package.json"),
      JSON.stringify({ name: "@test/a", tspub: { check: { plugins: ["pkg-plugin"] } } }),
    );

    const config = await loadConfigWithInheritance(
      join(tmpDir, "packages", "a"),
      tmpDir,
    );

    expect(config?.check?.plugins).toEqual(["root-plugin", "pkg-plugin"]);
  });
});
