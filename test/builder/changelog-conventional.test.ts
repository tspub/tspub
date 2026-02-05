import { describe, it, expect } from "vitest";
import {
  parseConventionalCommit,
  isConventionalFormat,
} from "../../src/builder/changelog-conventional.js";

describe("conventional commit parsing", () => {
  it("parses feat commit", () => {
    const c = parseConventionalCommit("feat: add login page");
    expect(c).not.toBeNull();
    expect(c!.type).toBe("feat");
    expect(c!.scope).toBeNull();
    expect(c!.breaking).toBe(false);
    expect(c!.message).toBe("add login page");
  });

  it("parses fix with scope", () => {
    const c = parseConventionalCommit("fix(auth): handle expired tokens");
    expect(c).not.toBeNull();
    expect(c!.type).toBe("fix");
    expect(c!.scope).toBe("auth");
    expect(c!.message).toBe("handle expired tokens");
  });

  it("parses breaking change", () => {
    const c = parseConventionalCommit("feat(api)!: remove v1 endpoints");
    expect(c).not.toBeNull();
    expect(c!.breaking).toBe(true);
  });

  it("returns null for non-conventional", () => {
    expect(parseConventionalCommit("update readme")).toBeNull();
    expect(parseConventionalCommit("WIP")).toBeNull();
  });

  it("isConventionalFormat detects majority conventional", () => {
    expect(
      isConventionalFormat([
        "feat: add x",
        "fix: patch y",
        "chore: update deps",
        "random commit",
      ]),
    ).toBe(true);
  });

  it("isConventionalFormat returns false when minority", () => {
    expect(
      isConventionalFormat([
        "update readme",
        "fix stuff",
        "more changes",
        "feat: one thing",
      ]),
    ).toBe(false);
  });
});
