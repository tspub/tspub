import { describe, it, expect, vi } from "vitest";
import { binShebangRule } from "../../../src/checker/rules/files/bin-shebang.js";

vi.mock("../../../src/checker/rules/utils/format-detection.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../src/checker/rules/utils/format-detection.js")>();
  return {
    ...actual,
    readFileSafe: (path: string) => {
      if (path.includes("with-shebang")) return "#!/usr/bin/env node\nconsole.log('hi')";
      if (path.includes("no-shebang")) return "console.log('hi')";
      return null;
    },
  };
});

const baseCtx = { dir: "/tmp", compilerOptions: null, hasBuildOutput: true, distFiles: [], allJsFiles: [], hasUnresolvedExtends: false };

describe("files/bin-shebang", () => {
  it("warns when bin file has no shebang", () => {
    const results = binShebangRule.check({
      ...baseCtx,
      pkg: { bin: { tspub: "./no-shebang.js" } },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe("warning");
    expect(results[0]!.message).toContain("shebang");
  });

  it("passes when bin file has shebang", () => {
    const results = binShebangRule.check({
      ...baseCtx,
      pkg: { bin: { tspub: "./with-shebang.js" } },
    });
    expect(results).toHaveLength(0);
  });

  it("passes when no bin field", () => {
    const results = binShebangRule.check({ ...baseCtx, pkg: {} });
    expect(results).toHaveLength(0);
  });

  it("skips when no build output", () => {
    const results = binShebangRule.check({
      ...baseCtx,
      hasBuildOutput: false,
      pkg: { bin: { tspub: "./no-shebang.js" } },
    });
    expect(results).toHaveLength(0);
  });

  it("handles string bin field", () => {
    const results = binShebangRule.check({
      ...baseCtx,
      pkg: { name: "tspub", bin: "./no-shebang.js" },
    });
    expect(results).toHaveLength(1);
  });
});
