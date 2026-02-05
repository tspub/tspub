import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseGitHubUrl, discoverRepos } from "../../src/scanner/github.js";

describe("parseGitHubUrl", () => {
  it("parses standard GitHub URL", () => {
    const result = parseGitHubUrl("https://github.com/user/repo");
    expect(result.repo).toBe("user/repo");
    expect(result.cloneUrl).toBe("https://github.com/user/repo.git");
  });

  it("parses GitHub URL with .git suffix", () => {
    const result = parseGitHubUrl("https://github.com/user/repo.git");
    expect(result.repo).toBe("user/repo");
    expect(result.cloneUrl).toBe("https://github.com/user/repo.git");
  });

  it("parses GitHub URL with trailing slash", () => {
    const result = parseGitHubUrl("https://github.com/user/repo/");
    expect(result.repo).toBe("user/repo");
  });

  it("throws on invalid URL", () => {
    expect(() => parseGitHubUrl("https://example.com/foo")).toThrow("Invalid GitHub URL");
  });

  it("parses git@ SSH URL", () => {
    const result = parseGitHubUrl("git@github.com:user/repo.git");
    expect(result.repo).toBe("user/repo");
    expect(result.cloneUrl).toBe("https://github.com/user/repo.git");
  });
});

describe("discoverRepos", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    delete process.env.GITHUB_TOKEN;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("filters by minStars", async () => {
    const mockResponse = {
      items: [
        {
          full_name: "user/repo1",
          clone_url: "https://github.com/user/repo1.git",
          stargazers_count: 500,
        },
        {
          full_name: "user/repo2",
          clone_url: "https://github.com/user/repo2.git",
          stargazers_count: 50,
        },
        {
          full_name: "user/repo3",
          clone_url: "https://github.com/user/repo3.git",
          stargazers_count: 200,
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    const results = await discoverRepos(2, { minStars: 150 });

    expect(results).toHaveLength(2);
    expect(results[0]?.repo).toBe("user/repo1");
    expect(results[0]?.stars).toBe(500);
    expect(results[1]?.repo).toBe("user/repo3");
    expect(results[1]?.stars).toBe(200);
  });

  it("retries on 5xx errors", async () => {
    let attempt = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      attempt++;
      if (attempt === 1) {
        return {
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              full_name: "user/repo",
              clone_url: "https://github.com/user/repo.git",
              stargazers_count: 1000,
            },
          ],
        }),
      };
    });

    const results = await discoverRepos(1, { minStars: 100 });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(1);
    expect(results[0]?.repo).toBe("user/repo");
  });

  it("throws on rate limit (403)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
    });

    await expect(discoverRepos(1)).rejects.toThrow(/rate limit/);
  });

  it("throws on rate limit (429)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
    });

    await expect(discoverRepos(1)).rejects.toThrow(/rate limit/);
  });

  it("respects count parameter", async () => {
    const mockResponse = {
      items: Array.from({ length: 10 }, (_, i) => ({
        full_name: `user/repo${i}`,
        clone_url: `https://github.com/user/repo${i}.git`,
        stargazers_count: 1000 + i,
      })),
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    const results = await discoverRepos(5);

    expect(results).toHaveLength(5);
  });

  it("uses custom query when provided", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [] }),
    });

    await discoverRepos(1, { query: "react in:name" });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("q=react%20in%3Aname"),
      expect.anything()
    );
  });

  it("adds GitHub token to headers if present", async () => {
    process.env.GITHUB_TOKEN = "test-token";

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [] }),
    });

    await discoverRepos(1);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );
  });
});
