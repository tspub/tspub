import { describe, it, expect } from "vitest";
import { checkSizeLimits, computeSizes } from "../../src/builder/size-report.js";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("size-report", () => {
  describe("checkSizeLimits", () => {
    const sizeInfos = [
      { name: "index.js", path: "/tmp/index.js", raw: 5000, gzip: 2000 },
      { name: "utils.js", path: "/tmp/utils.js", raw: 3000, gzip: 1000 },
      { name: "index.css", path: "/tmp/index.css", raw: 1000, gzip: 400 },
    ];

    it("passes when all files are under limit", () => {
      const errors = checkSizeLimits(sizeInfos, { "*": "10kB" });
      expect(errors).toHaveLength(0);
    });

    it("flags files exceeding gzip limit", () => {
      const errors = checkSizeLimits(sizeInfos, { "*.js": "1kB" });
      // index.js gzip is 2000 bytes = ~1.95kB > 1kB
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain("index.js");
      expect(errors[0]).toContain("exceeds");
    });

    it("supports wildcard * pattern matching all files", () => {
      const errors = checkSizeLimits(sizeInfos, { "*": "100B" });
      // All gzip sizes exceed 100B
      expect(errors).toHaveLength(3);
    });

    it("supports extension pattern *.css", () => {
      const errors = checkSizeLimits(sizeInfos, { "*.css": "100B" });
      // Only index.css should match and exceed
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain("index.css");
    });

    it("supports substring pattern matching", () => {
      const errors = checkSizeLimits(sizeInfos, { "utils": "500B" });
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain("utils.js");
    });

    it("reports error for invalid size limit string", () => {
      const errors = checkSizeLimits(sizeInfos, { "*": "abc" });
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain("Invalid size limit");
    });

    it("handles MB units", () => {
      const errors = checkSizeLimits(sizeInfos, { "*": "1MB" });
      expect(errors).toHaveLength(0); // All files well under 1MB
    });

    it("handles B units", () => {
      const errors = checkSizeLimits(sizeInfos, { "index.js": "1500B" });
      // index.js gzip is 2000 > 1500
      expect(errors).toHaveLength(1);
    });

    it("returns empty for empty limits", () => {
      const errors = checkSizeLimits(sizeInfos, {});
      expect(errors).toHaveLength(0);
    });
  });

  describe("computeSizes", () => {
    it("computes sizes for real files", () => {
      const dir = join(tmpdir(), `tspub-size-${Date.now()}`);
      mkdirSync(dir, { recursive: true });
      try {
        const content = "x".repeat(1000);
        writeFileSync(join(dir, "test.js"), content);
        const sizes = computeSizes([{ path: join(dir, "test.js") }], dir);
        expect(sizes).toHaveLength(1);
        expect(sizes[0].raw).toBe(1000);
        expect(sizes[0].gzip).toBeGreaterThan(0);
        expect(sizes[0].gzip).toBeLessThan(1000); // gzip should compress
        expect(sizes[0].name).toBe("test.js");
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it("skips files that do not exist", () => {
      const sizes = computeSizes([{ path: "/nonexistent/file.js" }]);
      expect(sizes).toHaveLength(0);
    });
  });
});
