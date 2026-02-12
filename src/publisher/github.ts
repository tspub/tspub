import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import fg from "fast-glob";
import type { PackageJson } from "../shared/package-json.js";

export interface GitHubReleaseOptions {
  owner: string;
  repo: string;
  tag: string;
  name: string;
  body: string;
  prerelease: boolean;
  token: string;
  draft?: boolean;
  assets?: string[];
  /** Base directory for resolving asset glob patterns */
  assetDir?: string;
}

export async function createGitHubRelease(
  opts: GitHubReleaseOptions,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(opts.owner)}/${encodeURIComponent(opts.repo)}/releases`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${opts.token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
          tag_name: opts.tag,
          name: opts.name,
          body: opts.body,
          prerelease: opts.prerelease,
          draft: opts.draft ?? false,
        }),
      },
    );

    if (res.ok) {
      const data = (await res.json()) as { html_url?: string; id?: number; upload_url?: string };

      // Upload assets if specified
      const assetErrors: string[] = [];
      if (opts.assets?.length && data.id) {
        const resolvedPaths = await resolveAssetPaths(opts.assets, opts.assetDir ?? ".");
        for (const assetPath of resolvedPaths) {
          const result = await uploadReleaseAsset(opts.token, opts.owner, opts.repo, data.id, assetPath);
          if (!result.ok) {
            assetErrors.push(`${result.name}: ${result.error}`);
          }
        }
      }

      if (assetErrors.length > 0) {
        return { ok: true, url: data.html_url, error: `Asset upload failures: ${assetErrors.join("; ")}` };
      }
      return { ok: true, url: data.html_url };
    }

    const text = await res.text();
    return { ok: false, error: `${res.status}: ${text}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function parseGitHubRepo(
  pkg: PackageJson,
): { owner: string; repo: string } | null {
  const repo = pkg.repository;
  if (!repo) return null;

  let url: string | undefined;
  if (typeof repo === "string") {
    // "user/repo" shorthand
    if (/^[\w.-]+\/[\w.-]+$/.test(repo)) {
      const [owner, name] = repo.split("/");
      return { owner: owner!, repo: name! };
    }
    url = repo;
  } else if (typeof repo === "object" && repo.url) {
    url = repo.url;
  }

  if (!url) return null;

  // Handle git+https://github.com/user/repo.git, https://github.com/user/repo, etc.
  const match = url.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
  if (!match) return null;

  return { owner: match[1]!, repo: match[2]! };
}

export function extractReleaseNotes(
  changelogPath: string,
  version: string,
): string {
  let content: string;
  try {
    content = readFileSync(changelogPath, "utf-8");
  } catch {
    return "";
  }

  const lines = content.split("\n");
  let inSection = false;
  const sectionLines: string[] = [];

  for (const line of lines) {
    if (/^##\s/.test(line)) {
      if (inSection) break;
      if (line.includes(version)) {
        inSection = true;
        continue;
      }
    } else if (inSection) {
      sectionLines.push(line);
    }
  }

  return sectionLines.join("\n").trim();
}

async function resolveAssetPaths(patterns: string[], cwd: string): Promise<string[]> {
  return fg(patterns, { cwd, absolute: true });
}

async function uploadReleaseAsset(
  token: string,
  owner: string,
  repo: string,
  releaseId: number,
  assetPath: string,
): Promise<{ ok: boolean; name: string; error?: string }> {
  const fileName = basename(assetPath);
  const content = await readFile(assetPath);
  const url = `https://uploads.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/${releaseId}/assets?name=${encodeURIComponent(fileName)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/octet-stream",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: content,
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, name: fileName, error: `${res.status}: ${text}` };
    }
    return { ok: true, name: fileName };
  } catch (err) {
    return { ok: false, name: fileName, error: err instanceof Error ? err.message : String(err) };
  }
}
