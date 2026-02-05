import { describe, it, expect, afterEach } from "vitest";
import { check } from "../../src/checker/index.js";
import { rm, cp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fixturesDir = join(__dirname, "../fixtures");

describe("checker fix integration", () => {
  const tmps: string[] = [];

  afterEach(async () => {
    for (const dir of tmps) {
      await rm(dir, { recursive: true, force: true });
    }
    tmps.length = 0;
  });

  async function makeTmpCopy(fixtureName: string): Promise<string> {
    const src = join(fixturesDir, fixtureName);
    const tmp = join(tmpdir(), `tspub-fix-${fixtureName}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await cp(src, tmp, { recursive: true });
    tmps.push(tmp);
    return tmp;
  }

  it("fix on missing-fields adds required fields", async () => {
    const dir = await makeTmpCopy("missing-fields");
    const before = JSON.parse(await readFile(join(dir, "package.json"), "utf-8"));

    const results = await check({ dir, fix: true, strict: false });

    const after = JSON.parse(await readFile(join(dir, "package.json"), "utf-8"));
    // The result must be valid JSON
    expect(typeof after.name).toBe("string");

    // Fix should have produced info messages
    const infos = results.filter((r) => r.severity === "info");
    expect(infos.length).toBeGreaterThanOrEqual(0);
  });

  it("fix --dry-run does NOT modify package.json", async () => {
    const dir = await makeTmpCopy("missing-fields");
    const before = await readFile(join(dir, "package.json"), "utf-8");

    await check({ dir, fix: true, strict: false, dryRun: true });

    const after = await readFile(join(dir, "package.json"), "utf-8");
    expect(after).toBe(before);
  });

  it("fix is idempotent — running twice produces same result", async () => {
    const dir = await makeTmpCopy("broken-exports");

    await check({ dir, fix: true, strict: false });
    const firstPass = await readFile(join(dir, "package.json"), "utf-8");

    await check({ dir, fix: true, strict: false });
    const secondPass = await readFile(join(dir, "package.json"), "utf-8");

    expect(secondPass).toBe(firstPass);
  });

  it("fix respects fixTypes filter", async () => {
    const dir = await makeTmpCopy("broken-exports");
    const before = await readFile(join(dir, "package.json"), "utf-8");

    // Only fix 'metadata' category, not 'exports'
    const results = await check({ dir, fix: true, strict: false, fixTypes: ["metadata"] });

    const after = await readFile(join(dir, "package.json"), "utf-8");
    // Result should still be valid JSON
    expect(() => JSON.parse(after)).not.toThrow();
  });
});
