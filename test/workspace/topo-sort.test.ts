import { describe, it, expect } from "vitest";
import { topoSort } from "../../src/workspace/index.js";

describe("workspace: topoSort edge cases", () => {
  it("handles single package", () => {
    const sorted = topoSort([
      { name: "solo", dir: "/tmp/solo", pkg: { name: "solo" }, localDeps: [] },
    ]);
    expect(sorted).toHaveLength(1);
    expect(sorted[0]!.name).toBe("solo");
  });

  it("handles independent packages (no deps between them)", () => {
    const sorted = topoSort([
      { name: "a", dir: "/tmp/a", pkg: { name: "a" }, localDeps: [] },
      { name: "b", dir: "/tmp/b", pkg: { name: "b" }, localDeps: [] },
      { name: "c", dir: "/tmp/c", pkg: { name: "c" }, localDeps: [] },
    ]);
    expect(sorted).toHaveLength(3);
  });

  it("handles cycles gracefully without throwing", () => {
    const sorted = topoSort([
      { name: "a", dir: "/tmp/a", pkg: { name: "a" }, localDeps: ["b"] },
      { name: "b", dir: "/tmp/b", pkg: { name: "b" }, localDeps: ["a"] },
    ]);
    expect(sorted).toHaveLength(2);
  });

  it("orders dependencies before dependents", () => {
    const sorted = topoSort([
      { name: "b", dir: "/tmp/b", pkg: { name: "b" }, localDeps: ["a"] },
      { name: "a", dir: "/tmp/a", pkg: { name: "a" }, localDeps: [] },
    ]);
    const aIdx = sorted.findIndex((p) => p.name === "a");
    const bIdx = sorted.findIndex((p) => p.name === "b");
    expect(aIdx).toBeLessThan(bIdx);
  });
});
