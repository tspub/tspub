import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { buildContext } from "../../src/checker/framework/context.js";
import { licenseRule } from "../../src/checker/rules/metadata/license.js";
import { licenseFileRule } from "../../src/checker/rules/metadata/license-file.js";
import { repositoryRule } from "../../src/checker/rules/metadata/repository.js";
import { enginesRule } from "../../src/checker/rules/metadata/engines.js";
import { sideEffectsRule } from "../../src/checker/rules/metadata/side-effects.js";
import { peerDepConflictRule } from "../../src/checker/rules/metadata/peer-dep-conflict.js";
import { deprecatedFieldsRule } from "../../src/checker/rules/metadata/deprecated-fields.js";
import type { PackageJson } from "../../src/shared/package-json.js";

const fixturesDir = join(import.meta.dirname, "..", "fixtures");

describe("metadata/license", () => {
  it("passes when license exists", async () => {
    const ctx = await buildContext({ license: "MIT" }, fixturesDir);
    const diags = await licenseRule.check(ctx);
    expect(diags).toHaveLength(0);
  });

  it("warns when license is missing", async () => {
    const ctx = await buildContext({}, fixturesDir);
    const diags = await licenseRule.check(ctx);
    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0]!.message).toContain('"license"');
  });

  it("fix sets license from LICENSE file", async () => {
    const testDir = join(tmpdir(), "tspub-test-lic-fix-" + Date.now());
    await mkdir(testDir, { recursive: true });
    await writeFile(join(testDir, "LICENSE"), "MIT License\n\nCopyright (c) 2024", "utf-8");
    const pkg: PackageJson = {};
    const result = await licenseRule.fix!({ pkg, dir: testDir, distFiles: [] });
    expect(result.pkgModified).toBe(true);
    expect(pkg.license).toBe("MIT");
    await rm(testDir, { recursive: true, force: true });
  });
});

describe("metadata/license-file", () => {
  it("passes when LICENSE file exists", async () => {
    const ctx = await buildContext({}, join(fixturesDir, "valid-esm"));
    const diags = await licenseFileRule.check(ctx);
    expect(diags).toHaveLength(0);
  });

  it("warns when no LICENSE file", async () => {
    let testDir = join(tmpdir(), "tspub-test-lic-" + Date.now());
    await mkdir(testDir, { recursive: true });
    const ctx = await buildContext({}, testDir);
    const diags = await licenseFileRule.check(ctx);
    expect(diags.some((d) => d.message.includes("No LICENSE file"))).toBe(true);
    await rm(testDir, { recursive: true, force: true });
  });
});

describe("metadata/repository", () => {
  it("passes when repository exists", async () => {
    const ctx = await buildContext(
      { repository: "https://github.com/foo/bar" },
      fixturesDir,
    );
    const diags = await repositoryRule.check(ctx);
    expect(diags).toHaveLength(0);
  });

  it("info when repository is missing", async () => {
    const ctx = await buildContext({}, fixturesDir);
    const diags = await repositoryRule.check(ctx);
    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0]!.severity).toBe("info");
    expect(diags[0]!.message).toContain('"repository"');
  });
});

describe("metadata/engines", () => {
  it("passes when engines exists", async () => {
    const ctx = await buildContext({ engines: { node: ">=18" } }, fixturesDir);
    const diags = await enginesRule.check(ctx);
    expect(diags).toHaveLength(0);
  });

  it("info when engines is missing", async () => {
    const ctx = await buildContext({}, fixturesDir);
    const diags = await enginesRule.check(ctx);
    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0]!.severity).toBe("info");
    expect(diags[0]!.message).toContain('"engines"');
  });

  it("fix sets engines", async () => {
    const pkg: PackageJson = {};
    const result = await enginesRule.fix!({ pkg, dir: fixturesDir, distFiles: [] });
    expect(result.pkgModified).toBe(true);
    expect(pkg.engines).toEqual({ node: ">=18.0.0" });
  });
});

describe("metadata/side-effects", () => {
  it("passes when sideEffects is set", async () => {
    const ctx = await buildContext({ sideEffects: false }, fixturesDir);
    const diags = await sideEffectsRule.check(ctx);
    expect(diags).toHaveLength(0);
  });

  it("info when sideEffects is missing", async () => {
    const ctx = await buildContext({}, fixturesDir);
    const diags = await sideEffectsRule.check(ctx);
    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0]!.severity).toBe("info");
    expect(diags[0]!.message).toContain("sideEffects");
  });

  it("has no fix (not fixable)", () => {
    expect(sideEffectsRule.fix).toBeUndefined();
    expect(sideEffectsRule.meta.fixable).toBe(false);
  });
});

describe("metadata/peer-dep-conflict", () => {
  it("passes when no conflict", async () => {
    const pkg: PackageJson = {
      peerDependencies: { react: "^18" },
      dependencies: { lodash: "^4" },
    };
    const ctx = await buildContext(pkg, fixturesDir);
    const diags = await peerDepConflictRule.check(ctx);
    expect(diags).toHaveLength(0);
  });

  it("warns when dep in both peer and regular", async () => {
    const pkg: PackageJson = {
      peerDependencies: { react: "^18" },
      dependencies: { react: "^18.2" },
    };
    const ctx = await buildContext(pkg, fixturesDir);
    const diags = await peerDepConflictRule.check(ctx);
    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0]!.message).toContain('"react"');
    expect(diags[0]!.message).toContain("both a peer and regular");
  });

  it("passes when no peerDependencies", async () => {
    const ctx = await buildContext({ dependencies: { lodash: "^4" } }, fixturesDir);
    const diags = await peerDepConflictRule.check(ctx);
    expect(diags).toHaveLength(0);
  });
});

describe("metadata/deprecated-fields", () => {
  it("warns about jsnext:main", async () => {
    const pkg: PackageJson = { "jsnext:main": "./dist/index.js" };
    const ctx = await buildContext(pkg, fixturesDir);
    const diags = await deprecatedFieldsRule.check(ctx);
    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0]!.message).toContain("jsnext:main");
    expect(diags[0]!.message).toContain("deprecated");
  });

  it("passes when no deprecated fields", async () => {
    const ctx = await buildContext({ module: "./dist/index.js" }, fixturesDir);
    const diags = await deprecatedFieldsRule.check(ctx);
    expect(diags).toHaveLength(0);
  });

  it("warns about jsnext field", async () => {
    const pkg: PackageJson = { jsnext: "./dist/index.js" };
    const ctx = await buildContext(pkg, fixturesDir);
    const diags = await deprecatedFieldsRule.check(ctx);
    expect(diags.some((d) => d.message.includes('"jsnext"'))).toBe(true);
  });
});
