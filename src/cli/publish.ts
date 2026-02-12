import type { Command } from "commander";
import { logger } from "../shared/logger.js";
import { loadConfig } from "../config/loader.js";
import { isMonorepoRoot } from "../workspace/index.js";
import { publishPackage, publishMonorepo } from "../publisher/publish.js";
import { pushWithTags } from "../publisher/git.js";
import { createHooksFromConfig } from "../publisher/hooks.js";
import { bumpVersion, bumpPrerelease } from "../publisher/version-bump.js";

export { bumpVersion, bumpPrerelease };

export const VALID_CHANGELOG_STYLES = new Set<string>(["simple", "conventional", "auto"]);

const VALID_BUMPS = new Set(["major", "minor", "patch"]);

interface PublishActionOptions {
  dryRun?: boolean;
  tag: string;
  otp?: string;
  access?: string;
  changelog: boolean;
  git: boolean;
  prerelease?: string;
  provenance?: boolean;
  registry?: string;
  changelogStyle?: string;
  ci?: boolean;
  filter?: string;
  githubRelease?: boolean;
  yes?: boolean;
}

export function registerPublish(program: Command): void {
  program
    .command("publish [bump]")
    .description("Build + check + version + changelog + npm publish")
    .option("--dry-run", "Preview without publishing")
    .option("--tag <tag>", "npm dist-tag", "latest")
    .option("--otp <code>", "npm OTP for 2FA")
    .option("--access <level>", "public or restricted")
    .option("--no-changelog", "Skip changelog generation")
    .option("--no-git", "Skip git tag + commit")
    .option("--prerelease <tag>", "Create prerelease version (e.g. beta, alpha)")
    .option("--provenance", "Publish with provenance attestation")
    .option("--registry <url>", "npm registry URL")
    .option("--changelog-style <style>", "Changelog style: simple, conventional, auto", "auto")
    .option("--ci", "CI mode: auto-detect version bump from commits")
    .option("--filter <pattern>", "Filter workspace packages by name pattern")
    .option("--github-release", "Create a GitHub release (default: auto when GITHUB_TOKEN is set)")
    .option("--no-github-release", "Skip GitHub release creation")
    .option("-y, --yes", "Skip confirmation prompt")
    .action(async (bump: string | undefined, options: PublishActionOptions) => {
      const dir = process.cwd();
      const config = await loadConfig(dir);
      logger.heading("tspub publish");

      // Validate bump argument
      if (bump && !VALID_BUMPS.has(bump) && !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(bump)) {
        logger.error(`Invalid bump "${bump}". Use: major, minor, patch, or an explicit version (e.g. 1.2.3)`);
        process.exitCode = 1;
        return;
      }

      const isCi = options.ci === true || config?.publish?.ci?.enabled === true;
      const registry = options.registry ?? config?.publish?.registry;
      const registryArgs = registry ? ["--registry", registry] : [];

      const hooks = createHooksFromConfig(config?.publish);

      // Monorepo support
      if (await isMonorepoRoot(dir)) {
        const results = await publishMonorepo({
          dir,
          bump,
          options,
          hooks,
        });
        if (results.some((r) => !r.success)) {
          process.exitCode = 1;
        }
        return;
      }

      // Single package publish
      const result = await publishPackage({
        dir,
        bump,
        options,
        config,
        isCi,
        registry,
        registryArgs,
        hooks,
      });

      if (!result.success) {
        for (const d of result.prereqDiagnostics) {
          if (d.severity === "error") logger.error(d.message);
          else if (d.severity === "warning") logger.warn(d.message);
        }
        process.exitCode = 1;
        return;
      }

      // Push (single package)
      if (options.git !== false && !options.dryRun) {
        if (!isCi || config?.publish?.ci?.skipPush === false) {
          const { ok } = pushWithTags(dir);
          if (ok) {
            logger.info("Pushed to remote");
          } else {
            logger.warn("Git push failed — push manually");
          }
        }
      }
    });
}
