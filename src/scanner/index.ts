import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CheckResult } from "../checker/index.js";
import { check } from "../checker/index.js";
import { parseGitHubUrl, discoverRepos } from "./github.js";
import { cloneRepoAsync, cleanupRepo, findPackageDirs } from "./clone.js";
import { SCAN_PROFILES } from "./profiles.js";
import type { Severity } from "../checker/framework/types.js";

export interface ScanOptions {
  url?: string;
  top?: number;
  json: boolean;
  fix?: boolean;
  concurrency?: number;
  minStars?: number;
  query?: string;
  severityOverrides?: Record<string, Severity | "off">;
  profile?: string;
}

export interface FixChange {
  field: string;
  before: unknown;
  after: unknown;
}

export interface PackageScanResult {
  name: string;
  dir: string;
  errors: number;
  warnings: number;
  infos: number;
  results: CheckResult[];
  fixChanges?: FixChange[];
}

export interface ScanError {
  repo: string;
  phase: "clone" | "discover" | "check";
  message: string;
}

export interface ScanResult {
  repo: string;
  packages: PackageScanResult[];
  errors?: ScanError[];
  timing?: { cloneMs: number; checkMs: number };
}

function diffPackageJson(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): FixChange[] {
  const changes: FixChange[] = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of allKeys) {
    const b = JSON.stringify(before[key]);
    const a = JSON.stringify(after[key]);
    if (b !== a) {
      changes.push({ field: key, before: before[key] ?? null, after: after[key] ?? null });
    }
  }
  return changes;
}

export async function parallelMap<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]!);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

export async function scan(
  options: ScanOptions,
  onProgress?: (msg: string) => void,
): Promise<ScanResult[]> {
  const targets: Array<{ repo: string; cloneUrl: string }> = [];

  if (options.url) {
    targets.push(parseGitHubUrl(options.url));
  } else if (options.top) {
    onProgress?.(`Discovering top ${options.top} TypeScript npm repos...`);
    const repos = await discoverRepos(options.top, {
      query: options.query,
      minStars: options.minStars,
    });
    for (const r of repos) {
      targets.push({ repo: r.repo, cloneUrl: r.cloneUrl });
    }
  }

  // Resolve severity overrides from profile
  let severityOverrides = options.severityOverrides;
  if (options.profile && options.profile in SCAN_PROFILES) {
    severityOverrides = {
      ...SCAN_PROFILES[options.profile],
      ...severityOverrides,
    };
  }

  const concurrency = options.concurrency ?? 3;

  async function scanOne(
    target: { repo: string; cloneUrl: string },
    index: number,
  ): Promise<ScanResult> {
    onProgress?.(`[${index + 1}/${targets.length}] ${target.repo}`);
    const scanErrors: ScanError[] = [];

    let repoDir: string;
    const cloneStart = Date.now();
    try {
      repoDir = await cloneRepoAsync(target.cloneUrl);
    } catch (err) {
      onProgress?.(`  Could not clone ${target.repo}, skipping`);
      return {
        repo: target.repo,
        packages: [],
        errors: [
          {
            repo: target.repo,
            phase: "clone",
            message: err instanceof Error ? err.message : String(err),
          },
        ],
        timing: { cloneMs: Date.now() - cloneStart, checkMs: 0 },
      };
    }
    const cloneMs = Date.now() - cloneStart;

    const checkStart = Date.now();
    try {
      const pkgDirs = findPackageDirs(repoDir);
      const packages: PackageScanResult[] = [];

      for (const pkgDir of pkgDirs) {
        const absDir = join(repoDir, pkgDir);
        try {
          const pkgRaw = readFileSync(join(absDir, "package.json"), "utf-8");
          const pkg = JSON.parse(pkgRaw);

          const checkResults = await check({
            dir: absDir,
            fix: false,
            strict: false,
            severityOverrides,
          });

          const errors = checkResults.filter((r) => r.severity === "error").length;
          const warnings = checkResults.filter((r) => r.severity === "warning").length;
          const infos = checkResults.filter((r) => r.severity === "info").length;

          let fixChanges: FixChange[] | undefined;

          if (options.fix && (errors > 0 || warnings > 0)) {
            const before = JSON.parse(pkgRaw) as Record<string, unknown>;
            await check({ dir: absDir, fix: true, strict: false, severityOverrides });
            const afterRaw = readFileSync(join(absDir, "package.json"), "utf-8");
            const after = JSON.parse(afterRaw) as Record<string, unknown>;
            fixChanges = diffPackageJson(before, after);
          }

          const summary = errors > 0 ? `${errors} error(s)` : warnings > 0 ? `${warnings} warning(s)` : "clean";
          const fixSummary = fixChanges && fixChanges.length > 0
            ? ` → ${fixChanges.length} field(s) would be fixed`
            : "";
          onProgress?.(`  ${pkg.name} — ${summary}${fixSummary}`);

          packages.push({
            name: pkg.name,
            dir: pkgDir,
            errors,
            warnings,
            infos,
            results: checkResults,
            ...(fixChanges && fixChanges.length > 0 ? { fixChanges } : {}),
          });
        } catch (err) {
          scanErrors.push({
            repo: target.repo,
            phase: "check",
            message: `${pkgDir}: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      }

      return {
        repo: target.repo,
        packages,
        ...(scanErrors.length > 0 ? { errors: scanErrors } : {}),
        timing: { cloneMs, checkMs: Date.now() - checkStart },
      };
    } finally {
      cleanupRepo(repoDir);
    }
  }

  return parallelMap(targets, concurrency, (target) =>
    scanOne(target, targets.indexOf(target)),
  );
}
