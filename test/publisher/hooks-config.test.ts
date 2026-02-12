import { describe, it, expect } from "vitest";
import { createHooksFromConfig } from "../../src/publisher/hooks.js";

describe("createHooksFromConfig", () => {
  it("returns undefined when config is undefined", () => {
    expect(createHooksFromConfig(undefined)).toBeUndefined();
  });

  it("returns undefined when config has no hooks", () => {
    expect(createHooksFromConfig({ registry: "https://registry.npmjs.org" })).toBeUndefined();
  });

  it("returns undefined when hooks object is empty", () => {
    expect(createHooksFromConfig({ hooks: {} })).toBeUndefined();
  });

  it("returns hooks object when beforeBuild is set", () => {
    const hooks = createHooksFromConfig({ hooks: { beforeBuild: "echo test" } });
    expect(hooks).toBeDefined();
    expect(hooks!.beforeBuild).toBeTypeOf("function");
    expect(hooks!.afterBuild).toBeUndefined();
    expect(hooks!.beforePublish).toBeUndefined();
    expect(hooks!.afterPublish).toBeUndefined();
  });

  it("returns hooks object with all four hooks", () => {
    const hooks = createHooksFromConfig({
      hooks: {
        beforeBuild: "echo before-build",
        afterBuild: "echo after-build",
        beforePublish: "echo before-publish",
        afterPublish: "echo after-publish",
      },
    });
    expect(hooks).toBeDefined();
    expect(hooks!.beforeBuild).toBeTypeOf("function");
    expect(hooks!.afterBuild).toBeTypeOf("function");
    expect(hooks!.beforePublish).toBeTypeOf("function");
    expect(hooks!.afterPublish).toBeTypeOf("function");
  });

  it("hook executes shell command successfully", async () => {
    const hooks = createHooksFromConfig({
      hooks: { beforeBuild: "true" }, // `true` always exits 0
    });
    // Should not throw
    await hooks!.beforeBuild!({ dir: "/tmp" });
  });

  it("hook rejects on non-zero exit", async () => {
    const hooks = createHooksFromConfig({
      hooks: { beforeBuild: "false" }, // `false` always exits 1
    });
    await expect(hooks!.beforeBuild!({ dir: "/tmp" })).rejects.toThrow("Hook command failed");
  });
});
