# Configuration Reference

tspub is zero-config by default. For customization, create `tspub.config.ts` in your project root.

## Config File

```typescript
import type { TspubConfig } from "tspub";

export default {
  // options
} satisfies TspubConfig;
```

Also supports: `tspub.config.js`, `tspub.config.mjs`, or a `"tspub"` key in `package.json`.

## Build Options {#build}

```typescript
interface TspubBuildConfig {
  formats?: ("esm" | "cjs" | "iife")[];
  entry?: string | string[] | Record<string, string>;
  outDir?: string;
  clean?: boolean;
  dts?: boolean;
  dtsBundle?: boolean;
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
  replaceNodeEnv?: boolean;
  globalName?: string;
  onSuccess?: string | (() => void | Promise<void>);
  treeshake?: boolean | { ignoreAnnotations?: boolean };
  publicDir?: string;
  inject?: string[];
  sizeLimits?: Record<string, string>;
  shims?: boolean;
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `formats` | `("esm" \| "cjs" \| "iife")[]` | `["esm"]` | Output module formats |
| `entry` | `string \| string[] \| Record<string, string>` | auto | Entry point files |
| `outDir` | `string` | `"dist"` | Output directory |
| `clean` | `boolean` | `true` | Clean output before build |
| `dts` | `boolean` | `true` | Generate type declarations |
| `dtsBundle` | `boolean` | `false` | Bundle `.d.ts` into single-file declarations |
| `dtsResolve` | `boolean` | `false` | Resolve external types into bundled `.d.ts` |
| `sourcemap` | `boolean` | `false` | Generate sourcemaps |
| `minify` | `boolean` | `false` | Minify output |
| `splitting` | `boolean` | `false` | Enable code splitting (ESM only, auto-enabled for multi-entry) |
| `target` | `string` | — | esbuild target (e.g. `"es2022"`, `"node18"`) |
| `platform` | `"node" \| "browser" \| "neutral"` | — | Target platform |
| `external` | `(string \| RegExp)[]` | — | Packages to exclude from bundle |
| `noExternal` | `string[]` | — | Force-bundle specific packages |
| `define` | `Record<string, string>` | — | Compile-time constants |
| `banner` | `{ js?: string }` | — | Prepend text to output files |
| `footer` | `{ js?: string }` | — | Append text to output files |
| `cjsInterop` | `boolean` | `true` | Enable CJS interop (consumers don't need `.default`) |
| `esbuildPlugins` | `Plugin[]` | — | Pass esbuild plugins directly |
| `loader` | `Record<string, Loader>` | — | Custom esbuild loaders by extension |
| `replaceNodeEnv` | `boolean` | — | Replace `process.env.NODE_ENV` (auto when minify is true). Replaces deprecated `envProduction` |
| `globalName` | `string` | — | Global variable name for IIFE builds |
| `onSuccess` | `string \| () => void` | — | Run command/callback after successful build |
| `treeshake` | `boolean \| object` | — | Esbuild treeshake configuration |
| `publicDir` | `string` | — | Copy static assets to outDir |
| `inject` | `string[]` | — | Files to inject into all bundles |
| `sizeLimits` | `Record<string, string>` | — | Size budgets — fail build if exceeded |
| `shims` | `boolean` | `true` | Inject `__dirname`/`__filename`/`import.meta.url` shims into CJS |

## Check Options {#check}

```typescript
interface TspubCheckConfig {
  severityOverrides?: Record<string, "error" | "warning" | "info" | "off">;
  plugins?: string[];
  typeTests?: {
    enabled?: boolean;
    directory?: string;
  };
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `severityOverrides` | `Record<string, Severity \| "off">` | `{}` | Override rule severities |
| `plugins` | `string[]` | `[]` | Plugin module paths |
| `typeTests.enabled` | `boolean` | `false` | Run type tests during check |
| `typeTests.directory` | `string` | `"test-d"` | Directory for `.test-d.ts` files |

## Publish Options {#publish}

```typescript
interface TspubPublishConfig {
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
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `registry` | `string` | npm default | npm registry URL |
| `access` | `"public" \| "restricted"` | npm default | Package access level |
| `provenance` | `boolean` | `false` | Enable npm provenance |
| `branch` | `string \| string[]` | any | Allowed publish branches |
| `changelogStyle` | `string` | `"simple"` | Changelog format |
| `ci.enabled` | `boolean` | `false` | CI mode (no prompts) |
| `ci.skipPush` | `boolean` | `false` | Skip git push |
| `github.release` | `boolean` | `false` | Create GitHub release on publish |
| `github.draft` | `boolean` | `false` | Create as draft release |
| `github.assets` | `string[]` | — | Files to attach to GitHub release |
| `hooks.beforeBuild` | `string` | — | Shell command to run before build |
| `hooks.afterBuild` | `string` | — | Shell command to run after build |
| `hooks.beforePublish` | `string` | — | Shell command to run before npm publish |
| `hooks.afterPublish` | `string` | — | Shell command to run after npm publish |

## Changeset Options {#changeset}

```typescript
interface TspubChangesetConfig {
  dependentBumping?: "major" | "all" | "none";
  snapshotTag?: string;
  linked?: string[][];
  fixed?: string[][];
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dependentBumping` | `string` | `"major"` | When to bump dependents |
| `snapshotTag` | `string` | `"snapshot"` | Tag for snapshot releases |
| `linked` | `string[][]` | — | Groups of packages that bump together (highest bump wins) |
| `fixed` | `string[][]` | — | Groups of packages that always share the same version |

## Doctor Options {#doctor}

```typescript
interface TspubDoctorConfig {
  severityOverrides?: Record<string, DoctorSeverity | "off">;
  plugins?: string[];
  profile?: string;
}
```

## Scan Options {#scan}

```typescript
interface TspubScanConfig {
  concurrency?: number;
  severityOverrides?: Record<string, Severity | "off">;
  profile?: string;
}
```

## Workspace Inheritance

In monorepos, workspace packages inherit the root `tspub.config.ts`. Package-level configs override root settings.
