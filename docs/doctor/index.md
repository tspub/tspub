# Doctor

The `tspub doctor` command diagnoses your project environment, finding issues that aren't in your `package.json` but can still break your package.

## Quick Start

```bash
tspub doctor
```

```
environment/node-version    ✓ v20.10.0 (matches engines)
environment/lockfiles       ✗ found package-lock.json AND yarn.lock
typescript/strict           ✗ strict mode not enabled
typescript/declaration      ✗ declaration not enabled
build/output-fresh          ✗ dist/ is older than src/
dependencies/duplicates     ✗ react in deps AND devDeps

4 issues found (3 auto-fixable)
```

## Auto-fix

```bash
tspub doctor --fix
```

Fixes issues like:
- Removes extra lock files
- Enables `strict: true` in tsconfig
- Enables `declaration: true` in tsconfig
- Removes duplicates from devDependencies

## Options

| Option | Description |
|:-------|:------------|
| `--fix` | Apply auto-fixes |
| `--unsafe` | Allow unsafe fixes |
| `--dry-run` | Preview fixes without applying |
| `--profile <name>` | Use a preset profile (`strict`, `quick`) |
| `--format json` | Output JSON for CI |
| `--rule <id=severity>` | Override rule severity |

## The 16 Rules

### Environment (6 rules)

| Rule | Description | Fixable |
|:-----|:------------|:--------|
| `environment/node-version` | Node version matches `engines` | — |
| `environment/npm-version` | npm version is compatible | — |
| `environment/multiple-lockfiles` | Only one lock file exists | ✓ safe |
| `environment/typescript-version` | TypeScript is up to date | ✓ safe |
| `environment/git-dirty` | Working tree is clean | — |
| `environment/git-no-remote` | Git remote is configured | — |

### TypeScript (5 rules)

| Rule | Description | Fixable |
|:-----|:------------|:--------|
| `typescript/tsconfig-exists` | tsconfig.json exists | ✓ safe |
| `typescript/strict` | `strict: true` is set | ✓ safe |
| `typescript/declaration` | `declaration: true` is set | ✓ safe |
| `typescript/module` | Module setting is appropriate | — |
| `typescript/module-resolution` | moduleResolution is set correctly | — |

### Build (2 rules)

| Rule | Description | Fixable |
|:-----|:------------|:--------|
| `build/output-exists` | Build output directory exists | — |
| `build/output-fresh` | Build output is newer than source | — |

### Dependencies (3 rules)

| Rule | Description | Fixable |
|:-----|:------------|:--------|
| `dependencies/no-file-deps` | No `file:` protocol dependencies | — |
| `dependencies/no-duplicates` | No deps in both deps and devDeps | ✓ safe |
| `dependencies/peer-dep-installed` | Peer deps are installed for dev | — |

## Profiles

### `strict` (default)

All rules enabled at their default severity.

### `quick`

Skips slow checks:
- `build/output-fresh`
- `dependencies/peer-dep-installed`

```bash
tspub doctor --profile quick
```

## Override Severity

```bash
tspub doctor --rule "typescript/strict=off"
```

Or in config:

```ts
// tspub.config.ts
export default {
  doctor: {
    severityOverrides: {
      "typescript/strict": "off",
    },
  },
};
```

## Plugins

Write custom doctor rules:

```js
export const rules = [{
  meta: {
    id: "custom/check-nvmrc",
    description: "Ensure .nvmrc exists",
    category: "environment",
    fixable: "safe",
  },
  check(ctx) {
    // Check logic
  },
  fix(ctx) {
    // Fix logic
  },
}];
```

```ts
// tspub.config.ts
export default {
  doctor: { plugins: ["./my-doctor-rules.js"] },
};
```

## Programmatic API

```ts
import { doctor } from "tspub";

const results = await doctor({
  dir: ".",
  fix: true,
  profile: "strict",
});

console.log(results);
// [{ ruleId: "typescript/strict", severity: "error", message: "...", fixable: "safe" }]
```
