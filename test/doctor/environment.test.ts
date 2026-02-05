import { describe, it, expect, afterEach } from "vitest";
import {
  checkNodeVersion,
  checkNpmVersion,
  checkTypeScriptVersion,
  checkPackageManager,
  checkGitStatus,
} from "../../src/doctor/environment.js";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("doctor: environment checks", () => {
  describe("checkNodeVersion", () => {
    it("returns empty when no engines field", () => {
      expect(checkNodeVersion({})).toHaveLength(0);
    });

    it("returns empty when engines.node is satisfied", () => {
      expect(checkNodeVersion({ engines: { node: ">=14.0.0" } })).toHaveLength(0);
    });

    it("returns error when Node version is too old", () => {
      const diags = checkNodeVersion({ engines: { node: ">=99.0.0" } });
      expect(diags).toHaveLength(1);
      expect(diags[0].severity).toBe("error");
      expect(diags[0].message).toContain("does not satisfy");
      expect(diags[0].category).toBe("environment");
    });

    it("handles malformed engines.node string", () => {
      const diags = checkNodeVersion({ engines: { node: "not-a-version" } });
      expect(diags).toHaveLength(0);
    });
  });

  describe("checkNpmVersion", () => {
    it("returns info with npm version", () => {
      const diags = checkNpmVersion();
      expect(diags).toHaveLength(1);
      expect(diags[0].severity).toBe("info");
      expect(diags[0].message).toContain("npm version");
      expect(diags[0].category).toBe("environment");
    });
  });

  describe("checkTypeScriptVersion", () => {
    it("returns empty when no typescript dep", () => {
      expect(checkTypeScriptVersion({})).toHaveLength(0);
    });

    it("warns on TypeScript 4.x", () => {
      const diags = checkTypeScriptVersion({ devDependencies: { typescript: "^4.9.0" } });
      expect(diags).toHaveLength(1);
      expect(diags[0].severity).toBe("warning");
      expect(diags[0].message).toContain("outdated");
    });

    it("passes for TypeScript 5.x", () => {
      expect(checkTypeScriptVersion({ devDependencies: { typescript: "^5.7.0" } })).toHaveLength(0);
    });

    it("checks dependencies too, not just devDependencies", () => {
      const diags = checkTypeScriptVersion({ dependencies: { typescript: "^4.0.0" } });
      expect(diags).toHaveLength(1);
      expect(diags[0].severity).toBe("warning");
    });
  });

  describe("checkPackageManager", () => {
    let tmpPm: string;

    afterEach(async () => {
      if (tmpPm) await rm(tmpPm, { recursive: true, force: true });
    });

    it("returns empty when no lock files", async () => {
      tmpPm = join(tmpdir(), `tspub-pm-${Date.now()}`);
      await mkdir(tmpPm, { recursive: true });
      expect(await checkPackageManager(tmpPm)).toHaveLength(0);
    });

    it("returns empty for single lock file", async () => {
      tmpPm = join(tmpdir(), `tspub-pm-${Date.now()}`);
      await mkdir(tmpPm, { recursive: true });
      await writeFile(join(tmpPm, "package-lock.json"), "{}");
      expect(await checkPackageManager(tmpPm)).toHaveLength(0);
    });

    it("warns on multiple lock files", async () => {
      tmpPm = join(tmpdir(), `tspub-pm-${Date.now()}`);
      await mkdir(tmpPm, { recursive: true });
      await writeFile(join(tmpPm, "package-lock.json"), "{}");
      await writeFile(join(tmpPm, "yarn.lock"), "");
      const diags = await checkPackageManager(tmpPm);
      expect(diags).toHaveLength(1);
      expect(diags[0].severity).toBe("warning");
      expect(diags[0].message).toContain("Multiple lock files");
    });
  });

  describe("checkGitStatus", () => {
    it("returns diagnostics array", () => {
      const diags = checkGitStatus(process.cwd());
      expect(Array.isArray(diags)).toBe(true);
      for (const d of diags) {
        expect(["error", "warning", "info"]).toContain(d.severity);
        expect(typeof d.message).toBe("string");
      }
    });
  });
});
