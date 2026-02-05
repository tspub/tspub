import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { fileExists } from "../shared/resolve.js";
import { logger } from "../shared/logger.js";
import type { TspubConfig, TspubBuildConfig } from "./types.js";

const CONFIG_FILES = ["tspub.config.ts", "tspub.config.js"];

// Stable cache-bust token — changes once per process start, not per call.
// Call invalidateConfigCache() to force a fresh import (e.g., after watch-triggered rebuild).
let configCacheBust = Date.now().toString();

export function invalidateConfigCache(): void {
  configCacheBust = Date.now().toString();
}

const BUILD_DEEP_MERGE_KEYS = new Set(["define", "banner", "footer", "loader", "sizeLimits", "treeshake"]);

function deepMergeBuildConfig(
  root?: TspubBuildConfig,
  pkg?: TspubBuildConfig,
): TspubBuildConfig {
  const merged: TspubBuildConfig = { ...root, ...pkg };
  // Deep-merge nested object fields so child keys overlay parent keys
  for (const key of BUILD_DEEP_MERGE_KEYS) {
    const rootVal = (root as Record<string, unknown> | undefined)?.[key];
    const pkgVal = (pkg as Record<string, unknown> | undefined)?.[key];
    if (rootVal && typeof rootVal === "object" && !Array.isArray(rootVal) &&
        pkgVal && typeof pkgVal === "object" && !Array.isArray(pkgVal)) {
      (merged as Record<string, unknown>)[key] = { ...(rootVal as Record<string, unknown>), ...(pkgVal as Record<string, unknown>) };
    }
  }
  return merged;
}

export async function loadConfigWithInheritance(
  pkgDir: string,
  rootDir: string,
): Promise<TspubConfig | null> {
  const rootConfig = await loadConfig(rootDir);
  const pkgConfig = await loadConfig(pkgDir);

  if (!rootConfig && !pkgConfig) return null;
  if (!rootConfig) return pkgConfig;
  if (!pkgConfig) return rootConfig;

  // Deep merge: package config wins over root
  // For build config, deep-merge nested objects (define, banner, footer, loader, sizeLimits)
  const build = (rootConfig.build || pkgConfig.build)
    ? deepMergeBuildConfig(rootConfig.build, pkgConfig.build)
    : undefined;
  const publish = (rootConfig.publish || pkgConfig.publish)
    ? { ...rootConfig.publish, ...pkgConfig.publish }
    : undefined;
  const rootPlugins = rootConfig.check?.plugins ?? [];
  const pkgPlugins = pkgConfig.check?.plugins ?? [];
  const mergedCheck = (rootConfig.check || pkgConfig.check)
    ? {
        ...rootConfig.check,
        ...pkgConfig.check,
        severityOverrides: {
          ...rootConfig.check?.severityOverrides,
          ...pkgConfig.check?.severityOverrides,
        },
        plugins: [...rootPlugins, ...pkgPlugins],
      }
    : undefined;

  return {
    build,
    publish,
    check: mergedCheck,
  };
}

export async function loadConfig(dir: string): Promise<TspubConfig | null> {
  // Try config files first (higher priority)
  for (const file of CONFIG_FILES) {
    const filePath = join(dir, file);
    if (await fileExists(filePath)) {
      try {
        const url = pathToFileURL(filePath);
        // Use a stable cache-bust param that only changes once per process to
        // avoid accumulating module cache entries in watch mode.
        url.searchParams.set("v", configCacheBust);
        const mod = await import(url.href);
        return (mod.default ?? mod) as TspubConfig;
      } catch (err) {
        logger.verbose(`Failed to load config file ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }
    }
  }

  // Fall back to package.json "tspub" key
  try {
    const raw = await readFile(join(dir, "package.json"), "utf-8");
    const pkg = JSON.parse(raw) as Record<string, unknown>;
    if (pkg["tspub"] && typeof pkg["tspub"] === "object") {
      return pkg["tspub"] as TspubConfig;
    }
  } catch (err) {
    logger.verbose(`No config in package.json at ${dir}: ${err instanceof Error ? err.message : String(err)}`);
  }

  return null;
}
