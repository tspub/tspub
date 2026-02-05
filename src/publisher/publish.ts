import { readPackageJson, writePackageJson } from "../shared/package-json.js";
import { build } from "../builder/index.js";
import { generateChangelog } from "../builder/changelog.js";
import type { ChangelogStyle } from "../builder/changelog.js";
import { loadConfig, loadConfigWithInheritance } from "../config/loader.js";
import { isMonorepoRoot, discoverWorkspaces, topoSort, filterPackages } from "../workspace/index.js";
import { resolveVersionBump } from "./version-from-commits.js";
import { bumpVersion, bumpPrerelease } from "./version-bump.js";
import { commitRelease, commitMonorepoRelease, tagRelease, pushWithTags, rollbackRelease } from "./git.js";
import { npmPublish } from "./npm.js";
import { allPrereqs } from "./prereqs/index.js";
import { runHook } from "./hooks.js";
import { logger } from "../shared/logger.js";
import type { PublishOptions, PublishResult } from "./types.js";
import type { PrereqDiagnostic, PrereqContext } from "./framework/types.js";
import type { PublishHooks } from "./hooks.js";
import type { TspubConfig } from "../config/types.js";

const VALID_CHANGELOG_STYLES = new Set<string>(["simple", "conventional", "auto"]);

export interface PublishPackageParams {
  dir: string;
  bump: string | undefined;
  options: PublishOptions;
  config: TspubConfig | null;
  isCi: boolean;
  registry: string | undefined;
  registryArgs: string[];
  hooks?: PublishHooks;
  prefix?: string;
}

export interface PublishMonorepoParams {
  dir: string;
  bump: string | undefined;
  options: PublishOptions;
  hooks?: PublishHooks;
}

async function runPrereqs(ctx: PrereqContext): Promise<{ ok: boolean; diagnostics: PrereqDiagnostic[] }> {
  const diagnostics: PrereqDiagnostic[] = [];
  let blocked = false;

  for (const rule of allPrereqs) {
    const diags = await rule.check(ctx);
    diagnostics.push(...diags);
    if (rule.meta.blocking && diags.some((d) => d.severity === "error")) {
      blocked = true;
      break;
    }
  }

  return { ok: !blocked, diagnostics };
}

export async function publishPackage(params: PublishPackageParams): Promise<PublishResult> {
  const { dir, options, config, isCi, registry, registryArgs, hooks, prefix } = params;
  let { bump } = params;
  const label = prefix ? `[${prefix}] ` : "";

  const pkg = await readPackageJson(dir);
  const oldVersion = pkg.version ?? "0.0.0";

  // Run prereqs (skip checker prereq since we do it inline)
  if (options.git !== false && !options.dryRun) {
    const prereqCtx: PrereqContext = {
      dir,
      pkg,
      dryRun: options.dryRun ?? false,
      isCi,
      config: config?.publish ?? null,
      registry,
      registryArgs,
    };
    const { ok, diagnostics } = await runPrereqs(prereqCtx);
    if (!ok) {
      return {
        success: false,
        name: pkg.name ?? "",
        version: oldVersion,
        oldVersion,
        prereqDiagnostics: diagnostics,
      };
    }
  }

  // CI mode: auto-detect bump
  if (isCi && !bump) {
    const versionBump = resolveVersionBump(dir, prefix);
    if (!versionBump.bump) {
      logger.info(`${label}No relevant changes — skipping publish (${versionBump.reason})`);
      return {
        success: true,
        name: pkg.name ?? "",
        version: oldVersion,
        oldVersion,
        skipped: true,
        reason: versionBump.reason,
        prereqDiagnostics: [],
      };
    }
    bump = versionBump.bump;
    logger.info(`${label}Auto-detected bump: ${bump} (${versionBump.reason})`);
  }

  // Build
  await runHook(hooks, "beforeBuild", { dir });
  logger.info(`${label}Building...`);
  const buildConfig = config?.build;
  await build({
    formats: buildConfig?.formats ?? ["esm"],
    dts: buildConfig?.dts ?? true,
    sourcemap: buildConfig?.sourcemap ?? true,
    watch: false,
    dir,
    entry: buildConfig?.entry,
    clean: buildConfig?.clean,
    outDir: buildConfig?.outDir,
    minify: buildConfig?.minify,
    splitting: buildConfig?.splitting,
    target: buildConfig?.target,
    platform: buildConfig?.platform,
    external: buildConfig?.external,
    noExternal: buildConfig?.noExternal,
    define: buildConfig?.define,
    banner: buildConfig?.banner,
    footer: buildConfig?.footer,
    cjsInterop: buildConfig?.cjsInterop,
    esbuildPlugins: buildConfig?.esbuildPlugins,
    loader: buildConfig?.loader,
    replaceNodeEnv: buildConfig?.replaceNodeEnv,
    globalName: buildConfig?.globalName,
    onSuccess: buildConfig?.onSuccess,
    treeshake: buildConfig?.treeshake,
    publicDir: buildConfig?.publicDir,
    inject: buildConfig?.inject,
    dtsBundle: buildConfig?.dtsBundle,
    dtsResolve: buildConfig?.dtsResolve,
    sizeLimits: buildConfig?.sizeLimits,
  });
  await runHook(hooks, "afterBuild", { dir });

  // Bump version
  const prereleaseTag = options.prerelease;
  const newVersion = prereleaseTag
    ? bumpPrerelease(oldVersion, prereleaseTag, bump)
    : bumpVersion(oldVersion, bump ?? "patch");
  pkg.version = newVersion;
  await writePackageJson(dir, pkg);
  logger.info(`${label}Version: ${oldVersion} → ${newVersion}`);

  // Changelog
  if (options.changelog !== false) {
    const rawStyle = options.changelogStyle ?? config?.publish?.changelogStyle ?? "auto";
    const changelogStyle: ChangelogStyle = VALID_CHANGELOG_STYLES.has(rawStyle)
      ? (rawStyle as ChangelogStyle)
      : "auto";
    await generateChangelog(dir, newVersion, changelogStyle);
    logger.info(`${label}Changelog updated`);
  }

  // Git (single package only — monorepo does one commit for all)
  let releaseCommitSha: string | undefined;
  if (!prefix && options.git !== false && !options.dryRun) {
    try {
      releaseCommitSha = commitRelease(dir, newVersion, [
        "package.json",
        "CHANGELOG.md",
      ]);
      tagRelease(dir, `v${newVersion}`);
      logger.info(`${label}Git tag: v${newVersion}`);
    } catch {
      logger.warn(`${label}Git operations skipped (not a git repo or nothing to commit)`);
    }
  }

  // Publish
  await runHook(hooks, "beforePublish", { dir, version: newVersion });

  if (options.dryRun) {
    logger.info(`${label}Dry run — skipping npm publish`);
    logger.success(`${label}Would publish ${pkg.name}@${newVersion}`);
    await runHook(hooks, "afterPublish", { dir, version: newVersion, success: true });
    return {
      success: true,
      name: pkg.name ?? "",
      version: newVersion,
      oldVersion,
      prereqDiagnostics: [],
    };
  }

  const publishArgs = ["--tag", options.tag];
  if (options.otp) publishArgs.push("--otp", options.otp);

  const access =
    options.access ??
    config?.publish?.access ??
    (pkg.name?.startsWith("@") ? "public" : undefined);
  if (access) publishArgs.push("--access", access);
  if (options.provenance || config?.publish?.provenance) {
    publishArgs.push("--provenance");
  }
  publishArgs.push(...registryArgs);

  const { ok, error } = npmPublish(dir, publishArgs);
  if (ok) {
    logger.success(`${label}Published ${pkg.name}@${newVersion}`);
    await runHook(hooks, "afterPublish", { dir, version: newVersion, success: true });
    return {
      success: true,
      name: pkg.name ?? "",
      version: newVersion,
      oldVersion,
      prereqDiagnostics: [],
    };
  }

  logger.error(`${label}npm publish failed`);
  await runHook(hooks, "afterPublish", { dir, version: newVersion, success: false });

  if (!prefix && releaseCommitSha) {
    const rolledBack = rollbackRelease(dir, newVersion, releaseCommitSha);
    if (rolledBack) {
      logger.info("Rolled back git commit and tag");
    } else {
      logger.warn("Rollback failed — manual cleanup may be needed");
    }
  }

  return {
    success: false,
    name: pkg.name ?? "",
    version: newVersion,
    oldVersion,
    reason: error,
    prereqDiagnostics: [],
  };
}

export async function publishMonorepo(params: PublishMonorepoParams): Promise<PublishResult[]> {
  const { dir, bump, options, hooks } = params;
  const config = await loadConfig(dir);
  const isCi = options.ci === true || config?.publish?.ci?.enabled === true;
  const registry = options.registry ?? config?.publish?.registry;
  const registryArgs = registry ? ["--registry", registry] : [];

  let packages = topoSort(await discoverWorkspaces(dir));
  if (options.filter) {
    packages = filterPackages(packages, options.filter);
  }

  logger.info(`Monorepo detected — publishing ${packages.length} package(s) in topo order`);

  const results: PublishResult[] = [];
  const published: Array<{ name: string; version: string; dir: string }> = [];

  for (const wp of packages) {
    logger.info(`\n[${wp.name}] Starting publish...`);
    const pkgConfig = await loadConfigWithInheritance(wp.dir, dir);

    const result = await publishPackage({
      dir: wp.dir,
      bump,
      options,
      config: pkgConfig,
      isCi,
      registry,
      registryArgs,
      hooks,
      prefix: wp.name,
    });
    results.push(result);

    if (result.success && !result.skipped) {
      published.push({ name: result.name, version: result.version, dir: wp.dir });
    }
  }

  // Single git commit + tags for all packages
  if (published.length > 0 && options.git !== false && !options.dryRun) {
    try {
      commitMonorepoRelease(dir, published);
      for (const p of published) {
        tagRelease(dir, `${p.name}@${p.version}`);
      }
      logger.info("Git commit and tags created");

      if (!isCi || config?.publish?.ci?.skipPush === false) {
        const { ok } = pushWithTags(dir);
        if (ok) {
          logger.info("Pushed to remote");
        } else {
          logger.warn("Git push failed — push manually");
        }
      }
    } catch {
      logger.warn("Git operations failed");
    }
  }

  return results;
}
