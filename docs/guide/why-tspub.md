# Why tspub?

## The Problem

Publishing a TypeScript npm package correctly requires:

1. A bundler (tsup, unbuild, or raw tsc)
2. A linter for package.json (publint)
3. A type resolution checker (attw)
4. A versioning tool (changesets, semantic-release)
5. A type tester (tsd, expect-type)
6. Manual tsconfig.json tuning
7. Manual package.json field ordering

That's **7 tools to install, configure, and keep in sync**. Each has its own config format, CLI flags, and update cycle. When one breaks, the others don't know.

## The Solution

tspub is a single dependency that replaces all of them:

```bash
npm install -D @tspub-dev/tspub
```

| What you needed | What tspub provides |
|-----------------|---------------------|
| tsup / unbuild | `tspub build` |
| publint | `tspub check` (exports + files + metadata rules) |
| @arethetypeswrong/cli | `tspub check` (types/resolution rule) |
| @changesets/cli | `tspub changeset` |
| tsd | `tspub test-types` |
| Manual tsconfig audit | `tspub doctor` |
| npm publish workflow | `tspub publish` |

## Key Differentiators

### 70 Built-in Rules

More than publint (~40 rules) and attw (~12 problem types) combined. Every rule has a clear ID, severity, and many are auto-fixable.

### Auto-Fix

```bash
tspub check --fix
```

20+ rules can auto-fix issues in your `package.json` — reorder conditions, add missing fields, remove deprecated entries. No other package linter does this.

### Integrated Workflow

Build, check, and publish share context. `tspub publish` runs the full pipeline — if check fails, nothing gets published. No more publishing broken packages.

### Plugin System

```typescript
// my-plugin.ts
import type { Rule } from "tspub";

export const rules: Rule[] = [{
  meta: { id: "custom/my-rule", description: "...", defaultSeverity: "error", fixable: false, category: "custom" },
  check(ctx) { /* ... */ },
}];
```

Neither publint nor attw support plugins.

### Self-Hosting

tspub builds itself. The same `tspub build` pipeline you use is the one that produces tspub's own `dist/`. No external bundler needed — dogfooded from day one.

### Remote Scanning

```bash
tspub scan https://github.com/sindresorhus/chalk
tspub scan --top 10
```

Audit any public TypeScript package without cloning it. No other tool does this.

### Type Testing

```typescript
// test-d/index.test-d.ts
import { expectType } from "tspub/test-d";
import { myFn } from "../dist/index.js";

expectType<string>(myFn("hello"));
```

Built-in, no extra dependency needed.
