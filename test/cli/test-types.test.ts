import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { runTypeTests } from "../../src/type-tester/index.js";

const tmpDir = join(import.meta.dirname, "..", ".tmp-test-types-cli");

beforeEach(async () => {
  await mkdir(join(tmpDir, "test-d"), { recursive: true });
  await mkdir(join(tmpDir, "node_modules", ".bin"), { recursive: true });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("test-types CLI integration", { timeout: 30_000 }, () => {
  it("passes with valid type tests", async () => {
    await writeFile(
      join(tmpDir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          strict: true,
          noEmit: true,
          module: "esnext",
          moduleResolution: "bundler",
        },
      }),
    );
    await writeFile(
      join(tmpDir, "test-d", "pass.test-d.ts"),
      "const x: string = 'hello';\n",
    );

    const result = await runTypeTests({ dir: tmpDir });
    expect(result.passed).toBe(true);
    expect(result.fileCount).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it("reports errors for invalid type tests", async () => {
    await writeFile(
      join(tmpDir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          strict: true,
          noEmit: true,
          module: "esnext",
          moduleResolution: "bundler",
        },
      }),
    );
    await writeFile(
      join(tmpDir, "test-d", "fail.test-d.ts"),
      "const x: number = 'hello';\n",
    );

    const result = await runTypeTests({ dir: tmpDir });
    expect(result.passed).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]!.message).toContain("not assignable");
  });

  it("supports custom directory", async () => {
    await mkdir(join(tmpDir, "custom-types"), { recursive: true });
    await writeFile(
      join(tmpDir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: { strict: true, noEmit: true, module: "esnext", moduleResolution: "bundler" },
      }),
    );
    await writeFile(
      join(tmpDir, "custom-types", "check.test-d.ts"),
      "const x: string = 'ok';\n",
    );

    const result = await runTypeTests({ dir: tmpDir, directory: "custom-types" });
    expect(result.passed).toBe(true);
    expect(result.fileCount).toBe(1);
  });
});
