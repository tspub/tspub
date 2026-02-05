import { describe, it, expect } from "vitest";
import {
  discoverWorkspaces,
  topoSort,
  filterPackages,
} from "../../src/workspace/index.js";
import { fixture } from "./_helpers.js";

describe("E2E: Workspace Features", () => {
  it("discoverWorkspaces finds all packages with correct metadata", async () => {
    const packages = await discoverWorkspaces(fixture("monorepo"));
    expect(packages).toHaveLength(2);

    const names = packages.map((p) => p.name);
    expect(names).toContain("@monorepo/core");
    expect(names).toContain("@monorepo/utils");

    for (const p of packages) {
      expect(typeof p.dir).toBe("string");
      expect(p.dir.length).toBeGreaterThan(0);
      expect(p.pkg).toBeDefined();
      expect(p.pkg.name).toBe(p.name);
    }

    const utils = packages.find((p) => p.name === "@monorepo/utils")!;
    expect(utils.localDeps).toContain("@monorepo/core");

    const core = packages.find((p) => p.name === "@monorepo/core")!;
    expect(core.localDeps).toHaveLength(0);
  });

  it("topoSort orders core before utils due to dependency", async () => {
    const packages = await discoverWorkspaces(fixture("monorepo"));
    const sorted = topoSort(packages);

    expect(sorted).toHaveLength(2);
    const coreIdx = sorted.findIndex((p) => p.name === "@monorepo/core");
    const utilsIdx = sorted.findIndex((p) => p.name === "@monorepo/utils");
    expect(coreIdx).not.toBe(-1);
    expect(utilsIdx).not.toBe(-1);
    expect(coreIdx).toBeLessThan(utilsIdx);
  });

  it("filterPackages with exact name returns single package", async () => {
    const packages = await discoverWorkspaces(fixture("monorepo"));
    const filtered = filterPackages(packages, "@monorepo/core");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("@monorepo/core");
  });

  it("filterPackages with glob pattern matches multiple packages", async () => {
    const packages = await discoverWorkspaces(fixture("monorepo"));
    const filtered = filterPackages(packages, "@monorepo/*");
    expect(filtered).toHaveLength(2);
    const names = filtered.map((p) => p.name).sort();
    expect(names).toEqual(["@monorepo/core", "@monorepo/utils"]);
  });

  it("filterPackages with non-matching pattern returns empty", async () => {
    const packages = await discoverWorkspaces(fixture("monorepo"));
    const filtered = filterPackages(packages, "@other/*");
    expect(filtered).toHaveLength(0);
  });
});
