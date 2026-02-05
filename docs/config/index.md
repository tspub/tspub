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
  formats?: ("esm" | "cjs")[];  // Default: ["esm"]
  entry?: string | string[];     // Default: auto-detected
  outDir?: string;               // Default: "dist"
  clean?: boolean;               // Default: true
  dts?: boolean;                 // Default: true
  sourcemap?: boolean;           // Default: false
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `formats` | `("esm" \| "cjs")[]` | `["esm"]` | Output module formats |
| `entry` | `string \| string[]` | auto | Entry point files |
| `outDir` | `string` | `"dist"` | Output directory |
| `clean` | `boolean` | `true` | Clean output before build |
| `dts` | `boolean` | `true` | Generate type declarations |
| `sourcemap` | `boolean` | `false` | Generate sourcemaps |

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

## Changeset Options {#changeset}

```typescript
interface TspubChangesetConfig {
  dependentBumping?: "major" | "all" | "none";
  snapshotTag?: string;
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dependentBumping` | `string` | `"major"` | When to bump dependents |
| `snapshotTag` | `string` | `"snapshot"` | Tag for snapshot releases |

## Workspace Inheritance

In monorepos, workspace packages inherit the root `tspub.config.ts`. Package-level configs override root settings.
