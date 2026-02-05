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
