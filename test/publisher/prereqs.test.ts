import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import { dirtyTreeRule } from "../../src/publisher/prereqs/dirty-tree.js";
import { branchRule } from "../../src/publisher/prereqs/branch.js";
import { registryPingRule, registryAuthRule } from "../../src/publisher/prereqs/registry.js";
import type { PrereqContext } from "../../src/publisher/framework/types.js";

vi.mock("../../src/publisher/git.js", () => ({
  checkDirtyTree: vi.fn(),
  checkBranch: vi.fn(),
}));

vi.mock("../../src/publisher/npm.js", () => ({
  pingRegistry: vi.fn(),
  checkAuth: vi.fn(),
}));

describe("publisher prereqs", () => {
  let checkDirtyTree: Mock;
  let checkBranch: Mock;
  let pingRegistry: Mock;
  let checkAuth: Mock;

  beforeEach(async () => {
    const git = await import("../../src/publisher/git.js");
    const npm = await import("../../src/publisher/npm.js");

    checkDirtyTree = git.checkDirtyTree as Mock;
    checkBranch = git.checkBranch as Mock;
    pingRegistry = npm.pingRegistry as Mock;
    checkAuth = npm.checkAuth as Mock;

    checkDirtyTree.mockClear();
    checkBranch.mockClear();
    pingRegistry.mockClear();
    checkAuth.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function createContext(overrides?: Partial<PrereqContext>): PrereqContext {
    return {
      dir: "/test/dir",
      pkg: { name: "test-pkg", version: "1.0.0" },
      dryRun: false,
      isCi: false,
      config: null,
      registryArgs: [],
      ...overrides,
    };
  }

  describe("dirtyTreeRule", () => {
    it("returns empty array on dryRun", async () => {
      const ctx = createContext({ dryRun: true });
      const diagnostics = await dirtyTreeRule.check(ctx);

      expect(diagnostics).toEqual([]);
      expect(checkDirtyTree).not.toHaveBeenCalled();
    });

    it("returns empty array when tree is clean", async () => {
      checkDirtyTree.mockReturnValueOnce({ dirty: false });
      const ctx = createContext();
      const diagnostics = await dirtyTreeRule.check(ctx);

      expect(diagnostics).toEqual([]);
      expect(checkDirtyTree).toHaveBeenCalledWith("/test/dir");
    });

    it("returns error when tree is dirty", async () => {
      checkDirtyTree.mockReturnValueOnce({ dirty: true });
      const ctx = createContext();
      const diagnostics = await dirtyTreeRule.check(ctx);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]).toEqual({
        severity: "error",
        message: "Working tree is dirty. Commit or stash changes before publishing.",
        ruleId: "prereq/clean-tree",
      });
    });

    it("returns warning when git check fails", async () => {
      checkDirtyTree.mockReturnValueOnce({ dirty: false, error: "not a git repo" });
      const ctx = createContext();
      const diagnostics = await dirtyTreeRule.check(ctx);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]).toEqual({
        severity: "warning",
        message: "Not a git repository — skipping git checks",
        ruleId: "prereq/clean-tree",
      });
    });
  });

  describe("branchRule", () => {
    it("returns empty array when isCi is true", async () => {
      const ctx = createContext({ isCi: true });
      const diagnostics = await branchRule.check(ctx);

      expect(diagnostics).toEqual([]);
      expect(checkBranch).not.toHaveBeenCalled();
    });

    it("returns empty array on dryRun", async () => {
      const ctx = createContext({ dryRun: true });
      const diagnostics = await branchRule.check(ctx);

      expect(diagnostics).toEqual([]);
      expect(checkBranch).not.toHaveBeenCalled();
    });

    it("returns empty array when on allowed branch", async () => {
      checkBranch.mockReturnValueOnce({ ok: true, branch: "main" });
      const ctx = createContext();
      const diagnostics = await branchRule.check(ctx);

      expect(diagnostics).toEqual([]);
      expect(checkBranch).toHaveBeenCalledWith("/test/dir", ["main", "master"]);
    });

    it("returns error when on disallowed branch", async () => {
      checkBranch.mockReturnValueOnce({ ok: false, branch: "feature/test" });
      const ctx = createContext();
      const diagnostics = await branchRule.check(ctx);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]).toEqual({
        severity: "error",
        message: 'Current branch "feature/test" is not allowed. Expected: main, master',
        ruleId: "prereq/allowed-branch",
      });
    });

    it("uses config.branch when provided as array", async () => {
      checkBranch.mockReturnValueOnce({ ok: true, branch: "develop" });
      const ctx = createContext({
        config: { branch: ["develop", "staging"] },
      });
      const diagnostics = await branchRule.check(ctx);

      expect(diagnostics).toEqual([]);
      expect(checkBranch).toHaveBeenCalledWith("/test/dir", ["develop", "staging"]);
    });

    it("uses config.branch when provided as string", async () => {
      checkBranch.mockReturnValueOnce({ ok: true, branch: "production" });
      const ctx = createContext({
        config: { branch: "production" },
      });
      const diagnostics = await branchRule.check(ctx);

      expect(diagnostics).toEqual([]);
      expect(checkBranch).toHaveBeenCalledWith("/test/dir", ["production"]);
    });
  });

  describe("registryPingRule", () => {
    it("returns empty array on dryRun", async () => {
      const ctx = createContext({ dryRun: true });
      const diagnostics = await registryPingRule.check(ctx);

      expect(diagnostics).toEqual([]);
      expect(pingRegistry).not.toHaveBeenCalled();
    });

    it("returns empty array when ping succeeds", async () => {
      pingRegistry.mockReturnValueOnce({ ok: true });
      const ctx = createContext();
      const diagnostics = await registryPingRule.check(ctx);

      expect(diagnostics).toEqual([]);
      expect(pingRegistry).toHaveBeenCalledWith("/test/dir", []);
    });

    it("returns error when ping fails", async () => {
      pingRegistry.mockReturnValueOnce({ ok: false, error: "Network error" });
      const ctx = createContext();
      const diagnostics = await registryPingRule.check(ctx);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]).toEqual({
        severity: "error",
        message: "Cannot reach npm registry. Check your connection.",
        ruleId: "prereq/registry-reachable",
      });
    });

    it("passes registryArgs to pingRegistry", async () => {
      pingRegistry.mockReturnValueOnce({ ok: true });
      const ctx = createContext({
        registryArgs: ["--registry", "https://custom.registry"],
      });
      await registryPingRule.check(ctx);

      expect(pingRegistry).toHaveBeenCalledWith("/test/dir", [
        "--registry",
        "https://custom.registry",
      ]);
    });
  });

  describe("registryAuthRule", () => {
    it("returns empty array on dryRun", async () => {
      const ctx = createContext({ dryRun: true });
      const diagnostics = await registryAuthRule.check(ctx);

      expect(diagnostics).toEqual([]);
      expect(checkAuth).not.toHaveBeenCalled();
    });

    it("returns empty array when auth check succeeds", async () => {
      checkAuth.mockReturnValueOnce({ ok: true });
      const ctx = createContext();
      const diagnostics = await registryAuthRule.check(ctx);

      expect(diagnostics).toEqual([]);
      expect(checkAuth).toHaveBeenCalledWith("/test/dir", []);
    });

    it("returns error when auth check fails", async () => {
      checkAuth.mockReturnValueOnce({ ok: false, error: "Not authenticated" });
      const ctx = createContext();
      const diagnostics = await registryAuthRule.check(ctx);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]).toEqual({
        severity: "error",
        message: "Not authenticated with npm. Run `npm login` first.",
        ruleId: "prereq/registry-authenticated",
      });
    });

    it("passes registryArgs to checkAuth", async () => {
      checkAuth.mockReturnValueOnce({ ok: true });
      const ctx = createContext({
        registryArgs: ["--registry", "https://custom.registry"],
      });
      await registryAuthRule.check(ctx);

      expect(checkAuth).toHaveBeenCalledWith("/test/dir", [
        "--registry",
        "https://custom.registry",
      ]);
    });
  });
});
