import { describe, it, expect } from "vitest";
import { computeDependentBumps, type PackageInfo } from "../../src/changeset/dependent-bumping.js";

describe("changeset: computeDependentBumps edge cases", () => {
  it("handles empty packages list", () => {
    const result = computeDependentBumps([], new Map(), "all");
    expect(result.size).toBe(0);
  });

  it("handles no initial bumps", () => {
    const packages: PackageInfo[] = [
      { name: "a", dependencies: {}, devDependencies: {} },
    ];
    const result = computeDependentBumps(packages, new Map(), "all");
    expect(result.size).toBe(0);
  });

  it("does not bump packages with no dependency on bumped package", () => {
    const packages: PackageInfo[] = [
      { name: "a", dependencies: {}, devDependencies: {} },
      { name: "b", dependencies: {}, devDependencies: {} },
    ];
    const result = computeDependentBumps(packages, new Map([["a", "major"]]), "all");
    expect(result.get("a")).toBe("major");
    expect(result.has("b")).toBe(false);
  });

  it("handles devDependency relationships", () => {
    const packages: PackageInfo[] = [
      { name: "core", dependencies: {}, devDependencies: {} },
      { name: "tests", dependencies: {}, devDependencies: { core: "^1.0.0" } },
    ];
    const result = computeDependentBumps(packages, new Map([["core", "minor"]]), "all");
    expect(result.get("tests")).toBe("patch");
  });

  it("handles circular dependencies without infinite loop", () => {
    const packages: PackageInfo[] = [
      { name: "a", dependencies: { b: "^1.0.0" }, devDependencies: {} },
      { name: "b", dependencies: { a: "^1.0.0" }, devDependencies: {} },
    ];
    const result = computeDependentBumps(packages, new Map([["a", "patch"]]), "all");
    expect(result.get("a")).toBe("patch");
    expect(result.get("b")).toBe("patch");
  });

  it("deep transitive chain propagates correctly", () => {
    const packages: PackageInfo[] = [
      { name: "a", dependencies: {}, devDependencies: {} },
      { name: "b", dependencies: { a: "^1.0.0" }, devDependencies: {} },
      { name: "c", dependencies: { b: "^1.0.0" }, devDependencies: {} },
      { name: "d", dependencies: { c: "^1.0.0" }, devDependencies: {} },
    ];
    const result = computeDependentBumps(packages, new Map([["a", "patch"]]), "all");
    expect(result.get("a")).toBe("patch");
    expect(result.get("b")).toBe("patch");
    expect(result.get("c")).toBe("patch");
    expect(result.get("d")).toBe("patch");
  });

  it("does not downgrade existing bumps", () => {
    const packages: PackageInfo[] = [
      { name: "core", dependencies: {}, devDependencies: {} },
      { name: "utils", dependencies: { core: "^1.0.0" }, devDependencies: {} },
      { name: "app", dependencies: { utils: "^1.0.0", core: "^1.0.0" }, devDependencies: {} },
    ];
    const initial = new Map<string, "major" | "minor" | "patch">([["core", "major"], ["utils", "minor"]]);
    const result = computeDependentBumps(packages, initial, "major");
    expect(result.get("utils")).toBe("minor");
  });

  it("major mode does not propagate minor bumps", () => {
    const packages: PackageInfo[] = [
      { name: "core", dependencies: {}, devDependencies: {} },
      { name: "utils", dependencies: { core: "^1.0.0" }, devDependencies: {} },
    ];
    const result = computeDependentBumps(packages, new Map([["core", "minor"]]), "major");
    expect(result.has("utils")).toBe(false);
  });

  it("none mode only returns initial bumps", () => {
    const packages: PackageInfo[] = [
      { name: "core", dependencies: {}, devDependencies: {} },
      { name: "utils", dependencies: { core: "^1.0.0" }, devDependencies: {} },
    ];
    const result = computeDependentBumps(packages, new Map([["core", "major"]]), "none");
    expect(result.size).toBe(1);
    expect(result.has("utils")).toBe(false);
  });

  it("propagates to dependents in 'all' mode", () => {
    const packages: PackageInfo[] = [
      { name: "core", dependencies: {}, devDependencies: {} },
      { name: "utils", dependencies: { core: "^1.0.0" }, devDependencies: {} },
      { name: "app", dependencies: { utils: "^1.0.0" }, devDependencies: {} },
    ];
    const initial = new Map<string, "major" | "minor" | "patch">([["core", "patch"]]);
    const result = computeDependentBumps(packages, initial, "all");

    expect(result.get("core")).toBe("patch");
    expect(result.get("utils")).toBe("patch");
    expect(result.get("app")).toBe("patch");
  });

  it("with 'none' mode does not propagate", () => {
    const packages: PackageInfo[] = [
      { name: "core", dependencies: {}, devDependencies: {} },
      { name: "utils", dependencies: { core: "^1.0.0" }, devDependencies: {} },
    ];
    const initial = new Map<string, "major" | "minor" | "patch">([["core", "minor"]]);
    const result = computeDependentBumps(packages, initial, "none");

    expect(result.get("core")).toBe("minor");
    expect(result.has("utils")).toBe(false);
  });

  it("with 'major' mode only propagates major bumps", () => {
    const packages: PackageInfo[] = [
      { name: "core", dependencies: {}, devDependencies: {} },
      { name: "utils", dependencies: { core: "^1.0.0" }, devDependencies: {} },
    ];

    const minorResult = computeDependentBumps(
      packages,
      new Map([["core", "minor"]]),
      "major",
    );
    expect(minorResult.has("utils")).toBe(false);

    const majorResult = computeDependentBumps(
      packages,
      new Map([["core", "major"]]),
      "major",
    );
    expect(majorResult.get("utils")).toBeDefined();
  });
});
