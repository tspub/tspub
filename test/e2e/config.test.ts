import { describe, it, expect } from "vitest";
import { loadConfig, loadConfigWithInheritance } from "../../src/config/index.js";
import { fixture } from "./_helpers.js";

describe("E2E: Config Features", () => {
  it("loadConfig returns null for directory without config file", async () => {
    const config = await loadConfig(fixture("simple-pkg"));
    expect(config).toBeNull();
  });

  it("loadConfigWithInheritance returns null when neither dir has config", async () => {
    const config = await loadConfigWithInheritance(
      fixture("simple-pkg"),
      fixture("valid-esm"),
    );
    expect(config).toBeNull();
  });

  it("loadConfig does not throw on any fixture directory", async () => {
    const dirs = ["simple-pkg", "valid-esm", "valid-dual", "broken-exports", "broken-types"];
    for (const d of dirs) {
      const config = await loadConfig(fixture(d));
      expect(config === null || typeof config === "object").toBe(true);
    }
  });
});
