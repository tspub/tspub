import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createGitHubRelease, parseGitHubRepo, extractReleaseNotes } from "../../src/publisher/github.js";
import { writeFileSync, mkdirSync, rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("parseGitHubRepo", () => {
  it("parses shorthand user/repo", () => {
    const result = parseGitHubRepo({ repository: "user/repo" });
    expect(result).toEqual({ owner: "user", repo: "repo" });
  });

  it("parses HTTPS URL", () => {
    const result = parseGitHubRepo({ repository: { type: "git", url: "https://github.com/user/repo" } });
    expect(result).toEqual({ owner: "user", repo: "repo" });
  });

  it("parses git+https URL", () => {
    const result = parseGitHubRepo({ repository: { type: "git", url: "git+https://github.com/user/repo.git" } });
    expect(result).toEqual({ owner: "user", repo: "repo" });
  });

  it("returns null for non-GitHub URL", () => {
    const result = parseGitHubRepo({ repository: { type: "git", url: "https://gitlab.com/user/repo" } });
    expect(result).toBeNull();
  });

  it("returns null with no repository", () => {
    expect(parseGitHubRepo({})).toBeNull();
  });
});

describe("extractReleaseNotes", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "tspub-gh-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("extracts notes for a specific version", () => {
    const changelogPath = join(tmpDir, "CHANGELOG.md");
    writeFileSync(changelogPath, "# Changelog\n\n## 1.1.0\n\n- Added feature\n- Fixed bug\n\n## 1.0.0\n\n- Initial release\n");
    const notes = extractReleaseNotes(changelogPath, "1.1.0");
    expect(notes).toBe("- Added feature\n- Fixed bug");
  });

  it("returns empty string when version not found", () => {
    const changelogPath = join(tmpDir, "CHANGELOG.md");
    writeFileSync(changelogPath, "# Changelog\n\n## 1.0.0\n\n- Initial\n");
    expect(extractReleaseNotes(changelogPath, "2.0.0")).toBe("");
  });

  it("returns empty string when file doesn't exist", () => {
    expect(extractReleaseNotes(join(tmpDir, "nope.md"), "1.0.0")).toBe("");
  });
});

describe("createGitHubRelease", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("sends draft flag in payload", async () => {
    let capturedBody: string | undefined;
    globalThis.fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = init?.body as string;
      return new Response(JSON.stringify({ html_url: "https://github.com/u/r/releases/1", id: 1 }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });

    const result = await createGitHubRelease({
      owner: "user",
      repo: "repo",
      tag: "v1.0.0",
      name: "v1.0.0",
      body: "Release notes",
      prerelease: false,
      token: "ghp_test",
      draft: true,
    });

    expect(result.ok).toBe(true);
    const parsed = JSON.parse(capturedBody!);
    expect(parsed.draft).toBe(true);
  });

  it("sends draft: false by default", async () => {
    let capturedBody: string | undefined;
    globalThis.fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = init?.body as string;
      return new Response(JSON.stringify({ html_url: "https://github.com/u/r/releases/1", id: 1 }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });

    await createGitHubRelease({
      owner: "user",
      repo: "repo",
      tag: "v1.0.0",
      name: "v1.0.0",
      body: "",
      prerelease: false,
      token: "ghp_test",
    });

    const parsed = JSON.parse(capturedBody!);
    expect(parsed.draft).toBe(false);
  });

  it("reports asset upload failures without failing the release", async () => {
    let callCount = 0;
    const tmpDir = mkdtempSync(join(tmpdir(), "tspub-gh-asset-"));
    const assetPath = join(tmpDir, "artifact.tar.gz");
    writeFileSync(assetPath, "fake content");

    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      callCount++;
      const urlStr = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
      if (urlStr.includes("uploads.github.com")) {
        return new Response("Too large", { status: 413 });
      }
      return new Response(JSON.stringify({ html_url: "https://github.com/u/r/releases/1", id: 42 }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });

    const result = await createGitHubRelease({
      owner: "user",
      repo: "repo",
      tag: "v1.0.0",
      name: "v1.0.0",
      body: "",
      prerelease: false,
      token: "ghp_test",
      assets: ["*.tar.gz"],
      assetDir: tmpDir,
    });

    expect(result.ok).toBe(true); // release itself succeeded
    expect(result.error).toContain("Asset upload failures");
    expect(result.error).toContain("413");

    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("reports failure when release creation fails", async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response("Not Found", { status: 404 });
    });

    const result = await createGitHubRelease({
      owner: "user",
      repo: "repo",
      tag: "v1.0.0",
      name: "v1.0.0",
      body: "",
      prerelease: false,
      token: "ghp_bad",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("404");
  });
});
