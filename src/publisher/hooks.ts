import { execFile } from "node:child_process";
import { logger } from "../shared/logger.js";
import type { TspubPublishConfig } from "../config/types.js";

export interface PublishHooks {
  beforePublish?(ctx: { dir: string; version: string }): Promise<void>;
  afterPublish?(ctx: {
    dir: string;
    version: string;
    success: boolean;
  }): Promise<void>;
  beforeBuild?(ctx: { dir: string }): Promise<void>;
  afterBuild?(ctx: { dir: string }): Promise<void>;
}

export async function runHook<K extends keyof PublishHooks>(
  hooks: PublishHooks | undefined,
  name: K,
  ctx: NonNullable<Parameters<NonNullable<PublishHooks[K]>>[0]>,
): Promise<void> {
  const fn = hooks?.[name];
  if (typeof fn === "function") {
    await (fn as (ctx: unknown) => Promise<void>)(ctx);
  }
}

async function execShellHook(cmd: string, cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile("sh", ["-c", cmd], { cwd, timeout: 60_000 }, (error, stdout, stderr) => {
      if (stdout) logger.info(stdout.trimEnd());
      if (stderr) logger.warn(stderr.trimEnd());
      if (error) reject(new Error(`Hook command failed: ${cmd}\n${error.message}`));
      else resolve();
    });
  });
}

export function createHooksFromConfig(
  config: TspubPublishConfig | undefined,
): PublishHooks | undefined {
  const hooks = config?.hooks;
  if (!hooks) return undefined;
  if (!hooks.beforeBuild && !hooks.afterBuild && !hooks.beforePublish && !hooks.afterPublish) {
    return undefined;
  }

  const result: PublishHooks = {};
  if (hooks.beforeBuild) {
    const cmd = hooks.beforeBuild;
    result.beforeBuild = ({ dir }) => execShellHook(cmd, dir);
  }
  if (hooks.afterBuild) {
    const cmd = hooks.afterBuild;
    result.afterBuild = ({ dir }) => execShellHook(cmd, dir);
  }
  if (hooks.beforePublish) {
    const cmd = hooks.beforePublish;
    result.beforePublish = ({ dir }) => execShellHook(cmd, dir);
  }
  if (hooks.afterPublish) {
    const cmd = hooks.afterPublish;
    result.afterPublish = ({ dir }) => execShellHook(cmd, dir);
  }
  return result;
}
