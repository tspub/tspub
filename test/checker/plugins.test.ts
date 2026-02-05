import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { loadPlugins } from "../../src/checker/plugins.js";

const tmpDir = join(import.meta.dirname, "..", ".tmp-plugins-test");

beforeEach(async () => {
  await mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("loadPlugins", () => {
  it("loads a plugin from a relative path", async () => {
    const pluginCode = `
export const rules = [
  {
    meta: {
      id: "custom/test-rule",
      description: "A test rule",
      defaultSeverity: "warning",
      fixable: false,
      category: "custom",
    },
    check() {
      return [];
    },
  },
];
`;
    await writeFile(join(tmpDir, "my-plugin.mjs"), pluginCode);

    const rules = await loadPlugins(["./my-plugin.mjs"], tmpDir);
    expect(rules).toHaveLength(1);
    expect(rules[0]!.meta.id).toBe("custom/test-rule");
  });

  it("loads a plugin with default export", async () => {
    const pluginCode = `
export default {
  name: "my-plugin",
  rules: [
    {
      meta: {
        id: "custom/default-rule",
        description: "Default export rule",
        defaultSeverity: "info",
        fixable: false,
        category: "custom",
      },
      check() {
        return [];
      },
    },
  ],
};
`;
    await writeFile(join(tmpDir, "default-plugin.mjs"), pluginCode);

    const rules = await loadPlugins(["./default-plugin.mjs"], tmpDir);
    expect(rules).toHaveLength(1);
    expect(rules[0]!.meta.id).toBe("custom/default-rule");
  });

  it("throws on invalid plugin (no rules)", async () => {
    await writeFile(join(tmpDir, "bad-plugin.mjs"), "export const foo = 42;\n");

    await expect(
      loadPlugins(["./bad-plugin.mjs"], tmpDir),
    ).rejects.toThrow("must export");
  });

  it("throws on rule missing meta.id", async () => {
    const pluginCode = `
export const rules = [
  {
    meta: { description: "bad", defaultSeverity: "warning", fixable: false, category: "x" },
    check() { return []; },
  },
];
`;
    await writeFile(join(tmpDir, "no-id.mjs"), pluginCode);

    await expect(
      loadPlugins(["./no-id.mjs"], tmpDir),
    ).rejects.toThrow("without meta.id");
  });
});
