import { describe, it, expect } from "vitest";
import { filterPackages } from "../../src/workspace/index.js";

describe("workspace: filterPackages patterns", () => {
  const packages = [
    { name: "@scope/core", dir: "", pkg: { name: "@scope/core" }, localDeps: [] },
    { name: "@scope/utils", dir: "", pkg: { name: "@scope/utils" }, localDeps: [] },
    { name: "@other/lib", dir: "", pkg: { name: "@other/lib" }, localDeps: [] },
    { name: "standalone", dir: "", pkg: { name: "standalone" }, localDeps: [] },
  ];

  it("exact match", () => {
    expect(filterPackages(packages, "@scope/core")).toHaveLength(1);
  });

  it("scope glob @scope/*", () => {
    const filtered = filterPackages(packages, "@scope/*");
    expect(filtered).toHaveLength(2);
  });

  it("all glob *", () => {
    expect(filterPackages(packages, "*").length).toBe(4);
  });

  it("no match returns empty", () => {
    expect(filterPackages(packages, "@missing/*")).toHaveLength(0);
  });

  it("? single character wildcard", () => {
    const filtered = filterPackages(packages, "@scope/cor?");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("@scope/core");
  });

  it("partial wildcard at end", () => {
    const filtered = filterPackages(packages, "stand*");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("standalone");
  });
});
