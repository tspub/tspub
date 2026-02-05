import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { loadDoctorPlugins } from "../../src/doctor/plugins.js";
import type { DoctorRule } from "../../src/doctor/framework/types.js";

describe("loadDoctorPlugins", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(
      "/tmp",
      `tspub-test-plugins-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("loads plugin rules from file", async () => {
    const pluginContent = `
export const rules = [
  {
    meta: {
      id: "custom/test-rule",
      description: "Test rule from plugin",
      defaultSeverity: "warning",
      fixable: false,
      category: "custom",
    },
    check: () => [{ severity: "warning", message: "Test warning" }],
  },
];
`;
    const pluginPath = join(tempDir, "plugin.mjs");
    await writeFile(pluginPath, pluginContent);

    const rules = await loadDoctorPlugins([pluginPath], tempDir);

    expect(rules).toHaveLength(1);
    expect(rules[0]?.meta.id).toBe("custom/test-rule");
    expect(rules[0]?.meta.category).toBe("custom");
  });

  it("loads plugin with default export", async () => {
    const pluginContent = `
export default {
  name: "my-plugin",
  rules: [
    {
      meta: {
        id: "plugin/rule1",
        description: "Rule 1",
        defaultSeverity: "error",
        fixable: false,
        category: "plugin",
      },
      check: () => [],
    },
  ],
};
`;
    const pluginPath = join(tempDir, "plugin-default.mjs");
    await writeFile(pluginPath, pluginContent);

    const rules = await loadDoctorPlugins([pluginPath], tempDir);

    expect(rules).toHaveLength(1);
    expect(rules[0]?.meta.id).toBe("plugin/rule1");
  });

  it("loads multiple rules from single plugin", async () => {
    const pluginContent = `
export const rules = [
  {
    meta: {
      id: "multi/rule1",
      description: "Rule 1",
      defaultSeverity: "warning",
      fixable: false,
      category: "multi",
    },
    check: () => [],
  },
  {
    meta: {
      id: "multi/rule2",
      description: "Rule 2",
      defaultSeverity: "error",
      fixable: false,
      category: "multi",
    },
    check: () => [],
  },
];
`;
    const pluginPath = join(tempDir, "multi-plugin.mjs");
    await writeFile(pluginPath, pluginContent);

    const rules = await loadDoctorPlugins([pluginPath], tempDir);

    expect(rules).toHaveLength(2);
    expect(rules[0]?.meta.id).toBe("multi/rule1");
    expect(rules[1]?.meta.id).toBe("multi/rule2");
  });

  it("throws on missing rules export", async () => {
    const pluginContent = `
export const notRules = [];
`;
    const pluginPath = join(tempDir, "invalid-plugin.mjs");
    await writeFile(pluginPath, pluginContent);

    await expect(loadDoctorPlugins([pluginPath], tempDir)).rejects.toThrow(
      "must export { rules",
    );
  });

  it("validates meta.id exists", async () => {
    const pluginContent = `
export const rules = [
  {
    meta: {
      description: "Missing ID",
      defaultSeverity: "warning",
      fixable: false,
      category: "test",
    },
    check: () => [],
  },
];
`;
    const pluginPath = join(tempDir, "no-id-plugin.mjs");
    await writeFile(pluginPath, pluginContent);

    await expect(loadDoctorPlugins([pluginPath], tempDir)).rejects.toThrow(
      "without meta.id",
    );
  });

  it("validates meta.category exists", async () => {
    const pluginContent = `
export const rules = [
  {
    meta: {
      id: "test/no-category",
      description: "Missing category",
      defaultSeverity: "warning",
      fixable: false,
    },
    check: () => [],
  },
];
`;
    const pluginPath = join(tempDir, "no-category-plugin.mjs");
    await writeFile(pluginPath, pluginContent);

    await expect(loadDoctorPlugins([pluginPath], tempDir)).rejects.toThrow(
      "missing meta.category",
    );
  });

  it("validates check function exists", async () => {
    const pluginContent = `
export const rules = [
  {
    meta: {
      id: "test/no-check",
      description: "Missing check",
      defaultSeverity: "warning",
      fixable: false,
      category: "test",
    },
  },
];
`;
    const pluginPath = join(tempDir, "no-check-plugin.mjs");
    await writeFile(pluginPath, pluginContent);

    await expect(loadDoctorPlugins([pluginPath], tempDir)).rejects.toThrow(
      "missing check function",
    );
  });

  it("loads multiple plugins", async () => {
    const plugin1Content = `
export const rules = [
  {
    meta: {
      id: "plugin1/rule",
      description: "Plugin 1 rule",
      defaultSeverity: "warning",
      fixable: false,
      category: "plugin1",
    },
    check: () => [],
  },
];
`;
    const plugin1Path = join(tempDir, "plugin1.mjs");
    await writeFile(plugin1Path, plugin1Content);

    const plugin2Content = `
export const rules = [
  {
    meta: {
      id: "plugin2/rule",
      description: "Plugin 2 rule",
      defaultSeverity: "error",
      fixable: false,
      category: "plugin2",
    },
    check: () => [],
  },
];
`;
    const plugin2Path = join(tempDir, "plugin2.mjs");
    await writeFile(plugin2Path, plugin2Content);

    const rules = await loadDoctorPlugins([plugin1Path, plugin2Path], tempDir);

    expect(rules).toHaveLength(2);
    expect(rules[0]?.meta.id).toBe("plugin1/rule");
    expect(rules[1]?.meta.id).toBe("plugin2/rule");
  });

  it("handles plugin load failure", async () => {
    const nonExistentPath = join(tempDir, "nonexistent.mjs");

    await expect(loadDoctorPlugins([nonExistentPath], tempDir)).rejects.toThrow(
      "Failed to load doctor plugin",
    );
  });

  it("loads plugin with relative path", async () => {
    const pluginContent = `
export const rules = [
  {
    meta: {
      id: "relative/rule",
      description: "Relative rule",
      defaultSeverity: "info",
      fixable: false,
      category: "relative",
    },
    check: () => [],
  },
];
`;
    const pluginPath = join(tempDir, "relative-plugin.mjs");
    await writeFile(pluginPath, pluginContent);

    const rules = await loadDoctorPlugins(["./relative-plugin.mjs"], tempDir);

    expect(rules).toHaveLength(1);
    expect(rules[0]?.meta.id).toBe("relative/rule");
  });
});
