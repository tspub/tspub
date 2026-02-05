import { describe, it, expect } from "vitest";
import { parsePnpmWorkspacePackages } from "../../src/workspace/index.js";

describe("parsePnpmWorkspacePackages", () => {
  describe("block style", () => {
    it("parses basic block style", () => {
      const yaml = "packages:\n  - packages/*\n  - apps/*\n";
      expect(parsePnpmWorkspacePackages(yaml)).toEqual(["packages/*", "apps/*"]);
    });

    it("parses single-quoted values", () => {
      const yaml = "packages:\n  - 'packages/*'\n  - 'apps/*'\n";
      expect(parsePnpmWorkspacePackages(yaml)).toEqual(["packages/*", "apps/*"]);
    });

    it("parses double-quoted values", () => {
      const yaml = 'packages:\n  - "packages/*"\n  - "apps/*"\n';
      expect(parsePnpmWorkspacePackages(yaml)).toEqual(["packages/*", "apps/*"]);
    });

    it("strips inline comments from unquoted values", () => {
      const yaml = "packages:\n  - packages/* # all packages\n  - apps/*\n";
      expect(parsePnpmWorkspacePackages(yaml)).toEqual(["packages/*", "apps/*"]);
    });

    it("preserves # inside quoted values", () => {
      const yaml = "packages:\n  - 'packages/#internal/*'\n  - apps/*\n";
      expect(parsePnpmWorkspacePackages(yaml)).toEqual(["packages/#internal/*", "apps/*"]);
    });

    it("stops at next top-level key", () => {
      const yaml = "packages:\n  - packages/*\nother:\n  - foo\n";
      expect(parsePnpmWorkspacePackages(yaml)).toEqual(["packages/*"]);
    });

    it("skips blank lines within block", () => {
      const yaml = "packages:\n  - packages/*\n\n  - apps/*\n";
      expect(parsePnpmWorkspacePackages(yaml)).toEqual(["packages/*", "apps/*"]);
    });
  });

  describe("flow style", () => {
    it("parses single-line flow array with single quotes", () => {
      const yaml = "packages: ['packages/*', 'apps/*']\n";
      expect(parsePnpmWorkspacePackages(yaml)).toEqual(["packages/*", "apps/*"]);
    });

    it("parses single-line flow array with double quotes", () => {
      const yaml = 'packages: ["packages/*", "apps/*"]\n';
      expect(parsePnpmWorkspacePackages(yaml)).toEqual(["packages/*", "apps/*"]);
    });

    it("parses single-line flow array with unquoted values", () => {
      const yaml = "packages: [packages/*, apps/*]\n";
      expect(parsePnpmWorkspacePackages(yaml)).toEqual(["packages/*", "apps/*"]);
    });

    it("parses multi-line flow array", () => {
      const yaml = "packages: [\n  'packages/*',\n  'apps/*'\n]\n";
      expect(parsePnpmWorkspacePackages(yaml)).toEqual(["packages/*", "apps/*"]);
    });

    it("preserves # inside quoted flow values", () => {
      const yaml = "packages: ['packages/#special/*', 'apps/*']\n";
      expect(parsePnpmWorkspacePackages(yaml)).toEqual(["packages/#special/*", "apps/*"]);
    });
  });

  describe("edge cases", () => {
    it("returns empty array when no packages key", () => {
      const yaml = "other:\n  - foo\n";
      expect(parsePnpmWorkspacePackages(yaml)).toEqual([]);
    });

    it("returns empty array for empty input", () => {
      expect(parsePnpmWorkspacePackages("")).toEqual([]);
    });

    it("handles packages key with content before it", () => {
      const yaml = "catalog:\n  react: ^18\npackages:\n  - packages/*\n";
      expect(parsePnpmWorkspacePackages(yaml)).toEqual(["packages/*"]);
    });

    it("handles mixed quoting styles", () => {
      const yaml = "packages: ['packages/*', \"apps/*\", tools/*]\n";
      expect(parsePnpmWorkspacePackages(yaml)).toEqual(["packages/*", "apps/*", "tools/*"]);
    });
  });
});
