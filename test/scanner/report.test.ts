import { describe, it, expect } from "vitest";
import { generateMarkdownReport, generateSummaryStats } from "../../src/scanner/report.js";
import type { ScanResult } from "../../src/scanner/index.js";

describe("generateSummaryStats", () => {
  it("returns correct counts for empty results", () => {
    const stats = generateSummaryStats([]);

    expect(stats.totalRepos).toBe(0);
    expect(stats.totalPackages).toBe(0);
    expect(stats.reposWithErrors).toBe(0);
    expect(stats.reposWithWarningsOnly).toBe(0);
    expect(stats.cleanRepos).toBe(0);
    expect(stats.totalErrors).toBe(0);
    expect(stats.totalWarnings).toBe(0);
    expect(stats.topIssues).toEqual([]);
  });

  it("calculates correct summary statistics", () => {
    const results: ScanResult[] = [
      {
        repo: "user/repo1",
        packages: [
          {
            name: "pkg1",
            dir: ".",
            errors: 2,
            warnings: 3,
            infos: 1,
            results: [
              { ruleId: "test/rule1", message: "Missing field", severity: "error" },
              { ruleId: "test/rule2", message: "Missing field", severity: "error" },
              { ruleId: "test/rule3", message: "Deprecated usage", severity: "warning" },
              { ruleId: "test/rule4", message: "Deprecated usage", severity: "warning" },
              { ruleId: "test/rule5", message: "Consider adding", severity: "warning" },
              { ruleId: "test/rule6", message: "Info message", severity: "info" },
            ],
          },
        ],
      },
      {
        repo: "user/repo2",
        packages: [
          {
            name: "pkg2",
            dir: ".",
            errors: 0,
            warnings: 1,
            infos: 0,
            results: [
              { ruleId: "test/rule7", message: "Deprecated usage", severity: "warning" },
            ],
          },
        ],
      },
      {
        repo: "user/repo3",
        packages: [
          {
            name: "pkg3",
            dir: ".",
            errors: 0,
            warnings: 0,
            infos: 0,
            results: [],
          },
        ],
      },
    ];

    const stats = generateSummaryStats(results);

    expect(stats.totalRepos).toBe(3);
    expect(stats.totalPackages).toBe(3);
    expect(stats.reposWithErrors).toBe(1);
    expect(stats.reposWithWarningsOnly).toBe(1);
    expect(stats.cleanRepos).toBe(1);
    expect(stats.totalErrors).toBe(2);
    expect(stats.totalWarnings).toBe(4);
    expect(stats.topIssues).toHaveLength(3);
    expect(stats.topIssues[0]?.message).toBe("Deprecated usage");
    expect(stats.topIssues[0]?.count).toBe(3);
  });

  it("handles repos with multiple packages", () => {
    const results: ScanResult[] = [
      {
        repo: "user/monorepo",
        packages: [
          {
            name: "pkg1",
            dir: "packages/pkg1",
            errors: 1,
            warnings: 0,
            infos: 0,
            results: [
              { ruleId: "test/rule", message: "Error", severity: "error" },
            ],
          },
          {
            name: "pkg2",
            dir: "packages/pkg2",
            errors: 0,
            warnings: 2,
            infos: 0,
            results: [
              { ruleId: "test/rule", message: "Warning", severity: "warning" },
              { ruleId: "test/rule", message: "Warning", severity: "warning" },
            ],
          },
        ],
      },
    ];

    const stats = generateSummaryStats(results);

    expect(stats.totalRepos).toBe(1);
    expect(stats.totalPackages).toBe(2);
    expect(stats.reposWithErrors).toBe(1);
    expect(stats.totalErrors).toBe(1);
    expect(stats.totalWarnings).toBe(2);
  });

  it("limits top issues to 10", () => {
    const results: ScanResult[] = [
      {
        repo: "user/repo",
        packages: [
          {
            name: "pkg",
            dir: ".",
            errors: 15,
            warnings: 0,
            infos: 0,
            results: Array.from({ length: 15 }, (_, i) => ({
              ruleId: `test/rule${i}`,
              message: `Issue ${i}`,
              severity: "error" as const,
            })),
          },
        ],
      },
    ];

    const stats = generateSummaryStats(results);

    expect(stats.topIssues).toHaveLength(10);
  });
});

describe("generateMarkdownReport", () => {
  it("returns string with markdown table headers", () => {
    const results: ScanResult[] = [
      {
        repo: "user/repo",
        packages: [
          {
            name: "pkg",
            dir: ".",
            errors: 1,
            warnings: 2,
            infos: 0,
            results: [],
          },
        ],
      },
    ];

    const report = generateMarkdownReport(results);

    expect(report).toContain("# tspub Scan Report");
    expect(report).toContain("## Summary");
    expect(report).toContain("| Metric | Value |");
    expect(report).toContain("| --- | --- |");
    expect(report).toContain("## Results by Repository");
    expect(report).toContain("| Repo | Packages | Errors | Warnings |");
  });

  it("handles empty results", () => {
    const report = generateMarkdownReport([]);

    expect(report).toContain("# tspub Scan Report");
    expect(report).toContain("| Repos scanned | 0 |");
    expect(report).toContain("| Packages checked | 0 |");
  });

  it("includes top issues section when present", () => {
    const results: ScanResult[] = [
      {
        repo: "user/repo",
        packages: [
          {
            name: "pkg",
            dir: ".",
            errors: 2,
            warnings: 0,
            infos: 0,
            results: [
              { ruleId: "test/rule", message: "Missing field", severity: "error" },
              { ruleId: "test/rule", message: "Missing field", severity: "error" },
            ],
          },
        ],
      },
    ];

    const report = generateMarkdownReport(results);

    expect(report).toContain("## Top Issues");
    expect(report).toContain("| Count | Issue |");
    expect(report).toContain("Missing field");
  });

  it("formats repository results correctly", () => {
    const results: ScanResult[] = [
      {
        repo: "user/repo1",
        packages: [
          {
            name: "pkg1",
            dir: ".",
            errors: 5,
            warnings: 3,
            infos: 0,
            results: [],
          },
        ],
      },
      {
        repo: "user/repo2",
        packages: [
          {
            name: "pkg2a",
            dir: "packages/a",
            errors: 0,
            warnings: 1,
            infos: 0,
            results: [],
          },
          {
            name: "pkg2b",
            dir: "packages/b",
            errors: 0,
            warnings: 0,
            infos: 0,
            results: [],
          },
        ],
      },
    ];

    const report = generateMarkdownReport(results);

    expect(report).toContain("| user/repo1 | 1 | 5 | 3 |");
    expect(report).toContain("| user/repo2 | 2 | 0 | 1 |");
  });

  it("includes scan errors in error count", () => {
    const results: ScanResult[] = [
      {
        repo: "user/repo",
        packages: [],
        errors: [
          {
            repo: "user/repo",
            phase: "clone",
            message: "Failed to clone",
          },
        ],
      },
    ];

    const report = generateMarkdownReport(results);

    expect(report).toContain("| user/repo | 0 | 1 | 0 |");
  });
});
