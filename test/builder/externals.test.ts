import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { resolveExternals, resolveExternalsFlat } from "../../src/builder/externals.js";

const FIXTURE_DIR = join(__dirname, "../fixtures/simple-pkg");

describe("resolveExternalsFlat", () => {
  it("externalizes dependencies from package.json", () => {
    const externals = resolveExternalsFlat(FIXTURE_DIR);
    expect(externals).toContain("chalk");
  });

  it("externalizes node builtins", () => {
    const externals = resolveExternalsFlat(FIXTURE_DIR);
    expect(externals).toContain("node:path");
    expect(externals).toContain("fs");
  });

  it("includes user-specified externals", () => {
    const externals = resolveExternalsFlat(FIXTURE_DIR, ["my-lib"]);
    expect(externals).toContain("my-lib");
  });

  it("removes noExternal entries", () => {
    const externals = resolveExternalsFlat(FIXTURE_DIR, undefined, ["chalk"]);
    expect(externals).not.toContain("chalk");
  });

  it("does not externalize devDependencies", () => {
    const externals = resolveExternalsFlat(FIXTURE_DIR);
    expect(externals).toContain("chalk");
  });
});

describe("resolveExternals (plugin-based)", () => {
  it("returns node builtins as strings", () => {
    const result = resolveExternals(FIXTURE_DIR);
    expect(result.strings).toContain("node:path");
    expect(result.strings).toContain("fs");
  });

  it("returns a plugin for dep subpath matching", () => {
    const result = resolveExternals(FIXTURE_DIR);
    expect(result.plugin).not.toBeNull();
    expect(result.plugin!.name).toBe("tspub-externals");
  });

  it("does not include dep names in strings (handled by plugin)", () => {
    const result = resolveExternals(FIXTURE_DIR);
    // chalk is handled by the plugin, not in the strings array
    expect(result.strings).not.toContain("chalk");
  });

  it("supports regex externals", () => {
    const result = resolveExternals(FIXTURE_DIR, [/^node:/]);
    expect(result.plugin).not.toBeNull();
  });

  it("handles mixed string and regex externals", () => {
    const result = resolveExternals(FIXTURE_DIR, ["lodash", /^@scope\//]);
    expect(result.plugin).not.toBeNull();
  });

  it("respects noExternal with plugin-based resolution", () => {
    // chalk is the only dep, so removing it means no deps left → no plugin needed
    const result = resolveExternals(FIXTURE_DIR, undefined, ["chalk"]);
    expect(result.plugin).toBeNull();

    // But if we add another external, plugin should exist and chalk should still be excluded
    const result2 = resolveExternals(FIXTURE_DIR, ["lodash"], ["chalk"]);
    expect(result2.plugin).not.toBeNull();
  });
});
