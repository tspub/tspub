import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { doctor } from "../../src/doctor/index.js";
import type { DoctorOptions } from "../../src/doctor/index.js";

describe("doctor: full integration", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(
      "/tmp",
      `tspub-test-doctor-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("accepts string (dir) as argument", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({ name: "test-pkg", version: "1.0.0" }),
    );

    const results = await doctor(tempDir);
    expect(Array.isArray(results)).toBe(true);
  });

  it("accepts DoctorOptions object as argument", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({ name: "test-pkg", version: "1.0.0" }),
    );

    const options: DoctorOptions = {
      dir: tempDir,
      fix: false,
    };

    const results = await doctor(options);
    expect(Array.isArray(results)).toBe(true);
  });

  it("returns results with ruleId", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({ name: "test-pkg", version: "1.0.0" }),
    );

    const results = await doctor(tempDir);
    expect(results.length).toBeGreaterThan(0);

    for (const result of results) {
      if (result.category !== "fix") {
        expect(result.ruleId).toBeDefined();
        expect(typeof result.ruleId).toBe("string");
      }
    }
  });

  it("returns results with valid severities", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({ name: "test-pkg", version: "1.0.0" }),
    );

    const results = await doctor(tempDir);
    expect(results.length).toBeGreaterThan(0);

    for (const result of results) {
      expect(["error", "warning", "info"]).toContain(result.severity);
    }
  });

  it("returns results with categories", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({ name: "test-pkg", version: "1.0.0" }),
    );

    const results = await doctor(tempDir);
    expect(results.length).toBeGreaterThan(0);

    for (const result of results) {
      expect(typeof result.category).toBe("string");
      expect(result.category.length).toBeGreaterThan(0);
    }
  });

  it("severity overrides work", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({ name: "test-pkg", version: "1.0.0" }),
    );

    // First run without overrides
    const resultsWithout = await doctor(tempDir);
    const initialCount = resultsWithout.length;

    // Run with severity override to turn off a common rule
    const resultsWithOverride = await doctor({
      dir: tempDir,
      severityOverrides: {
        "environment/npm-version": "off",
      },
    });

    // Should have fewer results when a rule is turned off
    expect(resultsWithOverride.length).toBeLessThan(initialCount);
  });

  it("severity overrides can change severity level", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({ name: "test-pkg", version: "1.0.0" }),
    );

    const results = await doctor({
      dir: tempDir,
      severityOverrides: {
        "environment/npm-version": "error",
      },
    });

    const npmVersionResult = results.find(
      (r) => r.ruleId === "environment/npm-version",
    );
    if (npmVersionResult) {
      expect(npmVersionResult.severity).toBe("error");
    }
  });

  it("includes fixable information in results", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({ name: "test-pkg", version: "1.0.0" }),
    );

    const results = await doctor(tempDir);

    // Find a result with fixable information
    const fixableResult = results.find((r) => r.fixable !== undefined);
    if (fixableResult) {
      expect([false, "safe", "unsafe"]).toContain(fixableResult.fixable);
    }
  });

  it("produces results for package with typescript", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({
        name: "test-pkg",
        version: "1.0.0",
        devDependencies: {
          typescript: "^5.0.0",
        },
      }),
    );
    await writeFile(
      join(tempDir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          strict: true,
          declaration: true,
        },
      }),
    );

    const results = await doctor(tempDir);
    expect(results.length).toBeGreaterThan(0);

    const categories = new Set(results.map((r) => r.category));
    expect(categories.has("environment") || categories.has("typescript")).toBe(
      true,
    );
  });

  it("detects missing tsconfig", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({
        name: "test-pkg",
        version: "1.0.0",
        devDependencies: {
          typescript: "^5.0.0",
        },
      }),
    );

    const results = await doctor(tempDir);
    const tsconfigError = results.find(
      (r) => r.ruleId === "typescript/tsconfig-exists",
    );
    expect(tsconfigError).toBeDefined();
    expect(tsconfigError?.severity).toBe("error");
  });

  it("fix mode returns fix results", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({
        name: "test-pkg",
        version: "1.0.0",
        dependencies: {
          react: "^18.0.0",
        },
        devDependencies: {
          react: "^18.0.0",
        },
      }),
    );

    const results = await doctor({
      dir: tempDir,
      fix: true,
    });

    const fixResults = results.filter((r) => r.category === "fix");
    expect(fixResults.length).toBeGreaterThan(0);
  });

  it("dry-run mode shows what would be fixed", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({
        name: "test-pkg",
        version: "1.0.0",
        dependencies: {
          react: "^18.0.0",
        },
        devDependencies: {
          react: "^18.0.0",
        },
      }),
    );

    const results = await doctor({
      dir: tempDir,
      fix: true,
      dryRun: true,
    });

    const fixResults = results.filter((r) => r.category === "fix");
    if (fixResults.length > 0) {
      expect(fixResults[0]?.message).toMatch(/Would fix/);
    }
  });

  it("handles package without issues gracefully", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({
        name: "perfect-pkg",
        version: "1.0.0",
        dependencies: {},
        devDependencies: {
          typescript: "^5.0.0",
        },
      }),
    );
    await writeFile(
      join(tempDir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          strict: true,
          declaration: true,
          module: "Node16",
          moduleResolution: "Node16",
        },
      }),
    );
    await mkdir(join(tempDir, "dist"));

    const results = await doctor(tempDir);
    // Should still have some info messages (like npm version)
    expect(Array.isArray(results)).toBe(true);
  });
});
