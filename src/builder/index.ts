import { execFileSync, spawn } from "node:child_process";
import { join } from "node:path";
import { mkdir, rm } from "node:fs/promises";
import { logger } from "../shared/logger.js";
import { inferEntryFromPackageJson } from "./entry-inference.js";
import { readPackageJson } from "../shared/package-json.js";
import { buildWithEsbuild } from "./esbuild-builder.js";
import type { TspubBuildPlugin } from "./plugins.js";
import type * as esbuild from "esbuild";

export type { TspubBuildPlugin } from "./plugins.js";

export interface BuildOptions {
  formats: Array<"esm" | "cjs" | "iife">;
  dts: boolean;
  sourcemap: boolean;
  watch: boolean;
  dir: string;
  entry?: string | string[] | Record<string, string>;
  clean?: boolean;
  outDir?: string;
  // esbuild options
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
  /** Shell command to run after successful build. Runs with shell: true — only use trusted values from config. */
  onSuccess?: string | (() => void | Promise<void>);
  treeshake?: boolean | { ignoreAnnotations?: boolean };
  publicDir?: string;
  inject?: string[];
  dtsBundle?: boolean;
  dtsResolve?: boolean;
  /** Use legacy tsc-only build. Note: only dts, sourcemap, watch, outDir, and dir are honored; all other options (entry, formats, minify, splitting, etc.) are ignored. */
  legacy?: boolean;
  /** Size budget limits — fail build if exceeded (gzip size) */
  sizeLimits?: Record<string, string>;
  /** Inject __dirname/__filename/import.meta.url shims into CJS output (default: true) */
  shims?: boolean;
}

export async function build(options: BuildOptions): Promise<void> {
  const { formats, dts, sourcemap, watch, dir } = options;
  const outDir = options.outDir ?? "dist";
  const outPath = join(dir, outDir);

  if (options.clean) {
    await rm(outPath, { recursive: true, force: true });
    // Remove tsc incremental cache so DTS regenerates correctly
    await rm(join(dir, "tsconfig.tsbuildinfo"), { force: true });
    await rm(join(dir, "tsconfig.build.tsbuildinfo"), { force: true });
  }

  await mkdir(outPath, { recursive: true });

  // Resolve entry points
  let entry: string[] | Record<string, string>;
  if (options.entry) {
    if (typeof options.entry === "string") {
      entry = [options.entry];
    } else {
      entry = options.entry;
    }
  } else {
    try {
      const pkg = await readPackageJson(dir);
      const inferred = await inferEntryFromPackageJson(pkg, dir);
      if (inferred) {
        entry = inferred;
      } else {
        logger.warn("Could not infer entry from package.json, defaulting to src/index.ts");
        entry = ["src/index.ts"];
      }
    } catch (err) {
      logger.warn(`Could not read package.json for entry inference: ${err instanceof Error ? err.message : String(err)}, defaulting to src/index.ts`);
      entry = ["src/index.ts"];
    }
  }

  if (options.legacy) {
    if (options.minify || options.splitting || options.external || options.define || options.globalName) {
      logger.warn("Legacy tsc build ignores minify, splitting, external, define, and globalName options");
    }
    await buildWithTsc(dir, dts, sourcemap, watch, outDir);
    return;
  }

  await buildWithEsbuild({
    dir,
    entry,
    formats,
    outDir,
    dts,
    dtsBundle: options.dtsBundle,
    dtsResolve: options.dtsResolve,
    sourcemap,
    watch,
    minify: options.minify,
    splitting: options.splitting,
    target: options.target,
    platform: options.platform,
    external: options.external,
    noExternal: options.noExternal,
    plugins: options.plugins,
    esbuildPlugins: options.esbuildPlugins,
    define: options.define,
    banner: options.banner,
    footer: options.footer,
    cjsInterop: options.cjsInterop,
    loader: options.loader,
    envProduction: options.envProduction,
    replaceNodeEnv: options.replaceNodeEnv,
    globalName: options.globalName,
    onSuccess: options.onSuccess,
    treeshake: options.treeshake,
    publicDir: options.publicDir,
    inject: options.inject,
    sizeLimits: options.sizeLimits,
    shims: options.shims,
  });
}

async function buildWithTsc(
  dir: string,
  dts: boolean,
  sourcemap: boolean,
  watch: boolean,
  outDir: string,
): Promise<void> {
  const args = ["--outDir", outDir];

  if (dts) {
    args.push("--declaration");
  } else {
    args.push("--declaration", "false");
  }

  if (!sourcemap) {
    args.push("--sourceMap", "false");
  }

  if (watch) {
    args.push("--watch");
  }

  const env = { ...process.env, PATH: `${join(dir, "node_modules", ".bin")}:${process.env["PATH"]}` };

  logger.dim(`> tsc ${args.join(" ")}`);

  if (watch) {
    await new Promise<void>((resolve, reject) => {
      const child = spawn("tsc", args, { cwd: dir, stdio: "inherit", env });
      child.on("close", (code) => {
        if (code === 0 || code === null) resolve();
        else reject(new Error(`tsc exited with code ${code}`));
      });
      child.on("error", reject);
    });
  } else {
    execFileSync("tsc", args, { cwd: dir, stdio: "inherit", env });
  }
}
