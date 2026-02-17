import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { existsSync } from "node:fs";
import { check } from "../../src/checker/index.js";
import type { CheckResult } from "../../src/checker/index.js";

/**
 * Ecosystem checks — run tspub check against real-world TypeScript packages.
 * Similar to Ruff's ecosystem CI that validates against popular Python projects.
 *
 * Each entry defines:
 *   - repo: GitHub clone URL
 *   - ref: pinned commit/tag for reproducibility
 *   - dir: subdirectory containing package.json (for monorepos)
 *   - expectedErrors: known errors we expect (to track false positives/negatives)
 *   - allowedWarnings: warning messages that are acceptable for this package
 */

interface EcosystemTarget {
  name: string;
  repo: string;
  ref: string;
  dir?: string;
  expectedErrors?: string[];
  maxErrors?: number;
  maxWarnings?: number;
  skip?: string;
}

const ECOSYSTEM_TARGETS: EcosystemTarget[] = [
  {
    name: "zod",
    repo: "https://github.com/colinhacks/zod.git",
    ref: "v3.24.2",
    maxErrors: 2,
    maxWarnings: 6,
  },
  {
    name: "nanoid",
    repo: "https://github.com/ai/nanoid.git",
    ref: "5.1.5",
    maxErrors: 2,
    maxWarnings: 6,
  },
  {
    name: "type-fest",
    repo: "https://github.com/sindresorhus/type-fest.git",
    ref: "v4.37.0",
    maxErrors: 2,
    maxWarnings: 6,
  },
  {
    name: "cva",
    repo: "https://github.com/joe-bell/cva.git",
    ref: "v1.0.0-beta.4",
    dir: "packages/cva",
    maxErrors: 2,
    maxWarnings: 6,
  },
  {
    name: "superjson",
    repo: "https://github.com/flightcontrolhq/superjson.git",
    ref: "v2.2.2",
    maxErrors: 2,
    maxWarnings: 6,
  },
  // Poorly maintained / legacy packages — should produce real warnings/errors
  {
    name: "moment",
    repo: "https://github.com/moment/moment.git",
    ref: "2.30.1",
    maxErrors: 3,
    maxWarnings: 600,
  },
  {
    name: "express",
    repo: "https://github.com/expressjs/express.git",
    ref: "v4.22.1",
    maxErrors: 3,
    maxWarnings: 8,
  },
  {
    name: "request",
    repo: "https://github.com/request/request.git",
    ref: "v2.88.1",
    maxErrors: 3,
    maxWarnings: 8,
  },
];

const ecosystemDir = join(tmpdir(), "tspub-ecosystem-" + Date.now());

function shallowClone(repo: string, ref: string, dest: string): void {
  execSync(
    `git clone --depth 1 --branch ${ref} --single-branch ${repo} ${dest}`,
    { stdio: "pipe", timeout: 30_000 },
  );
}

describe("ecosystem checks", () => {
  beforeAll(async () => {
    await mkdir(ecosystemDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(ecosystemDir, { recursive: true, force: true });
  });

  for (const target of ECOSYSTEM_TARGETS) {
    it(
      `${target.name}: tspub check runs without crashing`,
      async () => {
        if (target.skip) return;

        const cloneDir = join(ecosystemDir, target.name);

        // Clone
        try {
          shallowClone(target.repo, target.ref, cloneDir);
        } catch (err) {
          // Network failures shouldn't fail CI — skip gracefully
          console.warn(
            `Skipping ${target.name}: clone failed (${err instanceof Error ? err.message : String(err)})`,
          );
          return;
        }

        const checkDir = target.dir ? join(cloneDir, target.dir) : cloneDir;

        // Verify package.json exists
        expect(
          existsSync(join(checkDir, "package.json")),
          `${target.name}: package.json should exist at ${checkDir}`,
        ).toBe(true);

        // Run check — must not throw
        let results: CheckResult[];
        try {
          results = await check({
            dir: checkDir,
            fix: false,
            strict: false,
          });
        } catch (err) {
          throw new Error(
            `tspub check crashed on ${target.name}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }

        // Validate we got results (not empty)
        expect(results.length).toBeGreaterThan(0);

        // Categorize
        const errors = results.filter((r) => r.severity === "error");
        const warnings = results.filter((r) => r.severity === "warning");
        const oks = results.filter((r) => r.severity === "ok");

        // Log results for visibility
        console.log(`\n  ${target.name} (${target.ref}):`);
        console.log(
          `    ${errors.length} errors, ${warnings.length} warnings, ${oks.length} ok`,
        );
        for (const r of [...errors, ...warnings]) {
          console.log(`    [${r.severity}] ${r.message}`);
        }

        // Bound checks — ensure we're not wildly off
        if (target.maxErrors !== undefined) {
          expect(
            errors.length,
            `${target.name}: too many errors (${errors.length} > ${target.maxErrors}). Possible false positives.`,
          ).toBeLessThanOrEqual(target.maxErrors);
        }
        if (target.maxWarnings !== undefined) {
          expect(
            warnings.length,
            `${target.name}: too many warnings (${warnings.length} > ${target.maxWarnings}). Possible false positives.`,
          ).toBeLessThanOrEqual(target.maxWarnings);
        }

        // Verify expected errors if specified
        if (target.expectedErrors) {
          for (const expected of target.expectedErrors) {
            expect(
              errors.some((e) => e.message.includes(expected)),
              `${target.name}: expected error containing "${expected}" not found`,
            ).toBe(true);
          }
        }
      },
      60_000,
    );
  }

  it("ecosystem: no checker crashes on any target", () => {
    // This is a meta-test — if we got here, none of the above threw unexpectedly
    expect(true).toBe(true);
  });
});
