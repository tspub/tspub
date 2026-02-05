# Contributing to tspub

## Setup

```bash
git clone https://github.com/anishgiri/tspub.git
cd tspub
npm install
npm run build
npm test
```

## Architecture

```
src/
├── builder/        Build orchestration (tsdown wrapper, changelog generation)
├── changeset/      Changeset parsing, versioning, snapshot releases
├── checker/        Package validation engine
│   ├── framework/  Rule runner, context builder, types
│   ├── rules/      40+ built-in rules organized by category
│   │   ├── exports/   Export field validation (23 rules)
│   │   ├── types/     TypeScript config & resolution (9 rules)
│   │   ├── files/     File inclusion & format checks (7 rules)
│   │   ├── metadata/  Package metadata validation (8 rules)
│   │   ├── size/      Package size checks (1 rule)
│   │   └── utils/     Shared helpers (exports traversal, format detection)
│   └── plugins.ts  Plugin loader
├── cli/            Command handlers (init, build, check, publish, doctor, scan, changeset, test-types)
├── config/         Config loading from tspub.config.ts / package.json
├── doctor/         Package diagnosis and auto-repair
├── publisher/      npm publish workflow, version bumping from commits
├── scaffold/       Project templates (package.json, tsconfig, CI)
├── scanner/        Remote GitHub repo scanning
├── shared/         Logger, package.json helpers, file resolution
├── type-tester/    .test-d.ts type declaration testing
└── workspace/      Monorepo discovery, topo sort, package filtering
```

## Writing a Checker Rule

1. Create a file in `src/checker/rules/<category>/my-rule.ts`:

```typescript
import type { Rule, RawDiagnostic } from "../../framework/types.js";

export const myRule: Rule = {
  meta: {
    id: "exports/my-rule",        // category/name format
    description: "What this rule checks",
    defaultSeverity: "warning",   // "error" | "warning" | "info"
    fixable: false,               // false | "safe" | "unsafe"
    category: "exports",          // must match the ID prefix
  },
  check(ctx) {
    const results: RawDiagnostic[] = [];
    // ctx.pkg — parsed package.json
    // ctx.dir — package directory
    // ctx.compilerOptions — tsconfig compilerOptions (or null)
    // ctx.hasBuildOutput — whether dist/ exists
    // ctx.distFiles — list of files in dist/
    // ctx.allJsFiles — all .js files in dist/
    if (someCondition(ctx.pkg)) {
      results.push({
        severity: "warning",
        message: "Describe the problem clearly",
      });
    }
    return results;
  },
  // Optional: auto-fix
  fix(ctx) {
    // Modify ctx.pkg in place
    return { message: "what was fixed", pkgModified: true };
  },
};
```

2. Register in `src/checker/rules/index.ts`:

```typescript
import { myRule } from "./exports/my-rule.js";

export const allRules: Rule[] = [
  // ... existing rules
  myRule,
];
```

3. Write tests in `test/checker/<category>/my-rule.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { myRule } from "../../../src/checker/rules/exports/my-rule.js";

const baseCtx = {
  dir: "/tmp",
  compilerOptions: null,
  hasBuildOutput: true,
  distFiles: [],
  allJsFiles: [],
  hasUnresolvedExtends: false,
};

describe("exports/my-rule", () => {
  it("detects the problem", () => {
    const results = myRule.check({ ...baseCtx, pkg: { /* bad config */ } });
    expect(results).toHaveLength(1);
  });

  it("passes for correct config", () => {
    const results = myRule.check({ ...baseCtx, pkg: { /* good config */ } });
    expect(results).toHaveLength(0);
  });
});
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npx vitest run test/checker/exports/my-rule.test.ts

# Type check
npm run typecheck

# Lint
npm run lint
```

## Changeset Workflow for Contributors

When making changes that affect the published package:

```bash
# Create a changeset
npx tspub changeset add
# Select bump type (patch/minor/major)
# Write a summary of the change

# The changeset file is committed with your PR
git add .changeset/
git commit -m "feat: add my-rule checker"
```

## Workflow

1. Fork and clone
2. Create a branch: `git checkout -b my-feature`
3. Make changes
4. Run `npm test` and `npm run typecheck`
5. Add a changeset if applicable
6. Submit a PR
