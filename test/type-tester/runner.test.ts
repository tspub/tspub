import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { runTypeTests } from "../../src/type-tester/index.js";

const tmpDir = join(import.meta.dirname, "..", ".tmp-type-tester-test");

beforeEach(async () => {
  await mkdir(join(tmpDir, "test-d"), { recursive: true });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("runTypeTests", { timeout: 30_000 }, () => {
  it("returns passed when no test files exist", async () => {
    await rm(join(tmpDir, "test-d"), { recursive: true, force: true });
    const result = await runTypeTests({ dir: tmpDir });
    expect(result.passed).toBe(true);
    expect(result.fileCount).toBe(0);
  });

  it("reports file count when test files exist", async () => {
    // Create a minimal tsconfig
    await writeFile(
      join(tmpDir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: { strict: true, noEmit: true, module: "esnext", moduleResolution: "bundler" },
      }),
    );

    // Create a test file that passes
    await writeFile(
      join(tmpDir, "test-d", "basic.test-d.ts"),
      "const x: string = 'hello';\n",
    );

    const result = await runTypeTests({ dir: tmpDir });
    expect(result.fileCount).toBe(1);
  });

  it("expectNever accepts never type", async () => {
    await writeFile(
      join(tmpDir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: { strict: true, noEmit: true, module: "esnext", moduleResolution: "bundler" },
      }),
    );

    await writeFile(
      join(tmpDir, "test-d", "never.test-d.ts"),
      `import { expectNever } from "../../src/type-tester/assertions.js";\ntype N = never;\ndeclare const n: N;\nexpectNever(n);\n`,
    );

    const result = await runTypeTests({ dir: tmpDir });
    expect(result.fileCount).toBe(1);
  });

  it("expectAny accepts any type", async () => {
    await writeFile(
      join(tmpDir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: { strict: true, noEmit: true, module: "esnext", moduleResolution: "bundler" },
      }),
    );

    await writeFile(
      join(tmpDir, "test-d", "any.test-d.ts"),
      `import { expectAny } from "../../src/type-tester/assertions.js";\ndeclare const a: any;\nexpectAny(a);\n`,
    );

    const result = await runTypeTests({ dir: tmpDir });
    expect(result.fileCount).toBe(1);
  });
});
