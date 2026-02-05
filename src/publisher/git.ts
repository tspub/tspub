import { execFileSync } from "node:child_process";
import { join } from "node:path";

export function checkDirtyTree(dir: string): { dirty: boolean; error?: string } {
  try {
    const status = execFileSync("git", ["status", "--porcelain"], {
      cwd: dir,
      encoding: "utf-8",
    }).trim();
    return { dirty: status.length > 0 };
  } catch (err) {
    return {
      dirty: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function checkBranch(
  dir: string,
  allowed: string[],
): { ok: boolean; branch: string } {
  try {
    const branch = execFileSync("git", ["branch", "--show-current"], {
      cwd: dir,
      encoding: "utf-8",
    }).trim();
    return { ok: allowed.includes(branch), branch };
  } catch {
    return { ok: true, branch: "" };
  }
}

export function commitRelease(
  dir: string,
  version: string,
  files: string[],
): string {
  for (const f of files) {
    execFileSync("git", ["add", f], { cwd: dir, stdio: "pipe" });
  }
  execFileSync("git", ["commit", "-m", `release: v${version}`], {
    cwd: dir,
    stdio: "pipe",
  });
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: dir,
    encoding: "utf-8",
  }).trim();
}

export function commitMonorepoRelease(
  dir: string,
  published: Array<{ name: string; version: string; dir: string }>,
): void {
  for (const p of published) {
    execFileSync(
      "git",
      ["add", join(p.dir, "package.json"), join(p.dir, "CHANGELOG.md")],
      { cwd: dir, stdio: "pipe" },
    );
  }
  const names = published
    .map((p) => `${p.name}@${p.version}`)
    .join(", ");
  execFileSync("git", ["commit", "-m", `release: ${names}`], {
    cwd: dir,
    stdio: "pipe",
  });
}

export function tagRelease(dir: string, tag: string): void {
  execFileSync("git", ["tag", tag], { cwd: dir, stdio: "pipe" });
}

export function pushWithTags(dir: string): { ok: boolean; error?: string } {
  try {
    execFileSync("git", ["push"], { cwd: dir, stdio: "pipe" });
    execFileSync("git", ["push", "--tags"], { cwd: dir, stdio: "pipe" });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function rollbackRelease(
  dir: string,
  version: string,
  commitSha: string,
): boolean {
  try {
    const currentSha = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: dir,
      encoding: "utf-8",
    }).trim();
    if (currentSha !== commitSha) return false;
    execFileSync("git", ["tag", "-d", `v${version}`], {
      cwd: dir,
      stdio: "pipe",
    });
    execFileSync("git", ["reset", "--hard", "HEAD~1"], {
      cwd: dir,
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
}
