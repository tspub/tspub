import { execFileSync } from "node:child_process";

export function pingRegistry(
  dir: string,
  registryArgs: string[],
): { ok: boolean; error?: string } {
  try {
    execFileSync("npm", ["ping", ...registryArgs], {
      cwd: dir,
      stdio: "pipe",
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function checkAuth(
  dir: string,
  registryArgs: string[],
): { ok: boolean; error?: string } {
  try {
    execFileSync("npm", ["whoami", ...registryArgs], {
      cwd: dir,
      stdio: "pipe",
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function npmPublish(
  dir: string,
  args: string[],
): { ok: boolean; error?: string } {
  try {
    execFileSync("npm", ["publish", ...args], {
      cwd: dir,
      stdio: "inherit",
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
