import type { VercelRequest, VercelResponse } from "@vercel/node";
import { gunzipSync } from "node:zlib";
import { mkdtempSync, mkdirSync, rmSync, readFileSync, existsSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { buildContext } from "../src/checker/framework/context.js";
import { runRules } from "../src/checker/framework/runner.js";
import { allRules } from "../src/checker/rules/index.js";
import { computeScore } from "./_lib/score.js";
import type { PackageJson } from "../src/shared/package-json.js";

const SKIP_RULES = new Set([
  "types/resolution",
  "types/missing-export-equals",
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const repo = req.query["repo"];
  if (!repo || typeof repo !== "string") {
    return res.status(400).json({ error: "Missing ?repo= parameter" });
  }

  // Validate repo format: user/repo
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    return res.status(400).json({ error: "Invalid repo format. Use: user/repo" });
  }

  let repoDir: string | undefined;

  try {
    // Download repo tarball via GitHub API and extract with pure Node.js
    repoDir = mkdtempSync(join(tmpdir(), "tspub-scan-"));
    const tarballUrl = `https://api.github.com/repos/${repo}/tarball`;
    const tarRes = await fetch(tarballUrl, {
      headers: { "User-Agent": "tspub-scan" },
      redirect: "follow",
    });
    if (!tarRes.ok) {
      throw new Error(
        tarRes.status === 404
          ? `Repository ${repo} not found`
          : `GitHub API error: ${tarRes.status}`,
      );
    }
    const gzipped = Buffer.from(await tarRes.arrayBuffer());
    extractTarGz(gzipped, repoDir);

    // Find package directories
    const pkgDirs = findPackageDirs(repoDir);
    const rules = allRules.filter((r) => !SKIP_RULES.has(r.meta.id));

    const packages: Array<{
      name: string;
      path: string;
      score: number;
      grade: string;
      categoryScores: Record<string, number>;
      errors: number;
      warnings: number;
      results: Array<{
        ruleId: string;
        severity: string;
        message: string;
        category: string;
        fixable: false | "safe" | "unsafe";
      }>;
    }> = [];

    for (const pkgDir of pkgDirs) {
      const absDir = join(repoDir, pkgDir);
      try {
        const pkgRaw = readFileSync(join(absDir, "package.json"), "utf-8");
        const pkg = JSON.parse(pkgRaw) as PackageJson;
        if (!pkg.name || !pkg.version) continue;

        const ctx = await buildContext(pkg, absDir);
        const { diagnostics } = await runRules(rules, ctx, {
          dir: absDir,
          pkg,
          fix: false,
        });

        const results = diagnostics.map((d) => {
          const rule = rules.find((r) => r.meta.id === d.ruleId);
          return {
            ruleId: d.ruleId,
            severity: d.severity,
            message: d.message,
            category: d.ruleId.split("/")[0]!,
            fixable: rule?.meta.fixable ?? (false as const),
          };
        });

        const rulesPerCategory: Record<string, number> = {};
        for (const r of rules) {
          const cat = r.meta.id.split("/")[0]!;
          rulesPerCategory[cat] = (rulesPerCategory[cat] ?? 0) + 1;
        }
        const score = computeScore(results, rulesPerCategory);
        const errors = results.filter((r) => r.severity === "error").length;
        const warnings = results.filter((r) => r.severity === "warning").length;

        packages.push({
          name: pkg.name,
          path: pkgDir,
          score: score.total,
          grade: score.grade,
          categoryScores: score.categories,
          errors,
          warnings,
          results,
        });
      } catch {
        // Skip packages that fail to parse/check
      }
    }

    // Aggregate top issues
    const issueCounts = new Map<string, number>();
    for (const p of packages) {
      for (const r of p.results) {
        if (r.severity === "error" || r.severity === "warning") {
          issueCounts.set(r.ruleId, (issueCounts.get(r.ruleId) ?? 0) + 1);
        }
      }
    }
    const topIssues = [...issueCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ruleId, count]) => {
        const sample = packages
          .flatMap((p) => p.results)
          .find((r) => r.ruleId === ruleId);
        return { ruleId, count, message: sample?.message ?? "" };
      });

    // Overall score (average of packages)
    const overallScore =
      packages.length > 0
        ? Math.round(
            packages.reduce((sum, p) => sum + p.score, 0) / packages.length,
          )
        : 0;

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=1800, stale-while-revalidate=86400",
    );
    res.setHeader("Access-Control-Allow-Origin", "*");

    return res.status(200).json({
      repo,
      overallScore,
      packageCount: packages.length,
      packages,
      topIssues,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("not found") ? 404 : 500;
    return res.status(status).json({ error: message });
  } finally {
    if (repoDir) {
      try {
        rmSync(repoDir, { recursive: true, force: true });
      } catch {
        // Cleanup
      }
    }
  }
}

function findPackageDirs(repoDir: string): string[] {
  const dirs: string[] = [];

  if (existsSync(join(repoDir, "package.json"))) {
    try {
      const pkg = JSON.parse(readFileSync(join(repoDir, "package.json"), "utf-8"));
      if (pkg.name && pkg.version) dirs.push(".");
    } catch { /* skip */ }
  }

  // Check workspace globs
  try {
    const pkgRaw = readFileSync(join(repoDir, "package.json"), "utf-8");
    const pkg = JSON.parse(pkgRaw);
    let globs: string[] | undefined;
    if (Array.isArray(pkg.workspaces)) {
      globs = pkg.workspaces;
    } else if (pkg.workspaces?.packages) {
      globs = pkg.workspaces.packages;
    }
    if (globs) {
      for (const g of globs) {
        const base = join(repoDir, g.replace(/\/\*\*?$/, "").replace(/\/$/, ""));
        if (!existsSync(base)) continue;
        try {
          for (const entry of readdirSync(base, { withFileTypes: true })) {
            if (!entry.isDirectory()) continue;
            const pkgPath = join(base, entry.name, "package.json");
            if (existsSync(pkgPath)) {
              try {
                const p = JSON.parse(readFileSync(pkgPath, "utf-8"));
                if (p.name && p.version) {
                  dirs.push(
                    join(g.replace(/\/\*\*?$/, "").replace(/\/$/, ""), entry.name),
                  );
                }
              } catch { /* skip */ }
            }
          }
        } catch { /* skip */ }
      }
      if (dirs.length > 0) return dirs;
    }
  } catch { /* skip */ }

  // Fallback: scan common directories
  for (const pattern of ["packages", "libs", "apps"]) {
    const base = join(repoDir, pattern);
    if (!existsSync(base)) continue;
    try {
      for (const entry of readdirSync(base, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const pkgPath = join(base, entry.name, "package.json");
        if (existsSync(pkgPath)) {
          try {
            const p = JSON.parse(readFileSync(pkgPath, "utf-8"));
            if (p.name && p.version) dirs.push(join(pattern, entry.name));
          } catch { /* skip */ }
        }
      }
    } catch { /* skip */ }
  }

  return dirs;
}

/** Extract a .tar.gz buffer to outDir, stripping the first path component. */
function extractTarGz(gzipped: Buffer, outDir: string) {
  const data = gunzipSync(gzipped);
  let offset = 0;

  while (offset < data.length - 512) {
    const header = data.subarray(offset, offset + 512);
    // End of archive: two consecutive zero blocks
    if (header.every((b) => b === 0)) break;

    const nameRaw = header.subarray(0, 100).toString("utf-8").replaceAll("\0", "");
    const sizeOctal = header.subarray(124, 136).toString("utf-8").replaceAll("\0", "").trim();
    const typeFlag = header[156];
    const prefix = header.subarray(345, 500).toString("utf-8").replaceAll("\0", "");

    const fullName = prefix ? `${prefix}/${nameRaw}` : nameRaw;
    const size = sizeOctal ? parseInt(sizeOctal, 8) : 0;

    offset += 512; // move past header

    // Strip first path component (e.g. "owner-repo-sha/")
    const parts = fullName.split("/");
    const stripped = parts.slice(1).join("/");

    if (stripped && typeFlag === 53) {
      // Directory (type '5' = ASCII 53)
      mkdirSync(join(outDir, stripped), { recursive: true });
    } else if (stripped && (typeFlag === 48 || typeFlag === 0)) {
      // Regular file (type '0' = ASCII 48, or null) — include 0-byte files
      const filePath = join(outDir, stripped);
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, size > 0 ? data.subarray(offset, offset + size) : Buffer.alloc(0));
    }

    // Advance past file data (rounded up to 512-byte blocks)
    offset += Math.ceil(size / 512) * 512;
  }
}
