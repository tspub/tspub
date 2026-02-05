import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { binExecutableRule } from "../../../src/checker/rules/files/bin-executable.js";
import { mkdirSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { join } from "node:path";

const tmpDir = join(__dirname, ".tmp-bin-exec");

const baseCtx = { compilerOptions: null, hasBuildOutput: true, distFiles: [], allJsFiles: [], hasUnresolvedExtends: false };

beforeEach(() => {
  mkdirSync(join(tmpDir, "dist"), { recursive: true });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("files/bin-executable", () => {
  it("warns when bin file is not executable", () => {
    const binPath = join(tmpDir, "dist/cli.js");
    writeFileSync(binPath, "#!/usr/bin/env node\nconsole.log('hi');");
    chmodSync(binPath, 0o644);
    const results = binExecutableRule.check({
      ...baseCtx,
      dir: tmpDir,
      pkg: { bin: { mycli: "./dist/cli.js" } },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe("warning");
    expect(results[0]!.message).toContain("not executable");
  });

  it("passes when bin file is executable", () => {
    const binPath = join(tmpDir, "dist/cli.js");
    writeFileSync(binPath, "#!/usr/bin/env node\nconsole.log('hi');");
    chmodSync(binPath, 0o755);
    const results = binExecutableRule.check({
      ...baseCtx,
      dir: tmpDir,
      pkg: { bin: { mycli: "./dist/cli.js" } },
    });
    expect(results).toHaveLength(0);
  });

  it("handles string bin field", () => {
    const binPath = join(tmpDir, "dist/cli.js");
    writeFileSync(binPath, "#!/usr/bin/env node");
    chmodSync(binPath, 0o644);
    const results = binExecutableRule.check({
      ...baseCtx,
      dir: tmpDir,
      pkg: { name: "my-tool", bin: "./dist/cli.js" },
    });
    expect(results).toHaveLength(1);
  });

  it("skips when no build output", () => {
    const results = binExecutableRule.check({
      ...baseCtx,
      hasBuildOutput: false,
      dir: tmpDir,
      pkg: { bin: { mycli: "./dist/cli.js" } },
    });
    expect(results).toHaveLength(0);
  });

  it("skips when no bin field", () => {
    const results = binExecutableRule.check({
      ...baseCtx,
      dir: tmpDir,
      pkg: {},
    });
    expect(results).toHaveLength(0);
  });
});
