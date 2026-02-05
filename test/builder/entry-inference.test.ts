import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { inferEntryFromPackageJson } from "../../src/builder/entry-inference.js";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";

const tmpDir = join(import.meta.dirname, ".tmp-entry-test");

beforeEach(async () => {
  await mkdir(join(tmpDir, "src"), { recursive: true });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("inferEntryFromPackageJson", () => {
  it("infers from exports field", async () => {
    await writeFile(join(tmpDir, "src/index.ts"), "export {};\n");
    const entries = await inferEntryFromPackageJson(
      {
        exports: {
          ".": { import: { default: "./dist/index.js" } },
        },
      },
      tmpDir,
    );
    expect(entries).toEqual(["src/index.ts"]);
  });

  it("infers from bin field", async () => {
    await writeFile(join(tmpDir, "src/cli.ts"), "#!/usr/bin/env node\n");
    const entries = await inferEntryFromPackageJson(
      { bin: { mycli: "./dist/cli.js" } },
      tmpDir,
    );
    expect(entries).toEqual(["src/cli.ts"]);
  });

  it("infers from main field", async () => {
    await writeFile(join(tmpDir, "src/index.ts"), "export {};\n");
    const entries = await inferEntryFromPackageJson(
      { main: "./dist/index.js" },
      tmpDir,
    );
    expect(entries).toEqual(["src/index.ts"]);
  });

  it("returns null when no src files exist", async () => {
    const entries = await inferEntryFromPackageJson(
      { exports: { ".": { import: { default: "./dist/missing.js" } } } },
      tmpDir,
    );
    expect(entries).toBeNull();
  });
});
