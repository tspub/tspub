import type { Severity } from "../checker/framework/types.js";
import type { DoctorSeverity } from "../doctor/framework/types.js";
import type { Plugin as EsbuildPlugin, Loader } from "esbuild";

export interface TspubBuildConfig {
  formats?: Array<"esm" | "cjs" | "iife">;
  entry?: string | string[] | Record<string, string>;
  outDir?: string;
  clean?: boolean;
  dts?: boolean;
  /** Bundle .d.ts files into single-file declarations per entry */
  dtsBundle?: boolean;
  /** Resolve external package types into bundled .d.ts */
  dtsResolve?: boolean;
  sourcemap?: boolean;
  minify?: boolean;
  splitting?: boolean;
  target?: string;
  platform?: "node" | "browser" | "neutral";
  external?: (string | RegExp)[];
  noExternal?: string[];
  define?: Record<string, string>;
  banner?: { js?: string };
  footer?: { js?: string };
  cjsInterop?: boolean;
  esbuildPlugins?: EsbuildPlugin[];
  loader?: Record<string, Loader>;
  /** Replace process.env.NODE_ENV (auto-enabled when minify is true) */
  replaceNodeEnv?: boolean;
  /** @deprecated Use replaceNodeEnv instead */
  envProduction?: boolean;
  /** Global variable name for IIFE builds */
  globalName?: string;
  /** Run a command or callback after successful build */
  onSuccess?: string | (() => void | Promise<void>);
  /** Esbuild treeshake configuration */
  treeshake?: boolean | { ignoreAnnotations?: boolean };
  /** Copy static assets from this directory to outDir */
  publicDir?: string;
  /** Files to inject into all bundles (esbuild inject) */
  inject?: string[];
  /** Size budget limits — fail build if any file exceeds the limit */
  sizeLimits?: Record<string, string>;
  /** Inject __dirname/__filename/import.meta.url shims into CJS output (default: true) */
  shims?: boolean;
}

export interface TspubPublishConfig {
  registry?: string;
  access?: "public" | "restricted";
  provenance?: boolean;
  branch?: string | string[];
  changelogStyle?: "simple" | "conventional" | "auto";
  ci?: {
    enabled?: boolean;
    skipPush?: boolean;
  };
  github?: {
    release?: boolean;
    draft?: boolean;
    assets?: string[];
  };
  hooks?: {
    beforeBuild?: string;
    afterBuild?: string;
    beforePublish?: string;
    afterPublish?: string;
  };
}

export interface TspubCheckConfig {
  severityOverrides?: Record<string, Severity | "off">;
  plugins?: string[];
  typeTests?: {
    enabled?: boolean;
    directory?: string;
  };
}

export interface TspubDoctorConfig {
  severityOverrides?: Record<string, DoctorSeverity | "off">;
  plugins?: string[];
  profile?: string;
}

export interface TspubScanConfig {
  concurrency?: number;
  severityOverrides?: Record<string, Severity | "off">;
  profile?: string;
}

export interface TspubChangesetConfig {
  dependentBumping?: "major" | "all" | "none";
  snapshotTag?: string;
  /** Groups of package names that bump together (highest bump wins) */
  linked?: string[][];
  /** Groups of package names that always share the same version */
  fixed?: string[][];
}

export interface TspubConfig {
  build?: TspubBuildConfig;
  publish?: TspubPublishConfig;
  check?: TspubCheckConfig;
  doctor?: TspubDoctorConfig;
  scan?: TspubScanConfig;
  changeset?: TspubChangesetConfig;
}
