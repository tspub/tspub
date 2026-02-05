import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import { pingRegistry, checkAuth, npmPublish } from "../../src/publisher/npm.js";

vi.mock("node:child_process", () => ({
  execFileSync: vi.fn(),
}));

describe("npm operations", () => {
  let execFileSync: Mock;

  beforeEach(async () => {
    const childProcess = await import("node:child_process");
    execFileSync = childProcess.execFileSync as Mock;
    execFileSync.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("pingRegistry", () => {
    it("returns ok: true on success", () => {
      execFileSync.mockReturnValueOnce("");
      const result = pingRegistry("/test/dir", []);

      expect(result.ok).toBe(true);
      expect(result.error).toBeUndefined();
      expect(execFileSync).toHaveBeenCalledWith("npm", ["ping"], {
        cwd: "/test/dir",
        stdio: "pipe",
      });
    });

    it("returns ok: false with error on failure", () => {
      const error = new Error("Network error");
      execFileSync.mockImplementationOnce(() => {
        throw error;
      });

      const result = pingRegistry("/test/dir", []);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Network error");
    });

    it("passes registry args to npm ping", () => {
      execFileSync.mockReturnValueOnce("");
      pingRegistry("/test/dir", ["--registry", "https://custom.registry"]);

      expect(execFileSync).toHaveBeenCalledWith(
        "npm",
        ["ping", "--registry", "https://custom.registry"],
        { cwd: "/test/dir", stdio: "pipe" }
      );
    });

    it("handles non-Error exceptions", () => {
      execFileSync.mockImplementationOnce(() => {
        throw "string error";
      });

      const result = pingRegistry("/test/dir", []);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("string error");
    });
  });

  describe("checkAuth", () => {
    it("returns ok: true on success", () => {
      execFileSync.mockReturnValueOnce("testuser");
      const result = checkAuth("/test/dir", []);

      expect(result.ok).toBe(true);
      expect(result.error).toBeUndefined();
      expect(execFileSync).toHaveBeenCalledWith("npm", ["whoami"], {
        cwd: "/test/dir",
        stdio: "pipe",
      });
    });

    it("returns ok: false with error on failure", () => {
      const error = new Error("Not authenticated");
      execFileSync.mockImplementationOnce(() => {
        throw error;
      });

      const result = checkAuth("/test/dir", []);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("passes registry args to npm whoami", () => {
      execFileSync.mockReturnValueOnce("testuser");
      checkAuth("/test/dir", ["--registry", "https://custom.registry"]);

      expect(execFileSync).toHaveBeenCalledWith(
        "npm",
        ["whoami", "--registry", "https://custom.registry"],
        { cwd: "/test/dir", stdio: "pipe" }
      );
    });

    it("handles non-Error exceptions", () => {
      execFileSync.mockImplementationOnce(() => {
        throw { code: "ENEEDAUTH" };
      });

      const result = checkAuth("/test/dir", []);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("[object Object]");
    });
  });

  describe("npmPublish", () => {
    it("returns ok: true on success", () => {
      execFileSync.mockReturnValueOnce("");
      const result = npmPublish("/test/dir", ["--tag", "latest"]);

      expect(result.ok).toBe(true);
      expect(result.error).toBeUndefined();
      expect(execFileSync).toHaveBeenCalledWith("npm", ["publish", "--tag", "latest"], {
        cwd: "/test/dir",
        stdio: "inherit",
      });
    });

    it("returns ok: false with error on failure", () => {
      const error = new Error("Publish failed");
      execFileSync.mockImplementationOnce(() => {
        throw error;
      });

      const result = npmPublish("/test/dir", ["--tag", "latest"]);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Publish failed");
    });

    it("passes all arguments to npm publish", () => {
      execFileSync.mockReturnValueOnce("");
      npmPublish("/test/dir", [
        "--tag", "next",
        "--access", "public",
        "--registry", "https://custom.registry",
        "--otp", "123456"
      ]);

      expect(execFileSync).toHaveBeenCalledWith(
        "npm",
        [
          "publish",
          "--tag", "next",
          "--access", "public",
          "--registry", "https://custom.registry",
          "--otp", "123456"
        ],
        { cwd: "/test/dir", stdio: "inherit" }
      );
    });

    it("handles non-Error exceptions", () => {
      execFileSync.mockImplementationOnce(() => {
        throw "publish error";
      });

      const result = npmPublish("/test/dir", []);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("publish error");
    });
  });
});
