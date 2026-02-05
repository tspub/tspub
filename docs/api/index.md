# Programmatic API

All tspub functionality is available as a JavaScript API.

## Installation

```bash
npm install tspub
```

## Core Functions

### `check(options)`

Run all checker rules against a package directory.

```typescript
import { check } from "tspub";

const results = await check({
  dir: ".",
  fix: false,
  strict: false,
  severityOverrides: {
    "size/package-size": "off",
  },
});

for (const r of results) {
  console.log(`[${r.severity}] ${r.message}`);
}
```

**Options:**

| Field | Type | Description |
|-------|------|-------------|
| `dir` | `string` | Package directory |
| `fix` | `boolean` | Apply auto-fixes |
| `strict` | `boolean` | Treat warnings as errors |
| `unsafe` | `boolean` | Apply unsafe fixes |
| `dryRun` | `boolean` | Preview fixes only |
| `fixTypes` | `string[]` | Limit fix categories |
| `interactive` | `boolean` | Confirm each fix |
| `severityOverrides` | `Record<string, Severity \| "off">` | Override severities |

**Returns:** `Promise<CheckResult[]>`

### `build(options)`

Build TypeScript packages.

```typescript
import { build } from "tspub";

await build({
  dir: ".",
  formats: ["esm", "cjs"],
  dts: true,
});
```

### `scan(options)`

Scan remote GitHub repositories.

```typescript
import { scan } from "tspub";

const results = await scan({
  url: "https://github.com/owner/repo",
  json: false,
});
```

### `doctor(options)`

Diagnose package issues.

```typescript
import { doctor } from "tspub";

const results = await doctor({ dir: ".", fix: false });
```

### `scaffold(options)`

Create a new package from templates.

```typescript
import { scaffold } from "tspub";

await scaffold({ name: "my-package", dir: "./my-package" });
```

### `runTypeTests(options)`

Run `.test-d.ts` type tests.

```typescript
import { runTypeTests } from "tspub";

const result = await runTypeTests({
  dir: ".",
  directory: "test-d",
});

if (!result.passed) {
  for (const err of result.errors) {
    console.error(`${err.file}:${err.line} — ${err.message}`);
  }
}
```

## Workspace

```typescript
import { discoverWorkspaces, topoSort, isMonorepoRoot, filterPackages } from "tspub";

if (await isMonorepoRoot(".")) {
  const packages = topoSort(await discoverWorkspaces("."));
  const filtered = filterPackages(packages, "@scope/*");
}
```

## Config

```typescript
import { loadConfig, loadConfigWithInheritance } from "tspub";

const config = await loadConfig(".");
const inherited = await loadConfigWithInheritance("./packages/core", ".");
```

## Plugins

```typescript
import { loadPlugins } from "tspub";
import type { TspubPlugin, Rule, RuleMeta, CheckContext, Severity } from "tspub";
```

## Version

```typescript
import { resolveVersionBump } from "tspub";

const bump = await resolveVersionBump(".");
// { type: "minor", reason: "feat: add new API" }
```
