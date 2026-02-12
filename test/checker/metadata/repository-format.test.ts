import { describe, it, expect } from "vitest";
import { repositoryFormatRule } from "../../../src/checker/rules/metadata/repository-format.js";

const baseCtx = { dir: "/tmp", compilerOptions: null, hasBuildOutput: false, distFiles: [], allJsFiles: [], hasUnresolvedExtends: false };

describe("metadata/repository-format", () => {
  it("passes with shorthand user/repo", async () => {
    const results = await repositoryFormatRule.check({
      ...baseCtx,
      pkg: { repository: "user/repo" },
    });
    expect(results).toHaveLength(0);
  });

  it("passes with git URL", async () => {
    const results = await repositoryFormatRule.check({
      ...baseCtx,
      pkg: { repository: "https://github.com/user/repo.git" },
    });
    expect(results).toHaveLength(0);
  });

  it("passes with https URL", async () => {
    const results = await repositoryFormatRule.check({
      ...baseCtx,
      pkg: { repository: "https://github.com/user/repo" },
    });
    expect(results).toHaveLength(0);
  });

  it("warns with invalid string", async () => {
    const results = await repositoryFormatRule.check({
      ...baseCtx,
      pkg: { repository: "not a valid repo" },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe("warning");
  });

  it("passes with valid object form", async () => {
    const results = await repositoryFormatRule.check({
      ...baseCtx,
      pkg: { repository: { type: "git", url: "https://github.com/user/repo.git" } },
    });
    expect(results).toHaveLength(0);
  });

  it("warns when object is missing url", async () => {
    const results = await repositoryFormatRule.check({
      ...baseCtx,
      pkg: { repository: { type: "git" } as unknown as string },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.message).toContain("url");
  });

  it("warns with invalid url in object", async () => {
    const results = await repositoryFormatRule.check({
      ...baseCtx,
      pkg: { repository: { type: "git", url: "not valid" } },
    });
    expect(results).toHaveLength(1);
  });

  it("passes when no repository field", async () => {
    const results = await repositoryFormatRule.check({
      ...baseCtx,
      pkg: {},
    });
    expect(results).toHaveLength(0);
  });

  it("passes with git+https URL", async () => {
    const results = await repositoryFormatRule.check({
      ...baseCtx,
      pkg: { repository: "git+https://github.com/user/repo.git" },
    });
    expect(results).toHaveLength(0);
  });
});
