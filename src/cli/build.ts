import type { Command } from "commander";
import { build } from "../builder/index.js";
import { logger } from "../shared/logger.js";
import { loadConfig } from "../config/loader.js";
import { loadConfigWithInheritance } from "../config/loader.js";
import { isMonorepoRoot, discoverWorkspaces, topoSort, filterPackages } from "../workspace/index.js";

interface BuildActionOptions {
  format?: string;
  dts: boolean;
  sourcemap: boolean;
  watch?: boolean;
  entry?: string;
  clean?: boolean;
  outDir?: string;
  filter?: string;
  minify?: boolean;
  target?: string;
  platform?: string;
  splitting?: boolean;
  external?: string;
  cjsInterop: boolean;
  legacy?: boolean;
  envProduction?: boolean;
  globalName?: string;
  noTreeshake?: boolean;
  publicDir?: string;
  dtsBundle?: boolean;
}

async function buildSinglePackage(
  dir: string,
  options: BuildActionOptions,
  config: Awaited<ReturnType<typeof loadConfig>>,
  prefix?: string,
): Promise<boolean> {
  const buildConfig = config?.build;

  const VALID_FORMATS = new Set(["esm", "cjs", "iife"]);
  let formats: Array<"esm" | "cjs" | "iife">;
  if (options.format) {
    const parsed = options.format.split(",").map((f: string) => f.trim());
    const invalid = parsed.filter((f) => !VALID_FORMATS.has(f));
    if (invalid.length > 0) {
      logger.error(`Invalid format(s): ${invalid.join(", ")}. Valid formats: esm, cjs, iife`);
      return false;
    }
    formats = parsed as Array<"esm" | "cjs" | "iife">;
  } else {
    formats = buildConfig?.formats ?? ["esm"];
  }

  const entry = options.entry
    ? options.entry.split(",").map((e: string) => e.trim())
    : buildConfig?.entry ?? undefined;

  const clean = options.clean === true || (options.clean === undefined && buildConfig?.clean === true);
  const outDir = options.outDir ?? buildConfig?.outDir ?? "dist";
  const dts = options.dts !== false && (options.dts !== undefined || buildConfig?.dts !== false);
  const sourcemap = options.sourcemap !== false && (options.sourcemap !== undefined || buildConfig?.sourcemap !== false);

  const label = prefix ? `[${prefix}] ` : "";

  try {
    await build({
      formats,
      dts,
      sourcemap,
      watch: options.watch === true,
      dir,
      entry,
      clean,
      outDir,
      minify: options.minify ?? buildConfig?.minify,
      splitting: options.splitting ?? buildConfig?.splitting,
      target: options.target ?? buildConfig?.target,
      platform: (options.platform as "node" | "browser" | "neutral") ?? buildConfig?.platform,
      external: options.external
        ? options.external.split(",").map((e) => e.trim())
        : buildConfig?.external,
      noExternal: buildConfig?.noExternal,
      define: buildConfig?.define,
      banner: buildConfig?.banner,
      footer: buildConfig?.footer,
      cjsInterop: options.cjsInterop !== false ? (buildConfig?.cjsInterop ?? true) : false,
      esbuildPlugins: buildConfig?.esbuildPlugins,
      loader: buildConfig?.loader,
      envProduction: options.envProduction ?? buildConfig?.envProduction,
      replaceNodeEnv: buildConfig?.replaceNodeEnv,
      globalName: options.globalName ?? buildConfig?.globalName,
      onSuccess: buildConfig?.onSuccess,
      treeshake: options.noTreeshake === true ? false : buildConfig?.treeshake,
      publicDir: options.publicDir ?? buildConfig?.publicDir,
      inject: buildConfig?.inject,
      dtsBundle: options.dtsBundle ?? buildConfig?.dtsBundle,
      dtsResolve: buildConfig?.dtsResolve,
      legacy: options.legacy,
    });
    logger.success(`${label}Build complete`);
    return true;
  } catch (err) {
    logger.error(
      `${label}Build failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return false;
  }
}

export function registerBuild(program: Command): void {
  program
    .command("build")
    .description("Build ESM + CJS + types")
    .option("--format <formats>", "Output formats (comma-separated: esm,cjs,iife)")
    .option("--no-dts", "Skip .d.ts generation")
    .option("--no-sourcemap", "Skip sourcemap generation")
    .option("--watch", "Watch mode")
    .option("--entry <path>", "Entry file(s) (comma-separated)")
    .option("--clean", "Remove output directory before building")
    .option("--out-dir <dir>", "Output directory")
    .option("--filter <pattern>", "Filter workspace packages by name pattern")
    .option("--minify", "Minify output")
    .option("--target <target>", "Build target (e.g. node18, es2020)")
    .option("--platform <platform>", "Target platform (node, browser, neutral)")
    .option("--splitting", "Enable code splitting (ESM only)")
    .option("--external <deps>", "Additional externals (comma-separated)")
    .option("--no-cjs-interop", "Disable CJS default export interop")
    .option("--legacy", "Use legacy tsc-only build")
    .option("--env-production", "Replace process.env.NODE_ENV with 'production'")
    .option("--global-name <name>", "Global variable name for IIFE builds")
    .option("--no-treeshake", "Disable tree-shaking")
    .option("--public-dir <dir>", "Copy static assets from this directory")
    .option("--dts-bundle", "Bundle .d.ts into single files per entry")
    .action(async (options: BuildActionOptions) => {
      const dir = process.cwd();
      logger.heading("tspub build");

      if (await isMonorepoRoot(dir)) {
        let packages = topoSort(await discoverWorkspaces(dir));
        if (options.filter) {
          packages = filterPackages(packages, options.filter);
        }

        logger.info(`Monorepo detected — building ${packages.length} package(s)`);
        let hasErrors = false;

        for (const wp of packages) {
          logger.info(`[${wp.name}] Building...`);
          const config = await loadConfigWithInheritance(wp.dir, dir);
          const ok = await buildSinglePackage(wp.dir, options, config, wp.name);
          if (!ok) hasErrors = true;
        }

        if (hasErrors) process.exitCode = 1;
      } else {
        const config = await loadConfig(dir);
        const ok = await buildSinglePackage(dir, options, config);
        if (!ok) process.exitCode = 1;
      }
    });
}
