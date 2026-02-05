import * as esbuild from "esbuild";
import { join, basename, dirname } from "node:path";
import { stat, readFile as fsReadFile, writeFile as fsWriteFile, rename, mkdir, access } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { stripJsonComments } from "../shared/strip-json-comments.js";
import { resolveExternals } from "./externals.js";
import { cjsInteropPlugin } from "./cjs-interop.js";
import { createPluginContainer, type TspubBuildPlugin, type OutputFile } from "./plugins.js";
import { generateDts } from "./dts.js";
import { bundleDts } from "./dts-bundle.js";
import { copyPublicDir } from "./public-dir.js";
import { reportSizes, checkSizeLimits } from "./size-report.js";
import { logger } from "../shared/logger.js";
import { readPackageJson } from "../shared/package-json.js";

export interface EsbuildBuildOptions {
  dir: string;
  entry: string[] | Record<string, string>;
  formats: Array<"esm" | "cjs" | "iife">;
  outDir: string;
  dts: boolean;
  dtsBundle?: boolean;
  dtsResolve?: boolean;
  sourcemap: boolean;
  watch: boolean;
  minify?: boolean;
  splitting?: boolean;
  target?: string;
  platform?: "node" | "browser" | "neutral";
  external?: (string | RegExp)[];
  noExternal?: string[];
  plugins?: TspubBuildPlugin[];
  esbuildPlugins?: esbuild.Plugin[];
  define?: Record<string, string>;
  banner?: { js?: string };
  footer?: { js?: string };
  cjsInterop?: boolean;
  loader?: Record<string, esbuild.Loader>;
  /** @deprecated Use replaceNodeEnv */
  envProduction?: boolean;
  replaceNodeEnv?: boolean;
  globalName?: string;
  onSuccess?: string | (() => void | Promise<void>);
  treeshake?: boolean | { ignoreAnnotations?: boolean };
  publicDir?: string;
  inject?: string[];
  sizeLimits?: Record<string, string>;
}

export interface BuildResult {
  outputFiles: OutputFile[];
  duration: number;
}

const FORMAT_TO_EXT: Record<string, string> = {
  esm: ".js",
  cjs: ".cjs",
  iife: ".global.js",
};

const DEFAULT_LOADERS: Record<string, esbuild.Loader> = {
  ".json": "json",
};

export async function buildWithEsbuild(options: EsbuildBuildOptions): Promise<BuildResult> {
  const start = performance.now();
  const {
    dir,
    entry,
    formats,
    outDir,
    dts,
    dtsBundle: dtsBundleOpt = false,
    dtsResolve = false,
    sourcemap,
    watch,
    minify = false,
    splitting,
    target = "node18",
    platform = "node",
    external: userExternal,
    noExternal,
    plugins: userPlugins = [],
    esbuildPlugins: userEsbuildPlugins = [],
    define: userDefine,
    banner,
    footer,
    cjsInterop = true,
    loader: userLoader,
    envProduction,
    replaceNodeEnv,
    globalName,
    onSuccess,
    treeshake,
    publicDir,
    inject,
  } = options;

  const outPath = join(dir, outDir);
  const externals = resolveExternals(dir, userExternal, noExternal);
  const container = createPluginContainer(userPlugins);

  // Auto-enable splitting for multi-entry ESM (tsup/tsdown convention)
  const entryCount = Array.isArray(entry) ? entry.length : Object.keys(entry).length;
  const autoSplitting = entryCount > 1 ? (splitting ?? true) : splitting;

  await container.buildStart();

  const allOutputFiles: OutputFile[] = [];

  // Read package.json for dts + shebang detection
  let pkg: Record<string, unknown> = {};
  let packageType: "module" | "commonjs" | undefined;
  try {
    pkg = await readPackageJson(dir);
    packageType = (pkg.type as "module" | "commonjs") ?? undefined;
  } catch (err) {
    logger.verbose(`[readPackageJson]: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Resolve entry points (support object entries)
  const entryPoints = resolveEntryPoints(dir, entry);

  // Detect bin entries for shebang preservation
  const binEntries = resolveBinEntries(pkg);

  // Build define map (replaceNodeEnv takes precedence over envProduction)
  const effectiveReplaceNodeEnv = replaceNodeEnv ?? envProduction;
  const define = buildDefineMap(userDefine, minify, effectiveReplaceNodeEnv);

  // Merge loaders
  const loaderMap = { ...DEFAULT_LOADERS, ...userLoader };
  if (platform === "node" && !userLoader?.[".css"]) {
    loaderMap[".css"] = "empty";
  } else if (!loaderMap[".css"]) {
    loaderMap[".css"] = "css";
  }

  // Resolve treeshake options
  const treeShaking = resolveTreeshake(treeshake);

  // Detect tsconfig paths and warn
  await warnTsconfigPaths(dir);

  for (const format of formats) {
    const isESM = format === "esm";
    const isIIFE = format === "iife";
    const outExtension = FORMAT_TO_EXT[format] ?? ".js";

    const esbuildPlugins: esbuild.Plugin[] = [];

    // Add externals plugin for subpath + regex matching
    if (externals.plugin) {
      esbuildPlugins.push(externals.plugin);
    }

    // Add shebang plugin
    const shebangPlugin = createShebangPlugin(dir, entry, binEntries);
    if (shebangPlugin) {
      esbuildPlugins.push(shebangPlugin);
    }

    if (!isESM && !isIIFE && cjsInterop) {
      esbuildPlugins.push(cjsInteropPlugin());
    }

    // Add user esbuild plugins
    esbuildPlugins.push(...userEsbuildPlugins);

    const esbuildFormat = isIIFE ? "iife" : isESM ? "esm" : "cjs";

    const buildOptions: esbuild.BuildOptions = {
      entryPoints,
      bundle: true,
      format: esbuildFormat,
      platform: isIIFE ? "browser" : platform,
      target,
      outdir: outPath,
      outExtension: { ".js": outExtension },
      external: isIIFE ? [] : externals.strings,
      sourcemap,
      minify,
      splitting: isESM ? (autoSplitting ?? false) : false,
      metafile: true,
      plugins: esbuildPlugins,
      define,
      banner: banner ? { js: banner.js ?? "" } : undefined,
      footer: footer ? { js: footer.js ?? "" } : undefined,
      loader: loaderMap,
      inject: inject?.map((f) => join(dir, f)),
      ...(isIIFE && globalName ? { globalName } : {}),
      ...treeShaking,
    };

    if (watch) {
      const ctx = await esbuild.context({
        ...buildOptions,
        plugins: [
          ...esbuildPlugins,
          createWatchLogPlugin(format),
        ],
      });
      await ctx.watch();
      logger.info(`Watching for changes (${format})...`);

      const cleanup = () => {
        ctx.dispose().catch(() => {});
        process.removeListener("SIGINT", cleanup);
        process.removeListener("SIGTERM", cleanup);
        process.removeListener("exit", cleanup);
      };
      process.on("SIGINT", cleanup);
      process.on("SIGTERM", cleanup);
      process.on("exit", cleanup);

      continue;
    }

    const result = await esbuild.build(buildOptions);

    // Run renderChunk on output files
    if (result.metafile) {
      for (const outFile of Object.keys(result.metafile.outputs)) {
        if (!outFile.endsWith(".js") && !outFile.endsWith(".cjs") && !outFile.endsWith(".global.js")) continue;

        try {
          const code = await fsReadFile(outFile, "utf-8");
          const processed = await container.processChunk(code, { path: outFile, format: isIIFE ? "iife" : format as "esm" | "cjs" | "iife" });
          if (processed !== code) {
            await fsWriteFile(outFile, processed);
          }
        } catch (err) {
          logger.verbose(`[renderChunk] ${outFile}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    // Collect output files from metafile
    if (result.metafile) {
      for (const outFile of Object.keys(result.metafile.outputs)) {
        try {
          const s = await stat(outFile);
          allOutputFiles.push({ path: outFile, size: s.size });
        } catch (err) {
          logger.verbose(`[stat] ${outFile}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  }

  if (watch) {
    return { outputFiles: [], duration: performance.now() - start };
  }

  // Generate .d.ts files
  if (dts) {
    try {
      await generateDts({ dir, outDir, packageType });

      // Relocate .d.ts files for object entries where outName differs from source path
      if (!Array.isArray(entry)) {
        await relocateEntryDts(outPath, entry);
      }

      // Bundle declarations if requested
      if (dtsBundleOpt) {
        const entryDtsNames = resolveEntryDtsNames(entry);
        await bundleDts({
          outDir: outPath,
          entries: entryDtsNames,
          resolveExternals: dtsResolve,
        });
      }
    } catch (err) {
      logger.warn(`Declaration generation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Copy publicDir assets
  if (publicDir) {
    await copyPublicDir(dir, publicDir, outDir);
  }

  await container.buildEnd(allOutputFiles);

  const duration = performance.now() - start;
  const sizeInfos = reportSizes(allOutputFiles, dir);

  // Check size budgets
  if (options.sizeLimits && Object.keys(options.sizeLimits).length > 0) {
    const sizeErrors = checkSizeLimits(sizeInfos, options.sizeLimits);
    if (sizeErrors.length > 0) {
      for (const err of sizeErrors) {
        logger.error(`Size limit exceeded: ${err}`);
      }
      throw new Error(`${sizeErrors.length} file(s) exceeded size limits`);
    }
  }

  // Run onSuccess callback
  if (onSuccess) {
    await runOnSuccess(onSuccess, dir);
  }

  return { outputFiles: allOutputFiles, duration };
}

/** Resolve entry points supporting both string[] and Record<string, string> */
function resolveEntryPoints(
  dir: string,
  entry: string[] | Record<string, string>,
): esbuild.BuildOptions["entryPoints"] {
  if (Array.isArray(entry)) {
    return entry.map((e) => join(dir, e));
  }
  const result: Record<string, string> = {};
  for (const [outName, srcPath] of Object.entries(entry)) {
    result[outName] = join(dir, srcPath);
  }
  return result;
}

/** Resolve bin entries from package.json */
function resolveBinEntries(pkg: Record<string, unknown>): Set<string> {
  const bins = new Set<string>();
  const bin = pkg.bin;
  if (typeof bin === "string") {
    bins.add(bin);
  } else if (bin && typeof bin === "object") {
    for (const v of Object.values(bin as Record<string, string>)) {
      bins.add(v);
    }
  }
  return bins;
}

/** Create shebang plugin that preserves shebangs for bin entries */
function createShebangPlugin(
  dir: string,
  entry: string[] | Record<string, string>,
  binEntries: Set<string>,
): esbuild.Plugin | null {
  if (binEntries.size === 0) return null;

  const shebangs = new Map<string, string>();
  const entries = Array.isArray(entry) ? entry : Object.values(entry);

  for (const e of entries) {
    const fullPath = join(dir, e);
    try {
      const content = readFileSync(fullPath, "utf-8");
      const match = content.match(/^#!.+\n/);
      if (match) {
        shebangs.set(fullPath, match[0].trimEnd());
      }
    } catch (err) {
      logger.verbose(`[shebang] ${fullPath}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (shebangs.size === 0) return null;

  return {
    name: "tspub-shebang",
    setup(build) {
      build.onEnd(async (result) => {
        if (!result.metafile) return;

        for (const [outFile, outputInfo] of Object.entries(result.metafile.outputs)) {
          if (!outFile.endsWith(".js") && !outFile.endsWith(".cjs")) continue;

          const isBin = [...binEntries].some((bin) => outFile.endsWith(bin.replace(/^\.\//, "")));
          if (!isBin) {
            const entryPoint = outputInfo.entryPoint;
            if (!entryPoint) continue;
            const fullEntry = join(dir, entryPoint);
            if (!shebangs.has(fullEntry)) continue;
          }

          const entryPoint = outputInfo.entryPoint;
          if (!entryPoint) continue;
          const fullEntry = join(dir, entryPoint);
          const shebang = shebangs.get(fullEntry);
          if (!shebang) continue;

          try {
            const content = await fsReadFile(outFile, "utf-8");
            if (!content.startsWith("#!")) {
              await fsWriteFile(outFile, shebang + "\n" + content);
            }
          } catch (err) {
            logger.verbose(`[shebang write] ${outFile}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      });
    },
  };
}

/** Watch mode rebuild logger plugin */
function createWatchLogPlugin(format: string): esbuild.Plugin {
  return {
    name: "tspub-watch-log",
    setup(build) {
      let buildCount = 0;
      build.onStart(() => {
        buildCount++;
        if (buildCount > 1) {
          logger.info(`Rebuilding (${format})...`);
        }
      });
      build.onEnd((result) => {
        if (buildCount > 1) {
          if (result.errors.length > 0) {
            logger.error(`Rebuild failed with ${result.errors.length} error(s)`);
          } else {
            logger.success(`Rebuild complete (${format})`);
          }
        }
      });
    },
  };
}

/** Build define map with optional NODE_ENV injection */
function buildDefineMap(
  userDefine?: Record<string, string>,
  minify?: boolean,
  replaceNodeEnv?: boolean,
): Record<string, string> | undefined {
  const shouldInjectEnv = replaceNodeEnv === true || (replaceNodeEnv !== false && minify === true);

  if (!userDefine && !shouldInjectEnv) return undefined;

  const define: Record<string, string> = { ...userDefine };
  if (shouldInjectEnv && !define["process.env.NODE_ENV"]) {
    define["process.env.NODE_ENV"] = '"production"';
  }
  return define;
}

/** Resolve treeshake config to esbuild options */
function resolveTreeshake(
  treeshake?: boolean | { ignoreAnnotations?: boolean },
): Partial<esbuild.BuildOptions> {
  if (treeshake === undefined || treeshake === true) return {};
  if (treeshake === false) return { treeShaking: false };
  const opts: Partial<esbuild.BuildOptions> = {};
  if (treeshake.ignoreAnnotations) {
    opts.ignoreAnnotations = true;
  }
  return opts;
}

/** Warn if tsconfig has paths without a resolver plugin */
async function warnTsconfigPaths(dir: string): Promise<void> {
  try {
    for (const name of ["tsconfig.json", "tsconfig.build.json"]) {
      let content: string;
      try {
        content = await fsReadFile(join(dir, name), "utf-8");
      } catch {
        continue;
      }
      const stripped = stripJsonComments(content);
      const tsconfig = JSON.parse(stripped);
      if (tsconfig.compilerOptions?.paths && Object.keys(tsconfig.compilerOptions.paths).length > 0) {
        logger.warn(
          `tsconfig paths detected but no resolver plugin configured. ` +
          `Add an esbuild path resolution plugin to \`esbuildPlugins\` or imports may fail to resolve.`,
        );
        return;
      }
    }
  } catch (err) {
    logger.verbose(`[warnTsconfigPaths]: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Relocate .d.ts files for object entries where the output name differs from the source path.
 * tsc emits declarations mirroring the source tree (e.g. src/index.ts → dist/src/index.d.ts),
 * but object entries map to different output names (e.g. { index: "src/index.ts" } → dist/index.d.ts).
 */
async function relocateEntryDts(
  outPath: string,
  entry: Record<string, string>,
): Promise<void> {
  for (const [outName, srcPath] of Object.entries(entry)) {
    const tscRelative = srcPath.replace(/\.tsx?$/, ".d.ts");
    const targetRelative = outName + ".d.ts";

    if (tscRelative === targetRelative) continue;

    const tscFile = join(outPath, tscRelative);
    const targetFile = join(outPath, targetRelative);

    try {
      await access(tscFile);
    } catch {
      continue; // tsc didn't generate this file
    }

    await mkdir(dirname(targetFile), { recursive: true });
    await rename(tscFile, targetFile);

    // Also relocate .d.ts.map and .d.cts if they exist
    for (const suffix of [".d.ts.map", ".d.cts"]) {
      const srcVariant = join(outPath, srcPath.replace(/\.tsx?$/, suffix));
      const tgtVariant = join(outPath, outName + suffix);
      try {
        await access(srcVariant);
        await mkdir(dirname(tgtVariant), { recursive: true });
        await rename(srcVariant, tgtVariant);
      } catch {
        // variant doesn't exist — skip
      }
    }
  }
}

/** Resolve .d.ts entry file names from the build entry config */
function resolveEntryDtsNames(entry: string[] | Record<string, string>): string[] {
  if (Array.isArray(entry)) {
    // Preserve directory structure to avoid collisions (e.g., "utils/index.d.ts" vs "index.d.ts")
    return entry.map((e) => {
      // Strip leading "src/" since tsc emits relative to rootDir
      const normalized = e.replace(/^src\//, "");
      return normalized.replace(/\.tsx?$/, ".d.ts");
    });
  }
  return Object.keys(entry).map((outName) => outName + ".d.ts");
}

/** Run onSuccess command or callback */
async function runOnSuccess(
  onSuccess: string | (() => void | Promise<void>),
  dir: string,
): Promise<void> {
  if (typeof onSuccess === "function") {
    try {
      await onSuccess();
    } catch (err) {
      logger.warn(`onSuccess callback failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    // Run as shell command
    await new Promise<void>((resolve) => {
      execFile(onSuccess, { cwd: dir, timeout: 30_000, shell: true }, (err, stdout, stderr) => {
        if (err) {
          logger.warn(`onSuccess command failed: ${err.message}`);
        }
        if (stdout) logger.dim(stdout.trim());
        if (stderr) logger.warn(stderr.trim());
        resolve();
      });
    });
  }
}
