import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import { publishPackage } from "../../src/publisher/publish.js";
import type { PublishPackageParams } from "../../src/publisher/publish.js";

vi.mock("../../src/builder/index.js", () => ({
  build: vi.fn(),
}));

vi.mock("../../src/builder/changelog.js", () => ({
  generateChangelog: vi.fn(),
}));

vi.mock("../../src/publisher/npm.js", () => ({
  pingRegistry: vi.fn(),
  checkAuth: vi.fn(),
  npmPublish: vi.fn(),
}));

vi.mock("../../src/publisher/git.js", () => ({
  checkDirtyTree: vi.fn(),
  checkBranch: vi.fn(),
  commitRelease: vi.fn(),
  tagRelease: vi.fn(),
  rollbackRelease: vi.fn(),
}));

vi.mock("../../src/publisher/version-from-commits.js", () => ({
  resolveVersionBump: vi.fn(),
}));

vi.mock("../../src/shared/package-json.js", () => ({
  readPackageJson: vi.fn(),
  writePackageJson: vi.fn(),
}));

describe("publishPackage integration", () => {
  let build: Mock;
  let generateChangelog: Mock;
  let npmPublish: Mock;
  let checkDirtyTree: Mock;
  let checkBranch: Mock;
  let pingRegistry: Mock;
  let checkAuth: Mock;
  let readPackageJson: Mock;
  let writePackageJson: Mock;
  let resolveVersionBump: Mock;

  beforeEach(async () => {
    const builder = await import("../../src/builder/index.js");
    const changelog = await import("../../src/builder/changelog.js");
    const npm = await import("../../src/publisher/npm.js");
    const git = await import("../../src/publisher/git.js");
    const pkgJson = await import("../../src/shared/package-json.js");
    const versionFromCommits = await import("../../src/publisher/version-from-commits.js");

    build = builder.build as Mock;
    generateChangelog = changelog.generateChangelog as Mock;
    npmPublish = npm.npmPublish as Mock;
    checkDirtyTree = git.checkDirtyTree as Mock;
    checkBranch = git.checkBranch as Mock;
    pingRegistry = npm.pingRegistry as Mock;
    checkAuth = npm.checkAuth as Mock;
    readPackageJson = pkgJson.readPackageJson as Mock;
    writePackageJson = pkgJson.writePackageJson as Mock;
    resolveVersionBump = versionFromCommits.resolveVersionBump as Mock;

    build.mockClear();
    generateChangelog.mockClear();
    npmPublish.mockClear();
    checkDirtyTree.mockClear();
    checkBranch.mockClear();
    pingRegistry.mockClear();
    checkAuth.mockClear();
    readPackageJson.mockClear();
    writePackageJson.mockClear();
    resolveVersionBump.mockClear();

    // Default successful mocks
    build.mockResolvedValue(undefined);
    generateChangelog.mockResolvedValue(undefined);
    npmPublish.mockReturnValue({ ok: true });
    checkDirtyTree.mockReturnValue({ dirty: false });
    checkBranch.mockReturnValue({ ok: true, branch: "main" });
    pingRegistry.mockReturnValue({ ok: true });
    checkAuth.mockReturnValue({ ok: true });
    readPackageJson.mockResolvedValue({ name: "test-pkg", version: "1.0.0" });
    writePackageJson.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function createParams(overrides?: Partial<PublishPackageParams>): PublishPackageParams {
    return {
      dir: "/test/dir",
      bump: "patch",
      options: {
        dryRun: false,
        tag: "latest",
        changelog: true,
        git: true,
      },
      config: null,
      isCi: false,
      registry: undefined,
      registryArgs: [],
      ...overrides,
    };
  }

  describe("dry-run mode", () => {
    it("returns success without calling npm publish", async () => {
      const params = createParams({
        options: {
          dryRun: true,
          tag: "latest",
          changelog: true,
          git: true,
        },
      });

      const result = await publishPackage(params);

      expect(result.success).toBe(true);
      expect(result.version).toBe("1.0.1");
      expect(result.oldVersion).toBe("1.0.0");
      expect(npmPublish).not.toHaveBeenCalled();
      expect(build).toHaveBeenCalled();
      expect(generateChangelog).toHaveBeenCalled();
    });

    it("skips prereq checks in dry-run", async () => {
      const params = createParams({
        options: {
          dryRun: true,
          tag: "latest",
          changelog: true,
          git: true,
        },
      });

      await publishPackage(params);

      expect(checkDirtyTree).not.toHaveBeenCalled();
      expect(checkBranch).not.toHaveBeenCalled();
      expect(pingRegistry).not.toHaveBeenCalled();
      expect(checkAuth).not.toHaveBeenCalled();
    });

    it("logs dry-run message", async () => {
      const params = createParams({
        options: {
          dryRun: true,
          tag: "latest",
          changelog: true,
          git: true,
        },
      });

      const result = await publishPackage(params);

      expect(result.success).toBe(true);
      expect(result.name).toBe("test-pkg");
      expect(result.version).toBe("1.0.1");
    });
  });

  describe("CI mode", () => {
    it("skips publish when no changes detected", async () => {
      resolveVersionBump.mockReturnValueOnce({
        bump: null,
        reason: "no commits since last tag",
      });

      const params = createParams({
        bump: undefined,
        isCi: true,
      });

      const result = await publishPackage(params);

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.reason).toBe("no commits since last tag");
      expect(npmPublish).not.toHaveBeenCalled();
      expect(build).not.toHaveBeenCalled();
    });

    it("auto-detects bump from commits", async () => {
      resolveVersionBump.mockReturnValueOnce({
        bump: "minor",
        reason: "feature commits found",
      });

      const params = createParams({
        bump: undefined,
        isCi: true,
      });

      const result = await publishPackage(params);

      expect(result.success).toBe(true);
      expect(result.version).toBe("1.1.0");
      expect(resolveVersionBump).toHaveBeenCalledWith("/test/dir", undefined);
    });

    it("uses explicit bump when provided in CI", async () => {
      const params = createParams({
        bump: "major",
        isCi: true,
      });

      const result = await publishPackage(params);

      expect(result.success).toBe(true);
      expect(result.version).toBe("2.0.0");
      expect(resolveVersionBump).not.toHaveBeenCalled();
    });

    it("skips publish when resolveVersionBump returns null bump", async () => {
      resolveVersionBump.mockReturnValueOnce({
        bump: null,
        reason: "only non-source changes",
      });

      const params = createParams({
        bump: undefined,
        isCi: true,
      });

      const result = await publishPackage(params);

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.version).toBe("1.0.0");
      expect(npmPublish).not.toHaveBeenCalled();
    });
  });

  describe("prerelease versions", () => {
    it("creates prerelease version", async () => {
      const params = createParams({
        options: {
          dryRun: true,
          tag: "next",
          changelog: true,
          git: true,
          prerelease: "beta",
        },
      });

      const result = await publishPackage(params);

      expect(result.success).toBe(true);
      expect(result.version).toBe("1.0.1-beta.0");
    });

    it("increments existing prerelease with explicit bump", async () => {
      readPackageJson.mockResolvedValueOnce({
        name: "test-pkg",
        version: "1.0.1-beta.0",
      });

      const params = createParams({
        bump: "patch", // Explicit bump resets the counter
        options: {
          dryRun: true,
          tag: "next",
          changelog: true,
          git: true,
          prerelease: "beta",
        },
      });

      const result = await publishPackage(params);

      expect(result.success).toBe(true);
      // When bump is "patch", it bumps to 1.0.2-beta.0 (resets counter)
      expect(result.version).toBe("1.0.2-beta.0");
    });
  });

  describe("build integration", () => {
    it("calls build with config from tspub.config", async () => {
      const params = createParams({
        config: {
          build: {
            formats: ["esm", "cjs"],
            dts: true,
            sourcemap: false,
          },
        },
        options: {
          dryRun: true,
          tag: "latest",
          changelog: true,
          git: true,
        },
      });

      await publishPackage(params);

      expect(build).toHaveBeenCalledWith(
        expect.objectContaining({
          formats: ["esm", "cjs"],
          dts: true,
          sourcemap: false,
          watch: false,
          dir: "/test/dir",
        })
      );
    });

    it("uses default build config when none provided", async () => {
      const params = createParams({
        options: {
          dryRun: true,
          tag: "latest",
          changelog: true,
          git: true,
        },
      });

      await publishPackage(params);

      expect(build).toHaveBeenCalledWith(
        expect.objectContaining({
          formats: ["esm"],
          dts: true,
          sourcemap: true,
          watch: false,
        })
      );
    });
  });

  describe("npm publish options", () => {
    it("passes access option when specified", async () => {
      const params = createParams({
        options: {
          dryRun: false,
          tag: "latest",
          changelog: false,
          git: false,
          access: "public",
        },
      });

      await publishPackage(params);

      expect(npmPublish).toHaveBeenCalledWith(
        "/test/dir",
        expect.arrayContaining(["--access", "public"])
      );
    });

    it("defaults to public access for scoped packages", async () => {
      readPackageJson.mockResolvedValueOnce({
        name: "@scope/test-pkg",
        version: "1.0.0",
      });

      const params = createParams({
        options: {
          dryRun: false,
          tag: "latest",
          changelog: false,
          git: false,
        },
      });

      await publishPackage(params);

      expect(npmPublish).toHaveBeenCalledWith(
        "/test/dir",
        expect.arrayContaining(["--access", "public"])
      );
    });

    it("passes otp when specified", async () => {
      const params = createParams({
        options: {
          dryRun: false,
          tag: "latest",
          changelog: false,
          git: false,
          otp: "123456",
        },
      });

      await publishPackage(params);

      expect(npmPublish).toHaveBeenCalledWith(
        "/test/dir",
        expect.arrayContaining(["--otp", "123456"])
      );
    });

    it("includes provenance when enabled", async () => {
      const params = createParams({
        options: {
          dryRun: false,
          tag: "latest",
          changelog: false,
          git: false,
          provenance: true,
        },
      });

      await publishPackage(params);

      expect(npmPublish).toHaveBeenCalledWith(
        "/test/dir",
        expect.arrayContaining(["--provenance"])
      );
    });
  });
});
