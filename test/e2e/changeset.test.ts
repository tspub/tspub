import { describe, it, expect } from "vitest";
import { consumeChangesets } from "../../src/changeset/version.js";
import { rm, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { makeTmpCopy, fileExists } from "./_helpers.js";

describe("E2E: Changeset Features", () => {
  it("consumeChangesets parses changeset and computes correct version bump", async () => {
    const tmp = await makeTmpCopy("changeset-pkg");
    try {
      const result = await consumeChangesets(tmp);

      expect(result.updates.length).toBeGreaterThan(0);

      const update = result.updates.find((u) => u.packageName === "changeset-pkg");
      expect(update).toBeDefined();
      expect(update!.bump).toBe("minor");
      expect(update!.oldVersion).toBe("1.0.0");
      expect(update!.newVersion).toBe("1.1.0");
      expect(update!.changelog).toBeDefined();
      expect(typeof update!.changelog).toBe("string");

      expect(typeof result.cleanup).toBe("function");
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it("consumeChangesets cleanup removes changeset files", async () => {
    const tmp = await makeTmpCopy("changeset-pkg");
    try {
      const result = await consumeChangesets(tmp);
      const changesetDir = join(tmp, ".changeset");
      const filesBefore = (await readdir(changesetDir)).filter((f) => f.endsWith(".md") && f !== "README.md");
      expect(filesBefore.length).toBeGreaterThan(0);

      await result.cleanup();

      const filesAfter = (await readdir(changesetDir)).filter((f) => f.endsWith(".md") && f !== "README.md");
      expect(filesAfter).toHaveLength(0);
      expect(await fileExists(join(changesetDir, "README.md"))).toBe(true);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it("consumeChangesets cleanup deletes consumed changeset files", async () => {
    const tmp = await makeTmpCopy("changeset-pkg");
    try {
      const result = await consumeChangesets(tmp);
      const changesetDir = join(tmp, ".changeset");
      const filesBefore = (await readdir(changesetDir)).filter((f) => f.endsWith(".md") && f !== "README.md");
      expect(filesBefore.length).toBeGreaterThan(0);
      await result.cleanup();
      const filesAfter = (await readdir(changesetDir)).filter((f) => f.endsWith(".md") && f !== "README.md");
      expect(filesAfter).toHaveLength(0);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it("consumeChangesets creates changelog on consume", async () => {
    const tmp = await makeTmpCopy("changeset-pkg");
    try {
      await consumeChangesets(tmp);
      const changelog = await readFile(join(tmp, "CHANGELOG.md"), "utf-8");
      expect(changelog).toContain("1.1.0");
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});
