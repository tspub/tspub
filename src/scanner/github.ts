export interface RepoInfo {
  repo: string;
  cloneUrl: string;
  stars: number;
}

export function parseGitHubUrl(url: string): { repo: string; cloneUrl: string } {
  const match = url.match(
    /github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?(?:\/)?$/,
  );
  if (!match) {
    throw new Error(`Invalid GitHub URL: ${url}`);
  }
  const repo = match[1]!;
  return { repo, cloneUrl: `https://github.com/${repo}.git` };
}

export interface DiscoverOptions {
  query?: string;
  minStars?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function discoverRepos(
  count: number,
  options?: DiscoverOptions,
): Promise<RepoInfo[]> {
  const results: RepoInfo[] = [];
  const perPage = Math.min(count, 100);
  let page = 1;
  const minStars = options?.minStars ?? 100;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  while (results.length < count) {
    const q = encodeURIComponent(
      options?.query ?? `language:TypeScript stars:>${minStars}`,
    );
    const url = `https://api.github.com/search/repositories?q=${q}&sort=stars&per_page=${perPage}&page=${page}`;

    let res: Response | undefined;
    let lastError: Error | undefined;

    // Retry on 5xx errors
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        res = await fetch(url, { headers });
        if (res.status < 500) break;
        lastError = new Error(`GitHub API error: ${res.status}`);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
      if (attempt < 2) await sleep(1000 * Math.pow(2, attempt));
    }

    if (!res) {
      throw lastError ?? new Error("GitHub API request failed");
    }

    if (res.status === 403 || res.status === 429) {
      throw new Error(
        "GitHub API rate limit reached. Set GITHUB_TOKEN env var for higher limits.",
      );
    }
    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as {
      items: Array<{
        full_name: string;
        clone_url: string;
        stargazers_count: number;
      }>;
    };

    if (data.items.length === 0) break;

    for (const item of data.items) {
      if (results.length >= count) break;
      if (item.stargazers_count < minStars) continue;
      results.push({
        repo: item.full_name,
        cloneUrl: item.clone_url,
        stars: item.stargazers_count,
      });
    }

    page++;
    if (page > 10) break;
  }

  return results;
}
