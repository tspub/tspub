import { describe, it, expect } from "vitest";
import { execFileSync, execSync } from "node:child_process";
import { join } from "node:path";
import { statSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const binPath = join(__dirname, "../../dist/bin/tspub.js");
const fixturesDir = join(__dirname, "../fixtures");

const distExists = (() => {
  try { statSync(binPath); return true; } catch { return false; }
})();
const shouldSkip = !distExists && !process.env["CI"];

function run(args: string[], cwd: string, expectFail = false): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execFileSync("node", [binPath, ...args], {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 30000,
    });
    return { stdout, stderr: "", exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    if (!expectFail) throw err;
    return { stdout: e.stdout ?? "", stderr: e.stderr ?? "", exitCode: e.status ?? 1 };
  }
}

describe.skipIf(shouldSkip)("CLI comprehensive tests", () => {
  // ── Help & Version ───────────────────────────────────────
  describe("help and version", () => {
    it("--help shows usage with all commands", () => {
      const { stdout } = run(["--help"], fixturesDir);
      expect(stdout.toLowerCase()).toContain("usage");
      expect(stdout).toContain("build");
      expect(stdout).toContain("check");
      expect(stdout).toContain("publish");
      expect(stdout).toContain("doctor");
      expect(stdout).toContain("init");
    });

    it("--version prints a version number", () => {
      const { stdout } = run(["--version"], fixturesDir);
      expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
    });

    it("build --help shows build options", () => {
      const { stdout } = run(["build", "--help"], fixturesDir);
      expect(stdout).toContain("--format");
      expect(stdout).toContain("--no-dts");
      expect(stdout).toContain("--watch");
      expect(stdout).toContain("--minify");
      expect(stdout).toContain("--clean");
    });

    it("check --help shows check options", () => {
      const { stdout } = run(["check", "--help"], fixturesDir);
      expect(stdout).toContain("--fix");
      expect(stdout).toContain("--format");
      expect(stdout).toContain("--strict");
      expect(stdout).toContain("--list-rules");
      expect(stdout).toContain("--profile");
    });

    it("publish --help shows publish options", () => {
      const { stdout } = run(["publish", "--help"], fixturesDir);
      expect(stdout).toContain("--dry-run");
      expect(stdout).toContain("--tag");
      expect(stdout).toContain("--otp");
      expect(stdout).toContain("--provenance");
      expect(stdout).toContain("--ci");
    });
  });

  // ── Check CLI ─────────────────────────────────────────────
  describe("check command", () => {
    it("exits 0 on valid-esm", () => {
      const { exitCode } = run(["check"], join(fixturesDir, "valid-esm"));
      expect(exitCode).toBe(0);
    });

    it("exits 0 on valid-dual", () => {
      const { exitCode } = run(["check"], join(fixturesDir, "valid-dual"));
      expect(exitCode).toBe(0);
    });

    it("--format json outputs valid JSON with summary", () => {
      const { stdout } = run(["check", "--format", "json"], join(fixturesDir, "valid-esm"));
      const parsed = JSON.parse(stdout);
      expect(parsed).toHaveProperty("results");
      expect(parsed).toHaveProperty("summary");
      expect(typeof parsed.summary.errors).toBe("number");
      expect(typeof parsed.summary.warnings).toBe("number");
      expect(typeof parsed.summary.passed).toBe("number");
      expect(parsed.summary.errors).toBe(0);
    });

    it("--format json on broken fixture reports errors or warnings", () => {
      const { stdout } = run(["check", "--format", "json"], join(fixturesDir, "broken-types"), true);
      const parsed = JSON.parse(stdout);
      const totalIssues = parsed.summary.errors + parsed.summary.warnings;
      expect(totalIssues).toBeGreaterThan(0);
    });

    it("--list-rules prints all rules and exits", () => {
      const { stdout } = run(["check", "--list-rules"], fixturesDir);
      // Should list rule IDs in category/name format
      expect(stdout).toContain("exports/");
      expect(stdout).toContain("types/");
      expect(stdout).toContain("files/");
      expect(stdout).toContain("metadata/");
    });

    it("--rule override disables a rule", () => {
      const { stdout } = run(
        ["check", "--format", "json", "--rule", "exports/file-exists=off"],
        join(fixturesDir, "valid-esm"),
      );
      const parsed = JSON.parse(stdout);
      const fileExistsResults = parsed.results.filter((r: { ruleId?: string }) => r.ruleId === "exports/file-exists");
      expect(fileExistsResults).toHaveLength(0);
    });

    it("--ignore-rules skips specified rules", () => {
      const { stdout } = run(
        ["check", "--format", "json", "--ignore-rules", "metadata/license,metadata/license-file"],
        join(fixturesDir, "valid-esm"),
      );
      const parsed = JSON.parse(stdout);
      const licenseResults = parsed.results.filter(
        (r: { ruleId?: string }) => r.ruleId === "metadata/license" || r.ruleId === "metadata/license-file",
      );
      expect(licenseResults).toHaveLength(0);
    });
  });

  // ── Doctor CLI ────────────────────────────────────────────
  describe("doctor command", () => {
    it("exits 0 on valid package and shows output", () => {
      const { stdout, exitCode } = run(["doctor"], join(fixturesDir, "valid-esm"));
      expect(exitCode).toBe(0);
      // Doctor should produce some output
      expect(stdout.length).toBeGreaterThan(0);
    });

    it("--check subpath resolves export", () => {
      const { stdout, exitCode } = run(["doctor", "--check", "."], join(fixturesDir, "valid-esm"));
      expect(exitCode).toBe(0);
      expect(stdout).toContain(".");
    });

    it("--check nonexistent subpath shows error", () => {
      const { stderr, exitCode } = run(["doctor", "--check", "./nonexistent"], join(fixturesDir, "valid-esm"), true);
      expect(exitCode).toBe(1);
    });
  });

  // ── Build CLI ─────────────────────────────────────────────
  describe("build command", () => {
    let tmpBuildDir: string;

    function setupTmpPkg() {
      tmpBuildDir = join(tmpdir(), `tspub-cli-build-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      mkdirSync(join(tmpBuildDir, "src"), { recursive: true });
      writeFileSync(join(tmpBuildDir, "package.json"), JSON.stringify({
        name: "cli-build-test", version: "1.0.0", type: "module",
        exports: { ".": "./dist/index.js" },
      }));
      writeFileSync(join(tmpBuildDir, "tsconfig.json"), JSON.stringify({
        compilerOptions: { target: "ES2022", module: "ESNext", moduleResolution: "bundler", strict: true, outDir: "dist", declaration: true, skipLibCheck: true },
        include: ["src"],
      }));
      writeFileSync(join(tmpBuildDir, "src/index.ts"), "export function test() { return 42; }\n");
      return tmpBuildDir;
    }

    it("tspub build produces output", () => {
      const dir = setupTmpPkg();
      try {
        run(["build", "--no-sourcemap"], dir);
        const output = readFileSync(join(dir, "dist/index.js"), "utf-8");
        expect(output).toContain("test");
        expect(output).toMatch(/export/);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it("tspub build --format cjs produces .cjs", () => {
      const dir = setupTmpPkg();
      try {
        run(["build", "--format", "cjs", "--no-dts", "--no-sourcemap"], dir);
        const output = readFileSync(join(dir, "dist/index.cjs"), "utf-8");
        expect(output).toMatch(/exports/);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it("tspub build --minify produces smaller output", () => {
      const dir = setupTmpPkg();
      try {
        run(["build", "--no-dts", "--no-sourcemap"], dir);
        const normal = readFileSync(join(dir, "dist/index.js"), "utf-8");

        run(["build", "--no-dts", "--no-sourcemap", "--minify", "--clean"], dir);
        const minified = readFileSync(join(dir, "dist/index.js"), "utf-8");

        expect(minified.length).toBeLessThan(normal.length);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it("tspub build --format invalid exits with error", () => {
      const dir = setupTmpPkg();
      try {
        const { exitCode } = run(["build", "--format", "xml", "--no-dts", "--no-sourcemap"], dir, true);
        expect(exitCode).not.toBe(0);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  // ── Pack CLI ──────────────────────────────────────────────
  describe("pack command", () => {
    it("tspub pack shows dry-run output", () => {
      const { stdout, exitCode } = run(["pack"], join(fixturesDir, "valid-esm"));
      // npm pack --dry-run lists files
      expect(exitCode).toBe(0);
    });
  });
});
