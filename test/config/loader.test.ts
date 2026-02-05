import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../../src/config/loader.js";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";

const tmpDir = join(import.meta.dirname, ".tmp-config-test");

beforeEach(async () => {
  await mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("loadConfig", () => {
  it("loads from tspub.config.js (ESM default export)", async () => {
    await writeFile(
      join(tmpDir, "tspub.config.js"),
      `export default { build: { formats: ["cjs"] } };\n`,
    );
    await writeFile(
      join(tmpDir, "package.json"),
      JSON.stringify({ name: "test" }),
    );
    const config = await loadConfig(tmpDir);
    expect(config).not.toBeNull();
    expect(config!.build?.formats).toEqual(["cjs"]);
  });

  it("loads from package.json tspub key", async () => {
    await writeFile(
      join(tmpDir, "package.json"),
      JSON.stringify({
        name: "test",
        tspub: { check: { severityOverrides: { "exports/file-exists": "off" } } },
      }),
    );
    const config = await loadConfig(tmpDir);
    expect(config).not.toBeNull();
    expect(config!.check?.severityOverrides?.["exports/file-exists"]).toBe("off");
  });

  it("config file takes precedence over package.json", async () => {
    await writeFile(
      join(tmpDir, "tspub.config.js"),
      `export default { build: { formats: ["cjs"] } };\n`,
    );
    await writeFile(
      join(tmpDir, "package.json"),
      JSON.stringify({
        name: "test",
        tspub: { build: { formats: ["esm"] } },
      }),
    );
    const config = await loadConfig(tmpDir);
    expect(config).not.toBeNull();
    // Config file should win — "cjs" from file, not "esm" from package.json
    expect(config!.build?.formats).toEqual(["cjs"]);
  });

  it("returns null when no config found", async () => {
    await writeFile(
      join(tmpDir, "package.json"),
      JSON.stringify({ name: "test" }),
    );
    const config = await loadConfig(tmpDir);
    expect(config).toBeNull();
  });
});
