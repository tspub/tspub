import type { ScanResult } from "./index.js";

export interface ScanSummary {
  totalRepos: number;
  totalPackages: number;
  reposWithErrors: number;
  reposWithWarningsOnly: number;
  cleanRepos: number;
  totalErrors: number;
  totalWarnings: number;
  topIssues: Array<{ message: string; count: number }>;
}

export function generateSummaryStats(results: ScanResult[]): ScanSummary {
  const totalRepos = results.length;
  const totalPackages = results.reduce(
    (sum, r) => sum + r.packages.length,
    0,
  );

  let totalErrors = 0;
  let totalWarnings = 0;
  const issueCounts = new Map<string, number>();

  for (const result of results) {
    for (const pkg of result.packages) {
      totalErrors += pkg.errors;
      totalWarnings += pkg.warnings;
      for (const r of pkg.results) {
        if (r.severity === "error" || r.severity === "warning") {
          issueCounts.set(r.message, (issueCounts.get(r.message) ?? 0) + 1);
        }
      }
    }
  }

  const reposWithErrors = results.filter((r) =>
    r.packages.some((p) => p.errors > 0),
  ).length;
  const reposWithWarningsOnly = results.filter(
    (r) =>
      r.packages.some((p) => p.warnings > 0) &&
      !r.packages.some((p) => p.errors > 0),
  ).length;
  const cleanRepos = totalRepos - reposWithErrors - reposWithWarningsOnly;

  const topIssues = [...issueCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([message, count]) => ({ message, count }));

  return {
    totalRepos,
    totalPackages,
    reposWithErrors,
    reposWithWarningsOnly,
    cleanRepos,
    totalErrors,
    totalWarnings,
    topIssues,
  };
}

export function generateMarkdownReport(results: ScanResult[]): string {
  const stats = generateSummaryStats(results);
  const lines: string[] = [];

  lines.push("# tspub Scan Report");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Repos scanned | ${stats.totalRepos} |`);
  lines.push(`| Packages checked | ${stats.totalPackages} |`);
  lines.push(`| Clean repos | ${stats.cleanRepos} |`);
  lines.push(`| Repos with warnings | ${stats.reposWithWarningsOnly} |`);
  lines.push(`| Repos with errors | ${stats.reposWithErrors} |`);
  lines.push(`| Total errors | ${stats.totalErrors} |`);
  lines.push(`| Total warnings | ${stats.totalWarnings} |`);
  lines.push("");

  if (stats.topIssues.length > 0) {
    lines.push("## Top Issues");
    lines.push("");
    lines.push("| Count | Issue |");
    lines.push("| --- | --- |");
    for (const issue of stats.topIssues) {
      lines.push(`| ${issue.count} | ${issue.message} |`);
    }
    lines.push("");
  }

  lines.push("## Results by Repository");
  lines.push("");
  lines.push("| Repo | Packages | Errors | Warnings |");
  lines.push("| --- | --- | --- | --- |");

  for (const result of results) {
    const errors = result.packages.reduce((s, p) => s + p.errors, 0);
    const warnings = result.packages.reduce((s, p) => s + p.warnings, 0);
    const scanErrors = result.errors?.length ?? 0;
    lines.push(
      `| ${result.repo} | ${result.packages.length} | ${errors + scanErrors} | ${warnings} |`,
    );
  }

  lines.push("");
  return lines.join("\n");
}
